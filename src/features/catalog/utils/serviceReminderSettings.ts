import type { Setting } from "../../../types/setting.types";

// Same fixed-key, single-row convention as PRINT_CONFIG (settings/utils/
// printSettings.ts) — a salon has one list of reminder-day presets,
// JSON-encoded into salon_settings' single `value` column. Nothing new is
// needed on the backend: that table already stores arbitrary keyed JSON
// scoped to the salon, which is also what makes this inherently per-salon.
export const SERVICE_REMINDER_PRESETS_KEY = "SERVICE_REMINDER_PRESETS";

// Starts empty — the salon owner builds this list themselves (Services →
// Options → Service reminder options) rather than being handed defaults
// that may not match how they actually recall clients.
export const DEFAULT_SERVICE_REMINDER_PRESETS: number[] = [];

export function parseServiceReminderPresets(raw: Setting["value"] | undefined): number[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try { arr = JSON.parse(raw); } catch { return DEFAULT_SERVICE_REMINDER_PRESETS; }
  }
  if (!Array.isArray(arr)) return DEFAULT_SERVICE_REMINDER_PRESETS;
  const days = arr.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

export function findServiceReminderPresetsSetting(items: Setting[]): Setting | undefined {
  return items.find((s) => s.key === SERVICE_REMINDER_PRESETS_KEY);
}

export function getServiceReminderPresets(items: Setting[]): number[] {
  const setting = findServiceReminderPresetsSetting(items);
  return setting ? parseServiceReminderPresets(setting.value) : DEFAULT_SERVICE_REMINDER_PRESETS;
}
