import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import type { ReportFilterKey, ReportFilters } from "@/features/reports/report-config";
import { useThemeColors } from "@/theme/ThemeProvider";

type Option = { label: string; value: string };

const DATE_KEYS: ReportFilterKey[] = ["start_date", "end_date", "date", "from", "to"];
const OPTIONS: Partial<Record<ReportFilterKey, Option[]>> = {
  status: ["completed", "cancelled", "refunded", "draft"].map((value) => ({ label: value, value })),
  statuses: ["scheduled", "confirmed", "completed", "cancelled", "no_show"].map((value) => ({ label: value, value })),
  period: ["daily", "weekly", "monthly", "yearly"].map((value) => ({ label: value, value })),
  item_type: ["service", "product", "membership", "package"].map((value) => ({ label: value, value })),
  report_type: ["successful", "failed", "blocked"].map((value) => ({ label: value, value })),
};
const LABELS: Partial<Record<ReportFilterKey, string>> = {
  start_date: "Start date", end_date: "End date", date: "Date", from: "From", to: "To",
  staff_id: "Staff ID", status: "Status", statuses: "Appointment status",
  category_id: "Category ID", service_id: "Service ID", product_id: "Product ID",
  period: "Period", item_type: "Item type", campaign_id: "Campaign",
  report_type: "Report type",
};

const titleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const ReportFilterSheet = memo(function ReportFilterSheet({
  campaignOptions = [],
  filters,
  onApply,
  onClose,
  onReset,
  supportedFilters,
  visible,
}: {
  campaignOptions?: Option[];
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClose: () => void;
  onReset: () => void;
  supportedFilters: ReportFilterKey[];
  visible: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [draft, setDraft] = useState(filters);
  const [activeDateKey, setActiveDateKey] = useState<ReportFilterKey | null>(null);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [filters, visible]);

  const update = useCallback((key: ReportFilterKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value, page: 1 }));
  }, []);
  const visibleFilters = supportedFilters.filter((key) =>
    key !== "search" && key !== "branch_id");

  const footer = (
    <>
      <TouchableOpacity accessibilityRole="button" onPress={onReset} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Reset</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => onApply(draft)}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Apply filters</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <BottomSheet
      footer={footer}
      onClose={onClose}
      subtitle="Only filters supported by this report are shown."
      title="Filters"
      visible={visible}
    >
      <View style={styles.fields}>
        {visibleFilters.map((key) => {
          if (DATE_KEYS.includes(key)) {
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{LABELS[key]}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveDateKey(key)}
                  style={styles.control}
                >
                  <Ionicons name="calendar-outline" size={17} color={Colors.text2} />
                  <Text style={styles.controlText}>{draft[key] || "Select date"}</Text>
                </Pressable>
              </View>
            );
          }

          const options = key === "campaign_id" ? campaignOptions : OPTIONS[key];
          if (options?.length) {
            return (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{LABELS[key]}</Text>
                <View style={styles.chips}>
                  {options.map((option) => {
                    const selected = draft[key] === option.value;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={option.value}
                        onPress={() => update(key, selected ? "" : option.value)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {titleCase(option.label)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          }

          return (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{LABELS[key] ?? titleCase(key)}</Text>
              <TextInput
                accessibilityLabel={LABELS[key] ?? titleCase(key)}
                autoCapitalize="none"
                onChangeText={(value) => update(key, value.trim())}
                placeholder={`Enter ${(LABELS[key] ?? titleCase(key)).toLowerCase()}`}
                placeholderTextColor={Colors.placeholder}
                style={styles.input}
                value={draft[key] ?? ""}
              />
            </View>
          );
        })}
      </View>

      {activeDateKey ? (
        <DateTimePicker
          display="default"
          mode="date"
          onChange={(_event, value) => {
            if (value) update(activeDateKey, value.toISOString().slice(0, 10));
            setActiveDateKey(null);
          }}
          value={new Date(`${draft[activeDateKey] ?? new Date().toISOString().slice(0, 10)}T12:00:00`)}
        />
      ) : null}
    </BottomSheet>
  );
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  fields: { gap: Spacing.lg },
  field: { gap: Spacing.sm },
  label: { color: Colors.heading, fontSize: 12, fontWeight: "800" },
  control: {
    alignItems: "center", backgroundColor: Colors.backgroundElement,
    borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1,
    flexDirection: "row", gap: Spacing.sm, minHeight: 50, paddingHorizontal: Spacing.md,
  },
  controlText: { color: Colors.text, flex: 1, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: Colors.backgroundElement, borderColor: Colors.border,
    borderRadius: AppRadius.control, borderWidth: 1, color: Colors.heading,
    fontSize: 13, minHeight: 50, paddingHorizontal: Spacing.md,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    backgroundColor: Colors.backgroundElement, borderColor: Colors.border,
    borderRadius: AppRadius.pill, borderWidth: 1, justifyContent: "center",
    minHeight: 44, paddingHorizontal: Spacing.lg,
  },
  chipSelected: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  chipText: { color: Colors.text, fontSize: 12, fontWeight: "700" },
  chipTextSelected: { color: "#FFFFFF" },
  secondaryButton: {
    alignItems: "center", borderColor: Colors.border, borderRadius: AppRadius.pill,
    borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 50,
  },
  secondaryButtonText: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
  primaryButton: {
    alignItems: "center", backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill, flex: 1.4, justifyContent: "center", minHeight: 50,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
