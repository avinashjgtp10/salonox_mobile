import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton, AppBackButtonPlaceholder } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareForm } from "@/components/ui/KeyboardAwareForm";
import { ErrorState, InlineLoader } from "@/components/ui/StateViews";
import { AppLayout } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useStaffNames } from "@/features/staff/screens/CommissionRulesScreen";
import {
  findKindConflicts,
  formatRupees,
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  groupCommissionRules,
  RULE_SOURCES,
  RULE_TYPE_OPTIONS,
  SOURCE_META,
} from "@/features/staff/utils/commissionRules";
import { useAppToast } from "@/hooks/useAppToast";
import { getApiErrorMessage } from "@/services/api";
import { appAlert as Alert } from "@/services/appAlert";
import { commissionRulesService } from "@/services/commissionRules.service";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type {
  CommissionFrequency,
  CommissionRule,
  CommissionRuleFormData,
  CommissionRuleGroup,
  CommissionRuleSource,
  CommissionRuleStatus,
  CommissionRuleType,
} from "@/types/commissionRules";
import { canUseCommissionRules, COMMISSION_RULE_PERMISSIONS as PERMS } from "@/utils/permissions";

// Digits and a single decimal point (same rule as the staff form's amount fields).
const sanitizeDecimalInput = (text: string) => {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  return firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
};

type Tier = { reward: string; target: string };
const EMPTY_TIER: Tier = { reward: "", target: "" };
const positive = (value: string) => Number(value) > 0;

export function CommissionRuleFormScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const toast = useAppToast();
  const user = useAppSelector(selectCurrentUser);
  const { ruleId } = useLocalSearchParams<{ ruleId?: string }>();
  const isEditing = Boolean(ruleId);
  const allowed = canUseCommissionRules(user, isEditing ? PERMS.EDIT : PERMS.ADD);
  const { loading: staffLoading, staff } = useStaffNames();

  const [allRules, setAllRules] = useState<CommissionRule[]>([]);
  const [editingGroup, setEditingGroup] = useState<CommissionRuleGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [source, setSource] = useState<CommissionRuleSource>("services");
  const [type, setType] = useState<CommissionRuleType>("percentage");
  const [rate, setRate] = useState("");
  const [rateAfterTarget, setRateAfterTarget] = useState("");
  const [conditionTarget, setConditionTarget] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([EMPTY_TIER]);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<CommissionFrequency>("monthly");
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState<CommissionRuleStatus | null>(null);
  const submitting = useRef(false);

  // Rules are loaded for the edit prefill and for the ladder/regular conflict check.
  useEffect(() => {
    let active = true;
    commissionRulesService.list()
      .then((rules) => {
        if (!active) return;
        setAllRules(rules);
        if (!ruleId) return;
        const group = groupCommissionRules(rules).find((item) => item.rules.some((rule) => rule.id === ruleId));
        if (!group) { setLoadError("This commission rule no longer exists."); return; }
        const rule = group.primary;
        setEditingGroup(group);
        setName(rule.name);
        setSource(rule.source);
        setType(rule.type === "milestone" ? "percentage" : rule.type);
        setRate(rule.rate != null && rule.type !== "milestone_ladder" ? String(rule.rate) : "");
        setRateAfterTarget(rule.rate_after_target != null ? String(rule.rate_after_target) : "");
        setConditionTarget(rule.condition_target != null ? String(rule.condition_target) : "");
        setTiers(rule.tiers?.length ? rule.tiers.map((tier) => ({ reward: String(tier.reward), target: String(tier.target) })) : [EMPTY_TIER]);
        setStaffIds(group.staffIds);
        setFrequency(rule.frequency);
      })
      .catch((failure) => { if (active) setLoadError(getApiErrorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ruleId]);

  const isLadder = type === "milestone_ladder";
  const tierTargets = tiers.map((tier) => Number(tier.target));
  const tierError = tiers.some((tier) => !positive(tier.target) || !positive(tier.reward)) || new Set(tierTargets).size !== tierTargets.length;
  const ladderTotal = tiers.reduce((sum, tier) => sum + (positive(tier.reward) ? Number(tier.reward) : 0), 0);
  const errors = {
    conditionTarget: type === "tiered_target" && !positive(conditionTarget),
    name: !name.trim(),
    rate: !isLadder && !positive(rate),
    rateAfterTarget: type === "tiered_target" && !positive(rateAfterTarget),
    staff: staffIds.length === 0,
    tiers: isLadder && tierError,
  };
  const invalid = Object.values(errors).some(Boolean);
  const show = (key: keyof typeof errors) => attempted && errors[key];

  // Switching type starts the type-specific amounts over, like the web wizard.
  // A new rule also resets the rest; an edit keeps name, source, staff and frequency.
  const selectType = (next: CommissionRuleType) => {
    if (next === type) return;
    setType(next);
    setAttempted(false);
    setRate("");
    setRateAfterTarget("");
    setConditionTarget("");
    setTiers([EMPTY_TIER]);
    if (!isEditing) {
      setName("");
      setSource("services");
      setStaffIds([]);
      setFrequency("monthly");
    }
  };

  const toggleStaff = (id: string) =>
    setStaffIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const allSelected = staff.length > 0 && staff.every((member) => staffIds.includes(member.id));

  const buildPayload = (status: CommissionRuleStatus): CommissionRuleFormData => {
    const data: CommissionRuleFormData = {
      frequency,
      name: name.trim(),
      rate: isLadder ? ladderTotal : Number(rate),
      scope_type: "staff",
      source,
      status,
      type,
    };
    if (staffIds.length === 1) data.scope_id = staffIds[0];
    else data.scope_ids = staffIds;
    if (type === "tiered_target") data.rate_after_target = Number(rateAfterTarget);
    if (isLadder) {
      data.tiers = tiers.map((tier) => ({ reward: Number(tier.reward), target: Number(tier.target) })).sort((a, b) => a.target - b.target);
      return data;
    }
    if (conditionTarget.trim()) {
      data.condition_target = Number(conditionTarget);
      data.condition_metric = "revenue";
    }
    return data;
  };

  const persist = async (data: CommissionRuleFormData, conflictIds: string[] = []) => {
    if (conflictIds.length) await commissionRulesService.deleteRules(conflictIds);
    if (editingGroup) {
      await commissionRulesService.replace(editingGroup.rules.map((rule) => rule.id), data);
      toast.showSuccess("Commission rule updated.");
    } else {
      toast.showSuccess((await commissionRulesService.create(data)) ?? "Commission rule created.");
    }
    router.back();
  };

  const run = async (status: CommissionRuleStatus, data: CommissionRuleFormData, conflictIds?: string[]) => {
    submitting.current = true;
    setSaving(status);
    try {
      await persist(data, conflictIds);
    } catch (failure) {
      Alert.alert("Unable to save commission rule", getApiErrorMessage(failure));
    } finally {
      submitting.current = false;
      setSaving(null);
    }
  };

  const submit = (status: CommissionRuleStatus) => {
    setAttempted(true);
    if (invalid || submitting.current) return;
    const data = buildPayload(status);
    const conflicts = findKindConflicts(allRules, data, editingGroup?.rules.map((rule) => rule.id));
    if (!conflicts.length) { void run(status, data); return; }

    if (!canUseCommissionRules(user, PERMS.DELETE)) {
      Alert.alert("Existing commission rule found", "A Milestone Ladder and a regular rule can't both be active for the same staff and category. Ask an owner to remove the existing rule, or save this one as a draft.");
      return;
    }
    const names = [...new Set(conflicts.map((rule) => rule.name))].join(", ");
    Alert.alert(
      "Existing commission rule found",
      `A Milestone Ladder and a regular rule can't both be active for the same staff and ${SOURCE_META[data.source].label.toLowerCase()}. Delete the existing ${conflicts.length > 1 ? "rules" : "rule"} (${names}) to continue?`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void run(status, data, conflicts.map((rule) => rule.id)), style: "destructive", text: conflicts.length > 1 ? "Delete rules & continue" : "Delete rule & continue" },
      ],
    );
  };

  if (!allowed) {
    return <Redirect href="/team/commission-rules" />;
  }

  const amountLabel = type === "fixed" ? "Amount (Rs.)" : type === "tiered_target" ? "Commission below target (%)" : "Commission (%)";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <View style={styles.header}>
        <AppBackButton fallbackHref="/team/commission-rules" />
        <Text style={styles.headerTitle}>{isEditing ? "Edit Commission Rule" : "New Commission Rule"}</Text>
        <AppBackButtonPlaceholder />
      </View>

      {loading ? <InlineLoader label="Loading..." /> : loadError ? (
        <View style={styles.padded}><ErrorState message={loadError} onRetry={() => router.back()} /></View>
      ) : (
        <KeyboardAwareForm autoReveal contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Commission type</Text>
          <View style={styles.typeGrid}>
            {RULE_TYPE_OPTIONS.map((option) => {
              const selected = option.key === type;
              return (
                <TouchableOpacity key={option.key} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => selectType(option.key)} style={[styles.typeCard, selected && styles.typeCardActive]}>
                  <Ionicons color={selected ? Colors.primary : Colors.text2} name={option.icon} size={18} />
                  <Text style={[styles.typeLabel, selected && { color: Colors.primary }]}>{option.label}</Text>
                  <Text style={styles.hint}>{option.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Basic information</Text>
          <Field error={show("name") ? "Enter a rule name." : null} label="Rule name">
            <TextInput maxLength={120} onChangeText={setName} placeholder="e.g. Stylist services commission" placeholderTextColor={Colors.placeholder} style={[styles.input, show("name") && styles.inputError]} value={name} />
          </Field>

          <Text style={styles.label}>Applies to sales of</Text>
          <View style={styles.chipWrap}>
            {RULE_SOURCES.map((item) => (
              <Chip key={item} active={item === source} icon={SOURCE_META[item].icon} label={SOURCE_META[item].label} onPress={() => setSource(item)} />
            ))}
          </View>

          <View style={[styles.rowBetween, styles.labelRow]}>
            <Text style={styles.label}>Staff members</Text>
            {staff.length ? (
              <TouchableOpacity hitSlop={8} onPress={() => setStaffIds(allSelected ? [] : staff.map((member) => member.id))}>
                <Text style={styles.link}>{allSelected ? "Clear all" : "Select all"}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {staffLoading ? <ActivityIndicator color={Colors.primary} /> : (
            <View style={styles.chipWrap}>
              {staff.map((member) => (
                <Chip key={member.id} active={staffIds.includes(member.id)} icon={staffIds.includes(member.id) ? "checkmark-circle" : "person-outline"} label={member.name} onPress={() => toggleStaff(member.id)} />
              ))}
            </View>
          )}
          {show("staff") ? <Text style={styles.error}>Select at least one staff member.</Text> : null}

          <Text style={styles.sectionTitle}>Commission configuration</Text>
          {type === "tiered_target" ? (
            <Field error={show("conditionTarget") ? "Enter the monthly sales target." : null} label="Monthly sales target (Rs.)">
              <TextInput keyboardType="decimal-pad" onChangeText={(value) => setConditionTarget(sanitizeDecimalInput(value))} placeholder="e.g. 50000" placeholderTextColor={Colors.placeholder} style={[styles.input, show("conditionTarget") && styles.inputError]} value={conditionTarget} />
            </Field>
          ) : null}
          {!isLadder ? (
            <Field error={show("rate") ? "Enter a value greater than 0." : null} label={amountLabel}>
              <TextInput keyboardType="decimal-pad" onChangeText={(value) => setRate(sanitizeDecimalInput(value))} placeholder={type === "fixed" ? "e.g. 100" : "e.g. 10"} placeholderTextColor={Colors.placeholder} style={[styles.input, show("rate") && styles.inputError]} value={rate} />
            </Field>
          ) : null}
          {type === "tiered_target" ? (
            <Field error={show("rateAfterTarget") ? "Enter a value greater than 0." : null} label="Commission at / above target (%)">
              <TextInput keyboardType="decimal-pad" onChangeText={(value) => setRateAfterTarget(sanitizeDecimalInput(value))} placeholder="e.g. 15" placeholderTextColor={Colors.placeholder} style={[styles.input, show("rateAfterTarget") && styles.inputError]} value={rateAfterTarget} />
            </Field>
          ) : null}
          {isLadder ? (
            <View style={styles.tiers}>
              <Text style={styles.hint}>Each milestone pays its reward once when the staff member&apos;s monthly {SOURCE_META[source].label.toLowerCase()} revenue reaches the target.</Text>
              {tiers.map((tier, index) => (
                <View key={index} style={styles.tierRow}>
                  <View style={styles.tierField}>
                    <Text style={styles.hint}>Target (Rs.)</Text>
                    <TextInput keyboardType="decimal-pad" onChangeText={(value) => setTiers((current) => current.map((item, i) => (i === index ? { ...item, target: sanitizeDecimalInput(value) } : item)))} placeholder="50000" placeholderTextColor={Colors.placeholder} style={styles.input} value={tier.target} />
                  </View>
                  <View style={styles.tierField}>
                    <Text style={styles.hint}>Reward (Rs.)</Text>
                    <TextInput keyboardType="decimal-pad" onChangeText={(value) => setTiers((current) => current.map((item, i) => (i === index ? { ...item, reward: sanitizeDecimalInput(value) } : item)))} placeholder="1000" placeholderTextColor={Colors.placeholder} style={styles.input} value={tier.reward} />
                  </View>
                  <TouchableOpacity accessibilityLabel="Remove milestone" disabled={tiers.length === 1} hitSlop={8} onPress={() => setTiers((current) => current.filter((_, i) => i !== index))} style={[styles.removeTier, tiers.length === 1 && { opacity: 0.3 }]}>
                    <Ionicons color={Colors.error} name="trash-outline" size={18} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => setTiers((current) => [...current, EMPTY_TIER])} style={styles.addTier}>
                <Ionicons color={Colors.primary} name="add" size={18} />
                <Text style={styles.link}>Add milestone</Text>
              </TouchableOpacity>
              <Text style={styles.label}>Total possible reward: {formatRupees(ladderTotal)}</Text>
              {show("tiers") ? <Text style={styles.error}>Every milestone needs a target and reward above 0, and targets must be different.</Text> : null}
            </View>
          ) : null}

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.chipWrap}>
            {FREQUENCY_OPTIONS.map((item) => (
              <Chip key={item} active={item === frequency} label={FREQUENCY_LABELS[item]} onPress={() => setFrequency(item)} />
            ))}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity disabled={saving !== null} onPress={() => submit("draft")} style={[styles.secondaryButton, saving !== null && styles.disabled]}>
              {saving === "draft" ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.secondaryText}>Save as Draft</Text>}
            </TouchableOpacity>
            <TouchableOpacity disabled={saving !== null} onPress={() => submit("active")} style={[styles.primaryButton, saving !== null && styles.disabled]}>
              {saving === "active" ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Save & Activate</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAwareForm>
      )}
    </SafeAreaView>
  );
}

function Field({ children, error, label }: { children: React.ReactNode; error: string | null; label: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Chip({ active, icon, label, onPress }: { active: boolean; icon?: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {icon ? <Ionicons color={active ? "#FFFFFF" : Colors.text2} name={icon} size={14} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
    marginTop: Spacing.md,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  headerTitle: { color: Colors.heading, fontSize: 18, fontWeight: AppLayout.screenTitleFontWeight },
  padded: { paddingHorizontal: AppLayout.contentHorizontalPadding },
  content: { gap: 10, paddingBottom: Spacing.xl, paddingHorizontal: AppLayout.contentHorizontalPadding },
  sectionTitle: { color: Colors.heading, fontSize: 15, fontWeight: "800", marginTop: Spacing.sm },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeCard: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: Radius.md, borderWidth: 1, gap: 4, padding: 12, width: "48.5%" },
  typeCardActive: { backgroundColor: Colors.backgroundSelected, borderColor: Colors.primary },
  typeLabel: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
  hint: { color: Colors.text2, fontSize: 11, lineHeight: 16 },
  field: { gap: 6 },
  label: { color: Colors.heading, fontSize: 12, fontWeight: "800" },
  labelRow: { marginTop: 4 },
  input: { backgroundColor: Colors.bg2, borderColor: Colors.border, borderRadius: Radius.md, borderWidth: 1, color: Colors.heading, fontSize: 14, minHeight: 48, paddingHorizontal: 14 },
  inputError: { borderColor: Colors.error },
  error: { color: Colors.error, fontSize: 11, fontWeight: "700" },
  link: { color: Colors.primary, fontSize: 13, fontWeight: "800" },
  rowBetween: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: Radius.full, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text2, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  tiers: { gap: 10 },
  tierRow: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  tierField: { flex: 1, gap: 4 },
  removeTier: { alignItems: "center", height: 48, justifyContent: "center", width: 32 },
  addTier: { alignItems: "center", flexDirection: "row", gap: 4 },
  footer: { flexDirection: "row", gap: 10, marginTop: Spacing.md },
  secondaryButton: { alignItems: "center", borderColor: Colors.primary, borderRadius: Radius.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 50 },
  secondaryText: { color: Colors.primary, fontSize: 14, fontWeight: "800" },
  primaryButton: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: Radius.md, flex: 1, justifyContent: "center", minHeight: 50 },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
