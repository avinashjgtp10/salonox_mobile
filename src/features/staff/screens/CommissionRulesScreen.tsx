import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  EmptyState,
  ErrorState,
  InlineLoader,
} from "@/components/ui/StateViews";
import { AppLayout } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
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
import {
  usePearlColors,
  type PearlColors as ThemeColors,
} from "@/components/auth/pearl/usePearlColors";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { StaffHeader, staffUi } from "../components/StaffPearl";
import {
  CommissionButton,
  CommissionChip,
  CommissionNote,
  commissionUi as ui,
} from "../components/CommissionPearl";
import type {
  CommissionRule,
  CommissionRuleGroup,
  CommissionRuleSource,
  TieredTargetProgress,
} from "@/types/commissionRules";
import {
  canUseCommissionRules,
  COMMISSION_RULE_PERMISSIONS as PERMS,
} from "@/utils/permissions";

/** Loads every active staff member's name once; rules store only staff ids. */
export function useStaffNames() {
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    staffService
      .getStaff({ limit: 200, page: 1 })
      .then((result) => {
        if (active)
          setStaff(
            result.staffMembers
              .filter((member) => member.status !== "Inactive")
              .map(({ id, name }) => ({ id, name })),
          );
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { loading, staff };
}

function TargetProgressRow({
  ruleId,
  staffName,
}: {
  ruleId: string;
  staffName: string;
}) {
  const Colors = usePearlColors(true);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [progress, setProgress] = useState<TieredTargetProgress | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    commissionRulesService
      .getProgress(ruleId)
      .then((value) => {
        if (active) setProgress(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [ruleId]);

  return (
    <View style={styles.progressRow}>
      <View style={styles.rowBetween}>
        <Text style={styles.progressName}>{staffName}</Text>
        <Text style={styles.progressPct}>
          {progress ? `${progress.progressPct}%` : failed ? "—" : "…"}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(100, progress?.progressPct ?? 0)}%` },
          ]}
        />
      </View>
      {progress ? (
        <Text style={styles.muted}>
          {progress.targetReached
            ? "Target reached"
            : `${formatRupees(progress.remaining)} to go`}{" "}
          · {formatRupees(progress.achieved)} of {formatRupees(progress.target)}
        </Text>
      ) : null}
    </View>
  );
}

export function CommissionRulesScreen() {
  const Colors = usePearlColors(true);
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
  const [sourceFilter, setSourceFilter] = useState<
    CommissionRuleSource | "all" | "targets"
  >("all");
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

  useFocusEffect(
    useCallback(() => {
      if (canView) void load();
    }, [canView, load]),
  );

  const groups = useMemo(() => groupCommissionRules(rules), [rules]);
  const visibleGroups = groups.filter(
    (group) =>
      sourceFilter === "all" ||
      (sourceFilter === "targets"
        ? ["tiered_target", "milestone_ladder", "milestone"].includes(
            group.primary.type,
          )
        : group.primary.source === sourceFilter),
  );
  const detailGroup = groups.find((group) => group.key === detailKey) ?? null;
  const staffName = (id: string) =>
    staff.find((member) => member.id === id)?.name ?? "Staff member";

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleStatus = async (group: CommissionRuleGroup) => {
    const next = group.primary.status === "active" ? "draft" : "active";
    setBusyKey(group.key);
    try {
      await commissionRulesService.setStatus(
        group.rules.map((rule) => rule.id),
        next,
      );
      const ids = new Set(group.rules.map((rule) => rule.id));
      setRules((current) =>
        current.map((rule) =>
          ids.has(rule.id) ? { ...rule, status: next } : rule,
        ),
      );
      setDetailKey(null);
    } catch (failure) {
      Alert.alert("Unable to update rule", getApiErrorMessage(failure));
      void load();
    } finally {
      setBusyKey(null);
    }
  };

  const confirmDelete = (group: CommissionRuleGroup) => {
    Alert.alert(
      "Delete commission rule?",
      `"${group.primary.name}" will stop applying to ${group.staffIds.length || "its"} staff. This can't be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setBusyKey(group.key);
            try {
              await commissionRulesService.deleteRules(
                group.rules.map((rule) => rule.id),
              );
              const ids = new Set(group.rules.map((rule) => rule.id));
              setRules((current) =>
                current.filter((rule) => !ids.has(rule.id)),
              );
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
      ],
    );
  };

  const openForm = (group?: CommissionRuleGroup) => {
    setDetailKey(null);
    router.push(
      (group
        ? `/team/commission-rules/form?ruleId=${group.primary.id}`
        : "/team/commission-rules/form") as Href,
    );
  };

  if (!canView) {
    return <Redirect href="/team/commissions" />;
  }

  const activeCount = groups.filter(
    (group) => group.primary.status === "active",
  ).length;
  const header = (
    <View style={{ gap: 14, marginBottom: 14 }}>
      <StaffHeader
        title="Commission rules"
        subtitle={
          loading
            ? "Loading…"
            : activeCount + " active rule" + (activeCount === 1 ? "" : "s")
        }
        right={
          canAdd ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="New rule"
              onPress={() => openForm()}
              style={staffUi.icon}
            >
              <Ionicons name="add" size={20} color={pearl.ink} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ui.chips}
      >
        {(["all", ...RULE_SOURCES, "targets"] as const).map((source) => (
          <CommissionChip
            key={source}
            selected={source === sourceFilter}
            label={
              source === "all"
                ? "All"
                : source === "targets"
                  ? "Targets"
                  : SOURCE_META[source].label
            }
            onPress={() => setSourceFilter(source)}
          />
        ))}
      </ScrollView>
      {loading && <InlineLoader label="Loading commission rules..." />}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {!loading && !error && !visibleGroups.length && (
        <EmptyState
          accent="indigo"
          description={
            groups.length
              ? "No rules for this category."
              : "Create a rule to decide how staff earn commission on sales."
          }
          icon="options-outline"
          title={
            groups.length ? "No matching rules" : "No commission rules yet"
          }
        />
      )}
    </View>
  );
  const renderGroup = ({ item: group }: { item: CommissionRuleGroup }) => {
    const rule = group.primary;
    const busy = busyKey === group.key;
    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => setDetailKey(group.key)}
        style={[ui.card, { marginBottom: 14 }]}
      >
        <View style={ui.between}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={ui.title}>{rule.name}</Text>
            <Text style={ui.muted}>
              {rule.type === "tiered_target" && rule.frequency === "daily"
                ? "Daily Target"
                : RULE_TYPE_LABELS[rule.type]}{" "}
              · {FREQUENCY_LABELS[rule.frequency]} ·{" "}
              {group.staffIds.length
                ? group.staffIds.length + " staff"
                : "All staff"}
            </Text>
          </View>
          {canEdit && rule.status !== "expired" ? (
            busy ? (
              <ActivityIndicator color={pearl.accentDeep} />
            ) : (
              <Switch
                accessibilityLabel={
                  rule.status === "active" ? "Deactivate rule" : "Activate rule"
                }
                value={rule.status === "active"}
                onValueChange={() => void toggleStatus(group)}
                thumbColor="#FFFFFF"
                trackColor={{ false: pearl.accentTint, true: pearl.accent }}
              />
            )
          ) : (
            <StatusPill status={rule.status} />
          )}
        </View>
        {(canEdit || canDelete) && (
          <View style={ui.row}>
            {canEdit && (
              <CommissionButton
                compact
                secondary
                label="Edit"
                icon="create-outline"
                disabled={busy}
                onPress={() => openForm(group)}
              />
            )}
            {canDelete && (
              <CommissionButton
                compact
                secondary
                label="Delete"
                icon="trash-outline"
                disabled={busy}
                onPress={() => confirmDelete(group)}
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };
  const footer =
    !loading && !error ? (
      <View style={{ gap: 14 }}>
        <CommissionNote>
          <Text style={{ fontWeight: "700" }}>How rules combine: </Text>
          Milestone bonuses add up. A milestone ladder and a regular rule cannot
          both be active for the same staff and category.
        </CommissionNote>
        {canAdd && (
          <View
            style={[ui.card, { alignItems: "center", paddingVertical: 24 }]}
          >
            <View
              style={[
                staffUi.icon,
                { width: 52, height: 52, backgroundColor: pearl.accentWash },
              ]}
            >
              <Ionicons
                name="trending-up-outline"
                color={pearl.accentDeep}
                size={22}
              />
            </View>
            <Text style={[ui.title, { textAlign: "center" }]}>
              Add rules for products or targets
            </Text>
            <Text style={[ui.muted, { textAlign: "center" }]}>
              For example, 5% on retail products, or a milestone bonus when
              sales reach a target.
            </Text>
            <CommissionButton
              compact
              label="New rule"
              onPress={() => openForm()}
            />
          </View>
        )}
      </View>
    ) : null;

  return (
    <PearlBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />
        <RefreshViewport>
          <FlatList
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + Spacing.lg },
            ]}
            data={loading || error ? [] : visibleGroups}
            keyExtractor={(group) => group.key}
            ListHeaderComponent={header}
            ListFooterComponent={footer}
            refreshControl={
              <RefreshControl
                colors={[Colors.primary]}
                onRefresh={() => void refresh()}
                refreshing={refreshing}
                tintColor={Colors.primary}
              />
            }
            renderItem={renderGroup}
            showsVerticalScrollIndicator={false}
          />
        </RefreshViewport>

        <BottomSheet
          pearlStyle
          centered={false}
          avoidKeyboard
          onClose={() => setDetailKey(null)}
          scrollable
          title={detailGroup?.primary.name ?? "Commission rule"}
          visible={Boolean(detailGroup)}
        >
          {detailGroup ? (
            <View style={styles.detail}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardDescription}>
                  {describeRule(detailGroup.primary)}
                </Text>
                <StatusPill status={detailGroup.primary.status} />
              </View>
              <DetailRow
                label="Source"
                value={SOURCE_META[detailGroup.primary.source].label}
              />
              <DetailRow
                label="Type"
                value={
                  detailGroup.primary.type === "tiered_target" &&
                  detailGroup.primary.frequency === "daily"
                    ? "Daily Target"
                    : RULE_TYPE_LABELS[detailGroup.primary.type]
                }
              />
              <DetailRow
                label="Frequency"
                value={FREQUENCY_LABELS[detailGroup.primary.frequency]}
              />
              {detailGroup.primary.type !== "tiered_target" &&
              detailGroup.primary.condition_target != null &&
              detailGroup.primary.condition_metric ? (
                <DetailRow
                  label="Condition"
                  value={`When ${detailGroup.primary.condition_metric} reaches ${detailGroup.primary.condition_metric === "revenue" ? formatRupees(detailGroup.primary.condition_target) : detailGroup.primary.condition_target}`}
                />
              ) : null}
              {detailGroup.primary.type === "tiered_target" ? (
                <>
                  <DetailRow
                    label={
                      detailGroup.primary.frequency === "daily"
                        ? "Daily target"
                        : "Monthly target"
                    }
                    value={formatRupees(
                      detailGroup.primary.condition_target ?? 0,
                    )}
                  />
                  <DetailRow
                    label="Below target"
                    value={`${detailGroup.primary.rate ?? 0}%`}
                  />
                  <DetailRow
                    label="At / above target"
                    value={`${detailGroup.primary.rate_after_target ?? 0}%`}
                  />
                </>
              ) : null}
              {detailGroup.primary.type === "milestone_ladder" &&
              detailGroup.primary.tiers?.length ? (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailHeading}>
                    Milestones (monthly{" "}
                    {SOURCE_META[
                      detailGroup.primary.source
                    ].label.toLowerCase()}{" "}
                    revenue)
                  </Text>
                  {detailGroup.primary.tiers.map((tier) => (
                    <DetailRow
                      key={tier.target}
                      label={`Reach ${formatRupees(tier.target)}`}
                      value={`+ ${formatRupees(tier.reward)}`}
                    />
                  ))}
                </View>
              ) : null}
              <View style={styles.detailBlock}>
                <Text style={styles.detailHeading}>Staff members</Text>
                <Text style={styles.muted}>
                  {detailGroup.staffIds.length
                    ? detailGroup.staffIds.map(staffName).join(", ")
                    : "All staff"}
                </Text>
              </View>
              {detailGroup.primary.type === "tiered_target" &&
              detailGroup.primary.status === "active" ? (
                <View style={styles.detailBlock}>
                  <Text style={styles.detailHeading}>Target progress</Text>
                  {detailGroup.rules.map((rule) => (
                    <TargetProgressRow
                      key={rule.id}
                      ruleId={rule.id}
                      staffName={
                        rule.scope_id ? staffName(rule.scope_id) : "All staff"
                      }
                    />
                  ))}
                </View>
              ) : null}
              {canEdit ? (
                <TouchableOpacity
                  onPress={() => openForm(detailGroup)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Edit rule</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </BottomSheet>
      </SafeAreaView>
    </PearlBackground>
  );
}

function StatusPill({ status }: { status: CommissionRule["status"] }) {
  const Colors = usePearlColors(true);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const palette =
    status === "active"
      ? { bg: Colors.successBg, color: Colors.success }
      : status === "expired"
        ? { bg: Colors.errorBg, color: Colors.error }
        : { bg: Colors.bg2, color: Colors.text2 };
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.color }]}>{status}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const Colors = usePearlColors(true);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { backgroundColor: "transparent", flex: 1 },
    content: { padding: AppLayout.contentHorizontalPadding },
    rowBetween: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
    },
    cardDescription: {
      color: Colors.heading,
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
    },
    muted: { color: Colors.text2, fontSize: 12 },
    pill: {
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
    detail: { gap: 10 },
    detailBlock: {
      borderColor: Colors.border,
      borderTopWidth: 0,
      gap: 8,
      paddingTop: 10,
    },
    detailHeading: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
    detailValue: { color: Colors.heading, fontSize: 13, fontWeight: "700" },
    progressRow: { gap: 4 },
    progressName: { color: Colors.heading, fontSize: 13, fontWeight: "700" },
    progressPct: { color: Colors.primaryText, fontSize: 13, fontWeight: "800" },
    progressTrack: {
      backgroundColor: Colors.bg2,
      borderRadius: Radius.full,
      height: 6,
      overflow: "hidden",
    },
    progressFill: {
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
      height: "100%",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: Radius.md,
      marginTop: 4,
      paddingVertical: 14,
    },
    primaryButtonText: {
      color: Colors.onPrimary,
      fontSize: 14,
      fontWeight: "800",
    },
  });
