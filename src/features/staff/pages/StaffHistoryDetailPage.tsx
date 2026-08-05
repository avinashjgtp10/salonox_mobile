import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import { deactivateStaffThunk, activateStaffThunk } from "../../../middleware/staff/staff.thunk";
import {
  ArrowLeft, PencilSquare, PersonX, PersonCheck, TelephoneFill, Calendar2Check,
  GraphUp, CashCoin, ClockHistory, Scissors, CreditCard2Front,
  ChatSquareText, Wallet2, ExclamationCircle, Search as SearchIcon, ChevronLeft, ChevronRight,
} from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF, SALE, ATTENDANCE, REVIEWS } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import "../styles/StaffHistoryPage.scss";

// ─── Shared types/helpers ───────────────────────────────────────────────────

interface StaffDetail {
  id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  employee_code?: string;
  phone_number?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  avatar_url?: string;
  created_at?: string;
  joined_date?: string;
}

interface SaleRow {
  id: string;
  client_name?: string | null;
  total_amount: string;
  status: string;
  payment_method: string | null;
  created_at: string;
}

interface SaleItemRow {
  id: string;
  item_type: string;
  name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  client_name: string | null;
  sale_created_at: string;
  payment_source?: string | null;
}

interface CommissionRow {
  id: string;
  category: string;
  revenue_amount: string;
  commission_kind: string;
  commission_rate: string;
  commission_amount: string;
  status: string;
  earned_at: string;
}

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  hours_worked: string | null;
}

function fmtDate(d: string | undefined | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d: string | undefined | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

function SourceBadge({ source }: { source: string }) {
  const key = source.toLowerCase();
  const tone =
    key === "membership" ? "membership" :
    key === "package"    ? "package"    :
    key.includes("ewallet") || key.includes("wallet") ? "wallet" :
    key.includes("reward") ? "reward" :
    "default";
  return <span className={`shp-source shp-source--${tone}`}>{source}</span>;
}

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)", "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#059669)", "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#ec4899,#f43f5e)", "linear-gradient(135deg,#8b5cf6,#6366f1)",
];
function getGradient(id: string) {
  const seed = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[seed % AVATAR_GRADIENTS.length];
}

function useFetch<T>(fetcher: () => Promise<T>, deps: any[], fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  const retry = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const attempt = (n: number): Promise<T> =>
      fetcher().catch((e: any) => {
        if (n <= 0) throw e;
        return new Promise((resolve) => setTimeout(resolve, 600)).then(() => attempt(n - 1));
      });
    attempt(2)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [...deps, tick]);

  return { data, loading, error, retry };
}

function EmptyState({ icon, text, note }: { icon: React.ReactNode; text: string; note?: string }) {
  return (
    <div className="shp-empty">
      {icon}
      <p>{text}</p>
      {note && <span className="shp-empty__note">{note}</span>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="shp-loading">
      <div className="shp-loading__spinner" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="shp-empty">
      <ExclamationCircle size={26} />
      <p>Couldn't load this — connection issue.</p>
      <button className="shp-btn shp-btn--primary" onClick={onRetry}>Retry</button>
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= pageSize) return null;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="shp-pagination">
      <div className="shp-pagination-info">
        Showing {start} to {end} of {totalItems} items
      </div>
      <div className="shp-pagination-controls">
        <button
          className="shp-page-btn"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          title="Previous Page"
        >
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            className={`shp-page-btn ${currentPage === page ? "active" : ""}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        <button
          className="shp-page-btn"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          title="Next Page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview",   label: "Overview" },
  { key: "timeline",   label: "Timeline" },
  { key: "services",   label: "Services" },
  { key: "sales",      label: "Sales" },
  { key: "commission", label: "Commission" },
  { key: "attendance", label: "Attendance" },
  { key: "payroll",    label: "Payroll" },
  { key: "notes",      label: "Notes & Feedback" },
] as const;
type TabKey = typeof TABS[number]["key"];

const TAB_PAGE_SIZE = 10;

// ─── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({ salesTotal, servicesRecent, commissionTotal, attendancePct }: {
  salesTotal: { loading: boolean; error: boolean; value: number; retry: () => void };
  servicesRecent: { loading: boolean; error: boolean; value: SaleItemRow[]; retry: () => void };
  commissionTotal: { loading: boolean; error: boolean; value: number; retry: () => void };
  attendancePct: { loading: boolean; error: boolean; value: number | null; retry: () => void };
}) {
  const { formatAmount: fmtMoney } = useCurrency();
  return (
    <div className="shp-overview">
      <div className="shp-stat-grid">
        <div className="shp-stat-card">
          <div className="shp-stat-card__icon shp-stat-card__icon--purple"><GraphUp size={18} /></div>
          <div>
            <div className="shp-stat-card__value">
              {salesTotal.loading ? "…" : salesTotal.error ? "—" : fmtMoney(salesTotal.value)}
            </div>
            <div className="shp-stat-card__label">Revenue Generated</div>
          </div>
        </div>
        <div className="shp-stat-card">
          <div className="shp-stat-card__icon shp-stat-card__icon--green"><CashCoin size={18} /></div>
          <div>
            <div className="shp-stat-card__value">
              {commissionTotal.loading ? "…" : commissionTotal.error ? "—" : fmtMoney(commissionTotal.value)}
            </div>
            <div className="shp-stat-card__label">Commission Earned (this month)</div>
          </div>
        </div>
        <div className="shp-stat-card">
          <div className="shp-stat-card__icon shp-stat-card__icon--amber"><Calendar2Check size={18} /></div>
          <div>
            <div className="shp-stat-card__value">
              {attendancePct.loading ? "…" : attendancePct.error || attendancePct.value == null ? "—" : `${attendancePct.value}%`}
            </div>
            <div className="shp-stat-card__label">Attendance (last 30 days)</div>
          </div>
        </div>
      </div>

      <div className="shp-two-col">
        <div className="shp-card">
          <div className="shp-card__header">
            <h3>Recent Services</h3>
          </div>
          {servicesRecent.loading ? <LoadingState /> : servicesRecent.error ? (
            <ErrorState onRetry={servicesRecent.retry} />
          ) : servicesRecent.value.length === 0 ? (
            <EmptyState icon={<Scissors size={26} />} text="No services recorded yet." />
          ) : (
            <div className="shp-recent-list">
              {servicesRecent.value.slice(0, 5).map((item) => (
                <div key={item.id} className="shp-recent-row">
                  <div className="shp-recent-row__icon"><Scissors size={14} /></div>
                  <div className="shp-recent-row__info">
                    <div className="shp-recent-row__title">{item.name}</div>
                    <div className="shp-recent-row__sub">
                      {item.client_name ?? "Walk-in"} · {fmtDate(item.sale_created_at)}
                      {item.payment_source && <> · <SourceBadge source={item.payment_source} /></>}
                    </div>
                  </div>
                  <div className="shp-recent-row__amount">{fmtMoney(Number(item.total_price))}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shp-card">
          <div className="shp-card__header"><h3>Recent Activity</h3></div>
          <EmptyState
            icon={<ClockHistory size={26} />}
            text="Activity tracking isn't set up yet."
            note="Check-ins, sales, and milestones will show here once activity logging is added."
          />
        </div>
      </div>

      <div className="shp-two-col">
        <div className="shp-card">
          <div className="shp-card__header"><h3>Target Progress</h3></div>
          <EmptyState
            icon={<GraphUp size={26} />}
            text="Targets aren't configured for this staff member yet."
          />
        </div>
        <div className="shp-card">
          <div className="shp-card__header"><h3>Upcoming Payout</h3></div>
          <EmptyState
            icon={<Wallet2 size={26} />}
            text="Payout scheduling isn't tracked yet."
          />
        </div>
      </div>
    </div>
  );
}

// ─── Timeline tab ────────────────────────────────────────────────────────────

function TimelineTab({ staffId }: { staffId: string }) {
  const { formatAmount: fmtMoney } = useCurrency();
  const [typeFilter, setTypeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: items, loading, error, retry } = useFetch<SaleItemRow[]>(
    () => api.get(SALE.STAFF_ITEMS(staffId), { params: { limit: 100 } }).then((r) => r.data?.data?.items ?? []),
    [staffId], []
  );
  const { data: attendance, loading: attLoading, error: attError } = useFetch<AttendanceRow[]>(
    () => api.get(ATTENDANCE.FOR_STAFF(staffId), { params: { limit: 100 } }).then((r) => r.data?.data?.items ?? []),
    [staffId], []
  );

  const events = useMemo(() => {
    const svcEvents = items.map((i) => ({
      type: "service" as const, at: i.sale_created_at,
      title: i.name, sub: i.client_name ?? "Walk-in", amount: Number(i.total_price),
    }));
    const checkInEvents = attendance
      .filter((a) => a.check_in)
      .map((a) => ({
        type: "attendance" as const, at: a.check_in!,
        title: a.status === "half_day" ? "Half Day" : "Checked In", sub: fmtDate(a.date), amount: null,
      }));
    const checkOutEvents = attendance
      .filter((a) => a.check_out)
      .map((a) => ({
        type: "attendance" as const, at: a.check_out!,
        title: "Checked Out", sub: fmtDate(a.date), amount: null,
      }));
    return [...svcEvents, ...checkInEvents, ...checkOutEvents].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [items, attendance]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesType = typeFilter === "all" || e.type === typeFilter;
      const eventDate = e.at ? e.at.slice(0, 10) : "";
      const matchesStart = !startDate || eventDate >= startDate;
      const matchesEnd = !endDate || eventDate <= endDate;
      return matchesType && matchesStart && matchesEnd;
    });
  }, [events, typeFilter, startDate, endDate]);

  useEffect(() => { setCurrentPage(1); }, [typeFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredEvents.length / TAB_PAGE_SIZE) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * TAB_PAGE_SIZE;
    return filteredEvents.slice(start, start + TAB_PAGE_SIZE);
  }, [filteredEvents, currentPage]);

  if (loading || attLoading) return <LoadingState />;
  if (error || attError) return <ErrorState onRetry={retry} />;

  return (
    <div>
      <div className="shp-filter-bar">
        <div className="shp-filter-group">
          <label>Type:</label>
          <select className="shp-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Events</option>
            <option value="service">Services</option>
            <option value="attendance">Attendance</option>
          </select>
        </div>
        <div className="shp-filter-group">
          <label>From:</label>
          <input className="shp-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="shp-filter-group">
          <label>To:</label>
          <input className="shp-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState icon={<ClockHistory size={26} />} text="No history events found matching criteria." />
      ) : (
        <>
          <div className="shp-timeline">
            {paginatedEvents.map((e, i) => (
              <div key={i} className="shp-timeline-row">
                <div className={`shp-timeline-row__dot shp-timeline-row__dot--${e.type}`} />
                <div className="shp-timeline-row__info">
                  <div className="shp-timeline-row__title">{e.title}</div>
                  <div className="shp-timeline-row__sub">{e.sub} · {fmtDateTime(e.at)}</div>
                </div>
                {e.amount != null && <div className="shp-timeline-row__amount">{fmtMoney(e.amount)}</div>}
              </div>
            ))}
          </div>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredEvents.length}
            pageSize={TAB_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

// ─── Services tab ────────────────────────────────────────────────────────────

function ServicesTab({ staffId }: { staffId: string }) {
  const { formatAmount: fmtMoney } = useCurrency();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, error, retry } = useFetch<SaleItemRow[]>(
    () => api.get(SALE.STAFF_ITEMS(staffId), { params: { item_type: "service", limit: 200 } }).then((r) => r.data?.data?.items ?? []),
    [staffId], []
  );

  const filtered = useMemo(() => {
    return data.filter((i) => {
      const q = search.toLowerCase();
      const name = i.name.toLowerCase();
      const client = (i.client_name ?? "Walk-in").toLowerCase();
      const matchesSearch = !q || name.includes(q) || client.includes(q);

      const source = (i.payment_source || "").toLowerCase();
      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "membership" && source.includes("membership")) ||
        (sourceFilter === "package" && source.includes("package")) ||
        (sourceFilter === "wallet" && (source.includes("wallet") || source.includes("ewallet"))) ||
        (sourceFilter === "direct" && !source.includes("membership") && !source.includes("package"));

      const d = i.sale_created_at ? i.sale_created_at.slice(0, 10) : "";
      const matchesStart = !startDate || d >= startDate;
      const matchesEnd = !endDate || d <= endDate;

      return matchesSearch && matchesSource && matchesStart && matchesEnd;
    });
  }, [data, search, sourceFilter, startDate, endDate]);

  useEffect(() => { setCurrentPage(1); }, [search, sourceFilter, startDate, endDate]);

  const totalPages = Math.ceil(filtered.length / TAB_PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * TAB_PAGE_SIZE;
    return filtered.slice(start, start + TAB_PAGE_SIZE);
  }, [filtered, currentPage]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div>
      <div className="shp-filter-bar">
        <div className="shp-search-input">
          <SearchIcon size={14} />
          <input
            placeholder="Search service or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="shp-filter-group">
          <label>Source:</label>
          <select className="shp-select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="all">All Sources</option>
            <option value="direct">Direct Payment</option>
            <option value="membership">Membership</option>
            <option value="package">Package</option>
            <option value="wallet">eWallet</option>
          </select>
        </div>
        <div className="shp-filter-group">
          <label>From:</label>
          <input className="shp-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="shp-filter-group">
          <label>To:</label>
          <input className="shp-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Scissors size={26} />} text="No services found matching your filters." />
      ) : (
        <>
          <table className="shp-table">
            <thead><tr><th>Date</th><th>Client</th><th>Service</th><th>Paid Via</th><th>Qty</th><th>Amount</th></tr></thead>
            <tbody>
              {paginatedData.map((i) => (
                <tr key={i.id}>
                  <td>{fmtDate(i.sale_created_at)}</td>
                  <td>{i.client_name ?? "Walk-in"}</td>
                  <td>{i.name}</td>
                  <td>{i.payment_source ? <SourceBadge source={i.payment_source} /> : "—"}</td>
                  <td>{i.quantity}</td>
                  <td>{fmtMoney(Number(i.total_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={TAB_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

// ─── Sales tab ───────────────────────────────────────────────────────────────

function SalesTab({ staffId }: { staffId: string }) {
  const { formatAmount: fmtMoney } = useCurrency();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, error, retry } = useFetch<SaleRow[]>(
    () => api.get(SALE.BASE, { params: { staff_id: staffId, limit: 200 } }).then((r) => r.data?.data?.items ?? []),
    [staffId], []
  );

  const filtered = useMemo(() => {
    return data.filter((s) => {
      const q = search.toLowerCase();
      const client = (s.client_name ?? "Walk-in").toLowerCase();
      const matchesSearch = !q || client.includes(q);

      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const method = (s.payment_method || "").toLowerCase();
      const matchesPayment = paymentFilter === "all" || method.includes(paymentFilter);

      const d = s.created_at ? s.created_at.slice(0, 10) : "";
      const matchesStart = !startDate || d >= startDate;
      const matchesEnd = !endDate || d <= endDate;

      return matchesSearch && matchesStatus && matchesPayment && matchesStart && matchesEnd;
    });
  }, [data, search, statusFilter, paymentFilter, startDate, endDate]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, paymentFilter, startDate, endDate]);

  const totalPages = Math.ceil(filtered.length / TAB_PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * TAB_PAGE_SIZE;
    return filtered.slice(start, start + TAB_PAGE_SIZE);
  }, [filtered, currentPage]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div>
      <div className="shp-filter-bar">
        <div className="shp-search-input">
          <SearchIcon size={14} />
          <input
            placeholder="Search by client name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="shp-filter-group">
          <label>Status:</label>
          <select className="shp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="shp-filter-group">
          <label>Payment:</label>
          <select className="shp-select" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="wallet">eWallet</option>
          </select>
        </div>
        <div className="shp-filter-group">
          <label>From:</label>
          <input className="shp-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="shp-filter-group">
          <label>To:</label>
          <input className="shp-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CreditCard2Front size={26} />} text="No sales found matching criteria." />
      ) : (
        <>
          <table className="shp-table">
            <thead><tr><th>Date</th><th>Client</th><th>Payment</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {paginatedData.map((s) => (
                <tr key={s.id}>
                  <td>{fmtDate(s.created_at)}</td>
                  <td>{s.client_name ?? "Walk-in"}</td>
                  <td>{s.payment_method ?? "—"}</td>
                  <td><span className={`shp-status shp-status--${s.status}`}>{s.status}</span></td>
                  <td>{fmtMoney(Number(s.total_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={TAB_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

// ─── Commission tab ──────────────────────────────────────────────────────────

function CommissionTab({ staffId }: { staffId: string }) {
  const { formatAmount: fmtMoney, currencySymbol } = useCurrency();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, error, retry } = useFetch<CommissionRow[]>(
    () => api.get(`${STAFF.BY_ID(staffId)}/commissions/history`, { params: { month } }).then((r) => r.data?.data?.items ?? []),
    [staffId, month], []
  );

  const filtered = useMemo(() => {
    return data.filter((r) => {
      const matchesCat = categoryFilter === "all" || r.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesCat && matchesStatus;
    });
  }, [data, categoryFilter, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [categoryFilter, statusFilter, month]);

  const total = useMemo(() => filtered.reduce((s, r) => s + Number(r.commission_amount), 0), [filtered]);
  const totalPages = Math.ceil(filtered.length / TAB_PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * TAB_PAGE_SIZE;
    return filtered.slice(start, start + TAB_PAGE_SIZE);
  }, [filtered, currentPage]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div>
      <div className="shp-filter-bar">
        <div className="shp-filter-group">
          <label>Month:</label>
          <input className="shp-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <div className="shp-filter-group">
          <label>Category:</label>
          <select className="shp-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="service">Service</option>
            <option value="product">Product</option>
            <option value="membership">Membership</option>
            <option value="package">Package</option>
          </select>
        </div>
        <div className="shp-filter-group">
          <label>Status:</label>
          <select className="shp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="shp-inline-stat">Total for {month}: <strong>{fmtMoney(total)}</strong></div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CashCoin size={26} />} text={`No commission earned in ${month} matching criteria.`} />
      ) : (
        <>
          <table className="shp-table">
            <thead><tr><th>Date</th><th>Category</th><th>Revenue</th><th>Rate</th><th>Commission</th><th>Status</th></tr></thead>
            <tbody>
              {paginatedData.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.earned_at)}</td>
                  <td className="shp-cap">{r.category}</td>
                  <td>{fmtMoney(Number(r.revenue_amount))}</td>
                  <td>{r.commission_kind === "percentage" ? `${r.commission_rate}%` : `${currencySymbol}${r.commission_rate}`}</td>
                  <td>{fmtMoney(Number(r.commission_amount))}</td>
                  <td><span className={`shp-status shp-status--${r.status}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={TAB_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

// ─── Notes & Feedback tab (WhatsApp star ratings) ───────────────────────────

interface ReviewRow {
  id: string;
  rating: number;
  phone: string | null;
  review_text: string | null;
  created_at: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

function ReviewsTab({ staffId }: { staffId: string }) {
  const [ratingFilter, setRatingFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, error, retry } = useFetch<ReviewRow[]>(
    () => api.get(REVIEWS.BASE, { params: { staff_id: staffId } }).then((r) => r.data?.data ?? []),
    [staffId], []
  );
  const { data: stats } = useFetch<ReviewStats>(
    () => api.get(REVIEWS.STATS, { params: { staff_id: staffId } }).then((r) => r.data ?? { averageRating: 0, totalReviews: 0 }),
    [staffId], { averageRating: 0, totalReviews: 0 }
  );

  const filtered = useMemo(() => {
    return data.filter((r) => {
      const matchesRating = ratingFilter === "all" || String(r.rating) === ratingFilter;
      const d = r.created_at ? r.created_at.slice(0, 10) : "";
      const matchesStart = !startDate || d >= startDate;
      const matchesEnd = !endDate || d <= endDate;
      return matchesRating && matchesStart && matchesEnd;
    });
  }, [data, ratingFilter, startDate, endDate]);

  useEffect(() => { setCurrentPage(1); }, [ratingFilter, startDate, endDate]);

  const totalPages = Math.ceil(filtered.length / TAB_PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * TAB_PAGE_SIZE;
    return filtered.slice(start, start + TAB_PAGE_SIZE);
  }, [filtered, currentPage]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div>
      <div className="shp-filter-bar">
        <div className="shp-filter-group">
          <label>Rating:</label>
          <select className="shp-select" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
            <option value="all">All Ratings</option>
            <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
            <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
            <option value="3">⭐⭐⭐ (3 Stars)</option>
            <option value="2">⭐⭐ (2 Stars)</option>
            <option value="1">⭐ (1 Star)</option>
          </select>
        </div>
        <div className="shp-filter-group">
          <label>From:</label>
          <input className="shp-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="shp-filter-group">
          <label>To:</label>
          <input className="shp-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="shp-inline-stat">
        Average rating: <strong>{stats.averageRating > 0 ? `${"⭐".repeat(Math.round(stats.averageRating))} ${stats.averageRating.toFixed(1)}` : "—"}</strong>
        {" "}({stats.totalReviews} rating{stats.totalReviews === 1 ? "" : "s"})
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ChatSquareText size={26} />} text="No feedback found matching criteria." />
      ) : (
        <>
          <table className="shp-table">
            <thead><tr><th>Date</th><th>Client</th><th>Rating</th></tr></thead>
            <tbody>
              {paginatedData.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.created_at)}</td>
                  <td>{r.phone ?? "—"}</td>
                  <td>{"⭐".repeat(r.rating)} ({r.rating}/5)</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={TAB_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

// ─── Attendance tab ──────────────────────────────────────────────────────────

function AttendanceTab({ staffId }: { staffId: string }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, loading, error, retry } = useFetch<AttendanceRow[]>(
    () => api.get(ATTENDANCE.FOR_STAFF(staffId), { params: { limit: 200 } }).then((r) => r.data?.data?.items ?? []),
    [staffId], []
  );

  const filtered = useMemo(() => {
    return data.filter((a) => {
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const d = a.date ? a.date.slice(0, 10) : "";
      const matchesStart = !startDate || d >= startDate;
      const matchesEnd = !endDate || d <= endDate;
      return matchesStatus && matchesStart && matchesEnd;
    });
  }, [data, statusFilter, startDate, endDate]);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, startDate, endDate]);

  const totalPages = Math.ceil(filtered.length / TAB_PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * TAB_PAGE_SIZE;
    return filtered.slice(start, start + TAB_PAGE_SIZE);
  }, [filtered, currentPage]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div>
      <div className="shp-filter-bar">
        <div className="shp-filter-group">
          <label>Status:</label>
          <select className="shp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="half_day">Half Day</option>
            <option value="absent">Absent</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
        <div className="shp-filter-group">
          <label>From:</label>
          <input className="shp-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="shp-filter-group">
          <label>To:</label>
          <input className="shp-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Calendar2Check size={26} />} text="No attendance records found matching criteria." />
      ) : (
        <>
          <table className="shp-table">
            <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th></tr></thead>
            <tbody>
              {paginatedData.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDate(a.date)}</td>
                  <td><span className={`shp-status shp-status--${a.status}`}>{a.status.replace("_", " ")}</span></td>
                  <td>{a.check_in ? fmtDateTime(a.check_in) : "—"}</td>
                  <td>{a.check_out ? fmtDateTime(a.check_out) : "—"}</td>
                  <td>{a.hours_worked ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={TAB_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StaffHistoryDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [busy, setBusy] = useState(false);

  const { data: staff, loading: staffLoading, error: staffError, retry: retryStaff } = useFetch<StaffDetail | null>(
    () => api.get(STAFF.BY_ID(staffId!)).then((r) => r.data?.data ?? null),
    [staffId], null
  );

  // Overview aggregates — computed from the same real endpoints the other tabs use.
  const salesForTotal = useFetch<SaleRow[]>(
    () => api.get(SALE.BASE, { params: { staff_id: staffId } }).then((r) => r.data?.data?.items ?? []),
    [staffId], []
  );
  const salesTotal = {
    loading: salesForTotal.loading, error: salesForTotal.error,
    value: salesForTotal.data.filter((s) => s.status === "completed").reduce((s, r) => s + Number(r.total_amount), 0),
    retry: salesForTotal.retry,
  };

  const servicesRecent = useFetch<SaleItemRow[]>(
    () => api.get(SALE.STAFF_ITEMS(staffId!), { params: { item_type: "service", limit: 5 } }).then((r) => r.data?.data?.items ?? []),
    [staffId], []
  );

  const month = new Date().toISOString().slice(0, 7);
  const commissionForTotal = useFetch<CommissionRow[]>(
    () => api.get(`${STAFF.BY_ID(staffId!)}/commissions/history`, { params: { month } }).then((r) => r.data?.data?.items ?? []),
    [staffId], []
  );
  const commissionTotal = {
    loading: commissionForTotal.loading, error: commissionForTotal.error,
    value: commissionForTotal.data.reduce((s, r) => s + Number(r.commission_amount), 0),
    retry: commissionForTotal.retry,
  };

  const attendanceForPct = useFetch<AttendanceRow[]>(
    () => {
      const end = new Date();
      const start = new Date(); start.setDate(end.getDate() - 30);
      return api.get(ATTENDANCE.FOR_STAFF(staffId!), {
        params: { start_date: start.toISOString().slice(0, 10), end_date: end.toISOString().slice(0, 10) },
      }).then((r) => r.data?.data?.items ?? []);
    },
    [staffId], []
  );
  const attendancePct = {
    loading: attendanceForPct.loading, error: attendanceForPct.error,
    value: attendanceForPct.data.length === 0 ? null : Math.round(
      (attendanceForPct.data.filter((a) => a.status === "present" || a.status === "late").length / attendanceForPct.data.length) * 100
    ),
    retry: attendanceForPct.retry,
  };

  async function toggleActive() {
    if (!staff) return;
    setBusy(true);
    try {
      if (staff.is_active === false) await dispatch(activateStaffThunk(staff.id)).unwrap();
      else await dispatch(deactivateStaffThunk(staff.id)).unwrap();
      retryStaff();
    } catch { /* thunk surfaces its own error toast */ }
    finally { setBusy(false); }
  }

  if (!staffId) return null;

  return (
    <div className="shp-page">
      <button className="shp-back" onClick={() => navigate("/dashboard/team/history")}>
        <ArrowLeft size={14} /> Back to Staff
      </button>

      {staffLoading ? (
        <LoadingState />
      ) : staffError || !staff ? (
        <ErrorState onRetry={retryStaff} />
      ) : (
        <>
          <div className="shp-header">
            <div className="shp-header__avatar" style={{ background: staff.avatar_url ? undefined : getGradient(staff.id) }}>
              {staff.avatar_url
                ? <img src={staff.avatar_url} alt="" />
                : `${staff.first_name?.[0] ?? ""}${staff.last_name?.[0] ?? ""}`.toUpperCase()}
            </div>
            <div className="shp-header__info">
              <div className="shp-header__name-row">
                <h2>{staff.first_name} {staff.last_name}</h2>
                <span className={`shp-status shp-status--${staff.is_active === false ? "inactive" : "active"}`}>
                  {staff.is_active === false ? "Inactive" : "Active"}
                </span>
              </div>
              <div className="shp-header__meta">
                <span>{staff.job_title || "Staff"}</span>
                {staff.employee_code && <span>ID: {staff.employee_code}</span>}
              </div>
              <div className="shp-header__meta shp-header__meta--sub">
                <span><Calendar2Check size={12} /> Joined {fmtDate(staff.joined_date || staff.created_at)}</span>
                {(staff.phone_number || staff.phone) && (
                  <span><TelephoneFill size={12} /> {staff.phone_number || staff.phone}</span>
                )}
              </div>
            </div>
            <div className="shp-header__actions">
              <button className="shp-btn shp-btn--outline" onClick={() => navigate(`/dashboard/team/${staff.id}`)}>
                <PencilSquare size={14} /> Edit Staff
              </button>
              <button className="shp-btn shp-btn--danger" onClick={toggleActive} disabled={busy}>
                {staff.is_active === false ? <PersonCheck size={14} /> : <PersonX size={14} />}
                {staff.is_active === false ? "Activate" : "Deactivate"}
              </button>
            </div>
          </div>

          <div className="shp-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`shp-tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="shp-tab-content">
            {activeTab === "overview" && (
              <OverviewTab
                salesTotal={salesTotal}
                servicesRecent={{
                  loading: servicesRecent.loading,
                  error: servicesRecent.error,
                  value: servicesRecent.data,
                  retry: servicesRecent.retry,
                }}
                commissionTotal={commissionTotal}
                attendancePct={attendancePct}
              />
            )}
            {activeTab === "timeline"   && <TimelineTab staffId={staff.id} />}
            {activeTab === "services"   && <ServicesTab staffId={staff.id} />}
            {activeTab === "sales"      && <SalesTab staffId={staff.id} />}
            {activeTab === "commission" && <CommissionTab staffId={staff.id} />}
            {activeTab === "attendance" && <AttendanceTab staffId={staff.id} />}
            {activeTab === "payroll" && (
              <EmptyState
                icon={<Wallet2 size={26} />}
                text="Payroll history isn't tracked in the backend yet."
                note="The Payruns page isn't wired to any real payroll data yet, so there's nothing to show here yet."
              />
            )}
            {activeTab === "notes" && <ReviewsTab staffId={staff.id} />}
          </div>
        </>
      )}
    </div>
  );
}
