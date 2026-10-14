import { formatAppDate } from "@/utils/dateTime";

const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
export const DATE_RANGE_PRESETS = [
  { key: "today", label: "Today" }, { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This week" }, { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" }, { key: "this_quarter", label: "This quarter" },
  { key: "this_year", label: "This year" },
] as const;
export type DateRangePreset = typeof DATE_RANGE_PRESETS[number]["key"];

/** Same Sunday–Saturday weeks and full calendar periods as the web filters. */
export function getDateRangePreset(preset: DateRangePreset, now = new Date()) {
  const year = now.getFullYear(), month = now.getMonth();
  let start = new Date(now), end = new Date(now);
  if (preset === "yesterday") { start.setDate(start.getDate() - 1); end = new Date(start); }
  if (preset === "this_week") { start.setDate(start.getDate() - start.getDay()); end = new Date(start); end.setDate(end.getDate() + 6); }
  if (preset === "this_month") { start = new Date(year, month, 1); end = new Date(year, month + 1, 0); }
  if (preset === "last_month") { start = new Date(year, month - 1, 1); end = new Date(year, month, 0); }
  if (preset === "this_quarter") { const first = Math.floor(month / 3) * 3; start = new Date(year, first, 1); end = new Date(year, first + 3, 0); }
  if (preset === "this_year") { start = new Date(year, 0, 1); end = new Date(year, 11, 31); }
  return { startDate: dateKey(start), endDate: dateKey(end) };
}

export function dateRangeLabel(start?: string | null, end?: string | null, now = new Date()) {
  if (!start && !end) return "All time";
  const last = end || start;
  for (const preset of DATE_RANGE_PRESETS) {
    const range = getDateRangePreset(preset.key, now);
    if (start === range.startDate && last === range.endDate) return preset.label;
  }
  if (start && last && start === last) return formatAppDate(start, start);
  return `${start ? formatAppDate(start, start) : "Any date"} – ${last ? formatAppDate(last, last) : "Any date"}`;
}
