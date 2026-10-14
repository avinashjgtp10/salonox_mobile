import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { DateRangePickerSheet } from "./DateRangePickerSheet";
import { useThemeColors } from "@/theme/ThemeProvider";
import { dateRangeLabel } from "@/utils/dateRangePresets";

export function DateRangeField({ startDate, endDate, onChange, onClear, label = "Date range", disabled = false, maximumDate, minimumDate }: {
  startDate: string | null; endDate: string | null;
  onChange: (start: string, end: string) => void;
  label?: string; disabled?: boolean; maximumDate?: Date; minimumDate?: Date;
  onClear?: () => void;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 14, gap: 8 }}>
      <Text style={{ color: colors.text2, fontSize: 12, fontWeight: "700" }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()}`} disabled={disabled}
        onPress={() => setOpen(true)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, minHeight: 48, backgroundColor: colors.card, opacity: disabled ? 0.5 : 1 }}>
        <Text style={{ color: colors.heading }}>{startDate && endDate ? dateRangeLabel(startDate, endDate) : onClear ? "All time" : "Choose start and end dates"}</Text>
      </Pressable>
      {onClear && (startDate || endDate) && <Pressable disabled={disabled} accessibilityRole="button" onPress={onClear}><Text style={{ color: colors.primary, fontSize: 12 }}>Clear dates</Text></Pressable>}
      <DateRangePickerSheet visible={open} title={label} startDate={startDate} endDate={endDate} maximumDate={maximumDate} minimumDate={minimumDate}
        onClose={() => setOpen(false)} onApply={(start, end) => { if (start && end) { onChange(start, end); setOpen(false); } }} />
    </View>
  );
}
