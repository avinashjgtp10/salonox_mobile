import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import {
  CATALOG_RANGES,
  CATALOG_TAB_RANGES,
  catalogStatusLabel,
  emptyCatalogFilters,
  validateCatalogFilters,
  type CatalogFilters,
  type CatalogTab,
} from "../utils/catalogFilters";

type Props = {
  categories: string[];
  label: string;
  onApply: (value: CatalogFilters) => void;
  onClose: () => void;
  onReset: () => void;
  tab: CatalogTab;
  value: CatalogFilters;
  visible: boolean;
};

const toggle = <T,>(items: T[], item: T) => (items.includes(item) ? items.filter((value) => value !== item) : [...items, item]);

/** Controlled catalog filter panel; data fetching and list/grid rendering belong to its caller. */
export function CatalogFilterSheet({ categories, label, onApply, onClose, onReset, tab, value, visible }: Props) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setError(null);
      setCategoryOpen(false);
    }
  }, [value, visible]);

  // Selected categories stay listed even if the current rows no longer offer
  // them, so an applied filter is never silently unrepresented in the panel.
  const categoryOptions = useMemo(
    () => [...new Set([...categories, ...draft.categories])].sort((a, b) => a.localeCompare(b)),
    [categories, draft.categories],
  );

  const categorySummary = draft.categories.length === 0
    ? "All categories"
    : draft.categories.length === 1
      ? draft.categories[0]
      : `${draft.categories.length} categories selected`;

  const footer = (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.84}
        onPress={() => {
          setDraft(emptyCatalogFilters());
          setError(null);
          onReset();
          onClose();
        }}
        style={styles.resetButton}
      >
        <Text style={styles.resetText}>Clear / Reset</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.84}
        onPress={() => {
          const message = validateCatalogFilters(draft, tab);
          setError(message);
          if (!message) {
            onApply(draft);
            onClose();
          }
        }}
        style={styles.applyButton}
      >
        <Text style={styles.applyText}>Apply Filter</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <BottomSheet
      footer={footer}
      onClose={onClose}
      subtitle={`Combine filters to narrow your ${label.toLowerCase()}.`}
      title={`Filter ${label}`}
      visible={visible}
    >
      <Text style={styles.title}>Category</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Category filter, ${categorySummary}`}
        accessibilityState={{ disabled: categoryOptions.length === 0, expanded: categoryOpen }}
        activeOpacity={0.84}
        disabled={categoryOptions.length === 0}
        onPress={() => setCategoryOpen((open) => !open)}
        style={styles.dropdownTrigger}
      >
        <Text numberOfLines={1} style={[styles.dropdownValue, draft.categories.length === 0 && styles.dropdownPlaceholder]}>
          {categorySummary}
        </Text>
        <Ionicons name={categoryOpen ? "chevron-up" : "chevron-down"} size={15} color={Colors.text2} />
      </TouchableOpacity>
      {categoryOpen ? (
        <View style={styles.dropdownList}>
          {/* The sheet body scrolls too, so the option list needs nested scrolling of its own. */}
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.dropdownScroll}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => setDraft((current) => ({ ...current, categories: [] }))}
              style={styles.dropdownOption}
            >
              <Text style={[styles.dropdownOptionText, draft.categories.length === 0 && styles.dropdownOptionTextActive]}>
                All categories
              </Text>
              {draft.categories.length === 0 ? <Ionicons name="checkmark" size={18} color={Colors.primaryDark} /> : null}
            </TouchableOpacity>
            {categoryOptions.map((category) => {
              const selected = draft.categories.includes(category);
              return (
                <TouchableOpacity
                  key={category}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  activeOpacity={0.82}
                  onPress={() => setDraft((current) => ({ ...current, categories: toggle(current.categories, category) }))}
                  style={styles.dropdownOption}
                >
                  <Text numberOfLines={1} style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextActive]}>
                    {category}
                  </Text>
                  {selected ? <Ionicons name="checkmark" size={18} color={Colors.primaryDark} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <Text style={styles.hint}>
        {categoryOptions.length === 0 ? "No categories available yet." : "Select one or more. None selected means all."}
      </Text>

      <Text style={styles.title}>Status</Text>
      <View style={styles.chips}>
        {(["active", "inactive"] as const).map((status) => {
          const selected = draft.statuses.includes(status);
          return (
            <TouchableOpacity
              key={status}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              activeOpacity={0.84}
              onPress={() => setDraft((current) => ({ ...current, statuses: toggle(current.statuses, status) }))}
              style={[styles.chip, selected && styles.selected]}
            >
              <Text style={[styles.chipText, selected && styles.selectedText]}>{catalogStatusLabel(tab, status)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {CATALOG_TAB_RANGES[tab].map((key) => {
        const range = CATALOG_RANGES[key];
        const heading = `${range.label} (${range.unit})`;

        return (
          <View key={key}>
            <Text style={styles.title}>{heading}</Text>
            <View style={styles.range}>
              {([range.min, range.max] as const).map((bound, index) => (
                <View key={bound} style={styles.rangeField}>
                  <Text style={styles.hint}>{index === 0 ? "Minimum" : "Maximum"}</Text>
                  <TextInput
                    accessibilityLabel={`${heading} ${index === 0 ? "minimum" : "maximum"}`}
                    keyboardType="decimal-pad"
                    onChangeText={(text) => {
                      setDraft((current) => ({ ...current, [bound]: text }));
                      setError(null);
                    }}
                    placeholder="No limit"
                    placeholderTextColor={Colors.placeholder}
                    style={styles.input}
                    value={draft[bound]}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

// Mirrors ConsumableFilterSheet so both filter panels read as one design.
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: { color: colors.heading, fontSize: 12, fontWeight: "800", marginTop: Spacing.md, marginBottom: Spacing.sm },
    hint: { color: colors.text2, fontSize: 12, marginBottom: Spacing.sm },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    dropdownTrigger: { alignItems: "center", backgroundColor: colors.bg2, borderColor: colors.border, borderWidth: 1, borderRadius: Radius.md, flexDirection: "row", gap: Spacing.sm, justifyContent: "space-between", minHeight: 44, paddingHorizontal: 12 },
    dropdownValue: { color: colors.heading, flex: 1, fontSize: 13, fontWeight: "700" },
    dropdownPlaceholder: { color: colors.text2, fontWeight: "400" },
    dropdownList: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: Radius.md, marginTop: Spacing.sm, overflow: "hidden" },
    dropdownScroll: { maxHeight: 220 },
    dropdownOption: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: Spacing.sm, justifyContent: "space-between", minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
    dropdownOptionText: { color: colors.text2, flex: 1, fontSize: 13 },
    dropdownOptionTextActive: { color: colors.heading, fontWeight: "700" },
    chip: { backgroundColor: colors.bg2, borderColor: colors.border, borderWidth: 1, borderRadius: AppRadius.pill, paddingHorizontal: 13, paddingVertical: 8 },
    selected: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
    chipText: { color: colors.text2, fontSize: 12, fontWeight: "700" },
    selectedText: { color: "#FFFFFF" },
    range: { flexDirection: "row", gap: Spacing.md },
    rangeField: { flex: 1 },
    input: { color: colors.heading, backgroundColor: colors.bg2, borderColor: colors.border, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
    error: { color: colors.error, fontSize: 12, marginTop: Spacing.md },
    resetButton: { flex: 1, alignItems: "center", justifyContent: "center", borderColor: colors.border, borderWidth: 1, borderRadius: Radius.md, backgroundColor: colors.bg2, paddingVertical: 13 },
    applyButton: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: colors.primaryDark, paddingVertical: 13 },
    resetText: { color: colors.heading, fontSize: 13, fontWeight: "800" },
    applyText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  });
