import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectCurrentSalon } from "../../../store/selectors/slices.selectors";
import {
  Search,
  X,
  Filter,
  Receipt,
  CheckCircleFill,
  CurrencyDollar,
} from "react-bootstrap-icons";
import toast from "react-hot-toast";
import api from "../../../services/api/axios";
import { SALE } from "../../../services/api/endpoints";
import { DownloadButton } from "../../../components/ui";
import "../styles/StaffSalesPage.scss";

interface Sale {
  id: number;
  client_name?: string;
  staff_name?: string;
  total?: number;
  discount?: number;
  tax?: number;
  payment_method?: string;
  status?: string;
  created_at?: string;
  items?: { name: string; qty: number; price: number }[];
}

interface SaleSummary {
  total_revenue?: number;
  total_sales?: number;
  average_sale?: number;
}

const PAYMENT_COLORS: Record<string, string> = {
  cash: "sale-pay--cash",
  card: "sale-pay--card",
  upi: "sale-pay--upi",
  online: "sale-pay--online",
};

const STATUS_CLASSES: Record<string, string> = {
  paid: "sale-badge--paid",
  pending: "sale-badge--pending",
  refunded: "sale-badge--refunded",
  cancelled: "sale-badge--cancelled",
};

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

export default function StaffSalesPage() {
  const currentSalon = useSelector(selectCurrentSalon);
  const salonId = currentSalon?.id;

  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const headers = salonId ? { "x-salon-id": String(salonId) } : {};

  const fetchSummary = useCallback(async () => {
    if (!salonId) return;
    setLoadingSummary(true);
    try {
      const res = await api.get(SALE.SUMMARY, { headers });
      setSummary(res.data?.data ?? res.data ?? null);
    } catch {
      // Summary is optional
    } finally {
      setLoadingSummary(false);
    }
  }, [salonId]);

  const fetchSales = useCallback(async () => {
    if (!salonId) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;

      const res = await api.get(SALE.BASE, { headers, params });
      const raw = res.data?.data?.items ?? res.data?.data ?? res.data ?? [];
      const arr = Array.isArray(raw) ? raw : [];
      setSales(arr);
      setTotal(res.data?.data?.pagination?.total ?? arr.length);
    } catch {
      toast.error("Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [salonId, page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSummary();
    fetchSales();
  }, [fetchSummary, fetchSales]);

  const activeFilters =
    (statusFilter !== "all" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="sale-page">
      {/* ── Header ── */}
      <div className="sale-page__header">
        <div>
          <h1 className="sale-page__title">Sales & Billing</h1>
          <p className="sale-page__subtitle">
            Track revenue, invoices and payment history.
          </p>
        </div>
        <DownloadButton
          filename="sales.csv"
          fetcher={async () => {
            const res = await api.get(
              SALE.EXPORT({ format: "csv", salonId: salonId ? String(salonId) : undefined }),
              { responseType: "blob", headers }
            );
            return res.data;
          }}
          variant="outline-dark"
          size="sm"
          className="sale-page__export-btn"
        >
          Export CSV
        </DownloadButton>
      </div>

      {/* ── Summary Cards ── */}
      <div className="sale-page__summary">
        {[
          {
            label: "Total Revenue",
            value: loadingSummary
              ? null
              : `₹${Number(summary?.total_revenue ?? 0).toLocaleString("en-IN")}`,
            icon: <CurrencyDollar size={18} />,
            color: "emerald",
          },
          {
            label: "Total Sales",
            value: loadingSummary ? null : summary?.total_sales ?? 0,
            icon: <Receipt size={18} />,
            color: "indigo",
          },
          {
            label: "Average Sale",
            value: loadingSummary
              ? null
              : `₹${Number(summary?.average_sale ?? 0).toLocaleString("en-IN")}`,
            icon: <CheckCircleFill size={18} />,
            color: "amber",
          },
        ].map((card) => (
          <div key={card.label} className={`sale-summary-card sale-summary-card--${card.color}`}>
            <div className="sale-summary-card__icon">{card.icon}</div>
            <div>
              <div className="sale-summary-card__label">{card.label}</div>
              {card.value == null ? (
                <div className="sale-sk sale-sk--value" />
              ) : (
                <div className="sale-summary-card__value">{card.value}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="sale-page__toolbar">
        <div className="sale-page__search-wrap">
          <Search size={14} className="sale-page__search-icon" />
          <input
            className="sale-page__search"
            placeholder="Search by client or staff..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="sale-page__search-clear" onClick={() => setSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>

        <button
          className={`sale-page__filter-btn ${activeFilters > 0 ? "sale-page__filter-btn--active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={13} />
          Filters
          {activeFilters > 0 && (
            <span className="sale-page__filter-count">{activeFilters}</span>
          )}
        </button>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="sale-page__filters">
          <div className="sale-filter-group">
            <label className="sale-filter-label">Status</label>
            <div className="sale-filter-pills">
              {["all", "paid", "pending", "refunded", "cancelled"].map((s) => (
                <button
                  key={s}
                  className={`sale-pill ${statusFilter === s ? "sale-pill--active" : ""}`}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="sale-filter-group">
            <label className="sale-filter-label">Date Range</label>
            <div className="sale-date-range">
              <input
                type="date"
                className="sale-date-input"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
              <span className="sale-date-sep">to</span>
              <input
                type="date"
                className="sale-date-input"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          {activeFilters > 0 && (
            <button className="sale-clear-btn" onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="sale-page__card">
        {loading ? (
          <div className="sale-sk-list">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="sale-sk-row">
                <div className="sale-sk sale-sk--date" />
                <div className="sale-sk sale-sk--name" />
                <div className="sale-sk sale-sk--name" />
                <div className="sale-sk sale-sk--badge" />
                <div className="sale-sk sale-sk--pay" />
                <div className="sale-sk sale-sk--amount" />
              </div>
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="sale-page__empty">
            <Receipt size={42} className="sale-page__empty-icon" />
            <h3 className="sale-page__empty-title">
              {search || activeFilters > 0 ? "No results found" : "No sales yet"}
            </h3>
            <p className="sale-page__empty-desc">
              {search || activeFilters > 0
                ? "Try adjusting your search or filters."
                : "Sales records will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div className="sale-table__header">
              <div className="sale-table__col sale-table__col--date">Date</div>
              <div className="sale-table__col sale-table__col--client">Client</div>
              <div className="sale-table__col sale-table__col--staff">Staff</div>
              <div className="sale-table__col sale-table__col--status">Status</div>
              <div className="sale-table__col sale-table__col--payment">Payment</div>
              <div className="sale-table__col sale-table__col--amount">Total</div>
            </div>

            {sales.map((sale) => (
              <div key={sale.id} className="sale-table__row">
                <div className="sale-table__col sale-table__col--date">
                  <span className="sale-cell-muted">{formatDate(sale.created_at)}</span>
                </div>
                <div className="sale-table__col sale-table__col--client">
                  <span className="sale-cell-primary">{sale.client_name || "—"}</span>
                </div>
                <div className="sale-table__col sale-table__col--staff">
                  <span className="sale-cell-muted">{sale.staff_name || "—"}</span>
                </div>
                <div className="sale-table__col sale-table__col--status">
                  {sale.status ? (
                    <span className={`sale-badge ${STATUS_CLASSES[sale.status.toLowerCase()] ?? "sale-badge--pending"}`}>
                      {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                    </span>
                  ) : (
                    <span className="sale-cell-muted">—</span>
                  )}
                </div>
                <div className="sale-table__col sale-table__col--payment">
                  {sale.payment_method ? (
                    <span className={`sale-pay ${PAYMENT_COLORS[sale.payment_method.toLowerCase()] ?? "sale-pay--default"}`}>
                      {sale.payment_method.toUpperCase()}
                    </span>
                  ) : (
                    <span className="sale-cell-muted">—</span>
                  )}
                </div>
                <div className="sale-table__col sale-table__col--amount">
                  <span className="sale-cell-amount">
                    {sale.total != null
                      ? `₹${Number(sale.total).toLocaleString("en-IN")}`
                      : "—"}
                  </span>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="sale-page__pagination">
                <span className="sale-page__pagination-info">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div className="sale-page__pagination-btns">
                  <button
                    className="sale-page__page-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span className="sale-page__page-num">{page} / {totalPages}</span>
                  <button
                    className="sale-page__page-btn"
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
