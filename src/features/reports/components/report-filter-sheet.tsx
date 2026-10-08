import { useMemo } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { FilterSheet, type FilterField, type FilterSelection } from "@/components/ui/FilterSheet";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ReportFilters, ReportSlug } from "../report-config";
import { decodeReportSelection, REPORT_FILTER_FIELDS } from "../report-filters";
import { useReportFilterOptions, type ReportOption } from "../useReportFilterOptions";

export function ReportFilterSheet({ slug, data, filters, onApply, onClose, visible }: {
  slug: ReportSlug;
  data?: Record<string, unknown> | null;
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClose: () => void;
  visible: boolean;
}) {
  const colors = useThemeColors();
  const definitions = useMemo(() => REPORT_FILTER_FIELDS[slug] ?? [], [slug]);
  const lookup = useReportFilterOptions(slug, data, visible);
  const selected = useMemo(() => Object.fromEntries(definitions.map((field) => [field.key,
    field.kind === "boolean" ? (filters[field.key] === "false" ? ["false"] : []) : field.single || field.kind ? (filters[field.key] ? [filters[field.key]!] : []) : decodeReportSelection(filters[field.key]),
  ])), [definitions, filters]);
  const fields: FilterField[] = definitions.map((definition) => {
    const fieldOptions: ReportOption[] = definition.options ?? lookup.options[definition.source ?? ""] ?? [];
    const options = definition.key.endsWith("_names") ? fieldOptions.map((option) => ({ ...option, id: option.label })) : fieldOptions;
    const field: FilterField = { key: definition.key, label: definition.label, single: definition.single, options, searchable: Boolean(definition.source) };
    if (definition.key === "service_ids" && definitions.some((item) => item.key === "category_ids")) {
      field.dependsOn = "category_ids";
      field.optionsFor = (parents, own) => fieldOptions.filter((option) => own.includes(option.id) || (option.categoryId && parents.includes(option.categoryId)));
    }
    if (definition.kind === "boolean") field.render = (values, update) => <View style={styles.toggle}><Text style={{ color: colors.text }}>Include GST</Text><Switch accessibilityLabel="Include GST" value={values[0] !== "false"} onValueChange={(value) => update(value ? [] : ["false"])} /></View>;
    if (definition.kind === "number" || definition.kind === "date") field.render = (values, update) => <TextInput accessibilityLabel={definition.label} keyboardType={definition.kind === "number" ? "number-pad" : "default"} placeholder={definition.kind === "date" ? "YYYY-MM-DD" : "0"} placeholderTextColor={colors.placeholder} value={values[0] ?? ""} onChangeText={(value) => update(value ? [value] : [])} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />;
    return field;
  });
  const validate = (draft: FilterSelection) => {
    for (const field of definitions) {
      const value = draft[field.key]?.[0];
      if (!value) continue;
      if (field.kind === "number" && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) return `${field.label} must be a non-negative whole number.`;
      if (field.kind === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) return `${field.label} must be a valid date (YYYY-MM-DD).`;
    }
    if (draft.expiry_from?.[0] && draft.expiry_to?.[0] && draft.expiry_from[0] > draft.expiry_to[0]) return "Expiry start date must not be after the end date.";
    return null;
  };
  return <FilterSheet fields={fields} selected={selected} visible={visible} onClose={onClose} loading={lookup.loading} error={lookup.error} onRetry={lookup.retry} validate={validate} onApply={(draft) => {
    const next = { ...filters, page: 1 };
    definitions.forEach((field) => {
      const values = draft[field.key] ?? [];
      next[field.key] = field.kind === "boolean" ? values[0] ?? "true" : field.single || field.kind ? values[0] ?? "" : values.length ? JSON.stringify(values) : "";
    });
    onApply(next);
  }} />;
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  toggle: { gap: 12, alignItems: "flex-start" },
});
