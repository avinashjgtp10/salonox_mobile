import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../../../components/ui/Modal";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";
import Dropdown from "../../../../components/ui/Dropdown";
import api from "../../../../services/api/axios";
import { ATTENDANCE, COMMISSION_RULES, STAFF } from "../../../../services/api/endpoints";
import {
  DEFAULT_HALF_DAY_RULE_CONFIG,
  appliesToStaff,
  evaluateAttendanceCheckIn,
  resolveAttendanceRuleConfig,
  type HalfDayRuleConfig,
} from "../../../settings/utils/halfDayRuleSettings";

export interface StaffOption {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  working_hours_per_day?: number | string | null;
  schedule?: any[];
}

interface Props {
  staffOptions: StaffOption[];
  startDate: string;
  endDate: string;
  mode?: "create" | "edit";
  initialStaffId?: string;
  initialValues?: {
    staffId: string;
    base_salary: number;
    commission: number;
    tips: number;
    bonus: number;
    salary_advance: number;
    deductions: number;
  };
  onSave: (values: {
    staffId: string;
    base_salary: number;
    commission: number;
    tips: number;
    bonus: number;
    salary_advance: number;
    deductions: number;
  }) => void;
  onClose: () => void;
}

const EMPTY_AMOUNTS = { base_salary: "", commission: "", tips: "", bonus: "", salary_advance: "", deductions: "" };
const EMPTY_ATTENDANCE_SUMMARY = { total_present_days: 0, total_half_days: 0, total_absent_days: 0, total_late_days: 0, total_late_hours: 0, total_working_days: 0 };
const EMPTY_COMMISSION_SUMMARY: CommissionSummary = {
  total_commission: 0,
  total_paid: 0,
  total_pending: 0,
  frequency: "",
  rule_name: "",
  applicable_date: "",
  payroll_period: "",
  calculated_commission: 0,
};

interface AttendanceSummary {
  total_present_days: number;
  total_half_days: number;
  total_absent_days: number;
  total_late_days?: number;
  total_late_hours?: number;
  total_working_days?: number;
}

interface AttendanceRecord {
  staff_id?: string | number;
  staffId?: string | number;
  staff?: { id?: string | number; staff_id?: string | number } | null;
  date?: string;
  status?: string;
  check_in?: string | null;
  shift_start?: string | null;
  scheduled_shift_start?: string | null;
  scheduled_start?: string | null;
  late_minutes?: string | number | null;
  late_duration_minutes?: string | number | null;
  half_day_deduction?: string | number | null;
  attendance_deduction?: string | number | null;
}

interface CommissionSummary {
  total_commission: number;
  total_paid: number;
  total_pending: number;
  frequency: "daily" | "monthly" | "";
  rule_name: string;
  applicable_date: string;
  payroll_period: string;
  calculated_commission: number;
}

interface CommissionRecord {
  commission_amount?: string | number;
  earned_commission?: string | number;
  settled_amount?: string | number;
  status?: string;
  earned_at?: string;
  date?: string;
  rule_name?: string;
  commission_rule_name?: string;
  name?: string;
  frequency?: string;
}

const money = (value: number) => `\u20b9${(Number(value) || 0).toFixed(2)}`;

function normalizeAttendanceStatus(status: unknown) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  if (compact === "halfday") return "half_day";
  if (compact === "notmarked") return "not_marked";
  if (compact === "onleave") return "on_leave";
  return normalized;
}

function numericOrZero(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function positiveNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function daysInPayrollPeriod(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function minutesFromTime(value: unknown) {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function hoursBetweenTimes(start: unknown, end: unknown) {
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);
  if (startMinutes == null || endMinutes == null) return 0;
  const diff = endMinutes >= startMinutes
    ? endMinutes - startMinutes
    : endMinutes + 1440 - startMinutes;
  return diff > 0 ? diff / 60 : 0;
}

function workingHoursFromSchedule(schedule: any[] | undefined) {
  if (!Array.isArray(schedule)) return 0;
  const hours = schedule
    .filter((row: any) => row?.is_available !== false)
    .map((row: any) => positiveNumber(row?.scheduled_hours ?? row?.hours ?? row?.working_hours) || hoursBetweenTimes(row?.start_time, row?.end_time))
    .filter((value) => value > 0);
  if (hours.length === 0) return 0;
  return hours.reduce((sum, value) => sum + value, 0) / hours.length;
}

function attendanceStaffId(record: AttendanceRecord) {
  return String(record.staff_id ?? record.staffId ?? record.staff?.id ?? record.staff?.staff_id ?? "");
}

function unwrapAttendanceRecords(raw: any): AttendanceRecord[] {
  const data = raw?.data ?? raw ?? {};
  const records =
    data.records ??
    data.items ??
    data.data?.records ??
    data.data?.items ??
    raw?.records ??
    raw?.items ??
    [];
  return Array.isArray(records) ? records : [];
}

function toRecordDate(record: AttendanceRecord) {
  return String(record.date ?? record.check_in ?? "").slice(0, 10);
}

function toShiftStartISO(record: AttendanceRecord, defaultShiftStart: string | null) {
  const shiftStartRaw = record.shift_start ?? record.scheduled_shift_start ?? record.scheduled_start ?? defaultShiftStart;
  const date = toRecordDate(record);
  if (!shiftStartRaw || !date) return null;
  const value = String(shiftStartRaw);
  return value.includes("T") ? value : `${date}T${value.slice(0, 5)}:00+05:30`;
}

function toCheckInISO(record: AttendanceRecord) {
  if (!record.check_in) return "";
  const value = String(record.check_in);
  if (value.includes("T")) return value;
  const date = toRecordDate(record);
  return date ? `${date}T${value.slice(0, 5)}:00+05:30` : value;
}

function countAttendanceRecords(
  records: AttendanceRecord[],
  selectedStaffId: string,
  rule: HalfDayRuleConfig,
  defaultShiftStart: string | null
): Required<AttendanceSummary> {
  if (!appliesToStaff(rule, selectedStaffId)) return { ...EMPTY_ATTENDANCE_SUMMARY };

  return records.reduce<Required<AttendanceSummary>>((summary, record) => {
    const recordStaffId = attendanceStaffId(record);
    if (recordStaffId !== String(selectedStaffId)) return summary;

    const storedStatus = normalizeAttendanceStatus(record.status);
    if (storedStatus === "not_marked" || storedStatus === "on_leave") return summary;

    const shiftStartISO = toShiftStartISO(record, defaultShiftStart);
    const checkInISO = toCheckInISO(record);
    const evaluation = checkInISO && shiftStartISO
      ? evaluateAttendanceCheckIn(rule, shiftStartISO, checkInISO, recordStaffId)
      : null;
    const status = storedStatus === "half_day" || storedStatus === "late"
      ? storedStatus
      : evaluation?.status ?? storedStatus;
    const lateMinutes = evaluation?.lateMinutes ?? numericOrZero(record.late_minutes ?? record.late_duration_minutes);

    if (status === "half_day") summary.total_half_days += 1;
    else if (status === "late") {
      summary.total_late_days += 1;
      summary.total_late_hours += Math.max(0, lateMinutes / 60);
    }
    else if (status === "present") summary.total_present_days += 1;
    else if (status === "absent") summary.total_absent_days += 1;
    else return summary;

    summary.total_working_days += 1;
    return summary;
  }, { ...EMPTY_ATTENDANCE_SUMMARY });
}

function monthKeysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const months: string[] = [];

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return months;

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= last) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function inDateRange(value: unknown, startDate: string, endDate: string) {
  if (!value) return true;
  const ymd = String(value).slice(0, 10);
  return ymd >= startDate && ymd <= endDate;
}

function dailyRuleDate(startDate: string, endDate: string) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return today >= startDate && today <= endDate ? today : startDate;
}

function summarizeCommissionHistory(records: CommissionRecord[], startDate: string, endDate: string): CommissionSummary {
  return records.reduce<CommissionSummary>((summary, record) => {
    if (!inDateRange(record.earned_at ?? record.date, startDate, endDate)) return summary;

    const earned = Number(record.earned_commission ?? record.commission_amount) || 0;
    const settled = Number(record.settled_amount);
    const paid = Number.isFinite(settled)
      ? Math.min(earned, Math.max(0, settled))
      : String(record.status ?? "").trim().toLowerCase() === "paid"
        ? earned
        : 0;

    summary.total_commission += earned;
    summary.total_paid += paid;
    summary.total_pending += Math.max(0, earned - paid);
    if (!summary.rule_name) summary.rule_name = String(record.rule_name ?? record.commission_rule_name ?? record.name ?? "");
    if (!summary.frequency && (record.frequency === "daily" || record.frequency === "monthly")) {
      summary.frequency = record.frequency;
    }
    if (!summary.applicable_date) summary.applicable_date = String(record.earned_at ?? record.date ?? "").slice(0, 10);
    return summary;
  }, { ...EMPTY_COMMISSION_SUMMARY });
}

// Salon-wide and rarely changes within a session — cached so re-opening this
// modal (e.g. one row at a time for several staff) doesn't refire the exact
// same request PayrollPage's own commission-rules cache just made seconds
// earlier. Module-scope, not a per-instance cache, so it survives across
// modal open/close cycles.
let commissionRulesRequest: Promise<any[]> | null = null;

function fetchCommissionRules(): Promise<any[]> {
  if (!commissionRulesRequest) {
    commissionRulesRequest = api
      .get(COMMISSION_RULES.BASE)
      .then((res) => res.data?.data?.items ?? res.data?.data ?? [])
      .catch((err) => {
        commissionRulesRequest = null;
        throw err;
      });
  }
  return commissionRulesRequest;
}

// Same reasoning as fetchCommissionRules above — salon-wide settings that
// don't change per staff member, cached across modal open/close cycles.
let attendanceSettingsRequest: Promise<any> | null = null;

function fetchAttendanceSettings(): Promise<any> {
  if (!attendanceSettingsRequest) {
    attendanceSettingsRequest = api
      .get(ATTENDANCE.SETTINGS)
      .then((res) => res.data?.data ?? res.data)
      .catch((err) => {
        attendanceSettingsRequest = null;
        throw err;
      });
  }
  return attendanceSettingsRequest;
}

async function fetchRuleMeta(staffId: string) {
  try {
    const rules = await fetchCommissionRules();
    const rule = Array.isArray(rules)
      ? rules.find((r: any) =>
          r.status !== "draft" &&
          (r.scope_type === "salon" || String(r.scope_id ?? "") === String(staffId)) &&
          (r.frequency === "daily" || r.frequency === "monthly")
        )
      : null;
    return rule
      ? {
          rule_name: String(rule.name ?? ""),
          frequency: rule.frequency as "daily" | "monthly",
          amount: Number(rule.rate) || 0,
        }
      : null;
  } catch {
    return null;
  }
}

async function fetchAttendanceSummary(
  staffId: string,
  startDate: string,
  endDate: string,
  rule: HalfDayRuleConfig,
  defaultShiftStart: string | null
) {
  try {
    const res = await api.get(ATTENDANCE.RANGE, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
    const records = unwrapAttendanceRecords(res.data);
    const recalculated = countAttendanceRecords(records, staffId, rule, defaultShiftStart);
    if (recalculated.total_working_days > 0) {
      return recalculated;
    }
  } catch {
    // Fall back to per-staff attendance below if the range endpoint is unavailable.
  }

  try {
    const res = await api.get(ATTENDANCE.FOR_STAFF(staffId), {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
    const records = unwrapAttendanceRecords(res.data);
    const recalculated = countAttendanceRecords(records, staffId, rule, defaultShiftStart);
    if (recalculated.total_working_days > 0) return recalculated;
  } catch {
    // Fall back to defaults below.
  }

  return { ...EMPTY_ATTENDANCE_SUMMARY };
}

async function fetchCommissionSummary(staffId: string, startDate: string, endDate: string) {
  const histories = await Promise.all(
    monthKeysBetween(startDate, endDate).map((month) =>
      api.get(`${STAFF.BY_ID(staffId)}/commissions/history`, { params: { month } })
        .then((res) => res.data?.data?.items ?? [])
        .catch(() => [])
    )
  );
  const summary = summarizeCommissionHistory(histories.flat(), startDate, endDate);
  const ruleMeta = summary.frequency ? null : await fetchRuleMeta(staffId);
  const ruleAmount = ruleMeta?.amount || 0;
  const calculated = summary.calculated_commission || summary.total_pending || ruleAmount;
  const frequency: CommissionSummary["frequency"] = summary.frequency || ruleMeta?.frequency || "";
  return {
    ...summary,
    total_commission: summary.total_commission || calculated,
    total_pending: summary.total_pending || calculated,
    calculated_commission: calculated,
    rule_name: summary.rule_name || ruleMeta?.rule_name || "",
    frequency,
    applicable_date: summary.applicable_date || (frequency === "daily" ? dailyRuleDate(startDate, endDate) : ""),
    payroll_period: frequency === "monthly" ? `${startDate} - ${endDate}` : "",
  };
}

export default function AddPayrollEntryModal({
  staffOptions,
  startDate,
  endDate,
  mode = "create",
  initialStaffId,
  initialValues,
  onSave,
  onClose,
}: Props) {
  const isEditMode = mode === "edit";
  const initialAmounts = initialValues
    ? {
        base_salary: String(initialValues.base_salary ?? 0),
        commission: String(initialValues.commission ?? 0),
        tips: String(initialValues.tips ?? 0),
        bonus: String(initialValues.bonus ?? 0),
        salary_advance: String(initialValues.salary_advance ?? 0),
        deductions: String(initialValues.deductions ?? 0),
      }
    : EMPTY_AMOUNTS;
  const [staffId, setStaffId] = useState(initialValues?.staffId ? String(initialValues.staffId) : initialStaffId ? String(initialStaffId) : "");
  const [amounts, setAmounts] = useState(initialAmounts);
  const [staffPayrollProfile, setStaffPayrollProfile] = useState<any>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<Required<AttendanceSummary>>(EMPTY_ATTENDANCE_SUMMARY);
  const [attendanceRule, setAttendanceRule] = useState<HalfDayRuleConfig>(DEFAULT_HALF_DAY_RULE_CONFIG);
  const [defaultShiftStart, setDefaultShiftStart] = useState<string | null>(null);
  const [salaryDivisor, setSalaryDivisor] = useState(0);
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary>(EMPTY_COMMISSION_SUMMARY);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [deductionsOverridden, setDeductionsOverridden] = useState(isEditMode && numericOrZero(initialValues?.deductions) > 0);
  const [commissionOverridden, setCommissionOverridden] = useState(isEditMode && numericOrZero(initialValues?.commission) > 0);
  const [submitted, setSubmitted] = useState(false);
  const selectedStaffIdRef = useRef("");
  const attendanceRequestRef = useRef(0);
  const commissionRequestRef = useRef(0);

  const patch = (key: keyof typeof amounts) => (value: string) =>
    setAmounts((prev) => ({ ...prev, [key]: value }));

  const isStaffValid = staffId.trim() !== "";
  const baseSalaryNum = Number(amounts.base_salary);
  const isBaseSalaryValid = amounts.base_salary.trim() !== "" && Number.isFinite(baseSalaryNum) && baseSalaryNum >= 0;
  const selectedStaff = staffOptions.find((staff) => String(staff.id) === String(staffId));
  const periodDays = daysInPayrollPeriod(startDate, endDate);
  const monthlySalary = Number.isFinite(baseSalaryNum) && baseSalaryNum > 0 ? baseSalaryNum : 0;
  const salaryDays = salaryDivisor > 0 ? salaryDivisor : periodDays;
  const workingHoursPerDay =
    positiveNumber(staffPayrollProfile?.working_hours_per_day) ||
    positiveNumber(staffPayrollProfile?.workingHoursPerDay) ||
    positiveNumber(selectedStaff?.working_hours_per_day) ||
    workingHoursFromSchedule(staffPayrollProfile?.schedule ?? selectedStaff?.schedule) ||
    8;
  const perDaySalary = salaryDays > 0 && monthlySalary > 0 ? monthlySalary / salaryDays : 0;
  const perHourSalary = workingHoursPerDay > 0 ? perDaySalary / workingHoursPerDay : 0;
  const safeLateHours = numericOrZero(attendanceSummary.total_late_hours);
  const safeLateDays = numericOrZero(attendanceSummary.total_late_days);
  const safeHalfDays = numericOrZero(attendanceSummary.total_half_days);
  const configuredHalfDayAmount = Math.max(0, numericOrZero(attendanceRule.half_day_deduction_amount));
  const halfDayAmount = configuredHalfDayAmount > 0 ? configuredHalfDayAmount : perDaySalary / 2;
  const halfDayDeduction = safeHalfDays > 0 ? safeHalfDays * halfDayAmount : 0;
  const autoDeduction = useMemo(
    () => Number(Math.max(0, halfDayDeduction).toFixed(2)),
    [halfDayDeduction]
  );

  const showStaffError = submitted && !isStaffValid;
  const showBaseSalaryError = submitted && !isBaseSalaryValid;

  useEffect(() => {
    let cancelled = false;
    fetchAttendanceSettings()
      .then((settings) => {
        if (!cancelled) {
          setAttendanceRule(resolveAttendanceRuleConfig(settings));
          setDefaultShiftStart(settings?.shift_start ? String(settings.shift_start).slice(0, 5) : null);
          setSalaryDivisor(
            positiveNumber(settings?.salary_divisor) ||
            positiveNumber(settings?.payroll_salary_divisor) ||
            positiveNumber(settings?.fixed_salary_divisor)
          );
        }
      })
      .catch(() => {
        if (!cancelled) setAttendanceRule(resolveAttendanceRuleConfig(DEFAULT_HALF_DAY_RULE_CONFIG));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStaffChange = async (value: string) => {
    if (isEditMode) return;
    selectedStaffIdRef.current = value;
    setStaffId(value);
    setDeductionsOverridden(false);
    setCommissionOverridden(false);
    setStaffPayrollProfile(null);
    patch("base_salary")("0");

    if (!value) return;

    try {
      const res = await api.get(STAFF.WAGES(value));
      const wages = res.data?.data || res.data;
      const salary = Number(wages?.salary_amount ?? wages?.fixed_salary);

      if (selectedStaffIdRef.current === value) {
        setStaffPayrollProfile((prev: any) => ({ ...(prev ?? {}), ...wages }));
        if (wages?.compensation_type === "salary" && Number.isFinite(salary)) {
          patch("base_salary")(String(salary));
        }
      }
    } catch {
      // Staff detail/list data still provides a safe fallback.
    }

    try {
      const res = await api.get(STAFF.BY_ID(value));
      const staff = res.data?.data ?? res.data;
      if (selectedStaffIdRef.current === value) {
        setStaffPayrollProfile((prev: any) => ({ ...(prev ?? {}), ...staff }));
      }
    } catch {
      // Staff list data still provides a safe fallback.
    }
  };

  useEffect(() => {
    if (!isEditMode) {
      setDeductionsOverridden(false);
      setCommissionOverridden(false);
    }
  }, [startDate, endDate, isEditMode]);

  useEffect(() => {
    const requestId = attendanceRequestRef.current + 1;
    attendanceRequestRef.current = requestId;

    if (!staffId || !startDate || !endDate) {
      setAttendanceSummary(EMPTY_ATTENDANCE_SUMMARY);
      setAttendanceLoading(false);
      return;
    }

    setAttendanceLoading(true);
    fetchAttendanceSummary(staffId, startDate, endDate, attendanceRule, defaultShiftStart)
      .then((res) => {
        if (attendanceRequestRef.current !== requestId) return;
        setAttendanceSummary(res);
      })
      .catch(() => {
        if (attendanceRequestRef.current !== requestId) return;
        setAttendanceSummary(EMPTY_ATTENDANCE_SUMMARY);
      })
      .finally(() => {
        if (attendanceRequestRef.current === requestId) setAttendanceLoading(false);
      });
  }, [staffId, startDate, endDate, attendanceRule, defaultShiftStart]);

  useEffect(() => {
    if (!deductionsOverridden) {
      setAmounts((prev) => ({ ...prev, deductions: autoDeduction > 0 ? String(autoDeduction) : "0" }));
    }
  }, [autoDeduction, deductionsOverridden]);

  useEffect(() => {
    const requestId = commissionRequestRef.current + 1;
    commissionRequestRef.current = requestId;

    if (!staffId || !startDate || !endDate) {
      setCommissionSummary(EMPTY_COMMISSION_SUMMARY);
      setCommissionLoading(false);
      return;
    }

    setCommissionLoading(true);
    fetchCommissionSummary(staffId, startDate, endDate)
      .then((res) => {
        if (commissionRequestRef.current !== requestId) return;
        setCommissionSummary(res);
      })
      .catch(() => {
        if (commissionRequestRef.current !== requestId) return;
        setCommissionSummary(EMPTY_COMMISSION_SUMMARY);
      })
      .finally(() => {
        if (commissionRequestRef.current === requestId) setCommissionLoading(false);
      });
  }, [staffId, startDate, endDate]);

  useEffect(() => {
    if (!commissionOverridden) {
      const pending = Number(commissionSummary.total_pending) || 0;
      setAmounts((prev) => ({ ...prev, commission: pending > 0 ? String(Number(pending.toFixed(2))) : "0" }));
    }
  }, [commissionSummary.total_pending, commissionOverridden]);

  const handleSave = () => {
    setSubmitted(true);
    if (!isStaffValid || !isBaseSalaryValid) return;

    onSave({
      staffId,
      base_salary: baseSalaryNum,
      commission: Number(amounts.commission) || 0,
      tips: Number(amounts.tips) || 0,
      bonus: Number(amounts.bonus) || 0,
      salary_advance: Number(amounts.salary_advance) || 0,
      deductions: Number(amounts.deductions) || 0,
    });
  };

  return (
    <Modal show onClose={onClose} title={isEditMode ? "Edit Payroll Entry" : "Add Payroll Entry"} size="md">
      <div className="modal-scrollable" style={{ maxHeight: "72vh", paddingRight: 6, scrollbarGutter: "stable" }}>
      <div className="d-flex flex-column gap-3">
        <div>
          <label className="form-label fw-semibold mb-1">
            Staff <span className="text-danger">*</span>
          </label>
          {isEditMode ? (
            <div className="form-control bg-light d-flex align-items-center justify-content-between">
              <span>{selectedStaff ? `${selectedStaff.name} - ${selectedStaff.role}` : "Selected staff"}</span>
              <span className="badge text-bg-secondary">Locked</span>
            </div>
          ) : (
          <Dropdown
            value={staffId}
            onChange={handleStaffChange}
            options={staffOptions.map((s) => ({ id: s.id, name: `${s.name} · ${s.role}` }))}
            placeholder="Select staff"
            className={`form-select text-start ${showStaffError ? "is-invalid" : ""}`}
          />
          )}
          {showStaffError && <span className="text-danger small">Please select a staff member</span>}
        </div>

        <Input
          label="Base Salary"
          type="number"
          min={0}
          step="0.01"
          placeholder="0"
          value={amounts.base_salary}
          onChange={(e) => patch("base_salary")(e.target.value)}
          error={showBaseSalaryError ? "Please enter a valid amount" : undefined}
          containerClass="mb-0"
        />

        <div
          className="rounded border border-primary-subtle bg-primary-subtle bg-opacity-10 p-3"
          title="Deductions are calculated based on attendance (Half Days)"
        >
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="fw-semibold small text-primary">Attendance Deduction</span>
            {attendanceLoading && <span className="spinner-border spinner-border-sm text-primary" role="status" aria-label="Loading attendance" />}
          </div>
          <div className="d-flex gap-2">
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Half Days</div>
              <div className="fw-bold">{attendanceLoading ? "..." : safeHalfDays}</div>
            </div>
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Late Instances</div>
              <div className="fw-bold">{attendanceLoading ? "..." : safeLateDays}</div>
            </div>
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Total Late Hours</div>
              <div className="fw-bold">{attendanceLoading ? "..." : safeLateHours.toFixed(2)}</div>
            </div>
          </div>
          <div className="d-flex gap-2 mt-2">
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Per Day Salary</div>
              <div className="fw-bold">{attendanceLoading ? "..." : money(perDaySalary)}</div>
            </div>
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Per Hour Salary</div>
              <div className="fw-bold">{attendanceLoading ? "..." : money(perHourSalary)}</div>
            </div>
          </div>
          <div className="d-flex gap-2 mt-2">
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Half Day Deduction</div>
              <div className="fw-bold text-danger">{attendanceLoading ? "..." : money(halfDayDeduction)}</div>
            </div>
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Total Auto Deduction</div>
              <div className="fw-bold text-danger">{attendanceLoading ? "..." : money(autoDeduction)}</div>
            </div>
          </div>
          <div className="small text-primary fw-semibold mt-2">
            Source: Attendance Rule - Payroll days: {salaryDays || 0} - Working hours/day: {workingHoursPerDay.toFixed(2)}
          </div>
        </div>

        <div className="d-flex gap-3">
          <Input
            label="Commission"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={amounts.commission}
            readOnly
            containerClass="mb-0 flex-fill"
          />
          <Input
            label="Tips"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={amounts.tips}
            onChange={(e) => patch("tips")(e.target.value)}
            containerClass="mb-0 flex-fill"
          />
        </div>

        <div
          className="rounded border border-success-subtle bg-success-subtle bg-opacity-10 p-3"
          title="Commission is auto-filled from pending commission in this payroll date range"
        >
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="fw-semibold small text-success">Commission Summary</span>
            {commissionLoading && <span className="spinner-border spinner-border-sm text-success" role="status" aria-label="Loading commission" />}
          </div>
          <div className="d-flex gap-2">
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Earned Commission</div>
              <div className="fw-bold">{commissionLoading ? "..." : money(commissionSummary.total_commission)}</div>
            </div>
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Paid</div>
              <div className="fw-bold">{commissionLoading ? "..." : money(commissionSummary.total_paid)}</div>
            </div>
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Pending</div>
              <div className="fw-bold text-success">{commissionLoading ? "..." : money(commissionSummary.total_pending)}</div>
            </div>
          </div>
          <div className="d-flex gap-2 mt-2">
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Payout Frequency</div>
              <div className="fw-bold">{commissionLoading ? "..." : commissionSummary.frequency ? commissionSummary.frequency[0].toUpperCase() + commissionSummary.frequency.slice(1) : "No Rule"}</div>
            </div>
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Commission Rule</div>
              <div className="fw-bold">{commissionLoading ? "..." : commissionSummary.rule_name || "No Rule"}</div>
            </div>
          </div>
          <div className="d-flex gap-2 mt-2">
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">{commissionSummary.frequency === "daily" ? "Date" : "Payroll Period"}</div>
              <div className="fw-bold">
                {commissionLoading
                  ? "..."
                  : commissionSummary.frequency === "daily"
                    ? commissionSummary.applicable_date || startDate
                    : commissionSummary.payroll_period || `${startDate} - ${endDate}`}
              </div>
            </div>
            <div className="flex-fill rounded bg-white border p-2">
              <div className="text-muted small">Calculated Commission</div>
              <div className="fw-bold text-success">{commissionLoading ? "..." : money(commissionSummary.calculated_commission)}</div>
            </div>
          </div>
        </div>

        <div className="d-flex gap-3">
          <Input
            label="Bonus / Incentive"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={amounts.bonus}
            onChange={(e) => patch("bonus")(e.target.value)}
            containerClass="mb-0 flex-fill"
          />
          <Input
            label="Salary Advance (from history)"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={amounts.salary_advance}
            readOnly
            containerClass="mb-0 flex-fill"
          />
        </div>

        <Input
          label="Deductions"
          type="number"
          min={0}
          step="0.01"
          placeholder="0"
          value={amounts.deductions}
          onChange={(e) => {
            setDeductionsOverridden(true);
            patch("deductions")(e.target.value);
          }}
          containerClass="mb-0"
        />
      </div>

      <div className="d-flex flex-column gap-2 w-100 mt-4">
        <Button variant="dark" fullWidth onClick={handleSave}>
          {isEditMode ? "Update Entry" : "Add Entry"}
        </Button>
        <Button variant="outline-dark" fullWidth onClick={onClose}>
          Cancel
        </Button>
      </div>
      </div>
    </Modal>
  );
}
