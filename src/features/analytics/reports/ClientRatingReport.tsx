import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search, StarFill, Star } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CLIENT_RATING_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import "./ClientRevenueReport.scss";

const REPORT_NAME = "Client Rating";

const RATING_OPTIONS = [
  { id: "5", label: "5 Star" },
  { id: "4", label: "4 Star" },
  { id: "3", label: "3 Star" },
  { id: "2", label: "2 Star" },
  { id: "1", label: "1 Star" },
];

interface RatingRow {
  clientId: string;
  clientName: string;
  contact: string;
  staffId: string;
  staffName: string;
  rating: number;
  staffRating: number | null;
  serviceRating: number | null;
  ambienceRating: number | null;
  reviewText: string;
  reviewDate: string | null;
  source: string;
  totalSpend: number;
}

function mapRow(row: any): RatingRow {
  return {
    clientId: row.client_id ? String(row.client_id) : "",
    clientName: row.client_name || "Walk-in",
    contact: row.contact || "—",
    staffId: row.staff_id ? String(row.staff_id) : "",
    staffName: row.staff_name || "—",
    rating: Number(row.rating) || 0,
    staffRating: row.staff_rating != null ? Number(row.staff_rating) : null,
    serviceRating: row.service_rating != null ? Number(row.service_rating) : null,
    ambienceRating: row.ambience_rating != null ? Number(row.ambience_rating) : null,
    reviewText: row.review_text || "—",
    reviewDate: row.review_date || null,
    source: row.source || "—",
    totalSpend: Number(row.total_spend) || 0,
  };
}

function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function StarRating({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i =>
        i <= Math.round(value)
          ? <StarFill key={i} size={12} color="#F59E0B" />
          : <Star key={i} size={12} color="#d1d5db" />
      )}
    </span>
  );
}

export default function ClientRatingReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [minRating,    setMinRating]    = useState<string | null>(null);
  const [search,       setSearchInput]  = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,         setRows]         = useState<RatingRow[]>([]);
  const [total,        setTotal]        = useState(0);
  const [stats,        setStats]        = useState({ totalReviews: 0, averageRating: 0, positiveReviews: 0, negativeReviews: 0 });
  const [loading,      setLoading]      = useState(false);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [pageSize,     setPageSize]     = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        id: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.id);
      setStaffOptions(opts);
    }).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (minRating) body.min_rating = Number(minRating);
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(CLIENT_RATING_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalReviews: Number(s.total_reviews) || 0,
        averageRating: Number(s.average_rating) || 0,
        positiveReviews: Number(s.positive_reviews) || 0,
        negativeReviews: Number(s.negative_reviews) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalReviews: 0, averageRating: 0, positiveReviews: 0, negativeReviews: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, minRating, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, staffFilterIds, minRating, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "rating", label: "Rating", options: RATING_OPTIONS },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
    rating: minRating ? [minRating] : [],
  }), [staffFilterIds, minRating]);

  // Rating behaves as single-select even though JiraFilterMenu's checkbox
  // list is multi-capable — picking a second star value replaces the first,
  // used as a minimum-rating filter (e.g. "4 Star" == 4 and above).
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
    const picked = next.rating ?? [];
    setMinRating(picked.length ? picked[picked.length - 1] : null);
  };

  const HEADERS = ["Client Name", "Contact", `Total Spend (${currencySymbol})`, "Staff", "Rating", "Staff Rating", "Service Rating", "Ambience Rating", "Review", "Date"];
  const exportRows = () => rows.map(r => [
    r.clientName, r.contact, formatAmount(r.totalSpend), r.staffName, r.rating,
    r.staffRating ?? "—", r.serviceRating ?? "—", r.ambienceRating ?? "—",
    r.reviewText, formatDate(r.reviewDate),
  ]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton
              title={REPORT_NAME}
              headers={HEADERS}
              rows={exportRows}
              filename={`client-rating-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(minRating ? [`Min Rating: ${RATING_OPTIONS.find(o => o.id === minRating)?.label ?? minRating}`] : []),
              ]}
              summaryLines={[
                `Total Reviews: ${stats.totalReviews}`,
                `Average Rating: ${stats.averageRating.toFixed(1)}`,
                `Positive Reviews: ${stats.positiveReviews}`,
                `Negative Reviews: ${stats.negativeReviews}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalReviews}</div><div className="rp-sra-summary-label">Total Reviews</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.averageRating.toFixed(1)}</div><div className="rp-sra-summary-label">Average Rating</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.positiveReviews}</div><div className="rp-sra-summary-label">Positive Reviews</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.negativeReviews}</div><div className="rp-sra-summary-label">Negative Reviews</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client name or phone" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Client Name</th><th>Contact</th><th>Total Spend ({currencySymbol})</th><th>Staff</th>
              <th>Rating</th><th>Staff</th><th>Service</th><th>Ambience</th>
              <th>Review</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={10} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="rp-detail-empty-cell">No rating data found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td className="fw-semibold">{r.clientName}</td>
                <td>{r.contact}</td>
                <td className="fw-semibold">{formatAmount(r.totalSpend)}</td>
                <td>{r.staffName}</td>
                <td><StarRating value={r.rating} /></td>
                <td>{r.staffRating != null ? <StarRating value={r.staffRating} /> : "—"}</td>
                <td>{r.serviceRating != null ? <StarRating value={r.serviceRating} /> : "—"}</td>
                <td>{r.ambienceRating != null ? <StarRating value={r.ambienceRating} /> : "—"}</td>
                <td>{r.reviewText}</td>
                <td>{formatDate(r.reviewDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} />
      )}
    </div>
  );
}
