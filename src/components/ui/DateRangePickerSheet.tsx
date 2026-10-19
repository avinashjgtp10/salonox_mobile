import { Text } from "@/components/ui/AppTypography";
import { memo, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { DateRangeCalendar, toISODate } from "@/components/ui/DateRangeCalendar";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatAppDate } from "@/utils/dateTime";
import { DATE_RANGE_PRESETS, getDateRangePreset } from "@/utils/dateRangePresets";

export const DateRangePickerSheet = memo(function DateRangePickerSheet({
  endDate,
  mode = "range",
  onApply,
  onClose,
  startDate,
  visible,
  minimumDate,
  maximumDate,
  title,
  allowAllTime = false,
}: {
  endDate: string | null;
  mode?: "range" | "single";
  onApply: (startDate: string | null, endDate: string | null) => void;
  onClose: () => void;
  startDate: string | null;
  visible: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
  allowAllTime?: boolean;
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
  const inBounds = (date: string | null) => !!date && (!minimumDate || date >= toISODate(minimumDate)) && (!maximumDate || date <= toISODate(maximumDate));
  const canApply = (allowAllTime && isRange && !draftStart && !draftEnd) || (inBounds(draftStart) && (!isRange || (inBounds(draftEnd) && !!draftEnd && !!draftStart && draftEnd >= draftStart)));

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
        <Text style={styles.primaryButtonText}>{isRange ? "Apply range" : "Apply date"}</Text>
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
      title={title ?? (isRange ? "Select date range" : "Select date")}
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
            {DATE_RANGE_PRESETS.map((preset) => {
              const range = getDateRangePreset(preset.key);
              const start = minimumDate && range.startDate < toISODate(minimumDate) ? toISODate(minimumDate) : range.startDate;
              const end = maximumDate && range.endDate > toISODate(maximumDate) ? toISODate(maximumDate) : range.endDate;
              const selected = draftStart === start && draftEnd === end;
              return <Pressable key={preset.key} accessibilityRole="button" accessibilityState={{selected, disabled: start > end}}
                disabled={start > end} onPress={() => { setDraftStart(start); setDraftEnd(end); }}
                style={[styles.preset, selected && styles.selectedPreset, start > end && { opacity: 0.3 }]}>
                <Text style={[styles.presetText, selected && styles.selectedPresetText]}>{preset.label}</Text>
              </Pressable>;
            })}
            {allowAllTime && <Pressable accessibilityRole="button" accessibilityState={{ selected: !draftStart && !draftEnd }} onPress={() => { setDraftStart(null); setDraftEnd(null); }} style={[styles.preset, !draftStart && !draftEnd && styles.selectedPreset]}><Text style={[styles.presetText, !draftStart && !draftEnd && styles.selectedPresetText]}>All time</Text></Pressable>}
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
          minimumDate={minimumDate}
          maximumDate={maximumDate}
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
  selectedPreset: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  selectedPresetText: { color: Colors.onPrimary },
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
  primaryButtonText: { color: Colors.onPrimary, fontSize: 13, fontWeight: "800" },
});
