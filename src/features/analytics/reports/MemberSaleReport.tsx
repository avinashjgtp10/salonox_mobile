import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { MEMBER_SALE_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import ReportRefreshButton from "./ReportRefreshButton";
import Select from "../../../components/ui/Select";
import MultiSelectCheckbox from "../../../components/ui/MultiSelectCheckbox";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import "./MemberSaleReport.scss";

const REPORT_NAME = "Membership Sale";

interface FilterOption { id: string; label: string; }

const STATUS_OPTIONS: FilterOption[] = [
  { id: "active", label: "Active" },
  { id: "expiry_soon", label: "Expiry Soon" },
  { id: "expired", label: "Expired" },
  { id: "complete", label: "Complete" },
];

const PRICING_TYPE_LABELS: Record<string, string> = {
  value: "Flat Value",
  percentage: "Percentage",
  loyalty: "Loyalty",
};

interface MemberSaleRow {
  id: string;
  clientId: string;
  purchasedAt: string;
  invoiceNo: string;
  clientName: string;
  staffName: string;
  membershipName: string;
  pricingType: string | null;
  valueAmount: number | null;
  extraBenefits: string;
  pricePaid: number;
  paymentMethod: string;
  status: string;
}

// dd/MM/yyyy, consistently across the table and every export (CSV/Excel/PDF
// all read the same r.purchasedAt via exportRows).
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent Membership Sale API
// (POST /api/report/member-sale — reads client_memberships directly, never
// the Appointment API) to the table's row shape.
function mapRow(row: any): MemberSaleRow {
  return {
    id: row.id,
    clientId: row.client_id ? String(row.client_id) : "",
    purchasedAt: row.purchased_at ? formatDate(row.purchased_at) : "—",
    invoiceNo: row.invoice_number ?? "—",
    clientName: row.client_name || "—",
    staffName: row.staff_name || "—",
    membershipName: row.membership_name || "—",
    pricingType: row.pricing_type ?? null,
    valueAmount: row.value_amount != null ? Number(row.value_amount) : null,
    extraBenefits: row.extra_benefits || "—",
    pricePaid: Number(row.price_paid) || 0,
    paymentMethod: row.payment_method || "—",
    status: row.status || "active",
  };
}

export default function MemberSaleReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter,     setStatusFilter]     = useState("All");
  const [membershipFilter, setMembershipFilter] = useState("All");
  const [pricingTypeFilter, setPricingTypeFilter] = useState("All");
  const [staffFilterIds,   setStaffFilterIds]   = useState<string[]>([]);
  const [minPrice,         setMinPrice]         = useState("");
  const [maxPrice,         setMaxPrice]         = useState("");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [rows,        setRows]        = useState<MemberSaleRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({
    membershipsSold: 0, totalRevenue: 0, activeCount: 0,
    expirySoonCount: 0, expiredCount: 0, completedCount: 0,
  });
  // No separate /staff or /memberships API call — the member-sale API
  // itself returns filters_available.staff/memberships, so options stay
  // complete regardless of the current date/filter selection.
  const [membershipOptions, setMembershipOptions] = useState<FilterOption[]>([]);
  const [staffOptions,      setStaffOptions]      = useState<FilterOption[]>([]);
  const [pricingTypeOptions, setPricingTypeOptions] = useState<string[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (statusFilter !== "All") body.status = statusFilter;
      if (membershipFilter !== "All") body.membership_id = membershipFilter;
      if (pricingTypeFilter !== "All") body.pricing_type = pricingTypeFilter;
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (minPrice !== "") body.price_min = Number(minPrice);
      if (maxPrice !== "") body.price_max = Number(maxPrice);
      const res = await api.post(MEMBER_SALE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        membershipsSold: Number(s.memberships_sold) || 0,
        totalRevenue: Number(s.total_revenue) || 0,
        activeCount: Number(s.active_memberships) || 0,
        expirySoonCount: Number(s.expiry_soon_memberships) || 0,
        expiredCount: Number(s.expired_memberships) || 0,
        completedCount: Number(s.completed_memberships) || 0,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.memberships)) setMembershipOptions(avail.memberships);
      if (Array.isArray(avail.staff)) setStaffOptions(avail.staff);
      if (Array.isArray(avail.pricing_types)) setPricingTypeOptions(avail.pricing_types);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ membershipsSold: 0, totalRevenue: 0, activeCount: 0, expirySoonCount: 0, expiredCount: 0, completedCount: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, statusFilter, membershipFilter, pricingTypeFilter, staffFilterIds, minPrice, maxPrice, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, statusFilter, membershipFilter, pricingTypeFilter, staffFilterIds, minPrice, maxPrice]);

  const activeFilterCount = [
    statusFilter !== "All" ? 1 : 0,
    membershipFilter !== "All" ? 1 : 0,
    pricingTypeFilter !== "All" ? 1 : 0,
    staffFilterIds.length > 0 ? 1 : 0,
    minPrice !== "" ? 1 : 0,
    maxPrice !== "" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setStatusFilter("All"); setMembershipFilter("All"); setPricingTypeFilter("All");
    setStaffFilterIds([]); setMinPrice(""); setMaxPrice("");
  };

  const formatValue = (r: MemberSaleRow) => {
    if (r.valueAmount == null) return "—";
    if (r.pricingType === "percentage") return `${r.valueAmount}%`;
    if (r.pricingType === "value") return formatAmount(r.valueAmount);
    return "—";
  };

  const HEADERS = ["Date", "Invoice No", "Client", "Staff", "Membership", "Value", "Description", `Price Paid (${currencySymbol})`, "Payment Method", "Status"];
  const exportRows = () => rows.map(r => [
    r.purchasedAt, r.invoiceNo, r.clientName, r.staffName, r.membershipName,
    formatValue(r), r.extraBenefits, r.pricePaid, r.paymentMethod,
    STATUS_OPTIONS.find(o => o.id === r.status)?.label ?? r.status,
  ]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`membership-sale-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFields from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <button className="rp-ms-filters-btn" onClick={() => setShowFiltersPanel(true)}>
          Filters
          {activeFilterCount > 0 && <span className="rp-ms-filters-badge">{activeFilterCount}</span>}
        </button>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={6} /> : (
        <div className="rp-sra-summary-row rp-ms-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.membershipsSold}</div><div className="rp-sra-summary-label">Memberships Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRevenue)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.activeCount}</div><div className="rp-sra-summary-label">Active Memberships</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.expirySoonCount}</div><div className="rp-sra-summary-label">Expiry Soon</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.expiredCount}</div><div className="rp-sra-summary-label">Expired Memberships</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.completedCount}</div><div className="rp-sra-summary-label">Completed Memberships</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client or membership name" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Invoice No</th><th>Client</th><th>Staff</th><th>Membership</th>
              <th>Value</th><th>Description</th><th>Price Paid ({currencySymbol})</th>
              <th>Payment Method</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={10} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="rp-detail-empty-cell">No membership sales found</td></tr>
            ) : rows.map((r) => (
              <tr
                key={r.id}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td>{r.purchasedAt}</td>
                <td><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td className="fw-semibold">{r.clientName}</td>
                <td>{r.staffName}</td>
                <td className="fw-semibold rp-ms-name" title={r.membershipName}>{r.membershipName}</td>
                <td>{formatValue(r)}</td>
                <td className="rp-ms-benefits" title={r.extraBenefits}>{r.extraBenefits}</td>
                <td>{formatAmount(r.pricePaid)}</td>
                <td className="rp-ms-payment">{r.paymentMethod}</td>
                <td><span className={`rp-status-badge rp-status-${r.status}`}>{STATUS_OPTIONS.find(o => o.id === r.status)?.label ?? r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="memberships" />
      )}

      {showFiltersPanel && (
        <div className="rp-ms-filters-overlay" onClick={() => setShowFiltersPanel(false)}>
          <div className="rp-ms-filters-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filters</h3>
            </div>

            <div className="rp-ms-filters-body">
              <Select label="Status" containerClass="rp-ms-filter-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All</option>
                {STATUS_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>

              <Select label="Membership" containerClass="rp-ms-filter-field" value={membershipFilter} onChange={e => setMembershipFilter(e.target.value)}>
                <option value="All">All memberships</option>
                {membershipOptions.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </Select>

              <Select label="Membership Type" containerClass="rp-ms-filter-field" value={pricingTypeFilter} onChange={e => setPricingTypeFilter(e.target.value)}>
                <option value="All">All types</option>
                {pricingTypeOptions.map(t => <option key={t} value={t}>{PRICING_TYPE_LABELS[t] ?? t}</option>)}
              </Select>

              <MultiSelectCheckbox
                label="Staff"
                containerClass="rp-ms-filter-field"
                options={staffOptions}
                selected={staffFilterIds}
                onChange={setStaffFilterIds}
                placeholder="All staff"
              />

              <div className="rp-ms-filter-field">
                <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>Price Range ({currencySymbol})</label>
                <div className="rp-ms-price-range">
                  <input type="number" min={0} placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                  <span>—</span>
                  <input type="number" min={0} placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rp-ms-filters-actions">
              <Button variant="ghost" onClick={() => { clearFilters(); }}>Clear</Button>
              <Button variant="dark" onClick={() => { setShowFiltersPanel(false); fetchData(); }}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
