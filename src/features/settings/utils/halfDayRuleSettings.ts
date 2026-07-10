export interface HalfDayRuleConfig {
  active: boolean;
  threshold_hours: number; // staff checking in later than (shift start + this many hours) count as half day
}

export const DEFAULT_HALF_DAY_RULE_CONFIG: HalfDayRuleConfig = {
  active: false,
  threshold_hours: 2,
};

// Picks only the two known fields — the GET response is the full attendance_settings
// row (salon_id, id, shift_start, created_at, ...), and spreading it wholesale into
// this config would resend those extra fields on the next save.
function pickHalfDayRuleFields(obj: Record<string, unknown>): HalfDayRuleConfig {
  return {
    active: typeof obj.active === "boolean" ? obj.active : DEFAULT_HALF_DAY_RULE_CONFIG.active,
    threshold_hours: typeof obj.threshold_hours === "number"
      ? obj.threshold_hours
      : DEFAULT_HALF_DAY_RULE_CONFIG.threshold_hours,
  };
}

export function parseHalfDayRuleValue(raw: unknown): HalfDayRuleConfig {
  if (raw && typeof raw === "object") {
    return pickHalfDayRuleFields(raw as Record<string, unknown>);
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return pickHalfDayRuleFields(parsed);
    } catch {
      // ignore — fall through to default
    }
  }
  return DEFAULT_HALF_DAY_RULE_CONFIG;
}

/**
 * Whether a check-in counts as a half day under the given rule: late by more
 * than `threshold_hours` past the staff's scheduled shift start.
 */
export function isHalfDayCheckIn(
  rule: HalfDayRuleConfig,
  shiftStartISO: string | null,
  checkInISO: string
): boolean {
  if (!rule.active || !shiftStartISO) return false;
  const lateMs = new Date(checkInISO).getTime() - new Date(shiftStartISO).getTime();
  return lateMs > rule.threshold_hours * 60 * 60 * 1000;
}
