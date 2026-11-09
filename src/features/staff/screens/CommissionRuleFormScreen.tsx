import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { createRef, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, ScrollView, TouchableOpacity, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { KeyboardInsetView } from "@/components/ui/KeyboardInsetView";
import { PearlActionFooter } from "@/components/ui/PearlActionFooter";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { StaffHeader } from "../components/StaffPearl";
import {
  CommissionButton,
  CommissionChip,
  CommissionNote,
  commissionUi as ui,
} from "../components/CommissionPearl";
import { ErrorState, InlineLoader } from "@/components/ui/StateViews";
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

import type {
  CommissionFrequency,
  CommissionRule,
  CommissionRuleFormData,
  CommissionRuleGroup,
  CommissionRuleSource,
  CommissionRuleStatus,
  CommissionRuleType,
} from "@/types/commissionRules";
import {
  canUseCommissionRules,
  COMMISSION_RULE_PERMISSIONS as PERMS,
} from "@/utils/permissions";

// Digits and a single decimal point (same rule as the staff form's amount fields).
const sanitizeDecimalInput = (text: string) => {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  return firstDot === -1
    ? cleaned
    : cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "");
};

type Tier = { reward: string; target: string };
const EMPTY_TIER: Tier = { reward: "", target: "" };
const positive = (value: string) => Number(value) > 0;

export function CommissionRuleFormScreen() {
  const insets = useSafeAreaInsets();
  const toast = useAppToast();
  const user = useAppSelector(selectCurrentUser);
  const { ruleId } = useLocalSearchParams<{ ruleId?: string }>();
  const isEditing = Boolean(ruleId);
  const allowed = canUseCommissionRules(
    user,
    isEditing ? PERMS.EDIT : PERMS.ADD,
  );
  const { loading: staffLoading, staff } = useStaffNames();

  const [allRules, setAllRules] = useState<CommissionRule[]>([]);
  const [editingGroup, setEditingGroup] = useState<CommissionRuleGroup | null>(
    null,
  );
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
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const refs = useMemo(
    () => ({
      name: createRef<TextInput>(),
      conditionTarget: createRef<TextInput>(),
      rate: createRef<TextInput>(),
      rateAfterTarget: createRef<TextInput>(),
    }),
    [],
  );
  const tierRefs = useMemo(
    () =>
      Array.from({ length: tiers.length }, () => ({
        target: createRef<TextInput>(),
        reward: createRef<TextInput>(),
      })),
    [tiers.length],
  );
  const fieldOrder = [
    refs.name,
    ...(type === "milestone_ladder"
      ? tierRefs.flatMap((tier) => [tier.target, tier.reward])
      : [
          refs.conditionTarget,
          refs.rate,
          ...(type === "tiered_target" ? [refs.rateAfterTarget] : []),
        ]),
  ];
  const navigation = {
    showAccessory: false,
    fields: fieldOrder.map((ref) => ({ ref })),
  };

  // Rules are loaded for the edit prefill and for the ladder/regular conflict check.
  useEffect(() => {
    let active = true;
    commissionRulesService
      .list()
      .then((rules) => {
        if (!active) return;
        setAllRules(rules);
        if (!ruleId) return;
        const group = groupCommissionRules(rules).find((item) =>
          item.rules.some((rule) => rule.id === ruleId),
        );
        if (!group) {
          setLoadError("This commission rule no longer exists.");
          return;
        }
        const rule = group.primary;
        setEditingGroup(group);
        setName(rule.name);
        setSource(rule.source);
        setType(rule.type === "milestone" ? "percentage" : rule.type);
        setRate(
          rule.rate != null && rule.type !== "milestone_ladder"
            ? String(rule.rate)
            : "",
        );
        setRateAfterTarget(
          rule.rate_after_target != null ? String(rule.rate_after_target) : "",
        );
        setConditionTarget(
          rule.condition_target != null ? String(rule.condition_target) : "",
        );
        setTiers(
          rule.tiers?.length
            ? rule.tiers.map((tier) => ({
                reward: String(tier.reward),
                target: String(tier.target),
              }))
            : [EMPTY_TIER],
        );
        setStaffIds(group.staffIds);
        setFrequency(rule.frequency);
      })
      .catch((failure) => {
        if (active) setLoadError(getApiErrorMessage(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ruleId]);

  const isLadder = type === "milestone_ladder";
  const tierTargets = tiers.map((tier) => Number(tier.target));
  const tierError =
    tiers.some((tier) => !positive(tier.target) || !positive(tier.reward)) ||
    new Set(tierTargets).size !== tierTargets.length;
  const ladderTotal = tiers.reduce(
    (sum, tier) => sum + (positive(tier.reward) ? Number(tier.reward) : 0),
    0,
  );
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
    setStaffIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const allSelected =
    staff.length > 0 && staff.every((member) => staffIds.includes(member.id));

  const buildPayload = (
    status: CommissionRuleStatus,
  ): CommissionRuleFormData => {
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
    if (type === "tiered_target")
      data.rate_after_target = Number(rateAfterTarget);
    if (isLadder) {
      data.tiers = tiers
        .map((tier) => ({
          reward: Number(tier.reward),
          target: Number(tier.target),
        }))
        .sort((a, b) => a.target - b.target);
      return data;
    }
    if (conditionTarget.trim()) {
      data.condition_target = Number(conditionTarget);
      data.condition_metric = "revenue";
    }
    return data;
  };

  const persist = async (
    data: CommissionRuleFormData,
    conflictIds: string[] = [],
  ) => {
    if (conflictIds.length)
      await commissionRulesService.deleteRules(conflictIds);
    if (editingGroup) {
      await commissionRulesService.replace(
        editingGroup.rules.map((rule) => rule.id),
        data,
      );
      toast.showSuccess("Commission rule updated.");
    } else {
      toast.showSuccess(
        (await commissionRulesService.create(data)) ??
          "Commission rule created.",
      );
    }
    router.back();
  };

  const run = async (
    status: CommissionRuleStatus,
    data: CommissionRuleFormData,
    conflictIds?: string[],
  ) => {
    submitting.current = true;
    setSaving(status);
    try {
      await persist(data, conflictIds);
    } catch (failure) {
      Alert.alert(
        "Unable to save commission rule",
        getApiErrorMessage(failure),
      );
    } finally {
      submitting.current = false;
      setSaving(null);
    }
  };

  const submit = (status: CommissionRuleStatus) => {
    setAttempted(true);
    if (submitting.current) return;
    if (invalid) {
      if (errors.name) refs.name.current?.focus();
      else if (errors.staff) {
        Keyboard.dismiss();
        setStaffPickerOpen(true);
      } else if (errors.conditionTarget) refs.conditionTarget.current?.focus();
      else if (errors.rate) refs.rate.current?.focus();
      else if (errors.rateAfterTarget) refs.rateAfterTarget.current?.focus();
      else if (errors.tiers) tierRefs[0]?.target.current?.focus();
      return;
    }
    const data = buildPayload(status);
    const conflicts = findKindConflicts(
      allRules,
      data,
      editingGroup?.rules.map((rule) => rule.id),
    );
    if (!conflicts.length) {
      void run(status, data);
      return;
    }

    if (!canUseCommissionRules(user, PERMS.DELETE)) {
      Alert.alert(
        "Existing commission rule found",
        "A Milestone Ladder and a regular rule can't both be active for the same staff and category. Ask an owner to remove the existing rule, or save this one as a draft.",
      );
      return;
    }
    const names = [...new Set(conflicts.map((rule) => rule.name))].join(", ");
    Alert.alert(
      "Existing commission rule found",
      `A Milestone Ladder and a regular rule can't both be active for the same staff and ${SOURCE_META[data.source].label.toLowerCase()}. Delete the existing ${conflicts.length > 1 ? "rules" : "rule"} (${names}) to continue?`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () =>
            void run(
              status,
              data,
              conflicts.map((rule) => rule.id),
            ),
          style: "destructive",
          text:
            conflicts.length > 1
              ? "Delete rules & continue"
              : "Delete rule & continue",
        },
      ],
    );
  };

  const periodWord = frequency === "daily" ? "Daily" : "Monthly";
  const goBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace("/team/commission-rules");
  };
  const input = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    ref: React.RefObject<TextInput | null>,
    options: {
      error?: boolean;
      placeholder?: string;
      text?: boolean;
      suffix?: string;
    } = {},
  ) => {
    const next = fieldOrder[fieldOrder.indexOf(ref) + 1];
    return (
      <View style={ui.fieldGroup}>
        <Text style={ui.label}>{label}</Text>
        <View style={[ui.input, ui.row, options.error && ui.inputError]}>
          <TextInput
            ref={ref}
            accessibilityLabel={label.replace(" *", "")}
            editable={saving === null}
            value={value}
            onChangeText={(text) =>
              onChange(options.text ? text : sanitizeDecimalInput(text))
            }
            placeholder={options.placeholder}
            placeholderTextColor={pearl.placeholder}
            keyboardType={options.text ? "default" : "decimal-pad"}
            returnKeyType={next ? "next" : "done"}
            submitBehavior="submit"
            onSubmitEditing={() =>
              next ? next.current?.focus() : Keyboard.dismiss()
            }
            style={{
              flex: 1,
              color: pearl.ink,
              minHeight: 48,
              backgroundColor: "transparent",
              fontSize: 14,
            }}
          />
          {options.suffix && <Text style={ui.muted}>{options.suffix}</Text>}
        </View>
        {options.error && (
          <Text style={ui.error}>
            {options.text
              ? "Enter a rule name."
              : "Enter a value greater than 0."}
          </Text>
        )}
      </View>
    );
  };
  const preview =
    type === "milestone_ladder"
      ? "Maximum bonus in a month: " + formatRupees(ladderTotal)
      : type === "tiered_target"
        ? (rate || "0") +
          "% until the target, then " +
          (rateAfterTarget || "0") +
          "% at " +
          formatRupees(Number(conditionTarget) || 0) +
          " / " +
          (frequency === "daily" ? "day" : "month")
        : positive(rate)
          ? "Example: staff earn " +
            formatRupees(type === "fixed" ? Number(rate) : Number(rate) * 10) +
            " on a " +
            formatRupees(1000) +
            " sale" +
            (positive(conditionTarget)
              ? " once " +
                periodWord.toLowerCase() +
                " revenue reaches " +
                formatRupees(Number(conditionTarget)) +
                "."
              : ".")
          : "Example: enter a commission to preview what staff earn on a " +
            formatRupees(1000) +
            " sale.";
  if (!allowed) return <Redirect href="/team/commission-rules" />;
  return (
    <PearlBackground>
      <SafeAreaView edges={["top"]} style={ui.screen}>
        <AppStatusBar />
        <KeyboardInsetView bottomOffset={insets.bottom}>
          <KeyboardAwareScrollView
            pearlStyle
            padForKeyboard={false}
            extraScrollPadding={48}
            keyboardNavigation={navigation}
            contentContainerStyle={[ui.content, { paddingBottom: 24 }]}
          >
            <StaffHeader
              centered
              title={isEditing ? "Edit rule" : "New rule"}
              onBack={goBack}
            />
            {loading ? (
              <InlineLoader label="Loading..." />
            ) : loadError ? (
              <ErrorState message={loadError} onRetry={() => router.back()} />
            ) : (
              <>
                <View style={[ui.card, ui.formCard]}>
                  <Text style={ui.sectionTitle}>Type</Text>
                  {RULE_TYPE_OPTIONS.map((option) => {
                    const selected = option.key === type;
                    const title =
                      option.key === "fixed"
                        ? "Fixed amount"
                        : option.key === "tiered_target"
                          ? periodWord + " target"
                          : option.key === "milestone_ladder"
                            ? "Milestone ladder"
                            : "Percentage";
                    const subtitle =
                      option.key === "percentage"
                        ? "A % of each sale"
                        : option.key === "fixed"
                          ? "Same amount per sale"
                          : option.key === "tiered_target"
                            ? "Higher % once the " +
                              periodWord.toLowerCase() +
                              " target is hit"
                            : "Stacking bonuses at revenue milestones";
                    return (
                      <TouchableOpacity
                        key={option.key}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        disabled={saving !== null}
                        onPress={() => selectType(option.key)}
                        style={[
                          ui.input,
                          ui.row,
                          {
                            padding: 14,
                            borderRadius: 18,
                            borderWidth: 1.5,
                            backgroundColor: "rgba(255,255,255,0.55)",
                          },
                          selected && {
                            backgroundColor: "rgba(255,255,255,0.85)",
                            borderColor: pearl.accent,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            selected ? "radio-button-on" : "radio-button-off"
                          }
                          color={selected ? pearl.accentDeep : pearl.muted}
                          size={20}
                        />
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text style={ui.title}>{title}</Text>
                          <Text style={ui.muted}>{subtitle}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={[ui.card, ui.formCard]}>
                  <Text style={ui.sectionTitle}>Details</Text>
                  {input("Rule name *", name, setName, refs.name, {
                    text: true,
                    placeholder: "e.g. Stylist 10% on services",
                    error: show("name"),
                  })}
                  <View style={ui.fieldGroup}>
                    <Text style={ui.label}>Applies to</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={ui.chips}
                    >
                      {RULE_SOURCES.map((sourceOption) => (
                        <CommissionChip
                          key={sourceOption}
                          selected={source === sourceOption}
                          label={SOURCE_META[sourceOption].label}
                          onPress={() => {
                            if (!saving) setSource(sourceOption);
                          }}
                        />
                      ))}
                    </ScrollView>
                  </View>
                  <View style={ui.fieldGroup}>
                    <Text style={ui.label}>Staff *</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Choose staff"
                      disabled={staffLoading || saving !== null}
                      onPress={() => {
                        Keyboard.dismiss();
                        setStaffPickerOpen(true);
                      }}
                      style={[
                        ui.input,
                        ui.between,
                        show("staff") && ui.inputError,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          ui.label,
                          {
                            flex: 1,
                            color: staffIds.length ? pearl.ink : pearl.muted,
                          },
                        ]}
                      >
                        {staffLoading
                          ? "Loading staff..."
                          : !staffIds.length
                            ? "Choose staff"
                            : allSelected
                              ? "All staff (" + staff.length + ")"
                              : staffIds
                                  .map(
                                    (id) =>
                                      staff.find((member) => member.id === id)
                                        ?.name ?? "Staff member",
                                  )
                                  .join(", ")}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        color={pearl.muted}
                        size={16}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={staffLoading || saving !== null}
                      onPress={() =>
                        setStaffIds(
                          allSelected ? [] : staff.map((member) => member.id),
                        )
                      }
                    >
                      <Text
                        style={{
                          color: pearl.accentDeep,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        {allSelected ? "Clear all" : "Select all"}
                      </Text>
                    </TouchableOpacity>
                    {show("staff") && (
                      <Text style={ui.error}>
                        Select at least one staff member.
                      </Text>
                    )}
                  </View>
                  <View style={ui.fieldGroup}>
                    <Text style={ui.label}>Frequency</Text>
                    <View style={ui.chips}>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <CommissionChip
                          key={option}
                          selected={frequency === option}
                          label={FREQUENCY_LABELS[option]}
                          onPress={() => {
                            if (!saving) setFrequency(option);
                          }}
                        />
                      ))}
                    </View>
                  </View>
                  {(type === "percentage" || type === "fixed") && (
                    <>
                      {input(
                        "Condition (optional)",
                        conditionTarget,
                        setConditionTarget,
                        refs.conditionTarget,
                        {
                          placeholder: periodWord + " revenue needed",
                          suffix: "₹",
                        },
                      )}
                      <Text style={ui.muted}>Leave blank to always apply.</Text>
                    </>
                  )}
                  {type === "tiered_target" &&
                    input(
                      periodWord + " sales target *",
                      conditionTarget,
                      setConditionTarget,
                      refs.conditionTarget,
                      {
                        placeholder: "e.g. 100000",
                        suffix: "₹",
                        error: show("conditionTarget"),
                      },
                    )}
                  {!isLadder &&
                    input(
                      type === "fixed"
                        ? "Amount *"
                        : type === "tiered_target"
                          ? "Commission below target *"
                          : "Commission *",
                      rate,
                      setRate,
                      refs.rate,
                      {
                        placeholder: type === "fixed" ? "e.g. 100" : "e.g. 10",
                        suffix: type === "fixed" ? "₹" : "%",
                        error: show("rate"),
                      },
                    )}
                  {type === "tiered_target" &&
                    input(
                      "Commission at/above target *",
                      rateAfterTarget,
                      setRateAfterTarget,
                      refs.rateAfterTarget,
                      {
                        placeholder: "e.g. 15",
                        suffix: "%",
                        error: show("rateAfterTarget"),
                      },
                    )}
                  {isLadder && (
                    <View style={{ gap: 14 }}>
                      {tiers.map((tier, index) => (
                        <View key={index} style={{ gap: 10 }}>
                          <View style={ui.between}>
                            <Text style={ui.label}>Milestone {index + 1}</Text>
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel="Remove milestone"
                              disabled={tiers.length === 1 || saving !== null}
                              onPress={() =>
                                setTiers((current) =>
                                  current.filter((_, i) => i !== index),
                                )
                              }
                              style={{
                                opacity: tiers.length === 1 ? 0.3 : 1,
                                padding: 6,
                              }}
                            >
                              <Ionicons
                                name="trash-outline"
                                color={pearl.dangerText}
                                size={18}
                              />
                            </TouchableOpacity>
                          </View>
                          {input(
                            "Monthly revenue *",
                            tier.target,
                            (value) =>
                              setTiers((current) =>
                                current.map((item, i) =>
                                  i === index
                                    ? { ...item, target: value }
                                    : item,
                                ),
                              ),
                            tierRefs[index].target,
                            {
                              placeholder: "e.g. 50000",
                              suffix: "₹",
                              error: show("tiers") && !positive(tier.target),
                            },
                          )}
                          {input(
                            "Bonus *",
                            tier.reward,
                            (value) =>
                              setTiers((current) =>
                                current.map((item, i) =>
                                  i === index
                                    ? { ...item, reward: value }
                                    : item,
                                ),
                              ),
                            tierRefs[index].reward,
                            {
                              placeholder: "e.g. 1000",
                              suffix: "₹",
                              error: show("tiers") && !positive(tier.reward),
                            },
                          )}
                        </View>
                      ))}
                      <CommissionButton
                        secondary
                        compact
                        icon="add"
                        label="Add milestone"
                        disabled={saving !== null}
                        onPress={() =>
                          setTiers((current) => [...current, EMPTY_TIER])
                        }
                      />
                      {show("tiers") && (
                        <Text style={ui.error}>
                          Every milestone needs a revenue amount and a bonus
                          above 0, and revenue amounts must be different.
                        </Text>
                      )}
                      <Text style={ui.muted}>
                        Each time the staff member&apos;s revenue for the month
                        reaches a milestone, its bonus is earned once. Bonuses
                        add up, so reaching a higher milestone includes all the
                        lower ones.
                      </Text>
                    </View>
                  )}
                </View>
                <CommissionNote>{preview}</CommissionNote>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={saving !== null}
                  onPress={() => submit("draft")}
                  style={{ alignItems: "center", padding: 12 }}
                >
                  <Text
                    style={{
                      color: pearl.accentDeep,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {saving === "draft" ? "Saving..." : "Save Draft"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </KeyboardAwareScrollView>
          {!loading && !loadError && (
            <PearlActionFooter bottomInset={insets.bottom}>
              <CommissionButton
                secondary
                label="Cancel"
                disabled={saving !== null}
                onPress={goBack}
              />
              <View style={{ flex: 1 }}>
                <CommissionButton
                  label={saving === "active" ? "Saving..." : "Save rule"}
                  disabled={saving !== null}
                  onPress={() => submit("active")}
                />
              </View>
            </PearlActionFooter>
          )}
        </KeyboardInsetView>
        <BottomSheet
          pearlStyle
          centered={false}
          avoidKeyboard
          title="Choose staff"
          visible={staffPickerOpen}
          onClose={() => setStaffPickerOpen(false)}
          footer={
            <CommissionButton
              label="Done"
              onPress={() => setStaffPickerOpen(false)}
            />
          }
        >
          <View style={{ gap: 12 }}>
            <TextInput
              accessibilityLabel="Search staff"
              placeholder="Search staff"
              placeholderTextColor={pearl.placeholder}
              value={staffSearch}
              onChangeText={setStaffSearch}
              style={ui.input}
            />
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected }}
              onPress={() =>
                setStaffIds(allSelected ? [] : staff.map((member) => member.id))
              }
              style={[ui.between, { paddingVertical: 10 }]}
            >
              <Text style={ui.title}>All staff ({staff.length})</Text>
              <Ionicons
                name={allSelected ? "checkbox" : "square-outline"}
                color={pearl.accentDeep}
                size={22}
              />
            </TouchableOpacity>
            {staff
              .filter((member) =>
                member.name
                  .toLowerCase()
                  .includes(staffSearch.trim().toLowerCase()),
              )
              .map((member) => (
                <TouchableOpacity
                  key={member.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: staffIds.includes(member.id) }}
                  onPress={() => toggleStaff(member.id)}
                  style={[ui.between, { paddingVertical: 10 }]}
                >
                  <Text style={ui.title}>{member.name}</Text>
                  <Ionicons
                    name={
                      staffIds.includes(member.id)
                        ? "checkbox"
                        : "square-outline"
                    }
                    color={pearl.accentDeep}
                    size={22}
                  />
                </TouchableOpacity>
              ))}
            {!staff.length && (
              <Text style={ui.muted}>No active staff available.</Text>
            )}
          </View>
        </BottomSheet>
      </SafeAreaView>
    </PearlBackground>
  );
}
