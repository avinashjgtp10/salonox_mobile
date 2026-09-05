import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export function SelectField({
  error,
  label,
  options,
  value,
  onSelect,
}: {
  error?: string;
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onSelect: (value: string) => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <TouchableOpacity
                key={`${label}-${option.value}`}
                activeOpacity={0.82}
                onPress={() => onSelect(option.value)}
                style={[styles.optionChip, selected && styles.optionChipActive]}
              >
                <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}
