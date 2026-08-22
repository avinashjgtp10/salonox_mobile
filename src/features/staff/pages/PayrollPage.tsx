import { useEffect, useMemo, useState } from "react";
import {
  Search as SearchIcon,
  People,
  CashStack,
  Wallet2,
  GraphUpArrow,
  CheckCircleFill,
  ClockHistory,
  CalendarRange,
  PlusLg,
  PencilSquare,
  Trash3,
  ThreeDots,
  Printer,
} from "react-bootstrap-icons";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import { printPayrollReceipt } from "../utils/payrollReceipt";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import api from "../../../services/api/axios";
import { ATTENDANCE, COMMISSION_RULES, PAYROLL } from "../../../services/api/endpoints";
import { STAFF } from "../../../services/api/endpoints/staff.endpoints";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { DateRangePreset } from "../../../components/ui";
import JiraFilterMenu, { type JiraFilterField } from "../../../components/ui/JiraFilterMenu";
import Pagination from "../../../components/ui/Pagination";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import PaySalaryModal from "../components/payroll/PaySalaryModal";
import AddPayrollEntryModal, { type StaffOption } from "../components/payroll/AddPayrollEntryModal";
import {
  DEFAULT_HALF_DAY_RULE_CONFIG,
  appliesToStaff,
  evaluateAttendanceCheckIn,
  resolveAttendanceRuleConfig,
  type HalfDayRuleConfig,
} from "../../settings/utils/halfDayRuleSettings";
import { scheduleDateToYMD } from "../../../components/staff-schedule/utils";
import "../styles/PayrollPage.scss";

const AVATAR_COLOR_MAP: Record<string, string> = {
  light_blue: "#7dd3fc", blue: "#3b82f6", dark_blue: "#1d4ed8",
  purple: "#a855f7", violet: "#7c3aed", pink: "#f472b6",
  hot_pink: "#ec4899", rose: "#f43f5e", orange: "#f97316",
  yellow: "#eab308", lime: "#84cc16", green: "#22c55e",
  teal: "#14b8a6", cyan: "#06b6d4",
};
const AVATAR_GRADIENTS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#f97316"];

const avatarColorFor = (staffId: string, calendarColor?: string | null) =>
  calendarColor
    ? (AVATAR_COLOR_MAP[calendarColor] ?? AVATAR_GRADIENTS[0])
    : AVATAR_GRADIENTS[Math.abs(String(staffId).charCodeAt(0)) % AVATAR_GRADIENTS.length];

// This page shows whole-rupee amounts (no ".00", no thousands separator).
// a payroll-table-specific convention, not the app-wide currency format used
// by useCurrency().formatAmount elsewhere.
const fmtWhole = (symbol: string, n: number) => `${symbol}${Math.round(Number(n) || 0)}`;
const normalizeAttendanceStatus = (status: unknown) =>
  {
    const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
    const compact = normalized.replace(/[^a-z0-9]/g, "");
    if (compact === "halfday") return "half_day";
    if (compact === "notmarked") return "not_marked";
    if (compact === "onleave") return "on_leave";
    return normalized;
  };
const numericOrZero = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};
const positiveNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const emptyCommissionSummary: CommissionSummary = {
  total_commission: 0,
  total_paid: 0,
  total_pending: 0,
  frequency: "",
  rule_name: "",
  applicable_date: "",
  payroll_period: "",
  calculated_commission: 0,
};

const emptyTipSummary: TipSummary = {
  total_tips: 0,
  pending_payout: 0,
  paid_out: 0,
};

// Types

type PayrollStatus = "no_data" | "pending" | "in_progress" | "done";
type PaymentStatus = "no_data" | "unpaid" | "partial" | "paid";
type PeriodType = "weekly" | "biweekly" | "monthly" | "custom";

interface StaffPayroll {
  id: string;
  staff_id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  base_salary: number;
  commission: number;
  commission_earned: number;
  commission_paid: number;
  commission_frequency: "daily" | "monthly" | "";
  commission_rule_name: string;
  commission_applicable_date: string;
  commission_payroll_period: string;
  calculated_commission: number;
  tips: number;
  tips_pending: number;
  tips_paid: number;
  /** "paid" only once every tip earned for the period has been settled; any
   *  outstanding balance keeps it "pending" — tips stay visible either way. */
  tip_status: "paid" | "pending" | "no_data";
  bonus: number;
  salary_advance: number;
  deductions: number;
  half_day_deduction: number;
  half_day_count: number;
  half_day_dates: string[];
  late_count: number;
  late_hours: number;
  late_deduction: number;
  attendance_working_days: number;
  per_day_salary: number;
  per_hour_salary: number;
  paid_amount: number;
  hasPayrollData: boolean;
  status?: PayrollStatus;
  payment_method?: string;
  payment_date?: string;
}

interface SalaryAdvanceTransaction {
  id: string;
  staff_id: string;
  amount: number;
  advance_date: string;
  payroll_period_start: string;
  payroll_period_end: string;
  note?: string | null;
  created_at?: string;
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
  late_deduction?: string | number | null;
  half_day_deduction?: string | number | null;
  attendance_deduction?: string | number | null;
}

interface HalfDayDeductionSummary {
  count: number;
  halfDayAmount: number;
  lateCount: number;
  lateHours: number;
  lateAmount: number;
  totalWorkingDays: number;
  perDaySalary: number;
  perHourSalary: number;
  dates: string[];
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

interface TipSummary {
  total_tips: number;
  pending_payout: number;
  paid_out: number;
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

const STATUS_CONFIG: Record<PayrollStatus, { label: string; class: string }> = {
  no_data:     { label: "No Data",     class: "pr-badge--nodata" },
  pending:     { label: "Pending",     class: "pr-badge--pending" },
  in_progress: { label: "In Progress", class: "pr-badge--progress" },
  done:        { label: "Done",        class: "pr-badge--done" },
};

const TIP_STATUS_CONFIG: Record<StaffPayroll["tip_status"], { label: string; class: string }> = {
  no_data: { label: "—",       class: "pr-badge--nodata" },
  pending: { label: "Pending", class: "pr-badge--pending" },
  paid:    { label: "Paid",    class: "pr-badge--done" },
};

const COMPLETED_PAYROLL_KEY = "salon_completed_payroll_entries";
const DEFAULT_PAGE_SIZE = 20;
const HALF_DAY_DEDUCTION_REASON = "Late Arrival - Half Day";

// Date helpers

const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const formatShort = (d: Date) => formatDateDDMMYYYY(d);
const formatShortYear = (d: Date) => formatDateDDMMYYYY(d);
// Local YYYY-MM-DD avoids the UTC-shift bug from Date#toISOString(), which
// can land the date on the wrong calendar day depending on the browser's timezone.
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// The Payroll Period picker keeps its start/end in plain `{start, end}` state
// (threaded through many downstream calculations under those exact field
// names), so this just derives which preset that pair currently matches for
// display — it never drives the underlying state.
const QUICK_DATE_PRESETS: Exclude<DateRangePreset, "custom">[] = [
  "today", "yesterday", "this_week", "this_month", "last_month", "this_quarter", "this_year", "all_time",
];
function derivePayrollDatePreset(start: string, end: string): DateRangePreset {
  for (const preset of QUICK_DATE_PRESETS) {
    const range = getDateRangePresetValue(preset);
    if (range.startDate === start && range.endDate === end) return preset;
  }
  return "custom";
}

function getScheduleShiftStart(schedule: any[] | undefined, date: string): string | null {
  if (!Array.isArray(schedule)) return null;
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  const daySchedule =
    schedule.find((sch: any) => scheduleDateToYMD(sch.date) === date) ??
    schedule.find((sch: any) => !scheduleDateToYMD(sch.date) && sch.day_of_week === dayOfWeek);
  return daySchedule?.is_available && daySchedule?.start_time
    ? String(daySchedule.start_time).slice(0, 5)
    : null;
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

function attendanceRecordDate(record: AttendanceRecord) {
  return String(record.date ?? record.check_in ?? "").slice(0, 10);
}

function attendanceStaffId(record: AttendanceRecord) {
  return String(record.staff_id ?? record.staffId ?? record.staff?.id ?? record.staff?.staff_id ?? "");
}

function attendanceCheckInISO(record: AttendanceRecord) {
  if (!record.check_in) return "";
  const value = String(record.check_in);
  if (value.includes("T")) return value;
  const date = attendanceRecordDate(record);
  return date ? `${date}T${value.slice(0, 5)}:00+05:30` : value;
}

function attendanceShiftStartISO(
  record: AttendanceRecord,
  scheduleByStaffId: Map<string, any[]>,
  defaultShiftStart: string | null
) {
  const date = attendanceRecordDate(record);
  if (!date) return null;
  const scheduledShiftStart = getScheduleShiftStart(scheduleByStaffId.get(attendanceStaffId(record)), date);
  const shiftStartRaw = record.shift_start ?? record.scheduled_shift_start ?? record.scheduled_start ?? scheduledShiftStart ?? defaultShiftStart;
  if (!shiftStartRaw) return null;
  const value = String(shiftStartRaw);
  return value.includes("T") ? value : `${date}T${value.slice(0, 5)}:00+05:30`;
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
  const valueDate = String(value).slice(0, 10);
  return valueDate >= startDate && valueDate <= endDate;
}

function dailyRuleDate(startDate: string, endDate: string) {
  const today = ymd(new Date());
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
  }, { ...emptyCommissionSummary });
}

// The commission-rules list is salon-wide (no staff-specific query params),
// so every call returns the identical payload. Cache the in-flight/resolved
// promise at module scope so N staff falling back to fetchRuleMeta in the
// same payroll load share one request instead of firing N identical ones.
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

// Same "commissions/earned" endpoint the Commissions tab uses (and shows the
// correct, real ₹ amount from). It returns EVERY staff member's totals for
// one salon+month in a single call, so this fetches each month in the
// payroll period exactly once (not once per staff — that was making
// `staffOptions.length` identical requests to the same endpoint, one per
// staff, which is what made the page slow to load) and aggregates the rows
// into a per-staff map the caller can look up. Preferred over
// payroll commission summary endpoints: those may not exist in some deployments,
// usable total, and the fallback chain that follows ends up substituting the
// commission RULE's raw rate (e.g. "10" for 10%) as if it were a ₹ amount —
// which is what caused Payroll to show ₹10 instead of the real ₹120.
async function fetchAllStaffEarnedCommissions(
  salonId: string | undefined,
  startDate: string,
  endDate: string,
): Promise<Record<string, CommissionSummary>> {
  if (!salonId) return {};
  const months = monthKeysBetween(startDate, endDate);
  if (months.length === 0) return {};

  const rows = (
    await Promise.all(
      months.map((month) =>
        api
          .get(`${STAFF.BASE}/commissions/earned?salon_id=${salonId}&month=${month}`)
          .then((res) => res.data?.data ?? res.data ?? [])
          .catch(() => [])
      )
    )
  ).flat();

  const totalsByStaff = new Map<string, { total_commission: number; total_paid: number; total_pending: number }>();
  for (const row of rows as any[]) {
    const staffId = String(row.staff_id);
    const acc = totalsByStaff.get(staffId) ?? { total_commission: 0, total_paid: 0, total_pending: 0 };
    acc.total_commission += Number(row.total_earned) || 0;
    acc.total_paid += Number(row.paid_out) || 0;
    acc.total_pending += Number(row.pending_payout) || 0;
    totalsByStaff.set(staffId, acc);
  }

  const result: Record<string, CommissionSummary> = {};
  for (const [staffId, totals] of totalsByStaff) {
    result[staffId] = {
      ...emptyCommissionSummary,
      ...totals,
      calculated_commission: totals.total_pending || totals.total_commission,
    };
  }
  return result;
}

async function fetchStaffCommissionSummary(
  staffId: string,
  startDate: string,
  endDate: string,
): Promise<CommissionSummary> {
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

// Live per-staff tip totals for the period, straight from the tip
// settlement system (tip_earned/tip_settlements — see the Tip Settle tab on
// Commissions) rather than payroll_entries' flat, manually-typed `tips`
// column. One salon-wide call returns every staff member's total/paid/
// pending tips, so this stays visible in Payroll even for staff who have no
// payroll entry yet for the period — settling a tip only ever moves money
// between paid_out/pending_payout, it never removes it from total_tips.
async function fetchAllStaffEarnedTips(
  salonId: string | undefined,
  startDate: string,
  endDate: string,
): Promise<Record<string, TipSummary>> {
  if (!salonId) return {};

  const rows = await api
    .get(`${STAFF.BASE}/tips/earned`, { params: { salon_id: salonId, start_date: startDate, end_date: endDate } })
    .then((res) => res.data?.data ?? res.data ?? [])
    .catch(() => []);

  const result: Record<string, TipSummary> = {};
  for (const row of rows as any[]) {
    const staffId = String(row.staff_id);
    result[staffId] = {
      total_tips: Number(row.total_tips) || 0,
      pending_payout: Number(row.pending_payout) || 0,
      paid_out: Number(row.paid_out) || 0,
    };
  }
  return result;
}

function tipStatusFor(summary: TipSummary | undefined): StaffPayroll["tip_status"] {
  if (!summary || summary.total_tips <= 0) return "no_data";
  return summary.pending_payout > 0 ? "pending" : "paid";
}

// Derived payroll math

function netPay(e: StaffPayroll): number {
  return e.base_salary + e.commission + e.tips + e.bonus - e.salary_advance - e.deductions - e.half_day_deduction - e.late_deduction;
}
function pendingAmount(e: StaffPayroll): number {
  return Math.max(0, netPay(e) - e.paid_amount);
}
function hasPreviewPayrollData(e: StaffPayroll): boolean {
  return [
    e.base_salary,
    e.commission,
    e.tips,
    e.bonus,
    e.salary_advance,
    e.deductions,
    e.half_day_deduction,
    e.late_deduction,
    e.late_count,
    e.late_hours,
    e.attendance_working_days,
    e.per_day_salary,
    e.per_hour_salary,
  ].some((amount) => Math.abs(Number(amount) || 0) > 0);
}
function payrollStatus(e: StaffPayroll): PayrollStatus {
  if (!e.hasPayrollData && !hasPreviewPayrollData(e)) return "no_data";
  if (e.status === "done" || pendingAmount(e) <= 0) return "done";
  if (e.paid_amount > 0) return "in_progress";
  return "pending";
}

function paymentStatus(e: StaffPayroll): PaymentStatus {
  if (!e.hasPayrollData && !hasPreviewPayrollData(e)) return "no_data";
  if (e.paid_amount <= 0) return "unpaid";
  if (pendingAmount(e) <= 0) return "paid";
  return "partial";
}

function normalizePayrollStatus(value: unknown): PayrollStatus | undefined {
  const raw = String(value ?? "").toLowerCase();
  if (["done", "paid", "completed", "complete", "processed"].includes(raw)) return "done";
  if (["in_progress", "in progress", "partial", "partially_paid"].includes(raw)) return "in_progress";
  if (["pending", "unpaid"].includes(raw)) return "pending";
  return undefined;
}

function loadCompletedPayrollIds(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_PAYROLL_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveCompletedPayrollIds(ids: Set<string>) {
  try {
    localStorage.setItem(COMPLETED_PAYROLL_KEY, JSON.stringify([...ids]));
  } catch {
    // Local persistence is best-effort until the payroll API exposes mark-done.
  }
}

const staffFixedSalaryCache = new Map<string, number>();
const staffFixedSalaryRequests = new Map<string, Promise<number>>();

function getStaffRole(s: any): string {
  if (!s) return "Staff";
  const designation = s.designation || s.job_title || s.jobTitle || s.staff_designation;
  if (designation && String(designation).trim()) {
    return String(designation).trim();
  }
  const permLevel = String(s.permission_level || s.permissionLevel || s.staff_permission_level || s.role || "").toLowerCase();
  if (permLevel === "manager") {
    return "Manager";
  }
  if (s.role && String(s.role).trim() && String(s.role).toLowerCase() !== "staff") {
    return String(s.role).trim();
  }
  return "Staff";
}

function inlineStaffFixedSalary(staff: any): number | null {
  const salary = Number(staff.salary_amount ?? staff.fixed_salary);
  return Number.isFinite(salary) && salary > 0 ? salary : null;
}

async function getStaffFixedSalary(staff: any): Promise<number> {
  const staffId = String(staff.id);
  const inlineSalary = inlineStaffFixedSalary(staff);

  if (inlineSalary != null) {
    staffFixedSalaryCache.set(staffId, inlineSalary);
    return inlineSalary;
  }

  const cached = staffFixedSalaryCache.get(staffId);
  if (cached != null) return cached;

  const pending = staffFixedSalaryRequests.get(staffId);
  if (pending) return pending;

  const request = api.get(STAFF.WAGES(staffId))
    .then((res) => {
      const wages = res.data?.data || res.data;
      const salary = Number(wages?.salary_amount ?? wages?.fixed_salary);
      return wages?.compensation_type === "salary" && Number.isFinite(salary) ? salary : 0;
    })
    .catch(() => 0)
    .then((salary) => {
      staffFixedSalaryCache.set(staffId, salary);
      return salary;
    })
    .finally(() => {
      staffFixedSalaryRequests.delete(staffId);
    });

  staffFixedSalaryRequests.set(staffId, request);
  return request;
}

function mapEntryToRow(r: any): StaffPayroll {
  const id = String(r.id);
  const completedIds = loadCompletedPayrollIds();
  const commission =
    Number(r.commission) ||
    Number(r.commission_amount) ||
    Number(r.pending_commission) ||
    Number(r.total_pending) ||
    0;

  return {
    id,
    staff_id: r.staff_id,
    name: `${r.staff_first_name ?? ""} ${r.staff_last_name ?? ""}`.trim() || "Staff",
    role: getStaffRole(r),
    avatar: `${r.staff_first_name?.[0] ?? ""}${r.staff_last_name?.[0] ?? ""}`.toUpperCase() || "?",
    color: avatarColorFor(r.staff_id, r.staff_calendar_color),
    base_salary: Number(r.base_salary) || 0,
    commission,
    commission_earned: Number(r.commission_earned ?? r.total_commission) || 0,
    commission_paid: Number(r.commission_paid ?? r.total_paid) || 0,
    commission_frequency: (r.commission_frequency ?? r.frequency ?? r.payout_frequency) === "daily"
      ? "daily"
      : (r.commission_frequency ?? r.frequency ?? r.payout_frequency) === "monthly"
        ? "monthly"
        : "",
    commission_rule_name: String(r.commission_rule_name ?? r.rule_name ?? ""),
    commission_applicable_date: String(r.commission_applicable_date ?? r.applicable_date ?? r.date ?? ""),
    commission_payroll_period: String(r.commission_payroll_period ?? r.payroll_period ?? ""),
    calculated_commission: Number(r.calculated_commission) || commission,
    tips: Number(r.tips) || 0,
    tips_pending: 0,
    tips_paid: 0,
    tip_status: "no_data",
    bonus: Number(r.bonus) || 0,
    salary_advance: Number(r.salary_advance) || 0,
    deductions: Number(r.deductions) || 0,
    half_day_deduction: 0,
    half_day_count: 0,
    half_day_dates: [],
    late_count: 0,
    late_hours: 0,
    late_deduction: 0,
    attendance_working_days: 0,
    per_day_salary: 0,
    per_hour_salary: 0,
    paid_amount: Number(r.paid_amount) || 0,
    hasPayrollData: true,
    status: completedIds.has(id)
      ? "done"
      : normalizePayrollStatus(r.status ?? r.payroll_status),
    payment_method: r.payment_method ?? undefined,
    payment_date: r.payment_date ?? undefined,
  };
}

function mapStaffToEmptyPayroll(s: any, fixedSalary = 0): StaffPayroll {
  const staffId = String(s.id);
  const firstName = s.first_name ?? "";
  const lastName = s.last_name ?? "";
  const name = s.fullName || `${firstName} ${lastName}`.trim() || s.email || "Staff";

  return {
    id: `staff-${staffId}`,
    staff_id: staffId,
    name,
    role: getStaffRole(s),
    avatar: `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || name[0]?.toUpperCase() || "?",
    color: avatarColorFor(staffId, s.calendar_color),
    base_salary: fixedSalary,
    commission: 0,
    commission_earned: 0,
    commission_paid: 0,
    commission_frequency: "",
    commission_rule_name: "",
    commission_applicable_date: "",
    commission_payroll_period: "",
    calculated_commission: 0,
    tips: 0,
    tips_pending: 0,
    tips_paid: 0,
    tip_status: "no_data",
    bonus: 0,
    salary_advance: 0,
    deductions: 0,
    half_day_deduction: 0,
    half_day_count: 0,
    half_day_dates: [],
    late_count: 0,
    late_hours: 0,
    late_deduction: 0,
    attendance_working_days: 0,
    per_day_salary: 0,
    per_hour_salary: 0,
    paid_amount: 0,
    hasPayrollData: false,
    status: "no_data",
  };
}

// Summary Cards

function SummaryCards({ data, periodLabel }: { data: StaffPayroll[]; periodLabel: string }) {
  const { currencySymbol } = useCurrency();
  const fmt = (n: number) => fmtWhole(currencySymbol, n);

  const grossPayroll   = data.reduce((s, e) => s + e.base_salary + e.commission + e.tips + e.bonus, 0);
  // Must include salary_advance to match netPay()'s subtraction below —
  // otherwise Gross minus this card's total silently disagrees with Net
  // Payroll by however much salary advance was deducted, with no card
  // showing where that amount went.
  const totalDeductions = data.reduce((s, e) => s + e.deductions + e.half_day_deduction + e.late_deduction + e.salary_advance, 0);
  const netPayroll      = data.reduce((s, e) => s + netPay(e), 0);
  const totalPaid       = data.reduce((s, e) => s + e.paid_amount, 0);
  const totalPending    = data.reduce((s, e) => s + pendingAmount(e), 0);

  return (
    <div className="pr-cards">
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--blue"><People size={18} /></div>
        <div>
          <div className="pr-card-val">{data.length}</div>
          <div className="pr-card-label">Total Staff</div>
        </div>
      </div>
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--purple"><GraphUpArrow size={18} /></div>
        <div>
          <div className="pr-card-val">{fmt(grossPayroll)}</div>
          <div className="pr-card-label">Gross Payroll</div>
        </div>
      </div>
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--amber"><Wallet2 size={18} /></div>
        <div>
          <div className="pr-card-val">{fmt(totalDeductions)}</div>
          <div className="pr-card-label">Total Deductions</div>
        </div>
      </div>
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--purple"><CashStack size={18} /></div>
        <div>
          <div className="pr-card-val">{fmt(netPayroll)}</div>
          <div className="pr-card-label">Net Payroll</div>
        </div>
      </div>
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--green"><CheckCircleFill size={18} /></div>
        <div>
          <div className="pr-card-val">{fmt(totalPaid)}</div>
          <div className="pr-card-label">Total Paid</div>
        </div>
      </div>
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--amber"><ClockHistory size={18} /></div>
        <div>
          <div className="pr-card-val">{fmt(totalPending)}</div>
          <div className="pr-card-label">Total Pending</div>
        </div>
      </div>
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--blue"><CalendarRange size={18} /></div>
        <div>
          <div className="pr-card-val pr-card-val--sm">{periodLabel}</div>
          <div className="pr-card-label">Current Payroll Period</div>
        </div>
      </div>
    </div>
  );
}

function PayrollDetailsModal({
  staff,
  salaryAdvances,
  periodLabel,
  formatAmount,
  onClose,
  onMarkDone,
  onPrintReceipt,
}: {
  staff: StaffPayroll;
  salaryAdvances: SalaryAdvanceTransaction[];
  periodLabel: string;
  formatAmount: (amount: number) => string;
  onClose: () => void;
  onMarkDone: (staff: StaffPayroll) => void;
  onPrintReceipt: (staff: StaffPayroll) => void;
}) {
  const status = payrollStatus(staff);
  const advanceCount = salaryAdvances.length;
  const rows = [
    { label: "Monthly Salary", amount: staff.base_salary, showWhenSalaryExists: true },
    { label: "Commission", amount: staff.commission, showWhenAmountExists: true },
    { label: "Tips", amount: staff.tips, showWhenAmountExists: true },
    { label: "Bonus / Incentive", amount: staff.bonus, showWhenAmountExists: true },
    {
      label: advanceCount > 0 ? `Salary Advance (${advanceCount} times)` : "Salary Advance",
      amount: -staff.salary_advance,
      negative: true,
      showWhenAmountExists: true,
      note: advanceCount > 0 ? "View individual advances below" : undefined,
    },
    { label: "Deductions", amount: -staff.deductions, negative: true, showWhenAmountExists: true },
    { label: "Late Instances", amount: staff.late_count, plainNumber: true, showWhenAmountExists: true },
    { label: "Total Late Hours", amount: staff.late_hours, plainNumber: true, showWhenAmountExists: true },
    { label: "Working Days", amount: staff.attendance_working_days, plainNumber: true, showWhenAmountExists: true },
    { label: "Per Day Salary", amount: staff.per_day_salary, showWhenAmountExists: true },
    { label: "Per Hour Salary", amount: staff.per_hour_salary, showWhenAmountExists: true },
    {
      label: "Late Deduction",
      amount: -staff.late_deduction,
      negative: true,
      showWhenAmountExists: true,
    },
    {
      label: "Half Day Deduction",
      amount: -staff.half_day_deduction,
      negative: true,
      showWhenHalfDayExists: true,
      note: staff.half_day_count > 0
        ? `${HALF_DAY_DEDUCTION_REASON}${staff.half_day_count > 1 ? ` (${staff.half_day_count} days)` : ""}`
        : undefined,
    },
    {
      label: "Total Auto Deduction",
      amount: -(staff.late_deduction + staff.half_day_deduction),
      negative: true,
      showWhenAmountExists: true,
      note: staff.late_deduction + staff.half_day_deduction > 0 ? "Source: Attendance Rule" : undefined,
    },
  ];
  const hasSalary = staff.base_salary > 0;
  const hasHalfDayDeduction = staff.half_day_deduction > 0;
  const hasPreviewAmount = rows.some((row) => Math.abs(row.amount) > 0);
  const commissionFrequencyLabel = staff.commission_frequency
    ? staff.commission_frequency[0].toUpperCase() + staff.commission_frequency.slice(1)
    : "";
  const commissionPeriodLabel = staff.commission_frequency === "daily"
    ? staff.commission_applicable_date
    : staff.commission_payroll_period || periodLabel;
  const showCommissionMeta =
    staff.commission > 0 ||
    staff.commission_earned > 0 ||
    staff.commission_paid > 0 ||
    !!staff.commission_rule_name ||
    !!staff.commission_frequency;
  const amountLabel = (row: typeof rows[number]) => {
    const canShow =
      staff.hasPayrollData ||
      (row.showWhenSalaryExists && hasSalary) ||
      (row.showWhenHalfDayExists && hasHalfDayDeduction) ||
      (row.showWhenAmountExists && Math.abs(row.amount) > 0);
    if (!canShow) return "No Data";
    return row.plainNumber ? String(Number(row.amount.toFixed(2))) : formatAmount(row.amount);
  };

  return (
    <Modal show onClose={onClose} title="Payroll Details" size="md">
      <div className="pr-details">
        <div className="pr-details-head">
          <div className="pr-col--member">
            <div className="pr-avatar" style={{ "--avatar-bg": staff.color } as React.CSSProperties}>
              {staff.avatar}
            </div>
            <div>
              <div className="pr-details-name">{staff.name}</div>
              <div className="pr-details-meta">{staff.role} - {periodLabel}</div>
            </div>
          </div>
          <span className={`pr-badge ${STATUS_CONFIG[status].class}`}>{STATUS_CONFIG[status].label}</span>
        </div>

        <div className="pr-details-scroll">
          <div className="pr-details-list">
            {rows.map((row) => (
              <div className="pr-details-row" key={row.label}>
                <span>
                  {row.label}
                  {row.note && <small className="pr-details-reason">{row.note}</small>}
                </span>
                <strong className={row.negative ? "pr-deduct" : undefined}>
                  {amountLabel(row)}
                </strong>
              </div>
            ))}
          </div>

          {advanceCount > 0 && (
            <div className="pr-details-list">
              {salaryAdvances.map((advance) => (
                <div className="pr-details-row" key={advance.id}>
                  <span>
                    Advance on {advance.advance_date}
                    {advance.note && <small className="pr-details-reason">{advance.note}</small>}
                  </span>
                  <strong className="pr-deduct">-{formatAmount(advance.amount)}</strong>
                </div>
              ))}
            </div>
          )}

          {showCommissionMeta && (
            <div className="pr-details-list">
              <div className="pr-details-row">
                <span>Payout Frequency</span>
                <strong>{commissionFrequencyLabel || "No Rule"}</strong>
              </div>
              <div className="pr-details-row">
                <span>Commission Rule</span>
                <strong>{staff.commission_rule_name || "No Rule"}</strong>
              </div>
              <div className="pr-details-row">
                <span>{staff.commission_frequency === "daily" ? "Applicable Date" : "Payroll Period"}</span>
                <strong>{commissionPeriodLabel || "No Data"}</strong>
              </div>
              <div className="pr-details-row">
                <span>Commission Earned</span>
                <strong>{formatAmount(staff.commission_earned || staff.calculated_commission || staff.commission)}</strong>
              </div>
              <div className="pr-details-row">
                <span>Commission Paid</span>
                <strong>{formatAmount(staff.commission_paid)}</strong>
              </div>
              <div className="pr-details-row">
                <span>Commission Pending</span>
                <strong>{formatAmount(staff.calculated_commission || staff.commission)}</strong>
              </div>
            </div>
          )}

          {staff.tips > 0 && (
            <div className="pr-details-list">
              <div className="pr-details-row">
                <span>Tip Status</span>
                <span className={`pr-badge ${TIP_STATUS_CONFIG[staff.tip_status].class}`}>
                  {TIP_STATUS_CONFIG[staff.tip_status].label}
                </span>
              </div>
              <div className="pr-details-row">
                <span>Tips Paid</span>
                <strong>{formatAmount(staff.tips_paid)}</strong>
              </div>
              <div className="pr-details-row">
                <span>Tips Pending</span>
                <strong>{formatAmount(staff.tips_pending)}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="pr-details-total">
          <span>Net Payable Amount</span>
          <strong>{staff.hasPayrollData || hasSalary || hasPreviewAmount ? formatAmount(netPay(staff)) : "No Data"}</strong>
        </div>

        <div className="pr-details-actions">
          <button className="pr-btn pr-btn--outline" onClick={onClose}>Close</button>
          <button
            className="pr-btn pr-btn--outline"
            onClick={() => onPrintReceipt(staff)}
            disabled={!staff.hasPayrollData}
          >
            <Printer size={13} /> Print Receipt
          </button>
          <button
            className="pr-btn pr-btn--primary"
            onClick={() => onMarkDone(staff)}
            disabled={!staff.hasPayrollData || status === "done"}
          >
            Mark Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SalaryAdvanceModal({
  staffRows,
  selectedStaffId,
  advances,
  periodStart,
  periodEnd,
  formatAmount,
  onStaffChange,
  onClose,
  onSave,
  onDelete,
}: {
  staffRows: StaffPayroll[];
  selectedStaffId: string;
  advances: SalaryAdvanceTransaction[];
  periodStart: string;
  periodEnd: string;
  formatAmount: (amount: number) => string;
  onStaffChange: (staffId: string) => void;
  onClose: () => void;
  onSave: (values: { id?: string; staffId: string; amount: number; advance_date: string; note: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [advanceDate, setAdvanceDate] = useState(periodStart);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const total = advances.reduce((sum, advance) => sum + (Number(advance.amount) || 0), 0);
  const amountValue = Number(amount);
  const amountError = amountTouched && (!amount.trim() || !Number.isFinite(amountValue) || amountValue <= 0)
    ? (!amount.trim() ? "Amount is required" : "Enter a valid positive amount")
    : "";
  const canSave = !!selectedStaffId && Number.isFinite(amountValue) && amountValue > 0 && !!advanceDate && !saving;

  const resetForm = () => {
    setEditingId(null);
    setAmount("");
    setAdvanceDate(periodStart);
    setNote("");
    setAmountTouched(false);
  };

  const beginEdit = (advance: SalaryAdvanceTransaction) => {
    setEditingId(advance.id);
    setAmount(String(advance.amount || ""));
    setAdvanceDate(advance.advance_date || periodStart);
    setNote(advance.note ?? "");
  };

  const handleStaffChange = (staffId: string) => {
    onStaffChange(staffId);
    resetForm();
  };

  const handleSubmit = async () => {
    setAmountTouched(true);
    const numericAmount = Number(amount);
    if (!selectedStaffId || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    setSaving(true);
    try {
      await onSave({
        id: editingId ?? undefined,
        staffId: selectedStaffId,
        amount: numericAmount,
        advance_date: advanceDate,
        note,
      });
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show onClose={onClose} title="Salary Advance" size="lg">
      <div className="pr-advance">
        <div className="pr-advance-head">
          <div className="pr-advance-staff">
            <label className="pr-advance-label">Select Staff</label>
            <SearchableSelect<StaffPayroll>
              value={selectedStaffId}
              onChange={handleStaffChange}
              options={staffRows}
              getKey={(staff) => String(staff.staff_id)}
              getLabel={(staff) => `${staff.name} - ${staff.role}`}
              getSearchText={(staff) => `${staff.name} ${staff.role}`}
              placeholder="Choose staff"
              searchPlaceholder="Search staff..."
              className="pr-advance-select"
            />
          </div>
          <div className="pr-advance-total">
            <span>Total Advance</span>
            <strong>{formatAmount(total)}</strong>
            <small>{advances.length} time{advances.length === 1 ? "" : "s"}</small>
          </div>
        </div>

        <div className="pr-advance-form">
          <label>
            Amount
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => {
                const val = event.target.value;
                if (Number(val) < 0) return;
                setAmount(val);
              }}
              onBlur={() => setAmountTouched(true)}
              placeholder="Enter amount"
              className={amountError ? "pr-input--error" : ""}
              disabled={!selectedStaffId}
            />
            {amountError && <span className="pr-field-error">{amountError}</span>}
          </label>
          <label>
            Date
            <input
              type="date"
              min={periodStart}
              max={periodEnd}
              value={advanceDate}
              onChange={(event) => setAdvanceDate(event.target.value)}
              disabled={!selectedStaffId}
            />
          </label>
          <label className="pr-advance-note">
            Note
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional reason"
              disabled={!selectedStaffId}
            />
          </label>
          <div className="pr-advance-form-actions">
            <button className="pr-btn pr-btn--primary" type="button" onClick={handleSubmit} disabled={!canSave}>
              {editingId ? "Update Advance" : "Add Advance"}
            </button>
            {editingId && (
              <button className="pr-btn pr-btn--ghost" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="pr-advance-list">
          {!selectedStaffId ? (
            <div className="pr-advance-empty">Select a staff member to view and add salary advances.</div>
          ) : advances.length === 0 ? (
            <div className="pr-advance-empty">No salary advance added for this payroll period.</div>
          ) : (
            advances.map((advance) => (
              <div className="pr-advance-row" key={advance.id}>
                <div>
                  <strong>{formatAmount(advance.amount)}</strong>
                  <span>{advance.advance_date}{advance.note ? ` - ${advance.note}` : ""}</span>
                </div>
                <div className="pr-row-actions">
                  <button className="pr-icon-btn" type="button" title="Edit advance" onClick={() => beginEdit(advance)}>
                    <PencilSquare size={14} />
                  </button>
                  <button className="pr-icon-btn pr-icon-btn--danger" type="button" title="Delete advance" onClick={() => onDelete(advance.id)}>
                    <Trash3 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

// Page

export default function PayrollPage() {
  const { formatAmount, currencySymbol } = useCurrency();
  const fmt = (n: number) => fmtWhole(currencySymbol, n);
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const dispatch = useAppDispatch();
  const staffItems = useAppSelector((s) => s.staff.items);
  const currentSalon = useAppSelector((s) => s.salon.currentSalon);

  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: ymd(startOfMonth(now)),
      end: ymd(endOfMonth(now)),
    };
  });

  const [payrollEntries, setPayrollEntries] = useState<StaffPayroll[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvanceTransaction[]>([]);
  const [staffFixedSalaries, setStaffFixedSalaries] = useState<Record<string, number>>({});
  const [staffCommissionSummaries, setStaffCommissionSummaries] = useState<Record<string, CommissionSummary>>({});
  const [staffTipSummaries, setStaffTipSummaries] = useState<Record<string, TipSummary>>({});
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceRule, setAttendanceRule] = useState<HalfDayRuleConfig>(DEFAULT_HALF_DAY_RULE_CONFIG);
  const [defaultShiftStart, setDefaultShiftStart] = useState<string | null>(null);
  const [salaryDivisor, setSalaryDivisor] = useState(0);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payPreparingId, setPayPreparingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffPayroll | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [showSalaryAdvanceModal, setShowSalaryAdvanceModal] = useState(false);
  const [advanceStaffId, setAdvanceStaffId] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForStaffId, setAddForStaffId] = useState<string | undefined>(undefined);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    if (staffItems.length === 0) dispatch(fetchStaffThunk());
  }, [dispatch, staffItems.length]);

  // Close 3-dots action menu when clicking anywhere outside
  useEffect(() => {
    if (!openActionMenuId) return;
    const handleClickOutside = () => setOpenActionMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openActionMenuId]);

  useEffect(() => {
    let cancelled = false;
    api.get(ATTENDANCE.SETTINGS)
      .then((res) => {
        if (!cancelled) {
          const settings = res.data?.data ?? res.data;
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

  useEffect(() => {
    let cancelled = false;
    const activeStaff = (staffItems ?? []).filter((s: any) => s.is_active !== false);

    if (activeStaff.length === 0) {
      setStaffFixedSalaries({});
      return;
    }

    Promise.all(
      activeStaff.map(async (staff: any) => {
        const staffId = String(staff.id);
        return [staffId, await getStaffFixedSalary(staff)] as const;
      })
    ).then((entries) => {
      if (cancelled) return;
      const next = Object.fromEntries(entries);
      setStaffFixedSalaries((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        const same =
          prevKeys.length === nextKeys.length &&
          nextKeys.every((key) => prev[key] === next[key]);
        return same ? prev : next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [staffItems]);

  useEffect(() => {
    let cancelled = false;
    const activeStaff = (staffItems ?? []).filter((s: any) => s.is_active !== false);

    if (activeStaff.length === 0 || !dateRange.start || !dateRange.end) {
      setStaffCommissionSummaries({});
      return;
    }

    (async () => {
      // One salon-wide fetch covers every staff member who has real earned-
      // commission data for the period; only staff missing from it (e.g. a
      // brand-new hire the endpoint hasn't backfilled yet) fall back to the
      // slower per-staff lookup below.
      const earnedByStaff = await fetchAllStaffEarnedCommissions(currentSalon?.id, dateRange.start, dateRange.end);
      const staffNeedingFallback = activeStaff.filter((staff: any) => !earnedByStaff[String(staff.id)]);

      const fallbackEntries = await Promise.all(
        staffNeedingFallback.map(async (staff: any) => {
          const staffId = String(staff.id);
          try {
            return [staffId, await fetchStaffCommissionSummary(staffId, dateRange.start, dateRange.end)] as const;
          } catch {
            return [staffId, emptyCommissionSummary] as const;
          }
        })
      );

      if (!cancelled) {
        setStaffCommissionSummaries({ ...earnedByStaff, ...Object.fromEntries(fallbackEntries) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [staffItems, dateRange.start, dateRange.end, currentSalon?.id]);

  useEffect(() => {
    let cancelled = false;
    const activeStaff = (staffItems ?? []).filter((s: any) => s.is_active !== false);

    if (activeStaff.length === 0 || !dateRange.start || !dateRange.end) {
      setStaffTipSummaries({});
      return;
    }

    fetchAllStaffEarnedTips(currentSalon?.id, dateRange.start, dateRange.end).then((summaries) => {
      if (!cancelled) setStaffTipSummaries(summaries);
    });

    return () => {
      cancelled = true;
    };
  }, [staffItems, dateRange.start, dateRange.end, currentSalon?.id]);

  const periodStart = dateRange.start ? new Date(`${dateRange.start}T00:00:00`) : null;
  const periodEnd = dateRange.end ? new Date(`${dateRange.end}T00:00:00`) : null;
  const periodLabel = periodStart && periodEnd
    ? `${formatShort(periodStart)} - ${formatShortYear(periodEnd)}`
    : "Select a date range";

  const fetchPayrollEntries = async (start: Date, end: Date) => {
    try {
      const params = new URLSearchParams({ period_start: ymd(start), period_end: ymd(end) });
      const res = await api.get(PAYROLL.LIST(params.toString()));
      const items = res.data?.data?.items ?? [];
      setPayrollEntries(items.map(mapEntryToRow));
    } catch {
      setPayrollEntries([]);
      showError("Something went wrong, please try again");
    }
  };

  const normalizeSalaryAdvance = (item: any): SalaryAdvanceTransaction => ({
    id: String(item.id),
    staff_id: String(item.staff_id),
    amount: Number(item.amount) || 0,
    advance_date: String(item.advance_date ?? "").slice(0, 10),
    payroll_period_start: String(item.payroll_period_start ?? "").slice(0, 10),
    payroll_period_end: String(item.payroll_period_end ?? "").slice(0, 10),
    note: item.note ?? "",
    created_at: item.created_at,
  });

  const fetchSalaryAdvances = async (start: Date, end: Date) => {
    try {
      const res = await api.get(PAYROLL.SALARY_ADVANCES, {
        params: {
          period_start: ymd(start),
          period_end: ymd(end),
        },
      });
      const items = res.data?.data?.items ?? [];
      setSalaryAdvances(Array.isArray(items) ? items.map(normalizeSalaryAdvance) : []);
    } catch {
      setSalaryAdvances([]);
      showError("Failed to fetch salary advances");
    }
  };

  // Loads payroll rows for the selected period. Custom range only fetches
  // once both dates are picked. An incomplete range has nothing to query.
  useEffect(() => {
    if (periodStart && periodEnd) {
      fetchPayrollEntries(periodStart, periodEnd);
      fetchSalaryAdvances(periodStart, periodEnd);
    } else {
      setPayrollEntries([]);
      setSalaryAdvances([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    let cancelled = false;

    if (!dateRange.start || !dateRange.end) {
      setAttendanceRecords([]);
      return;
    }

    api.get(ATTENDANCE.RANGE, {
      params: {
        start_date: dateRange.start,
        end_date: dateRange.end,
      },
    })
      .then((res) => {
        if (cancelled) return;
        const records = res.data?.data?.records ?? res.data?.records ?? [];
        setAttendanceRecords(Array.isArray(records) ? records : []);
      })
      .catch(() => {
        if (!cancelled) setAttendanceRecords([]);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange.start, dateRange.end]);

  const halfDayDeductions = useMemo<Record<string, HalfDayDeductionSummary>>(() => {
    const salaryByStaffId = new Map<string, number>();
    const scheduleByStaffId = new Map<string, any[]>();
    const workingHoursByStaffId = new Map<string, number>();
    const salaryDays = salaryDivisor > 0 ? salaryDivisor : daysInPayrollPeriod(dateRange.start, dateRange.end);

    Object.entries(staffFixedSalaries).forEach(([staffId, salary]) => {
      salaryByStaffId.set(String(staffId), Number(salary) || 0);
    });

    (staffItems ?? []).forEach((staff: any) => {
      const staffId = String(staff.id);
      const schedule = Array.isArray(staff.schedule) ? staff.schedule : [];
      scheduleByStaffId.set(staffId, schedule);
      workingHoursByStaffId.set(
        staffId,
        positiveNumber(staff.working_hours_per_day) || workingHoursFromSchedule(schedule) || 8
      );
    });

    payrollEntries.forEach((entry) => {
      salaryByStaffId.set(String(entry.staff_id), entry.base_salary || salaryByStaffId.get(String(entry.staff_id)) || 0);
    });

    const workingDaysByStaffId = attendanceRecords.reduce<Map<string, number>>((acc, record) => {
      const staffId = attendanceStaffId(record);
      if (!staffId) return acc;
      const status = normalizeAttendanceStatus(record.status);
      if (!["present", "late", "half_day", "absent"].includes(status)) return acc;
      acc.set(staffId, (acc.get(staffId) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

    return attendanceRecords.reduce<Record<string, HalfDayDeductionSummary>>((acc, record) => {
      const staffId = attendanceStaffId(record);
      if (!staffId) return acc;
      if (!appliesToStaff(attendanceRule, staffId)) return acc;

      const storedStatus = normalizeAttendanceStatus(record.status);
      if (storedStatus === "not_marked" || storedStatus === "on_leave") return acc;

      const monthlySalary = salaryByStaffId.get(staffId) || 0;
      const totalWorkingDays = workingDaysByStaffId.get(staffId) ?? 0;
      const workingHoursPerDay = workingHoursByStaffId.get(staffId) || 8;
      const perDaySalary = salaryDays > 0 && monthlySalary > 0 ? monthlySalary / salaryDays : 0;
      const perHourSalary = workingHoursPerDay > 0 ? perDaySalary / workingHoursPerDay : 0;
      const existing = acc[staffId] ?? {
        count: 0,
        halfDayAmount: 0,
        lateCount: 0,
        lateHours: 0,
        lateAmount: 0,
        totalWorkingDays,
        perDaySalary,
        perHourSalary,
        dates: [],
      };

      const checkInISO = attendanceCheckInISO(record);
      const shiftStartISO = attendanceShiftStartISO(record, scheduleByStaffId, defaultShiftStart);
      const evaluation = checkInISO && shiftStartISO
        ? evaluateAttendanceCheckIn(attendanceRule, shiftStartISO, checkInISO, staffId, monthlySalary, totalWorkingDays)
        : null;
      const status = storedStatus === "half_day" || storedStatus === "late"
        ? storedStatus
        : evaluation?.status ?? storedStatus;
      if (status !== "half_day" && status !== "late") return acc;

      const lateMinutes = evaluation?.lateMinutes ?? numericOrZero(record.late_minutes ?? record.late_duration_minutes);
      const lateHours = Math.max(0, lateMinutes / 60);
      const billableLateHours = lateHours > 0 ? Math.max(1, lateHours) : 0;
      const rawLateDeduction = attendanceRule.late_deduction_type === "salary_per_hour"
        ? perHourSalary * billableLateHours
        : numericOrZero(attendanceRule.late_deduction_amount);
      const nextLateAmount = existing.lateAmount + (status === "late" && attendanceRule.late_rule_active ? Math.max(0, rawLateDeduction) : 0);
      const cappedLateAmount = attendanceRule.max_late_deduction != null
        ? Math.min(nextLateAmount, attendanceRule.max_late_deduction)
        : nextLateAmount;

      acc[staffId] = {
        count: existing.count + (status === "half_day" ? 1 : 0),
        halfDayAmount: existing.halfDayAmount + (status === "half_day" ? (Math.max(0, numericOrZero(attendanceRule.half_day_deduction_amount)) || (perDaySalary / 2)) : 0),
        lateCount: existing.lateCount + (status === "late" ? 1 : 0),
        lateHours: existing.lateHours + (status === "late" ? lateHours : 0),
        lateAmount: cappedLateAmount,
        totalWorkingDays,
        perDaySalary,
        perHourSalary,
        dates: record.date ? [...existing.dates, record.date] : existing.dates,
      };

      return acc;
    }, {});
  }, [attendanceRecords, payrollEntries, staffFixedSalaries, staffItems, attendanceRule, defaultShiftStart, salaryDivisor, dateRange.start, dateRange.end]);

  const salaryAdvanceTotals = useMemo<Record<string, number>>(() => {
    return salaryAdvances.reduce<Record<string, number>>((acc, advance) => {
      const staffId = String(advance.staff_id);
      acc[staffId] = (acc[staffId] ?? 0) + (Number(advance.amount) || 0);
      return acc;
    }, {});
  }, [salaryAdvances]);

  const allStaffPayrollRows = useMemo(() => {
    const payrollByStaffId = new Map(payrollEntries.map((entry) => [String(entry.staff_id), entry]));
    const activeStaff = (staffItems ?? []).filter((s: any) => s.is_active !== false);
    const staffIds = new Set<string>();
    const withHalfDayDeduction = (row: StaffPayroll): StaffPayroll => {
      const deduction = halfDayDeductions[String(row.staff_id)];
      if (!deduction) return row;

      return {
        ...row,
        half_day_count: deduction.count,
        half_day_deduction: deduction.halfDayAmount,
        half_day_dates: deduction.dates,
        late_count: deduction.lateCount,
        late_hours: deduction.lateHours,
        late_deduction: deduction.lateAmount,
        attendance_working_days: deduction.totalWorkingDays,
        per_day_salary: deduction.perDaySalary,
        per_hour_salary: deduction.perHourSalary,
      };
    };
    const withSalaryAdvanceTotal = (row: StaffPayroll): StaffPayroll => {
      const total = salaryAdvanceTotals[String(row.staff_id)] ?? 0;
      return {
        ...row,
        salary_advance: total > 0 ? total : row.salary_advance,
      };
    };
    // Tips always come from the live tip-settlement summary (staffTipSummaries,
    // sourced from /staff/tips/earned — see fetchAllStaffEarnedTips above),
    // never from payroll_entries' flat `tips` column — that keeps a staff
    // member's real tip total visible in Payroll whether or not it's been
    // settled yet, and whether or not a payroll entry even exists for them.
    const withTipSummary = (row: StaffPayroll): StaffPayroll => {
      const tipSummary = staffTipSummaries[String(row.staff_id)];
      if (!tipSummary) return row;
      return {
        ...row,
        tips: tipSummary.total_tips,
        tips_pending: tipSummary.pending_payout,
        tips_paid: tipSummary.paid_out,
        tip_status: tipStatusFor(tipSummary),
      };
    };

    const rows = activeStaff.map((staff: any) => {
      const staffId = String(staff.id);
      staffIds.add(staffId);
      const payroll = payrollByStaffId.get(staffId);
      const staffRow = mapStaffToEmptyPayroll(staff, staffFixedSalaries[staffId] || 0);
      const commissionSummary = staffCommissionSummaries[staffId];

      // Commission Earned/Paid always come from the live settlement summary
      // (staffCommissionSummaries, sourced from /commissions/earned — see
      // fetchAllStaffEarnedCommissions above) rather than whatever was
      // snapshotted onto a saved payroll entry, so a settlement made on the
      // Commissions page is reflected here the next time this page loads —
      // no separate "refresh" step needed.
      const row = payroll
        ? {
            ...payroll,
            name: staffRow.name,
            role: staffRow.role,
            avatar: staffRow.avatar,
            color: staffRow.color,
            commission_earned: commissionSummary?.total_commission ?? payroll.commission_earned ?? 0,
            commission_paid: commissionSummary?.total_paid ?? payroll.commission_paid ?? 0,
          }
        : {
            ...staffRow,
            commission: commissionSummary?.total_pending || 0,
            commission_earned: commissionSummary?.total_commission || 0,
            commission_paid: commissionSummary?.total_paid || 0,
            commission_frequency: (commissionSummary?.frequency || "") as StaffPayroll["commission_frequency"],
            commission_rule_name: commissionSummary?.rule_name || "",
            commission_applicable_date: commissionSummary?.applicable_date || "",
            commission_payroll_period: commissionSummary?.payroll_period || "",
            calculated_commission: commissionSummary?.calculated_commission || commissionSummary?.total_pending || 0,
          };

      return withTipSummary(withSalaryAdvanceTotal(withHalfDayDeduction(row)));
    });

    const payrollWithoutStaff = payrollEntries
      .filter((entry) => !staffIds.has(String(entry.staff_id)))
      .map((entry) => withTipSummary(withSalaryAdvanceTotal(withHalfDayDeduction(entry))));
    return [...rows, ...payrollWithoutStaff];
  }, [staffItems, payrollEntries, staffFixedSalaries, staffCommissionSummaries, staffTipSummaries, halfDayDeductions, salaryAdvanceTotals]);

  const filterFields = useMemo<JiraFilterField[]>(() => [
    {
      key: "staff",
      label: "Staff",
      searchable: true,
      options: allStaffPayrollRows.map((staff) => ({ id: String(staff.staff_id), label: staff.name })),
    },
    {
      key: "payroll_status",
      label: "Payroll Status",
      options: [
        { id: "no_data", label: "No Data" },
        { id: "pending", label: "Pending" },
        { id: "in_progress", label: "In Progress" },
        { id: "done", label: "Done" },
      ],
    },
    {
      key: "payment_status",
      label: "Payment Status",
      options: [
        { id: "no_data", label: "No Data" },
        { id: "unpaid", label: "Unpaid" },
        { id: "partial", label: "Partially Paid" },
        { id: "paid", label: "Paid" },
      ],
    },
  ], [allStaffPayrollRows]);

  const filtered = useMemo(() => allStaffPayrollRows.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase());
    const staffFilter = selectedFilters.staff ?? [];
    const payrollStatusFilter = selectedFilters.payroll_status ?? [];
    const paymentStatusFilter = selectedFilters.payment_status ?? [];
    const matchStaff = staffFilter.length === 0 || staffFilter.includes(String(e.staff_id));
    const matchPayrollStatus = payrollStatusFilter.length === 0 || payrollStatusFilter.includes(payrollStatus(e));
    const matchPaymentStatus = paymentStatusFilter.length === 0 || paymentStatusFilter.includes(paymentStatus(e));

    return matchSearch && matchStaff && matchPayrollStatus && matchPaymentStatus;
  }), [allStaffPayrollRows, search, selectedFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedFilters, dateRange.start, dateRange.end, pageSize]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const activeFilterChips = useMemo(() => {
    return filterFields.flatMap((field) => {
      const ids = selectedFilters[field.key] ?? [];
      if (ids.length === 0) return [];
      return ids.map((id) => ({
        key: `${field.key}-${id}`,
        fieldKey: field.key,
        id,
        label: field.options.find((option) => option.id === id)?.label ?? id,
      }));
    });
  }, [filterFields, selectedFilters]);

  const removeFilterChip = (fieldKey: string, id: string) => {
    const nextIds = (selectedFilters[fieldKey] ?? []).filter((value) => value !== id);
    setSelectedFilters({
      ...selectedFilters,
      [fieldKey]: nextIds,
    });
  };

  const payingStaff = allStaffPayrollRows.find((e) => e.id === payingId) ?? null;
  const detailsStaff = allStaffPayrollRows.find((e) => e.id === detailsId) ?? null;
  const editingStaff = allStaffPayrollRows.find((e) => e.id === editingId && e.hasPayrollData) ?? null;
  const detailSalaryAdvances = detailsStaff
    ? salaryAdvances.filter((advance) => String(advance.staff_id) === String(detailsStaff.staff_id))
    : [];
  const selectedStaffAdvances = salaryAdvances.filter((advance) => String(advance.staff_id) === String(advanceStaffId));

  const handleConfirmPayment = async (amount: number, method: string, date: string) => {
    if (!payingId) return;
    try {
      const res = await api.post(PAYROLL.PAY(payingId), {
        amount,
        payment_method: method,
        payment_date: date,
      });
      const updated = mapEntryToRow(res.data?.data);
      setPayrollEntries((prev) => prev.map((e) => (e.id === payingId ? updated : e)));
      showSuccess("Salary payment recorded successfully");
      setPayingId(null);
    } catch (err: any) {
      showError(err?.message ?? "Failed to process payment");
      throw err;
    }
  };

  const handleMarkDone = (staff: StaffPayroll) => {
    if (!staff.hasPayrollData) {
      showError("No payroll data available for this staff member");
      return;
    }
    const completedIds = loadCompletedPayrollIds();
    completedIds.add(staff.id);
    saveCompletedPayrollIds(completedIds);
    setPayrollEntries((prev) => prev.map((e) => (e.id === staff.id ? { ...e, status: "done" } : e)));
    showSuccess("Payroll marked as done");
  };

  // Staff not already on this period's payroll. Only these are selectable
  // in "Add Payroll Entry" (one row per staff member per period).
  const addedStaffIds = new Set(payrollEntries.map((e) => String(e.staff_id)));
  const staffOptions: StaffOption[] = (staffItems ?? [])
    .filter((s: any) => s.is_active !== false && !addedStaffIds.has(String(s.id)))
    .map((s: any) => ({
      id: s.id,
      name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email,
      role: getStaffRole(s),
      avatar: `${(s.first_name?.[0] ?? "").toUpperCase()}${(s.last_name?.[0] ?? "").toUpperCase()}` || "?",
      color: avatarColorFor(s.id, s.calendar_color),
      working_hours_per_day: s.working_hours_per_day,
      schedule: Array.isArray(s.schedule) ? s.schedule : [],
    }));
  const editStaffOptions: StaffOption[] = editingStaff
    ? [
        {
          id: editingStaff.staff_id,
          name: editingStaff.name,
          role: editingStaff.role,
          avatar: editingStaff.avatar,
          color: editingStaff.color,
          working_hours_per_day: staffItems.find((s: any) => String(s.id) === String(editingStaff.staff_id))?.working_hours_per_day,
          schedule: staffItems.find((s: any) => String(s.id) === String(editingStaff.staff_id))?.schedule ?? [],
        },
        ...staffOptions,
      ]
    : staffOptions;

  const handleAddEntry = async (values: {
    staffId: string;
    base_salary: number;
    commission: number;
    tips: number;
    bonus: number;
    salary_advance: number;
    deductions: number;
  }) => {
    if (!periodStart || !periodEnd) { showError("Something went wrong, please try again"); return; }
    try {
      const res = await api.post(PAYROLL.BASE, {
        staff_id: values.staffId,
        period_type: periodType,
        period_start: ymd(periodStart),
        period_end: ymd(periodEnd),
        base_salary: values.base_salary,
        commission: values.commission,
        tips: values.tips,
        bonus: values.bonus,
        salary_advance: values.salary_advance,
        deductions: values.deductions,
      });
      setPayrollEntries((prev) => [...prev, mapEntryToRow(res.data?.data)]);
      setShowAddModal(false);
      showSuccess("Payroll updated successfully");
    } catch (err: any) {
      showError(err?.message ?? "Something went wrong, please try again");
    }
  };

  const handleEditEntry = async (values: {
    staffId: string;
    base_salary: number;
    commission: number;
    tips: number;
    bonus: number;
    salary_advance: number;
    deductions: number;
  }) => {
    if (!editingStaff) return;
    try {
      const res = await api.patch(PAYROLL.BY_ID(editingStaff.id), {
        base_salary: values.base_salary,
        commission: values.commission,
        tips: values.tips,
        bonus: values.bonus,
        salary_advance: values.salary_advance,
        deductions: values.deductions,
      });
      const updated = mapEntryToRow(res.data?.data);
      setPayrollEntries((prev) => prev.map((entry) => (entry.id === editingStaff.id ? updated : entry)));
      setEditingId(null);
      showSuccess("Payroll entry updated successfully");
    } catch (err: any) {
      showError(err?.message ?? "Failed to update payroll entry");
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteTarget || deleteInput !== "DELETE") return;
    try {
      await api.delete(PAYROLL.BY_ID(deleteTarget.id));
      setPayrollEntries((prev) => prev.filter((entry) => entry.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteInput("");
      showSuccess("Payroll entry deleted successfully");
    } catch (err: any) {
      showError(err?.message ?? "Failed to delete payroll entry");
    }
  };

  const ensurePayrollEntryForPayment = async (row: StaffPayroll) => {
    if (row.hasPayrollData) return row;
    if (!periodStart || !periodEnd) {
      showError("Please select a payroll period first");
      return null;
    }

    setPayPreparingId(row.id);
    try {
      const res = await api.post(PAYROLL.BASE, {
        staff_id: row.staff_id,
        period_type: periodType,
        period_start: ymd(periodStart),
        period_end: ymd(periodEnd),
        base_salary: row.base_salary,
        commission: row.commission,
        tips: row.tips,
        bonus: row.bonus,
        salary_advance: row.salary_advance,
        deductions: row.deductions,
      });
      const created = mapEntryToRow(res.data?.data);
      setPayrollEntries((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      showError(err?.message ?? "Failed to prepare salary payment");
      return null;
    } finally {
      setPayPreparingId(null);
    }
  };

  const handleOpenPaySalary = async (row: StaffPayroll) => {
    const payableRow = await ensurePayrollEntryForPayment(row);
    if (payableRow) setPayingId(payableRow.id);
  };

  const handlePrintReceipt = (row: StaffPayroll) => {
    printPayrollReceipt(
      {
        staffName: row.name,
        role: row.role,
        base_salary: row.base_salary,
        commission: row.commission,
        tips: row.tips,
        bonus: row.bonus,
        salary_advance: row.salary_advance,
        deductions: row.deductions,
        half_day_deduction: row.half_day_deduction,
        late_deduction: row.late_deduction,
        paid_amount: row.paid_amount,
        payment_method: row.payment_method,
        payment_date: row.payment_date,
        status: row.status,
      },
      currentSalon,
      periodLabel,
      netPay(row),
      pendingAmount(row),
      { formatAmount },
    );
  };

  // A row can show "Done" purely from client-side math (e.g. salary advance
  // already covers the full base salary, so pendingAmount() is 0) before any
  // real payroll entry has been saved — this creates the entry (if missing)
  // and marks it done the same way "Mark Done" in the details modal does, so
  // the status is actually persisted instead of just looking settled.
  const handleSettleRow = async (row: StaffPayroll) => {
    const savedRow = await ensurePayrollEntryForPayment(row);
    if (savedRow) handleMarkDone(savedRow);
  };

  const handleSaveSalaryAdvance = async (values: { id?: string; staffId: string; amount: number; advance_date: string; note: string }) => {
    if (!dateRange.start || !dateRange.end) return;
    try {
      if (values.id) {
        const res = await api.patch(PAYROLL.SALARY_ADVANCE_BY_ID(values.id), {
          amount: values.amount,
          advance_date: values.advance_date,
          note: values.note,
        });
        const updated = normalizeSalaryAdvance(res.data?.data);
        setSalaryAdvances((prev) => prev.map((advance) => (advance.id === updated.id ? updated : advance)));
        showSuccess("Salary advance updated successfully");
      } else {
        const res = await api.post(PAYROLL.SALARY_ADVANCES, {
          staff_id: values.staffId,
          amount: values.amount,
          advance_date: values.advance_date,
          payroll_period_start: dateRange.start,
          payroll_period_end: dateRange.end,
          note: values.note,
        });
        const created = normalizeSalaryAdvance(res.data?.data);
        setSalaryAdvances((prev) => [created, ...prev]);
        showSuccess("Salary advance added successfully");
      }
    } catch (err: any) {
      showError(err?.message ?? "Failed to save salary advance");
      throw err;
    }
  };

  const handleDeleteSalaryAdvance = async (id: string) => {
    if (!window.confirm("Delete this salary advance transaction?")) return;
    try {
      await api.delete(PAYROLL.SALARY_ADVANCE_BY_ID(id));
      setSalaryAdvances((prev) => prev.filter((advance) => advance.id !== id));
      showSuccess("Salary advance deleted successfully");
    } catch (err: any) {
      showError(err?.message ?? "Failed to delete salary advance");
      throw err;
    }
  };

  return (
    <div className="payroll-page">
      {overlay}

      <div className="pr-header">
        <div>
          <h2 className="pr-title">Payroll Dashboard</h2>
          <p className="pr-subtitle">Review salary, commission, attendance deductions, and payments for each staff member.</p>
        </div>
        <div className="pr-header-actions">
          <button className="pr-btn pr-btn--primary" onClick={() => setShowAddModal(true)}>
            <PlusLg size={14} /> Add Entry
          </button>
        </div>
      </div>

      <SummaryCards data={filtered} periodLabel={periodLabel} />

      <section className="pr-controls">
        <div className="pr-controls__period">
          <div className="pr-control-icon">
            <CalendarRange size={17} />
          </div>
          <div className="pr-period-select-wrap">
            <label className="pr-period-label">Payroll Period</label>
            <DateRangeFilter
              value={{
                preset: derivePayrollDatePreset(dateRange.start, dateRange.end),
                startDate: dateRange.start,
                endDate: dateRange.end,
              }}
              onChange={(next) => {
                setPeriodType("custom");
                setDateRange({ start: next.startDate, end: next.endDate });
              }}
            />
          </div>
        </div>

        <div className="pr-controls__tools">
          <div className="pr-search-wrap">
            <SearchIcon size={14} className="pr-search-icon" />
            <input
              className="pr-search"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <JiraFilterMenu
            fields={filterFields}
            selected={selectedFilters}
            onApply={setSelectedFilters}
            triggerLabel="Filter"
          />
        </div>

        {(activeFilterChips.length > 0 || search.trim()) && (
          <div className="pr-active-filters">
            {search.trim() && (
              <span className="pr-chip">
                Search: {search.trim()}
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search">x</button>
              </span>
            )}
            {activeFilterChips.map((chip) => (
              <span className="pr-chip" key={chip.key}>
                {chip.label}
                <button type="button" onClick={() => removeFilterChip(chip.fieldKey, chip.id)} aria-label={`Remove ${chip.label}`}>x</button>
              </span>
            ))}
            <button type="button" className="pr-clear-filters" onClick={() => { setSearch(""); setSelectedFilters({}); }}>
              Clear all
            </button>
          </div>
        )}
      </section>

      <div className="pr-table-wrap">
        <div className="pr-table-head">
          <div>
            <h3 className="pr-table-title">Staff Payroll Details</h3>
            <p className="pr-table-subtitle">
              Showing {filtered.length} of {allStaffPayrollRows.length} staff for {periodLabel}
            </p>
          </div>
          <button
            className="pr-btn pr-btn--primary pr-btn--compact"
            type="button"
            onClick={() => {
              setAdvanceStaffId("");
              setShowSalaryAdvanceModal(true);
            }}
          >
            <PlusLg size={14} /> Add Advance
          </button>
        </div>
        <div className="pr-table-scroll">
          <table className="pr-table">
            <thead>
              <tr>
                <th className="pr-th--staff">Staff Name</th>
                <th>Role</th>
                <th>Base Salary</th>
                <th>Commission Paid</th>
                <th>Commission Pending</th>
                <th>Tips</th>
                <th>Tip Status</th>
                <th>Bonus / Incentive</th>
                <th>Salary Advance</th>
                <th>Deductions</th>
                <th>Late/Half-Day Deduction</th>
                <th>Net Pay</th>
                <th>Paid Amount</th>
                <th>Pending Amount</th>
                <th>Status</th>
                <th className="pr-th--actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={16}>
                    <div className="pr-empty">
                      <p>No staff found for the selected filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((e, idx) => {
                  const net = netPay(e);
                  const pending = pendingAmount(e);
                  const status = payrollStatus(e);
                  const cfg = STATUS_CONFIG[status];
                  const hasSalary = e.base_salary > 0;
                  const isBottomRow = idx >= pagedRows.length - 3 && pagedRows.length > 3;
                  const amountCell = (amount: number, className?: string, showWhenSalaryExists = false, showWhenHalfDayExists = false, showWhenAutoAmountExists = false) => {
                    const canShow =
                      e.hasPayrollData ||
                      (showWhenSalaryExists && hasSalary) ||
                      (showWhenHalfDayExists && e.half_day_deduction > 0) ||
                      (showWhenAutoAmountExists && amount > 0);
                    return (
                      <td className={className}>
                        {canShow ? fmt(amount) : "—"}
                      </td>
                    );
                  };
                  return (
                    <tr key={e.id} style={{ position: "relative", zIndex: openActionMenuId === e.id ? 9999 : undefined }}>
                      <td className="pr-th--staff">
                        <div className="pr-col--member">
                          <div className="pr-avatar" style={{ "--avatar-bg": e.color } as React.CSSProperties}>{e.avatar}</div>
                          <button className="pr-name-btn" type="button" onClick={() => setDetailsId(e.id)}>
                            {e.name}
                          </button>
                        </div>
                      </td>
                      <td>{e.role}</td>
                      {amountCell(e.base_salary, undefined, true)}
                      {amountCell(e.commission_paid, undefined, false, false, true)}
                      {amountCell(e.commission, undefined, false, false, true)}
                      <td>{e.tips > 0 ? fmt(e.tips) : "—"}</td>
                      <td>
                        <span className={`pr-badge ${TIP_STATUS_CONFIG[e.tip_status].class}`}>
                          {TIP_STATUS_CONFIG[e.tip_status].label}
                        </span>
                      </td>
                      {amountCell(e.bonus)}
                      <td>
                        {e.salary_advance > 0 ? (
                          <span className="pr-advance-summary">
                            <strong>{fmt(e.salary_advance)}</strong>
                            <small>{salaryAdvances.filter((advance) => String(advance.staff_id) === String(e.staff_id)).length} time(s)</small>
                          </span>
                        ) : (
                          <span className="pr-muted-cell">—</span>
                        )}
                      </td>
                      {amountCell(e.deductions)}
                      {amountCell(e.late_deduction + e.half_day_deduction, "pr-deduct", false, true)}
                      {amountCell(net, "pr-col--net", true)}
                      {amountCell(e.paid_amount)}
                      {amountCell(pending)}
                      <td>
                        <span className={`pr-badge ${cfg.class}`}>{cfg.label}</span>
                      </td>
                      <td className="pr-th--actions" style={{ zIndex: openActionMenuId === e.id ? 9999 : undefined }}>
                        <div className="pr-row-actions">
                          {status !== "done" && pending > 0 && (
                            <button
                              className="pr-pay-btn"
                              type="button"
                              disabled={payPreparingId === e.id}
                              onClick={() => handleOpenPaySalary(e)}
                            >
                              <CashStack size={13} /> {payPreparingId === e.id ? "Preparing..." : e.paid_amount > 0 ? "Pay remaining" : "Pay salary"}
                            </button>
                          )}

                          {status !== "done" && pending <= 0 && !e.hasPayrollData && hasPreviewPayrollData(e) && (
                            <button
                              className="pr-pay-btn"
                              type="button"
                              disabled={payPreparingId === e.id}
                              onClick={() => handleSettleRow(e)}
                            >
                              <CheckCircleFill size={13} /> {payPreparingId === e.id ? "Preparing..." : "Settle & mark done"}
                            </button>
                          )}

                          <div className="pr-action-menu-wrap">
                            <button
                              className={`pr-dots-btn ${openActionMenuId === e.id ? "active" : ""}`}
                              type="button"
                              title="Actions menu"
                              aria-label={`Actions menu for ${e.name}`}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setOpenActionMenuId(openActionMenuId === e.id ? null : e.id);
                              }}
                            >
                              <ThreeDots size={16} />
                            </button>

                            {openActionMenuId === e.id && (
                              <div
                                className={`pr-action-dropdown ${isBottomRow ? "pr-action-dropdown--up" : ""}`}
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                {e.hasPayrollData ? (
                                  <button
                                    className="pr-action-item"
                                    type="button"
                                    onClick={() => {
                                      setEditingId(e.id);
                                      setOpenActionMenuId(null);
                                    }}
                                  >
                                    <PencilSquare size={13} /> Edit entry
                                  </button>
                                ) : (
                                  <button
                                    className="pr-action-item"
                                    type="button"
                                    onClick={() => {
                                      setAddForStaffId(e.staff_id);
                                      setShowAddModal(true);
                                      setOpenActionMenuId(null);
                                    }}
                                  >
                                    <PlusLg size={13} /> Add payroll
                                  </button>
                                )}

                                {e.hasPayrollData && (
                                  <button
                                    className="pr-action-item"
                                    type="button"
                                    onClick={() => {
                                      handlePrintReceipt(e);
                                      setOpenActionMenuId(null);
                                    }}
                                  >
                                    <Printer size={13} /> Print receipt
                                  </button>
                                )}

                                <div className="pr-action-divider" />

                                <button
                                  className="pr-action-item pr-action-item--danger"
                                  type="button"
                                  disabled={!e.hasPayrollData}
                                  onClick={() => {
                                    if (e.hasPayrollData) {
                                      setDeleteTarget(e);
                                      setOpenActionMenuId(null);
                                    }
                                  }}
                                >
                                  <Trash3 size={13} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filtered.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {payingStaff && (
        <PaySalaryModal
          staffName={payingStaff.name}
          totalSalary={netPay(payingStaff)}
          paidAmount={payingStaff.paid_amount}
          pendingAmount={pendingAmount(payingStaff)}
          formatAmount={formatAmount}
          onConfirm={handleConfirmPayment}
          onClose={() => setPayingId(null)}
        />
      )}

      {detailsStaff && (
        <PayrollDetailsModal
          staff={detailsStaff}
          salaryAdvances={detailSalaryAdvances}
          periodLabel={periodLabel}
          formatAmount={formatAmount}
          onClose={() => setDetailsId(null)}
          onMarkDone={handleMarkDone}
          onPrintReceipt={handlePrintReceipt}
        />
      )}

      {showSalaryAdvanceModal && (
        <SalaryAdvanceModal
          staffRows={allStaffPayrollRows}
          selectedStaffId={advanceStaffId}
          advances={selectedStaffAdvances}
          periodStart={dateRange.start}
          periodEnd={dateRange.end}
          formatAmount={formatAmount}
          onStaffChange={setAdvanceStaffId}
          onSave={handleSaveSalaryAdvance}
          onDelete={handleDeleteSalaryAdvance}
          onClose={() => setShowSalaryAdvanceModal(false)}
        />
      )}

      {editingStaff && (
        <AddPayrollEntryModal
          mode="edit"
          staffOptions={editStaffOptions}
          startDate={dateRange.start}
          endDate={dateRange.end}
          initialValues={{
            staffId: editingStaff.staff_id,
            base_salary: editingStaff.base_salary,
            commission: editingStaff.commission,
            tips: editingStaff.tips,
            bonus: editingStaff.bonus,
            salary_advance: editingStaff.salary_advance,
            deductions: editingStaff.deductions,
          }}
          onSave={handleEditEntry}
          onClose={() => setEditingId(null)}
        />
      )}

      {deleteTarget && (
        <Modal
          show
          onClose={() => { setDeleteTarget(null); setDeleteInput(""); }}
          title="Delete payroll entry?"
          size="md"
          footer={
            <div className="d-flex flex-column gap-2 w-100">
              <Button
                variant="danger"
                fullWidth
                disabled={deleteInput !== "DELETE"}
                onClick={handleDeleteEntry}
              >
                Delete
              </Button>
              <Button
                variant="outline-dark"
                fullWidth
                onClick={() => { setDeleteTarget(null); setDeleteInput(""); }}
              >
                Cancel
              </Button>
            </div>
          }
        >
          <p className="text-muted small mb-4">
            Are you sure you want to delete the payroll entry for <strong>{deleteTarget.name}</strong> for {periodLabel}? This operation can't be undone.
          </p>
          <Input
            label="Type DELETE to confirm"
            placeholder="DELETE"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
          />
        </Modal>
      )}

      {showAddModal && (
        <AddPayrollEntryModal
          staffOptions={staffOptions}
          startDate={dateRange.start}
          endDate={dateRange.end}
          initialStaffId={addForStaffId}
          onSave={handleAddEntry}
          onClose={() => {
            setShowAddModal(false);
            setAddForStaffId(undefined);
          }}
        />
      )}
    </div>
  );
}

