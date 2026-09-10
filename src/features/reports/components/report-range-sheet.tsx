import { memo, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { DateRangeCalendar, toISODate } from "@/features/reports/components/date-range-calendar";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatAppDate } from "@/utils/dateTime";

const shiftDays = (days: number) => {
  const value = new Date();

  value.setDate(value.getDate() + days);

  return toISODate(value);
};

const PRESETS: { end: () => string; label: string; start: () => string }[] = [
  { end: () => toISODate(new Date()), label: "Today", start: () => toISODate(new Date()) },
  { end: () => toISODate(new Date()), label: "Last 7 days", start: () => shiftDays(-6) },
  { end: () => toISODate(new Date()), label: "Last 30 days", start: () => shiftDays(-29) },
  {
    end: () => toISODate(new Date()),
    label: "This month",
    start: () => {
      const now = new Date();

      return toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    },
  },
];

export const ReportRangeSheet = memo(function ReportRangeSheet({
  endDate,
  mode,
  onApply,
  onClose,
  startDate,
  visible,
}: {
  endDate: string | null;
  mode: "range" | "single";
  onApply: (startDate: string | null, endDate: string | null) => void;
  onClose: () => void;
  startDate: string | null;
  visible: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  useEffect(() => {
    if (visible) {
      setDraftStart(startDate);
      setDraftEnd(endDate);
    }
  }, [endDate, startDate, visible]);

  const isRange = mode === "range";
  // An open range (start picked, end still pending) is not applicable yet —
  // otherwise the report would silently query a single day.
  const canApply = Boolean(draftStart) && (!isRange || Boolean(draftEnd));

  const footer = (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setDraftStart(null);
          setDraftEnd(null);
        }}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>Clear</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={!canApply}
        onPress={() => onApply(draftStart, draftEnd)}
        style={[styles.primaryButton, !canApply && styles.buttonDisabled]}
      >
        <Text style={styles.primaryButtonText}>Apply range</Text>
      </Pressable>
    </>
  );

  return (
    <BottomSheet
      footer={footer}
      onClose={onClose}
      scrollable
      subtitle={
        isRange
          ? "Tap a start date, then an end date. Use the arrows to cross months."
          : "Tap the day to report on."
      }
      title={isRange ? "Report range" : "Report date"}
      visible={visible}
    >
      <View style={styles.body}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{isRange ? "FROM" : "DATE"}</Text>
            <Text style={styles.summaryValue}>
              {draftStart ? formatAppDate(draftStart, draftStart) : "Not set"}
            </Text>
          </View>
          {isRange ? (
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>TO</Text>
              <Text style={styles.summaryValue}>
                {draftEnd ? formatAppDate(draftEnd, draftEnd) : "Not set"}
              </Text>
            </View>
          ) : null}
        </View>

        {isRange ? (
          <View style={styles.presets}>
            {PRESETS.map((preset) => (
              <Pressable
                accessibilityRole="button"
                key={preset.label}
                onPress={() => {
                  setDraftStart(preset.start());
                  setDraftEnd(preset.end());
                }}
                style={styles.preset}
              >
                <Text style={styles.presetText}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <DateRangeCalendar
          endDate={draftEnd}
          mode={mode}
          onChange={(nextStart, nextEnd) => {
            setDraftStart(nextStart);
            setDraftEnd(nextEnd);
          }}
          startDate={draftStart}
        />
      </View>
    </BottomSheet>
  );
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  body: { gap: Spacing.lg },
  summaryRow: { flexDirection: "row", gap: Spacing.sm },
  summaryCell: {
    backgroundColor: Colors.backgroundElement,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  summaryLabel: { color: Colors.text2, fontSize: 10, fontWeight: "800" },
  summaryValue: { color: Colors.heading, fontSize: 13, fontWeight: "700" },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  preset: {
    backgroundColor: Colors.backgroundElement,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  presetText: { color: Colors.text, fontSize: 12, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  secondaryButtonText: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    flex: 1.4,
    justifyContent: "center",
    minHeight: 50,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
