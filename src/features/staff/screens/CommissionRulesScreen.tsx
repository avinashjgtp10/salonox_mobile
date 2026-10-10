import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState, ErrorState, InlineLoader } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import {
  describeRule,
  formatRupees,
  FREQUENCY_LABELS,
  groupCommissionRules,
  RULE_SOURCES,
  RULE_TYPE_LABELS,
  SOURCE_META,
} from "@/features/staff/utils/commissionRules";
import { useAppToast } from "@/hooks/useAppToast";
import { getApiErrorMessage } from "@/services/api";
import { appAlert as Alert } from "@/services/appAlert";
import { commissionRulesService } from "@/services/commissionRules.service";
import { staffService } from "@/services/staff.service";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { CommissionRule, CommissionRuleGroup, CommissionRuleSource, TieredTargetProgress } from "@/types/commissionRules";
import { canUseCommissionRules, COMMISSION_RULE_PERMISSIONS as PERMS } from "@/utils/permissions";

/** Loads every active staff member's name once; rules store only staff ids. */
export function useStaffNames() {
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    staffService.getStaff({ limit: 200, page: 1 })
      .then((result) => {
        if (active) setStaff(result.staffMembers.filter((member) => member.status !== "Inactive").map(({ id, name }) => ({ id, name })));
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { loading, staff };
}

function TargetProgressRow({ ruleId, staffName }: { ruleId: string; staffName: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [progress, setProgress] = useState<TieredTargetProgress | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    commissionRulesService.getProgress(ruleId)
      .then((value) => { if (active) setProgress(value); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [ruleId]);

  return (
    <View style={styles.progressRow}>
      <View style={styles.rowBetween}>
        <Text style={styles.progressName}>{staffName}</Text>
        <Text style={styles.progressPct}>{progress ? `${progress.progressPct}%` : failed ? "—" : "…"}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(100, progress?.progressPct ?? 0)}%` }]} />
      </View>
      {progress ? (
        <Text style={styles.muted}>
          {progress.targetReached ? "Target reached" : `${formatRupees(progress.remaining)} to go`} · {formatRupees(progress.achieved)} of {formatRupees(progress.target)}
        </Text>
      ) : null}
    </View>
  );
}

export function CommissionRulesScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const toast = useAppToast();
  const user = useAppSelector(selectCurrentUser);
  const canView = canUseCommissionRules(user, PERMS.VIEW);
  const canAdd = canUseCommissionRules(user, PERMS.ADD);
  const canEdit = canUseCommissionRules(user, PERMS.EDIT);
  const canDelete = canUseCommissionRules(user, PERMS.DELETE);

  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<CommissionRuleSource | "all">("all");
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const { staff } = useStaffNames();

  const load = useCallback(async () => {
    try {
      setRules(await commissionRulesService.list());
      setError(null);
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { if (canView) void load(); }, [canView, load]));

  const groups = useMemo(() => groupCommissionRules(rules), [rules]);
  const visibleGroups = groups.filter((group) => sourceFilter === "all" || group.primary.source === sourceFilter);
  const detailGroup = groups.find((group) => group.key === detailKey) ?? null;
  const staffName = (id: string) => staff.find((member) => member.id === id)?.name ?? "Staff member";

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleStatus = async (group: CommissionRuleGroup) => {
    const next = group.primary.status === "active" ? "draft" : "active";
    setBusyKey(group.key);
    try {
      await commissionRulesService.setStatus(group.rules.map((rule) => rule.id), next);
      const ids = new Set(group.rules.map((rule) => rule.id));
      setRules((current) => current.map((rule) => (ids.has(rule.id) ? { ...rule, status: next } : rule)));
      setDetailKey(null);
    } catch (failure) {
      Alert.alert("Unable to update rule", getApiErrorMessage(failure));
      void load();
    } finally {
      setBusyKey(null);
    }
  };

  const confirmDelete = (group: CommissionRuleGroup) => {
    Alert.alert("Delete commission rule?", `"${group.primary.name}" will stop applying to ${group.staffIds.length || "its"} staff. This can't be undone.`, [
      { style: "cancel", text: "Cancel" },
      {
        onPress: async () => {
          setBusyKey(group.key);
          try {
            await commissionRulesService.deleteRules(group.rules.map((rule) => rule.id));
            const ids = new Set(group.rules.map((rule) => rule.id));
            setRules((current) => current.filter((rule) => !ids.has(rule.id)));
            setDetailKey(null);
            toast.showSuccess("Commission rule deleted.");
          } catch (failure) {
            Alert.alert("Unable to delete rule", getApiErrorMessage(failure));
            void load();
          } finally {
            setBusyKey(null);
          }
        },
        style: "destructive",
        text: "Delete",
      },
    ]);
  };

  const openForm = (group?: CommissionRuleGroup) => {
    setDetailKey(null);
    router.push((group ? `/team/commission-rules/form?ruleId=${group.primary.id}` : "/team/commission-rules/form") as Href);
  };

  if (!canView) {
    return <Redirect href="/team/commissions" />;
  }

  const sourceCount = (source: CommissionRuleSource) => groups.filter((group) => group.primary.source === source).length;

  const header = (
    <View>
      <View style={styles.header}>
        <AppBackButton fallbackHref="/team/commissions" />
        <Text style={styles.headerTitle}>Commission Rules</Text>
        {canAdd ? (
          <TouchableOpacity accessibilityLabel="New commission rule" accessibilityRole="button" onPress={() => openForm()} style={styles.addButton}>
            <Ionicons color="#FFFFFF" name="add" size={22} />
          </TouchableOpacity>
        ) : <View style={styles.addButtonPlaceholder} />}
      </View>
      <ScrollView contentContainerStyle={styles.chipRow} horizontal showsHorizontalScrollIndicator={false}>
        {(["all", ...RULE_SOURCES] as const).map((source) => {
          const active = source === sourceFilter;
          const label = source === "all" ? `All (${groups.length})` : `${SOURCE_META[source].label} (${sourceCount(source)})`;
          return (
            <TouchableOpacity key={source} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSourceFilter(source)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {loading ? <InlineLoader label="Loading commission rules..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {!loading && !error && visibleGroups.length === 0 ? (
        <EmptyState
          accent="indigo"
          description={groups.length ? "No rules for this category." : "Create a rule to decide how staff earn commission on sales."}
          icon="options-outline"
          title={groups.length ? "No matching rules" : "No commission rules yet"}
        />
      ) : null}
    </View>
  );

  const renderGroup = ({ item: group }: { item: CommissionRuleGroup }) => {
    const rule = group.primary;
    const names = group.staffIds.map(staffName);
    const busy = busyKey === group.key;
    return (
      <TouchableOpacity activeOpacity={0.86} onPress={() => setDetailKey(group.key)} style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.cardTitleRow}>
            <View style={styles.sourceIcon}><Ionicons color={Colors.primary} name={SOURCE_META[rule.source].icon} size={16} /></View>
            <Text numberOfLines={1} style={styles.cardTitle}>{rule.name}</Text>
          </View>
          <StatusPill status={rule.status} />
        </View>
        <Text style={styles.cardDescription}>{describeRule(rule)}</Text>
        <Text style={styles.muted}>{SOURCE_META[rule.source].label} · {RULE_TYPE_LABELS[rule.type]} · {FREQUENCY_LABELS[rule.frequency]}</Text>
        <Text numberOfLines={1} style={styles.muted}>
          {names.length ? `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3} more` : ""}` : "All staff"}
        </Text>
        {canEdit || canDelete ? (
          <View style={styles.cardActions}>
            {canEdit && rule.status !== "expired" ? (
              <View style={styles.toggle}>
                {busy ? <ActivityIndicator color={Colors.primary} size="small" /> : (
                  <Switch
                    accessibilityLabel={rule.status === "active" ? "Deactivate rule" : "Activate rule"}
                    onValueChange={() => void toggleStatus(group)}
                    thumbColor="#FFFFFF"
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    value={rule.status === "active"}
                  />
                )}
                <Text style={styles.muted}>{rule.status === "active" ? "Active" : "Draft"}</Text>
              </View>
            ) : <View />}
            <View style={styles.iconActions}>
              {canEdit ? (
                <TouchableOpacity accessibilityLabel="Edit rule" accessibilityRole="button" disabled={busy} hitSlop={8} onPress={() => openForm(group)} style={styles.iconButton}>
                  <Ionicons color={Colors.heading} name="create-outline" size={18} />
                </TouchableOpacity>
              ) : null}
              {canDelete ? (
                <TouchableOpacity accessibilityLabel="Delete rule" accessibilityRole="button" disabled={busy} hitSlop={8} onPress={() => confirmDelete(group)} style={styles.iconButton}>
                  <Ionicons color={Colors.error} name="trash-outline" size={18} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}
        data={loading || error ? [] : visibleGroups}
        keyExtractor={(group) => group.key}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl colors={[Colors.primary]} onRefresh={() => void refresh()} refreshing={refreshing} tintColor={Colors.primary} />}
        renderItem={renderGroup}
        showsVerticalScrollIndicator={false}
      />

      <BottomSheet onClose={() => setDetailKey(null)} scrollable title={detailGroup?.primary.name ?? "Commission rule"} visible={Boolean(detailGroup)}>
        {detailGroup ? (
          <View style={styles.detail}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardDescription}>{describeRule(detailGroup.primary)}</Text>
              <StatusPill status={detailGroup.primary.status} />
            </View>
            <DetailRow label="Source" value={SOURCE_META[detailGroup.primary.source].label} />
            <DetailRow label="Type" value={RULE_TYPE_LABELS[detailGroup.primary.type]} />
            <DetailRow label="Frequency" value={FREQUENCY_LABELS[detailGroup.primary.frequency]} />
            {detailGroup.primary.type === "tiered_target" ? (
              <>
                <DetailRow label="Monthly target" value={formatRupees(detailGroup.primary.condition_target ?? 0)} />
                <DetailRow label="Below target" value={`${detailGroup.primary.rate ?? 0}%`} />
                <DetailRow label="At / above target" value={`${detailGroup.primary.rate_after_target ?? 0}%`} />
              </>
            ) : null}
            {detailGroup.primary.type === "milestone_ladder" && detailGroup.primary.tiers?.length ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailHeading}>Milestones (monthly {SOURCE_META[detailGroup.primary.source].label.toLowerCase()} revenue)</Text>
                {detailGroup.primary.tiers.map((tier) => (
                  <DetailRow key={tier.target} label={`Reach ${formatRupees(tier.target)}`} value={`+ ${formatRupees(tier.reward)}`} />
                ))}
              </View>
            ) : null}
            <View style={styles.detailBlock}>
              <Text style={styles.detailHeading}>Staff members</Text>
              <Text style={styles.muted}>{detailGroup.staffIds.length ? detailGroup.staffIds.map(staffName).join(", ") : "All staff"}</Text>
            </View>
            {detailGroup.primary.type === "tiered_target" && detailGroup.primary.status === "active" ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailHeading}>This month&apos;s progress</Text>
                {detailGroup.rules.map((rule) => (
                  <TargetProgressRow key={rule.id} ruleId={rule.id} staffName={rule.scope_id ? staffName(rule.scope_id) : "All staff"} />
                ))}
              </View>
            ) : null}
            {canEdit ? (
              <TouchableOpacity onPress={() => openForm(detailGroup)} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Edit rule</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: CommissionRule["status"] }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const palette = status === "active"
    ? { bg: Colors.successBg, color: Colors.success }
    : status === "expired" ? { bg: Colors.errorBg, color: Colors.error } : { bg: Colors.bg2, color: Colors.text2 };
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.color }]}>{status}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  content: { paddingHorizontal: AppLayout.contentHorizontalPadding },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
    marginTop: Spacing.md,
  },
  headerTitle: { color: Colors.heading, fontSize: AppLayout.headerTitleFontSize, fontWeight: AppLayout.screenTitleFontWeight },
  addButton: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: Radius.full, height: 40, justifyContent: "center", width: 40 },
  addButtonPlaceholder: { width: 40 },
  chipRow: { gap: 8, paddingBottom: Spacing.md },
  chip: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text2, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card, borderWidth: 1, gap: 6, marginBottom: Spacing.sm, padding: 14 },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  cardTitleRow: { alignItems: "center", flex: 1, flexDirection: "row", gap: 8 },
  sourceIcon: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.md, height: 30, justifyContent: "center", width: 30 },
  cardTitle: { color: Colors.heading, flex: 1, fontSize: 15, fontWeight: "800" },
  cardDescription: { color: Colors.heading, flex: 1, fontSize: 13, fontWeight: "700" },
  muted: { color: Colors.text2, fontSize: 12 },
  cardActions: { alignItems: "center", borderColor: Colors.border, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 8 },
  toggle: { alignItems: "center", flexDirection: "row", gap: 6, minHeight: 32 },
  iconActions: { flexDirection: "row", gap: 8 },
  iconButton: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: Radius.full, height: 36, justifyContent: "center", width: 36 },
  pill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  detail: { gap: 10 },
  detailBlock: { borderColor: Colors.border, borderTopWidth: 1, gap: 8, paddingTop: 10 },
  detailHeading: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
  detailValue: { color: Colors.heading, fontSize: 13, fontWeight: "700" },
  progressRow: { gap: 4 },
  progressName: { color: Colors.heading, fontSize: 13, fontWeight: "700" },
  progressPct: { color: Colors.primary, fontSize: 13, fontWeight: "800" },
  progressTrack: { backgroundColor: Colors.bg2, borderRadius: Radius.full, height: 6, overflow: "hidden" },
  progressFill: { backgroundColor: Colors.primary, borderRadius: Radius.full, height: "100%" },
  primaryButton: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: Radius.md, marginTop: 4, paddingVertical: 14 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
