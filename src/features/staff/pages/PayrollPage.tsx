import { useState } from "react";
import {
  Search as SearchIcon,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClockHistory,
  PersonCheck,
  CheckCircleFill,
} from "react-bootstrap-icons";
import { useCurrency } from "../../../hooks/useCurrency";
import { getCurrencyIcon } from "../../../utils/currencyIcon";
import "../styles/PayrollPage.scss";

// ─── Types ────────────────────────────────────────────────────────────────────

type PayStatus = "pending" | "paid" | "processing";

interface StaffPayroll {
  id: string;
  name: string;
  role: string;
  avatar: string;
  color: string;
  hours_worked: number;
  hourly_rate: number;
  base_salary: number;
  commission: number;
  deductions: number;
  bonus: number;
  net_pay: number;
  status: PayStatus;
  bank_account?: string;
  payment_method: "bank_transfer" | "pay_manually";
}


const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];


const STATUS_CONFIG: Record<PayStatus, { label: string; class: string }> = {
  pending:    { label: "Pending",    class: "pr-badge--pending" },
  paid:       { label: "Paid",       class: "pr-badge--paid" },
  processing: { label: "Processing", class: "pr-badge--processing" },
};

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ data }: { data: StaffPayroll[] }) {
  const { formatAmount: fmt, currencyCode } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);
  const totalNet   = data.reduce((s, d) => s + d.net_pay, 0);
  const totalPaid  = data.filter((d) => d.status === "paid").reduce((s, d) => s + d.net_pay, 0);
  const pending    = data.filter((d) => d.status === "pending").length;
  const totalHours = data.reduce((s, d) => s + d.hours_worked, 0);

  return (
    <div className="pr-cards">
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--purple"><CurrencyIcon size={18} /></div>
        <div>
          <div className="pr-card-val">{fmt(totalNet)}</div>
          <div className="pr-card-label">Total payroll</div>
        </div>
      </div>
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--green"><CheckCircleFill size={18} /></div>
        <div>
          <div className="pr-card-val">{fmt(totalPaid)}</div>
          <div className="pr-card-label">Paid this month</div>
        </div>
      </div>
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--amber"><PersonCheck size={18} /></div>
        <div>
          <div className="pr-card-val">{pending}</div>
          <div className="pr-card-label">Pending payments</div>
        </div>
      </div>
      <div className="pr-card">
        <div className="pr-card-icon pr-card-icon--blue"><ClockHistory size={18} /></div>
        <div>
          <div className="pr-card-val">{totalHours}h</div>
          <div className="pr-card-label">Total hours worked</div>
        </div>
      </div>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function PayrollRow({
  member,
  onMarkPaid,
}: {
  member: StaffPayroll;
  onMarkPaid: (id: string) => void;
}) {
  const { formatAmount: fmt } = useCurrency();
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[member.status];

  return (
    <>
      <div className={`pr-row ${open ? "pr-row--open" : ""}`} onClick={() => setOpen(!open)}>
        <div className="pr-col pr-col--member">
          <div className="pr-avatar" style={{ "--avatar-bg": member.color } as React.CSSProperties}>{member.avatar}</div>
          <div>
            <div className="pr-name">{member.name}</div>
            <div className="pr-role">{member.role}</div>
          </div>
        </div>
        <div className="pr-col pr-col--hours">{member.hours_worked}h</div>
        <div className="pr-col pr-col--base">
          {member.base_salary > 0 ? fmt(member.base_salary) : fmt(member.hours_worked * member.hourly_rate)}
        </div>
        <div className="pr-col pr-col--commission">{fmt(member.commission)}</div>
        <div className="pr-col pr-col--deductions">{fmt(member.deductions)}</div>
        <div className="pr-col pr-col--net">{fmt(member.net_pay)}</div>
        <div className="pr-col pr-col--status" onClick={(e) => e.stopPropagation()}>
          <span className={`pr-badge ${cfg.class}`}>{cfg.label}</span>
          {member.status === "pending" && (
            <button
              className="pr-pay-btn"
              onClick={(e) => { e.stopPropagation(); onMarkPaid(member.id); }}
            >
              Mark paid
            </button>
          )}
        </div>
        <div className="pr-col pr-col--expand">
          <ChevronDown size={14} className={open ? "pr-chevron--open" : ""} />
        </div>
      </div>

      {open && (
        <div className="pr-detail">
          <div className="pr-detail-grid">
            <div className="pr-detail-block">
              <div className="pr-detail-title">Earnings breakdown</div>
              <div className="pr-detail-row">
                <span>Base {member.base_salary > 0 ? "salary" : "pay (hourly)"}</span>
                <span>{member.base_salary > 0 ? fmt(member.base_salary) : fmt(member.hours_worked * member.hourly_rate)}</span>
              </div>
              <div className="pr-detail-row">
                <span>Commissions</span>
                <span>{fmt(member.commission)}</span>
              </div>
              <div className="pr-detail-row">
                <span>Bonus</span>
                <span>{fmt(member.bonus)}</span>
              </div>
              <div className="pr-detail-row pr-detail-row--total">
                <span>Gross pay</span>
                <span>{fmt(member.net_pay + member.deductions)}</span>
              </div>
            </div>

            <div className="pr-detail-block">
              <div className="pr-detail-title">Deductions</div>
              <div className="pr-detail-row">
                <span>Total deductions</span>
                <span className="pr-deduct">−{fmt(member.deductions)}</span>
              </div>
              <div className="pr-detail-row pr-detail-row--total">
                <span>Net pay</span>
                <span>{fmt(member.net_pay)}</span>
              </div>
            </div>

            <div className="pr-detail-block">
              <div className="pr-detail-title">Payment info</div>
              <div className="pr-detail-row">
                <span>Method</span>
                <span>{member.payment_method === "bank_transfer" ? "Bank transfer" : "Manual"}</span>
              </div>
              {member.bank_account && (
                <div className="pr-detail-row">
                  <span>Account</span>
                  <span>{member.bank_account}</span>
                </div>
              )}
              <div className="pr-detail-row">
                <span>Status</span>
                <span className={`pr-badge ${cfg.class}`}>{cfg.label}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const today = new Date();

export default function PayrollPage() {
  const { currencyCode } = useCurrency();
  const CurrencyIcon = getCurrencyIcon(currencyCode);
  const [search, setSearch]       = useState("");
  const [viewYear, setYear]       = useState(today.getFullYear());
  const [viewMonth, setMonth]     = useState(today.getMonth());
  const [statusFilter, setStatus] = useState<"all" | PayStatus>("all");
  const [data, setData]           = useState<StaffPayroll[]>([]);

  const prevMonth = () => {
    if (viewMonth === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const handleMarkPaid = (id: string) => {
    setData((prev) => prev.map((d) => d.id === id ? { ...d, status: "paid" } : d));
  };

  const handleMarkAllPaid = () => {
    setData((prev) => prev.map((d) => d.status === "pending" ? { ...d, status: "processing" } : d));
  };

  const filtered = data.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = data.filter((d) => d.status === "pending").length;

  return (
    <div className="payroll-page">
      <div className="pr-header">
        <div>
          <h2 className="pr-title">Payroll</h2>
          <p className="pr-subtitle">Manage and process monthly payroll for your staff.</p>
        </div>
        <div className="pr-header-actions">
          <button className="pr-btn pr-btn--outline">
            <Download size={14} /> Export
          </button>
          {pendingCount > 0 && (
            <button className="pr-btn pr-btn--primary" onClick={handleMarkAllPaid}>
              Run payroll ({pendingCount} pending)
            </button>
          )}
        </div>
      </div>

      <SummaryCards data={data} />

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

        <div className="pr-toolbar-right">
          {/* Status filter */}
          <div className="pr-filter-wrap">
            <select
              className="pr-filter-select"
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
            </select>
            <ChevronDown size={12} className="pr-filter-chevron" />
          </div>

          {/* Month nav */}
          <div className="pr-month-nav">
            <button className="pr-nav-btn" onClick={prevMonth}><ChevronLeft size={15} /></button>
            <span className="pr-month-label">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button className="pr-nav-btn" onClick={nextMonth}><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="pr-table-wrap">
        <div className="pr-table-head">
          <div className="pr-col pr-col--member">Team member</div>
          <div className="pr-col pr-col--hours">Hours</div>
          <div className="pr-col pr-col--base">Base pay</div>
          <div className="pr-col pr-col--commission">Commission</div>
          <div className="pr-col pr-col--deductions">Deductions</div>
          <div className="pr-col pr-col--net">Net pay</div>
          <div className="pr-col pr-col--status">Status</div>
          <div className="pr-col pr-col--expand" />
        </div>

        <div className="pr-table-body">
          {filtered.length === 0 ? (
            <div className="pr-empty">
              <CurrencyIcon size={32} className="pr-empty__icon" />
              <p>No payroll records for this month.</p>
              <span>Settle commissions from the Commissions page to generate payroll entries.</span>
            </div>
          ) : (
            filtered.map((m) => (
              <PayrollRow key={m.id} member={m} onMarkPaid={handleMarkPaid} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}