import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { Search, X } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import MultiSelectCheckbox from "../../../components/ui/MultiSelectCheckbox";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import { useCurrency } from "../../../hooks/useCurrency";
import "./CommissionReport.scss";

const REPORT_NAME = "Commission Report";

interface EarnedRow {
  staffId: string;
  staffName: string;
  items: string[];
  transactions: number;
  revenue: number;
  earned: number;
  pending: number;
  paid: number;
}

interface Summary {
  totalCommission: number;
  totalRevenue: number;
  pendingCommission: number;
  paidCommission: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  services: "Service",
  products: "Product",
  memberships: "Membership",
  packages: "Package",
  gift_cards: "Gift Card",
  cancellation: "Cancellation",
};

const DATE_PRESET_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  custom: "Custom Date Range",
};

function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function datePresetRange(preset: string): { from: string; to: string } | null {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === "today") return { from: iso(now), to: iso(now) };
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: iso(y), to: iso(y) };
  }
  if (preset === "this_week") {
    const s = new Date(now);
    s.setDate(s.getDate() - s.getDay());
    return { from: iso(s), to: iso(now) };
  }
  if (preset === "this_month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: iso(s), to: iso(now) };
  }
  if (preset === "last_month") {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: iso(s), to: iso(e) };
  }
  return null;
}

export default function CommissionReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const today       = new Date().toISOString().slice(0, 10);
  const monthStart  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [datePreset, setDatePreset] = useState("this_month");
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [staffOptions,   setStaffOptions]   = useState<{ id: string; label: string }[]>([]);
  const [itemFilter, setItemFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search,      setSearch]      = useState("");
  const [rows,        setRows]        = useState<EarnedRow[]>([]);
  const [summary,     setSummary]     = useState<Summary>({ totalCommission: 0, totalRevenue: 0, pendingCommission: 0, paidCommission: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Draft copies edited while the modal is open; only committed to the
  // applied filter state above when Apply is clicked. Closing via the X or
  // the overlay discards them, matching the Client Revenue filter modal.
  const [draftStaffIds, setDraftStaffIds] = useState<string[]>([]);
  const [draftItem, setDraftItem] = useState("All");
  const [draftStatus, setDraftStatus] = useState("All");

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
    if (datePreset === "custom") return;
    const r = datePresetRange(datePreset);
    if (r) { setDateFrom(r.from); setDateTo(r.to); }
  }, [datePreset]);

  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params: Record<string, any> = { start_date: dateFrom, end_date: dateTo };
      if (staffFilterIds.length > 0) params.staff_ids = staffFilterIds.join(",");
      if (itemFilter !== "All") params.category = itemFilter;
      if (statusFilter !== "All") params.status = statusFilter;
      const [earnedRes, summaryRes] = await Promise.all([
        api.get(`${STAFF.BASE}/commissions/earned`, { params, signal: ctrl.signal }),
        api.get(`${STAFF.BASE}/commissions/summary`, { params: { start_date: dateFrom, end_date: dateTo, ...(staffFilterIds.length > 0 ? { staff_ids: staffFilterIds.join(",") } : {}), ...(itemFilter !== "All" ? { category: itemFilter } : {}) }, signal: ctrl.signal }),
      ]);
      const earned: any[] = Array.isArray(earnedRes.data?.data) ? earnedRes.data.data : [];
      setRows(earned.map((r: any) => ({
        staffId: String(r.staff_id ?? ""),
        staffName: `${r.staff_first_name ?? ""} ${r.staff_last_name ?? ""}`.trim() || "—",
        items: Array.isArray(r.categories) ? r.categories.map((c: string) => CATEGORY_LABELS[c] ?? c) : [],
        transactions: Number(r.transaction_count) || 0,
        revenue: Number(r.total_revenue) || 0,
        earned: Number(r.total_earned) || 0,
        pending: Number(r.pending_payout) || 0,
        paid: Number(r.paid_out) || 0,
      })));
      const s = summaryRes.data?.data ?? {};
      setSummary({
        totalCommission: Number(s.total_commission) || 0,
        totalRevenue: Number(s.total_revenue) || 0,
        pendingCommission: Number(s.pending_payout) || 0,
        paidCommission: Number(s.paid_out) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") { setRows([]); setSummary({ totalCommission: 0, totalRevenue: 0, pendingCommission: 0, paidCommission: 0 }); }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, itemFilter, statusFilter, dateRangeError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.staffName.toLowerCase().includes(q) || r.items.some(i => i.toLowerCase().includes(q)));
  }, [rows, search]);

  useEffect(() => { setCurrentPage(1); }, [filteredRows.length]);

  const activeFilterCount = [
    staffFilterIds.length > 0 ? 1 : 0,
    itemFilter !== "All" ? 1 : 0,
    statusFilter !== "All" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const openFiltersPanel = () => {
    setDraftStaffIds(staffFilterIds);
    setDraftItem(itemFilter);
    setDraftStatus(statusFilter);
    setShowFiltersPanel(true);
  };

  const cancelFiltersPanel = () => setShowFiltersPanel(false);

  const clearDraftFilters = () => {
    setDraftStaffIds([]);
    setDraftItem("All");
    setDraftStatus("All");
  };

  const applyFilters = () => {
    setStaffFilterIds(draftStaffIds);
    setItemFilter(draftItem);
    setStatusFilter(draftStatus);
    setShowFiltersPanel(false);
  };

  const statusOf = (r: EarnedRow) => r.pending > 0 && r.paid > 0 ? "Partial" : r.pending > 0 ? "Pending" : r.paid > 0 ? "Paid" : "—";
  const HEADERS = ["Staff", "Item", "Transactions", `Revenue (${currencySymbol})`, `Commission Earned (${currencySymbol})`, `Pending (${currencySymbol})`, `Paid (${currencySymbol})`, "Status"];
  const exportRows = () => filteredRows.map(r => [r.staffName, r.items.join(", "), r.transactions, r.revenue, r.earned, r.pending, r.paid, statusOf(r)]);
  const paged = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
              filename={`commission-report-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={[
                ...(staffFilterIds.length > 0
                  ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
                  : []),
                ...(itemFilter !== "All" ? [`Item: ${CATEGORY_LABELS[itemFilter] ?? itemFilter}`] : []),
                ...(statusFilter !== "All" ? [`Status: ${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)}`] : []),
              ]}
              summaryLines={[
                `Total Revenue: ${formatAmount(summary.totalRevenue)}`,
                `Total Commission: ${formatAmount(summary.totalCommission)}`,
                `Pending Commission: ${formatAmount(summary.pendingCommission)}`,
                `Paid Commission: ${formatAmount(summary.paidCommission)}`,
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <Select containerClass="rp-cmr-date-preset" value={datePreset} onChange={e => setDatePreset(e.target.value)}>
            {Object.entries(DATE_PRESET_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          {datePreset === "custom" && (
            <div className="rp-detail-date-range">
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
              <span className="rp-detail-date-sep">-</span>
              <input type="date" value={dateTo}   min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
            </div>
          )}
          {dateRangeError && <div className="rp-detail-date-error">{dateRangeError}</div>}
        </div>
        <button className="rp-cr-filters-btn" onClick={openFiltersPanel}>
          Filters
          {activeFilterCount > 0 && <span className="rp-cr-filters-badge">{activeFilterCount}</span>}
        </button>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.totalRevenue)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.totalCommission)}</div><div className="rp-sra-summary-label">Total Commission</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.pendingCommission)}</div><div className="rp-sra-summary-label">Pending Commission</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(summary.paidCommission)}</div><div className="rp-sra-summary-label">Paid Commission</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Staff or item" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Staff</th><th>Item</th><th>Transactions</th><th>Revenue ({currencySymbol})</th><th>Commission Earned ({currencySymbol})</th><th>Pending ({currencySymbol})</th><th>Paid ({currencySymbol})</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No commission data found</td></tr>
            ) : paged.map((r) => (
              <tr key={r.staffId}>
                <td className="fw-semibold">{r.staffName}</td>
                <td>{r.items.length ? r.items.join(", ") : "—"}</td>
                <td>{r.transactions}</td>
                <td>{formatAmount(r.revenue)}</td>
                <td className="fw-semibold">{formatAmount(r.earned)}</td>
                <td>{formatAmount(r.pending)}</td>
                <td>{formatAmount(r.paid)}</td>
                <td><span className={`rp-status-badge rp-status-${statusOf(r).toLowerCase()}`}>{statusOf(r)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={filteredRows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {showFiltersPanel && (
        <div className="rp-cr-filters-overlay" onClick={cancelFiltersPanel}>
          <div className="rp-cr-filters-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filters</h3>
              <button type="button" className="rp-cr-filters-close" aria-label="Close" onClick={cancelFiltersPanel}>
                <X size={18} />
              </button>
            </div>

            <div className="rp-cr-filters-body">
              <MultiSelectCheckbox
                label="Staff Member"
                containerClass="rp-cr-filter-field"
                options={staffOptions}
                selected={draftStaffIds}
                onChange={setDraftStaffIds}
                placeholder="All staff"
              />

              <Select label="Item" containerClass="rp-cr-filter-field" value={draftItem} onChange={e => setDraftItem(e.target.value)}>
                <option value="All">All</option>
                <option value="services">Service</option>
                <option value="products">Product</option>
                <option value="memberships">Membership</option>
                <option value="packages">Package</option>
              </Select>

              <Select label="Commission Status" containerClass="rp-cr-filter-field" value={draftStatus} onChange={e => setDraftStatus(e.target.value)}>
                <option value="All">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
              </Select>
            </div>

            <div className="rp-cr-filters-actions">
              <Button variant="ghost" onClick={clearDraftFilters}>Clear</Button>
              <Button variant="dark" onClick={applyFilters}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
