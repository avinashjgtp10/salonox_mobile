import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

export function SearchableFilterDropdown({
  multi,
  onToggle,
  options,
  placeholder,
  selected,
}: {
  multi: boolean;
  onToggle: (id: string) => void;
  options: string[];
  placeholder: string;
  selected: string[];
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const matchingOptions = options.filter((option) => option.toLowerCase().includes(search.trim().toLowerCase()));
  const summary = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: options.length === 0, expanded: open }}
        activeOpacity={0.84}
        disabled={options.length === 0}
        onPress={() => { setOpen((current) => !current); setSearch(""); }}
        style={styles.dropdownTrigger}
      >
        <Text numberOfLines={1} style={[styles.dropdownValue, selected.length === 0 && styles.dropdownPlaceholder]}>
          {summary}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={Colors.text2} />
      </TouchableOpacity>
      {open ? (
        <View style={styles.dropdownList}>
          <TextInput accessibilityLabel={`Search ${placeholder.toLowerCase()}`} placeholder="Search options" placeholderTextColor={Colors.placeholder} value={search} onChangeText={setSearch} style={styles.dropdownSearch} />
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.dropdownScroll}>
            {multi ? (
              <TouchableOpacity accessibilityRole="button" activeOpacity={0.82} onPress={() => selected.forEach((id) => onToggle(id))} style={styles.dropdownOption}>
                <Text style={[styles.dropdownOptionText, selected.length === 0 && styles.dropdownOptionTextActive]}>{placeholder}</Text>
                {selected.length === 0 ? <Ionicons name="checkmark" size={18} color={Colors.primaryDark} /> : null}
              </TouchableOpacity>
            ) : null}
            {matchingOptions.length === 0 ? <Text style={styles.hint}>No matching options</Text> : null}
            {matchingOptions.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  accessibilityRole={multi ? "checkbox" : "radio"}
                  accessibilityState={{ checked: isSelected }}
                  activeOpacity={0.82}
                  onPress={() => { onToggle(option); if (!multi) { setOpen(false); Keyboard.dismiss(); } }}
                  style={styles.dropdownOption}
                >
                  <Text numberOfLines={1} style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
                    {option}
                  </Text>
                  {isSelected ? <Ionicons name="checkmark" size={18} color={Colors.primaryDark} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    hint: { color: colors.text2, fontSize: 12, marginBottom: Spacing.sm },
    dropdownTrigger: { alignItems: "center", backgroundColor: colors.bg2, borderColor: colors.border, borderWidth: 1, borderRadius: Radius.md, flexDirection: "row", gap: Spacing.sm, justifyContent: "space-between", minHeight: 44, paddingHorizontal: 12 },
    dropdownValue: { color: colors.heading, flex: 1, fontSize: 13, fontWeight: "700" },
    dropdownPlaceholder: { color: colors.text2, fontWeight: "400" },
    dropdownList: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: Radius.md, marginTop: Spacing.sm, overflow: "hidden" },
    dropdownScroll: { maxHeight: 220 },
    dropdownSearch: { color: colors.text, minHeight: 44, paddingHorizontal: 12, borderBottomColor: colors.border, borderBottomWidth: 1 },
    dropdownOption: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: Spacing.sm, justifyContent: "space-between", minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
    dropdownOptionText: { color: colors.text2, flex: 1, fontSize: 13 },
    dropdownOptionTextActive: { color: colors.heading, fontWeight: "700" },
});
