import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/constants/theme";

export type FilterOption = { id: string; label: string; disabled?: boolean };
export type FilterSelection = Record<string, string[]>;
export type FilterField = {
  key: string;
  label: string;
  options: FilterOption[];
  searchable?: boolean;
  single?: boolean;
  dependsOn?: string;
  optionsFor?: (parentIds: string[], ownIds: string[]) => FilterOption[];
  render?: (value: string[], onChange: (value: string[]) => void) => ReactNode;
};

export function FilterSheet({ fields, selected, visible, onClose, onApply, loading, error, onRetry, validate }: {
  fields: FilterField[];
  selected: FilterSelection;
  visible: boolean;
  onClose: () => void;
  onApply: (value: FilterSelection) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  validate?: (value: FilterSelection) => string | null;
}) {
  const colors = useThemeColors();
  const { height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [draft, setDraft] = useState<FilterSelection>({});
  const [activeKey, setActiveKey] = useState("");
  const [search, setSearch] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (visible && !wasOpen.current) {
      setDraft(Object.fromEntries(Object.entries(selected).map(([key, values]) => [key, [...values]])));
      setSearch({});
      setValidationError(null);
      setActiveKey(fields[0]?.key ?? "");
    }
    wasOpen.current = visible;
  }, [visible, selected, fields]);

  const active = fields.find((field) => field.key === activeKey) ?? fields[0];
  const values = active ? draft[active.key] ?? [] : [];
  const parent = active?.dependsOn ? draft[active.dependsOn] ?? [] : [];
  const options = active?.optionsFor && parent.length ? active.optionsFor(parent, values) : active?.options ?? [];
  const query = active ? search[active.key] ?? "" : "";
  const filtered = options.filter((option) => !active?.searchable || option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const update = (next: string[]) => {
    if (active) setDraft((current) => ({ ...current, [active.key]: next }));
    setValidationError(null);
  };
  const commit = (next: FilterSelection) => {
    const message = validate?.(next);
    setValidationError(message ?? null);
    if (message) return;
    onApply(next);
    onClose();
  };

  return (
    <BottomSheet centered visible={visible} onClose={onClose} title="Filters" scrollable={false} footer={
      <>
        <TouchableOpacity accessibilityRole="button" style={styles.clearButton} onPress={() => commit({})}>
          <Text style={styles.clearText}>Clear all</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.applyButton} onPress={() => commit(draft)}>
          <Text style={styles.applyText}>Apply filters</Text>
        </TouchableOpacity>
      </>
    }>
      {loading ? <ActivityIndicator color={colors.primary} accessibilityLabel="Loading filter options" /> : null}
      {error ? <View style={styles.notice}><Text style={styles.error}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={onRetry}><Text style={styles.clearText}>Retry</Text></TouchableOpacity></View> : null}
      {validationError ? <Text accessibilityRole="alert" style={styles.error}>{validationError}</Text> : null}
      <View style={[styles.body, { height: Math.min(350, height * 0.48) }]}>
        {fields.length > 1 ? <ScrollView style={styles.names} keyboardShouldPersistTaps="handled">
          {fields.map((field) => <TouchableOpacity key={field.key} accessibilityRole="tab" accessibilityState={{ selected: active?.key === field.key }} onPress={() => setActiveKey(field.key)} style={[styles.name, active?.key === field.key && styles.active]}>
            <Text style={styles.label}>{field.label}</Text>
            {draft[field.key]?.length ? <Text style={styles.count}>{draft[field.key].length}</Text> : null}
          </TouchableOpacity>)}
        </ScrollView> : null}
        <View style={styles.options}>
          <Text style={styles.heading}>{active?.label ?? "No filters available"}</Text>
          {active?.searchable && !active.render ? <TextInput accessibilityLabel={`Search ${active.label}`} placeholder={`Search ${active.label.toLowerCase()}`} placeholderTextColor={colors.placeholder} value={query} onChangeText={(value) => setSearch((current) => ({ ...current, [active.key]: value }))} style={styles.input} /> : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.optionContent}>
            {active?.render ? active.render(values, update) : filtered.length ? filtered.map((option) => {
              const checked = values.includes(option.id);
              return <TouchableOpacity key={option.id} accessibilityRole={active?.single ? "radio" : "checkbox"} accessibilityState={{ checked, disabled: option.disabled }} disabled={option.disabled} style={[styles.option, option.disabled && styles.disabled]} onPress={() => update(checked ? values.filter((id) => id !== option.id) : active?.single ? [option.id] : [...values, option.id])}>
                <Ionicons name={checked ? "checkbox" : "square-outline"} size={21} color={checked ? colors.primary : colors.text2} />
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>;
            }) : <Text style={styles.label}>{loading ? "Loading options…" : "No options"}</Text>}
          </ScrollView>
          {values.length ? <TouchableOpacity accessibilityRole="button" style={styles.name} onPress={() => update([])}><Text style={styles.clearText}>Clear {active?.label}</Text></TouchableOpacity> : null}
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
  body: { flexDirection: "row" },
  names: { width: "36%", flexGrow: 0, borderRightWidth: 1, borderColor: c.border },
  name: { minHeight: 48, padding: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  active: { backgroundColor: c.backgroundElement, borderRadius: 8 },
  label: { color: c.text, fontSize: 13, flexShrink: 1 },
  count: { color: c.primary, fontSize: 12, fontWeight: "800" },
  options: { flex: 1, paddingLeft: 12, gap: 8 },
  heading: { color: c.heading, fontSize: 14, fontWeight: "700", paddingVertical: 8 },
  input: { minHeight: 44, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 10, color: c.text },
  optionContent: { paddingBottom: 12 },
  option: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 48, paddingVertical: 8 },
  optionText: { color: c.text, fontSize: 13, flex: 1 },
  disabled: { opacity: 0.45 },
  clearButton: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: c.border },
  applyButton: { flex: 1.4, alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: 24, backgroundColor: c.primaryDark },
  clearText: { color: c.primary, fontSize: 13, fontWeight: "700" },
  applyText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  notice: { gap: 8, paddingBottom: 12 },
  error: { color: c.error, fontSize: 13, paddingBottom: 8 },
});
