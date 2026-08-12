export type DeductionType = "fixed" | "salary_per_hour";
export type StaffRuleScope = "all" | "selected";

export interface HalfDayRuleConfig {
  active: boolean;
  threshold_hours: number;
  late_rule_active: boolean;
  grace_period_hours: number;
  late_deduction_type: DeductionType;
  late_deduction_amount: number;
  late_deduction_after_hours: number;
  max_late_deduction: number | null;
  half_day_deduction_amount: number;
  staff_scope: StaffRuleScope;
  selected_staff_ids: string[];
}

export interface AttendanceEvaluation {
  status: "present" | "late" | "half_day";
  lateMinutes: number;
  lateDeduction: number;
  halfDayDeduction: number;
  totalDeduction: number;
}

export const DEFAULT_HALF_DAY_RULE_CONFIG: HalfDayRuleConfig = {
  active: false,
  threshold_hours: 2,
  late_rule_active: false,
  grace_period_hours: 0.25,
  late_deduction_type: "fixed",
  late_deduction_amount: 0,
  late_deduction_after_hours: 0.25,
  max_late_deduction: null,
  half_day_deduction_amount: 0,
  staff_scope: "all",
  selected_staff_ids: [],
};

const ATTENDANCE_RULE_STORAGE_KEY = "salon_attendance_rule_config";

function numericField(obj: Record<string, unknown>, key: string, fallback: number): number {
  const raw = obj[key];
  const numeric =
    typeof raw === "number" ? raw
    : typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw)) ? Number(raw)
    : null;
  return numeric !== null ? numeric : fallback;
}

function nullableNumericField(obj: Record<string, unknown>, key: string): number | null {
  const raw = obj[key];
  if (raw === null || raw === undefined || raw === "") return null;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function boolField(obj: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof obj[key] === "boolean" ? obj[key] : fallback;
}

function pickHalfDayRuleFields(obj: Record<string, unknown>): HalfDayRuleConfig {
  const lateType = obj.late_deduction_type === "salary_per_hour" ? "salary_per_hour" : "fixed";
  const staffScope = obj.staff_scope === "selected" ? "selected" : "all";
  const selectedStaffIds = Array.isArray(obj.selected_staff_ids)
    ? obj.selected_staff_ids.map(String)
    : [];

  return {
    active: boolField(obj, "active", DEFAULT_HALF_DAY_RULE_CONFIG.active),
    threshold_hours: numericField(obj, "threshold_hours", DEFAULT_HALF_DAY_RULE_CONFIG.threshold_hours),
    late_rule_active: boolField(obj, "late_rule_active", DEFAULT_HALF_DAY_RULE_CONFIG.late_rule_active),
    grace_period_hours: numericField(obj, "grace_period_hours", DEFAULT_HALF_DAY_RULE_CONFIG.grace_period_hours),
    late_deduction_type: lateType,
    late_deduction_amount: numericField(obj, "late_deduction_amount", DEFAULT_HALF_DAY_RULE_CONFIG.late_deduction_amount),
    late_deduction_after_hours: numericField(obj, "late_deduction_after_hours", DEFAULT_HALF_DAY_RULE_CONFIG.late_deduction_after_hours),
    max_late_deduction: nullableNumericField(obj, "max_late_deduction"),
    half_day_deduction_amount: numericField(obj, "half_day_deduction_amount", DEFAULT_HALF_DAY_RULE_CONFIG.half_day_deduction_amount),
    staff_scope: staffScope,
    selected_staff_ids: selectedStaffIds,
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
      // ignore malformed settings and use defaults
    }
  }
  return DEFAULT_HALF_DAY_RULE_CONFIG;
}

export function loadSavedAttendanceRuleConfig(): HalfDayRuleConfig | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(ATTENDANCE_RULE_STORAGE_KEY);
    return raw ? parseHalfDayRuleValue(raw) : null;
  } catch {
    return null;
  }
}

export function saveAttendanceRuleConfig(config: HalfDayRuleConfig) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ATTENDANCE_RULE_STORAGE_KEY, JSON.stringify(config));
    }
  } catch {
    // Local persistence is best effort.
  }
}

export function resolveAttendanceRuleConfig(raw: unknown): HalfDayRuleConfig {
  return {
    ...parseHalfDayRuleValue(raw),
    ...(loadSavedAttendanceRuleConfig() ?? {}),
  };
}

export function appliesToStaff(rule: HalfDayRuleConfig, staffId?: string | number | null): boolean {
  if (rule.staff_scope !== "selected") return true;
  if (staffId == null) return false;
  return rule.selected_staff_ids.includes(String(staffId));
}

export function lateMinutesFromShift(shiftStartISO: string | null, checkInISO: string): number {
  if (!shiftStartISO) return 0;
  const lateMs = new Date(checkInISO).getTime() - new Date(shiftStartISO).getTime();
  if (!Number.isFinite(lateMs)) return 0;
  return Math.max(0, Math.floor(lateMs / 60000));
}

export function isHalfDayCheckIn(
  rule: HalfDayRuleConfig,
  shiftStartISO: string | null,
  checkInISO: string,
  staffId?: string | number | null
): boolean {
  if (!rule.active || !appliesToStaff(rule, staffId)) return false;
  return lateMinutesFromShift(shiftStartISO, checkInISO) >= Math.round(rule.threshold_hours * 60);
}

export function evaluateAttendanceCheckIn(
  rule: HalfDayRuleConfig,
  shiftStartISO: string | null,
  checkInISO: string,
  staffId?: string | number | null,
  baseSalary = 0,
  totalWorkingDays = 0,
): AttendanceEvaluation {
  const lateMinutes = lateMinutesFromShift(shiftStartISO, checkInISO);
  const scoped = appliesToStaff(rule, staffId);

  if (!scoped || !shiftStartISO) {
    return { status: "present", lateMinutes, lateDeduction: 0, halfDayDeduction: 0, totalDeduction: 0 };
  }

  if (rule.active && lateMinutes >= Math.round(rule.threshold_hours * 60)) {
    const halfDayDeduction = Math.max(0, Number(rule.half_day_deduction_amount) || 0);
    return {
      status: "half_day",
      lateMinutes,
      lateDeduction: 0,
      halfDayDeduction,
      totalDeduction: halfDayDeduction,
    };
  }

  const graceMinutes = Math.round(rule.grace_period_hours * 60);
  const deductionAfterMinutes = Math.round(rule.late_deduction_after_hours * 60);
  if (!rule.late_rule_active || lateMinutes <= graceMinutes || lateMinutes <= deductionAfterMinutes) {
    return { status: "present", lateMinutes, lateDeduction: 0, halfDayDeduction: 0, totalDeduction: 0 };
  }

  const perHourSalary = baseSalary > 0 && totalWorkingDays > 0 ? baseSalary / totalWorkingDays / 8 : 0;
  const rawLateDeduction = rule.late_deduction_type === "salary_per_hour"
    ? perHourSalary * (lateMinutes / 60)
    : Number(rule.late_deduction_amount) || 0;
  const cappedLateDeduction = rule.max_late_deduction != null
    ? Math.min(rawLateDeduction, rule.max_late_deduction)
    : rawLateDeduction;
  const lateDeduction = Number(Math.max(0, cappedLateDeduction).toFixed(2));

  return {
    status: "late",
    lateMinutes,
    lateDeduction,
    halfDayDeduction: 0,
    totalDeduction: lateDeduction,
  };
}
