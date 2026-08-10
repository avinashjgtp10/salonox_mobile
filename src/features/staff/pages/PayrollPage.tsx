import { useEffect, useMemo, useState } from "react";
import {
  Search as SearchIcon,
  ChevronLeft,
  ChevronRight,
  People,
  CashStack,
  Wallet2,
  GraphUpArrow,
  CheckCircleFill,
  ClockHistory,
  CalendarRange,
  PlusLg,
} from "react-bootstrap-icons";
import { useCurrency } from "../../../hooks/useCurrency";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import api from "../../../services/api/axios";
import { PAYROLL } from "../../../services/api/endpoints";
import PaySalaryModal from "../components/payroll/PaySalaryModal";
import AddPayrollEntryModal, { type StaffOption } from "../components/payroll/AddPayrollEntryModal";
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

// This page shows whole-rupee amounts (no ".00", no thousands separator) —
// a payroll-table-specific convention, not the app-wide currency format used
// by useCurrency().formatAmount elsewhere.
const fmtWhole = (symbol: string, n: number) => `${symbol}${Math.round(Number(n) || 0)}`;

// ─── Types ────────────────────────────────────────────────────────────────────

type PayStatus = "unpaid" | "partial" | "paid";
type PeriodType = "weekly" | "biweekly" | "monthly" | "custom";

interface EmployeePayroll {
  id: string;
  staff_id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  base_salary: number;
  commission: number;
  tips: number;
  bonus: number;
  salary_advance: number;
  deductions: number;
  paid_amount: number;
  payment_method?: string;
  payment_date?: string;
}

const STATUS_CONFIG: Record<PayStatus, { label: string; class: string }> = {
  unpaid:  { label: "Unpaid",         class: "pr-badge--unpaid" },
  partial: { label: "Partially Paid", class: "pr-badge--partial" },
  paid:    { label: "Paid",           class: "pr-badge--paid" },
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

const startOfWeek = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
};
const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const formatShort = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const formatShortYear = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
// Local YYYY-MM-DD — avoids the UTC-shift bug from Date#toISOString(), which
// can land the date on the wrong calendar day depending on the browser's timezone.
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function getPeriodRange(
  periodType: PeriodType,
  anchorDate: Date,
  customStart: string,
  customEnd: string
): { start: Date | null; end: Date | null } {
  switch (periodType) {
    case "weekly": {
      const start = startOfWeek(anchorDate);
      return { start, end: addDays(start, 6) };
    }
    case "biweekly": {
      const start = startOfWeek(anchorDate);
      return { start, end: addDays(start, 13) };
    }
    case "monthly":
      return { start: startOfMonth(anchorDate), end: endOfMonth(anchorDate) };
    case "custom":
      return {
        start: customStart ? new Date(`${customStart}T00:00:00`) : null,
        end: customEnd ? new Date(`${customEnd}T00:00:00`) : null,
      };
  }
}

function getPeriodLabel(periodType: PeriodType, anchorDate: Date, start: Date | null, end: Date | null): string {
  if (periodType === "monthly") return `${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
  if (!start || !end) return "Select a custom range";
  return `${formatShort(start)} – ${formatShortYear(end)}`;
}

// ─── Derived payroll math ─────────────────────────────────────────────────────

function netPay(e: EmployeePayroll): number {
  return e.base_salary + e.commission + e.tips + e.bonus - e.salary_advance - e.deductions;
}
function pendingAmount(e: EmployeePayroll): number {
  return Math.max(0, netPay(e) - e.paid_amount);
}
function payStatus(e: EmployeePayroll): PayStatus {
  if (e.paid_amount <= 0) return "unpaid";
  if (pendingAmount(e) <= 0) return "paid";
  return "partial";
}

function mapEntryToRow(r: any): EmployeePayroll {
  return {
    id: r.id,
    staff_id: r.staff_id,
    name: `${r.staff_first_name ?? ""} ${r.staff_last_name ?? ""}`.trim() || "Staff",
    role: r.staff_designation || "Staff",
    avatar: `${r.staff_first_name?.[0] ?? ""}${r.staff_last_name?.[0] ?? ""}`.toUpperCase() || "?",
    color: avatarColorFor(r.staff_id, r.staff_calendar_color),
    base_salary: Number(r.base_salary) || 0,
    commission: Number(r.commission) || 0,
    tips: Number(r.tips) || 0,
    bonus: Number(r.bonus) || 0,
    salary_advance: Number(r.salary_advance) || 0,
    deductions: Number(r.deductions) || 0,
    paid_amount: Number(r.paid_amount) || 0,
    payment_method: r.payment_method ?? undefined,
    payment_date: r.payment_date ?? undefined,
  };
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ data, periodLabel }: { data: EmployeePayroll[]; periodLabel: string }) {
  const { currencySymbol } = useCurrency();
  const fmt = (n: number) => fmtWhole(currencySymbol, n);

  const grossPayroll   = data.reduce((s, e) => s + e.base_salary + e.commission + e.tips + e.bonus, 0);
  const totalDeductions = data.reduce((s, e) => s + e.deductions, 0);
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { formatAmount, currencySymbol } = useCurrency();
  const fmt = (n: number) => fmtWhole(currencySymbol, n);
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const dispatch = useAppDispatch();
  const staffItems = useAppSelector((s) => s.staff.items);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PayStatus>("all");

  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [data, setData] = useState<EmployeePayroll[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { dispatch(fetchStaffThunk()); }, [dispatch]);

  const { start: periodStart, end: periodEnd } = getPeriodRange(periodType, anchorDate, customStart, customEnd);
  const periodLabel = getPeriodLabel(periodType, anchorDate, periodStart, periodEnd);

  const fetchPayrollEntries = async (start: Date, end: Date) => {
    try {
      const params = new URLSearchParams({ period_start: ymd(start), period_end: ymd(end) });
      const res = await api.get(PAYROLL.LIST(params.toString()));
      const items = res.data?.data?.items ?? [];
      setData(items.map(mapEntryToRow));
    } catch {
      setData([]);
      showError("Something went wrong, please try again");
    }
  };

  // Loads payroll rows for the selected period. Custom range only fetches
  // once both dates are picked — an incomplete range has nothing to query.
  useEffect(() => {
    if (periodStart && periodEnd) fetchPayrollEntries(periodStart, periodEnd);
    else setData([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, anchorDate, customStart, customEnd]);

  const prevPeriod = () => {
    if (periodType === "monthly") {
      setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else if (periodType === "weekly") {
      setAnchorDate((d) => addDays(d, -7));
    } else if (periodType === "biweekly") {
      setAnchorDate((d) => addDays(d, -14));
    }
    showSuccess("Payroll updated successfully");
  };
  const nextPeriod = () => {
    if (periodType === "monthly") {
      setAnchorDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else if (periodType === "weekly") {
      setAnchorDate((d) => addDays(d, 7));
    } else if (periodType === "biweekly") {
      setAnchorDate((d) => addDays(d, 14));
    }
    showSuccess("Payroll updated successfully");
  };

  const filtered = useMemo(() => data.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || payStatus(e) === statusFilter;
    return matchSearch && matchStatus;
  }), [data, search, statusFilter]);

  const payingEmployee = data.find((e) => e.id === payingId) ?? null;

  const handleConfirmPayment = async (amount: number, method: string, date: string) => {
    if (!payingId) return;
    try {
      const res = await api.post(PAYROLL.PAY(payingId), {
        amount,
        payment_method: method,
        payment_date: date,
      });
      const updated = mapEntryToRow(res.data?.data);
      setData((prev) => prev.map((e) => (e.id === payingId ? updated : e)));
      showSuccess("Salary payment recorded successfully");
      setPayingId(null);
    } catch (err: any) {
      showError(err?.message ?? "Failed to process payment");
      throw err;
    }
  };

  // Staff not already on this period's payroll — only these are selectable
  // in "Add Payroll Entry" (one row per employee per period).
  const addedStaffIds = new Set(data.map((e) => e.staff_id));
  const staffOptions: StaffOption[] = (staffItems ?? [])
    .filter((s: any) => s.is_active !== false && !addedStaffIds.has(s.id))
    .map((s: any) => ({
      id: s.id,
      name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email,
      role: s.designation || "Staff",
      avatar: `${(s.first_name?.[0] ?? "").toUpperCase()}${(s.last_name?.[0] ?? "").toUpperCase()}` || "?",
      color: avatarColorFor(s.id, s.calendar_color),
    }));

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
      setData((prev) => [...prev, mapEntryToRow(res.data?.data)]);
      setShowAddModal(false);
      showSuccess("Payroll updated successfully");
    } catch (err: any) {
      showError(err?.message ?? "Something went wrong, please try again");
    }
  };

  return (
    <div className="payroll-page">
      {overlay}

      <div className="pr-header">
        <h2 className="pr-title">Payroll Dashboard</h2>
        <button className="pr-btn pr-btn--primary" onClick={() => setShowAddModal(true)}>
          <PlusLg size={14} /> Add Entry
        </button>
      </div>

      <SummaryCards data={filtered} periodLabel={periodLabel} />

      {/* Payroll Period */}
      <div className="pr-period">
        <div className="pr-period-select-wrap">
          <label className="pr-period-label">Select Payroll Period</label>
          <select
            className="pr-filter-select"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {periodType === "custom" ? (
          <div className="pr-period-custom">
            <input
              type="date"
              className="pr-date-input"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              className="pr-date-input"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        ) : (
          <div className="pr-month-nav">
            <button className="pr-nav-btn" onClick={prevPeriod} title="Previous Period">
              <ChevronLeft size={15} />
            </button>
            <span className="pr-month-label">{periodLabel}</span>
            <button className="pr-nav-btn" onClick={nextPeriod} title="Next Period">
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="pr-toolbar">
        <div className="pr-search-wrap">
          <SearchIcon size={14} className="pr-search-icon" />
          <input
            className="pr-search"
            placeholder="Search staff members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="pr-filter-wrap">
          <select
            className="pr-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <h3 className="pr-table-title">Employee Payroll Details</h3>
      <div className="pr-table-wrap">
        <div className="pr-table-scroll">
          <table className="pr-table">
            <thead>
              <tr>
                <th className="pr-th--employee">Employee</th>
                <th>Role</th>
                <th>Base Salary</th>
                <th>Commission</th>
                <th>Tips</th>
                <th>Bonus / Incentive</th>
                <th>Salary Advance</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Paid Amount</th>
                <th>Pending Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13}>
                    <div className="pr-empty">
                      <p>No payroll data available for this period</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const net = netPay(e);
                  const pending = pendingAmount(e);
                  const status = payStatus(e);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <tr key={e.id}>
                      <td className="pr-th--employee">
                        <div className="pr-col--member">
                          <div className="pr-avatar" style={{ "--avatar-bg": e.color } as React.CSSProperties}>{e.avatar}</div>
                          <span className="pr-name">{e.name}</span>
                        </div>
                      </td>
                      <td>{e.role}</td>
                      <td>{fmt(e.base_salary)}</td>
                      <td>{fmt(e.commission)}</td>
                      <td>{fmt(e.tips)}</td>
                      <td>{fmt(e.bonus)}</td>
                      <td>{fmt(e.salary_advance)}</td>
                      <td>{fmt(e.deductions)}</td>
                      <td className="pr-col--net">{fmt(net)}</td>
                      <td>{fmt(e.paid_amount)}</td>
                      <td>{fmt(pending)}</td>
                      <td>
                        <span className={`pr-badge ${cfg.class}`}>{cfg.label}</span>
                      </td>
                      <td>
                        {status !== "paid" && (
                          <button className="pr-pay-btn" onClick={() => setPayingId(e.id)}>
                            Pay Salary
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payingEmployee && (
        <PaySalaryModal
          employeeName={payingEmployee.name}
          totalSalary={netPay(payingEmployee)}
          paidAmount={payingEmployee.paid_amount}
          pendingAmount={pendingAmount(payingEmployee)}
          formatAmount={formatAmount}
          onConfirm={handleConfirmPayment}
          onClose={() => setPayingId(null)}
        />
      )}

      {showAddModal && (
        <AddPayrollEntryModal
          staffOptions={staffOptions}
          onSave={handleAddEntry}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
