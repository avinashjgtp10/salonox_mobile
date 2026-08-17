import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import {
  Search,
  Filter,
  X,
  CalendarCheck,
} from "react-bootstrap-icons";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import { useCurrency } from "../../../hooks/useCurrency";
import { DateRangeFilter } from "../../../components/ui";
import type { DateRangeFilterValue } from "../../../components/ui";
import "../styles/StaffAppointmentsPage.scss";

interface Appointment {
  id: number;
  client_name?: string;
  staff_name?: string;
  service_name?: string;
  start_time?: string;
  end_time?: string;
  date?: string;
  status?: string;
  total?: number;
  notes?: string;
}

const STATUS_OPTIONS = ["all", "confirmed", "pending", "completed", "cancelled"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "app-badge--blue",
  pending: "app-badge--amber",
  completed: "app-badge--green",
  cancelled: "app-badge--red",
};

function formatTime(val?: string) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return val;
  }
}

function formatDate(val?: string) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return val;
  }
}

export default function StaffAppointmentsPage() {
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;
  const { formatAmount } = useCurrency();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({
    preset: "all_time",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const { showError, overlay } = useStatusOverlay();

  const fetchAppointments = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (dateRange.startDate) params.start_date = dateRange.startDate;
      if (dateRange.endDate) params.end_date = dateRange.endDate;

      const res = await api.get(BOOKING.BASE, { params });
      const raw = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
      const arr = Array.isArray(raw) ? raw : [];
      setAppointments(arr);
      setTotal(res.data?.data?.pagination?.total ?? arr.length);
    } catch {
      showError("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [salonId, page, search, statusFilter, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const activeFilters =
    (statusFilter !== "all" ? 1 : 0) +
    (dateRange.preset !== "all_time" ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setDateRange({ preset: "all_time", startDate: "", endDate: "" });
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="app-page">
      {overlay}
      {/* ── Header ── */}
      <div className="app-page__header">
        <div>
          <h1 className="app-page__title">Appointments</h1>
          <p className="app-page__subtitle">
            View and manage all scheduled appointments.
          </p>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="app-page__toolbar">
        <div className="app-page__search-wrap">
          <Search size={14} className="app-page__search-icon" />
          <input
            className="app-page__search"
            placeholder="Search by client, staff or service..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="app-page__search-clear" onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>

        <button
          className={`app-page__filter-btn ${activeFilters > 0 ? "app-page__filter-btn--active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={13} />
          Filters
          {activeFilters > 0 && <span className="app-page__filter-count">{activeFilters}</span>}
        </button>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="app-page__filters">
          <div className="app-page__filter-group">
            <label className="app-page__filter-label">Status</label>
            <div className="app-page__filter-pills">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`app-page__pill ${statusFilter === s ? "app-page__pill--active" : ""}`}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                >
                  {s === "all" ? "All" : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="app-page__filter-group">
            <label className="app-page__filter-label">Date range</label>
            <DateRangeFilter
              value={dateRange}
              onChange={(next) => { setDateRange(next); setPage(1); }}
            />
          </div>
          {activeFilters > 0 && (
            <button className="app-page__clear-btn" onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="app-page__card">
        {loading ? (
          <div className="app-page__skeleton-list">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="app-page__skeleton-row">
                <div className="app-sk app-sk--date" />
                <div className="app-sk app-sk--name" />
                <div className="app-sk app-sk--name" />
                <div className="app-sk app-sk--service" />
                <div className="app-sk app-sk--badge" />
                <div className="app-sk app-sk--amount" />
              </div>
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="app-page__empty">
            <CalendarCheck size={42} className="app-page__empty-icon" />
            <h3 className="app-page__empty-title">
              {search || activeFilters > 0 ? "No results found" : "No appointments yet"}
            </h3>
            <p className="app-page__empty-desc">
              {search || activeFilters > 0
                ? "Try adjusting your search or filters."
                : "Appointments will appear here once booked."}
            </p>
            {activeFilters > 0 && (
              <button className="app-page__empty-btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="app-table__header">
              <div className="app-table__col app-table__col--date">Date & Time</div>
              <div className="app-table__col app-table__col--client">Client</div>
              <div className="app-table__col app-table__col--staff">Staff</div>
              <div className="app-table__col app-table__col--service">Service</div>
              <div className="app-table__col app-table__col--status">Status</div>
              <div className="app-table__col app-table__col--amount">Amount</div>
            </div>

            {/* Table Rows */}
            {appointments.map((appt) => (
              <div key={appt.id} className="app-table__row">
                <div className="app-table__col app-table__col--date">
                  <div className="app-table__date-primary">
                    {formatDate(appt.date ?? appt.start_time)}
                  </div>
                  <div className="app-table__date-sub">
                    {formatTime(appt.start_time)}
                    {appt.end_time ? ` – ${formatTime(appt.end_time)}` : ""}
                  </div>
                </div>
                <div className="app-table__col app-table__col--client">
                  <span className="app-table__cell-primary">
                    {appt.client_name || "—"}
                  </span>
                </div>
                <div className="app-table__col app-table__col--staff">
                  <span className="app-table__cell-muted">
                    {appt.staff_name || "—"}
                  </span>
                </div>
                <div className="app-table__col app-table__col--service">
                  <span className="app-table__cell-muted">
                    {appt.service_name || "—"}
                  </span>
                </div>
                <div className="app-table__col app-table__col--status">
                  {appt.status ? (
                    <span
                      className={`app-badge ${STATUS_COLORS[appt.status.toLowerCase()] ?? "app-badge--gray"}`}
                    >
                      {STATUS_LABELS[appt.status.toLowerCase()] ?? appt.status}
                    </span>
                  ) : (
                    <span className="app-table__cell-muted">—</span>
                  )}
                </div>
                <div className="app-table__col app-table__col--amount">
                  <span className="app-table__cell-primary">
                    {appt.total != null
                      ? formatAmount(Number(appt.total))
                      : "—"}
                  </span>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="app-page__pagination">
                <span className="app-page__pagination-info">
                  Showing {(page - 1) * limit + 1}–
                  {Math.min(page * limit, total)} of {total}
                </span>
                <div className="app-page__pagination-btns">
                  <button
                    className="app-page__page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span className="app-page__page-num">
                    {page} / {totalPages}
                  </span>
                  <button
                    className="app-page__page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
