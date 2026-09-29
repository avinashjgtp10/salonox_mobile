import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { MEMBER_SALE_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { useBulkMembershipDelete } from "./useBulkMembershipDelete";
import { BulkDeleteBar, BulkDeleteConfirmModal } from "./BulkDeleteBar";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import MemberSaleChartContent from "./MemberSaleChartContent";
import ReportViewToggle from "./ReportViewToggle";
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
  expiryDate: string;
  invoiceNo: string;
  clientName: string;
  clientPhone: string;
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
    expiryDate: row.expiry_date ? formatDate(row.expiry_date) : "—",
    invoiceNo: row.invoice_number ?? "—",
    clientName: row.client_name || "—",
    clientPhone: row.client_phone || "",
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
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter,     setStatusFilter]     = useState<string[]>([]);
  const [membershipFilter, setMembershipFilter] = useState<string[]>([]);
  const [pricingTypeFilter, setPricingTypeFilter] = useState<string[]>([]);
  const [staffFilterIds,   setStaffFilterIds]   = useState<string[]>([]);
  const [minPrice,         setMinPrice]         = useState("");
  const [maxPrice,         setMaxPrice]         = useState("");
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
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Shared with the Graph page below — same filter set the table/stats use,
  // minus pagination.
  const buildFilterBody = useCallback((): Record<string, any> => {
    const body: Record<string, any> = { start_date: dateFrom, end_date: dateTo };
    if (debouncedSearch) body.search = debouncedSearch;
    if (statusFilter.length > 0) body.statuses = statusFilter;
    if (membershipFilter.length > 0) body.membership_ids = membershipFilter;
    if (pricingTypeFilter.length > 0) body.pricing_types = pricingTypeFilter;
    if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
    if (minPrice !== "") body.price_min = Number(minPrice);
    if (maxPrice !== "") body.price_max = Number(maxPrice);
    return body;
  }, [dateFrom, dateTo, debouncedSearch, statusFilter, membershipFilter, pricingTypeFilter, staffFilterIds, minPrice, maxPrice]);

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
      const body = { ...buildFilterBody(), page: currentPage, limit: pageSize };
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
  }, [buildFilterBody, currentPage, pageSize]);

  // Same checkbox selection drives both bulk delete and Send Campaign —
  // matches the Sales Summary Report's pattern exactly. Each delete removes
  // the client's membership assignment AND the sale it created (revenue
  // drops accordingly), via clientMembershipsService.delete() on the backend.
  const bulkDelete = useBulkMembershipDelete(fetchData);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, statusFilter, membershipFilter, pricingTypeFilter, staffFilterIds, minPrice, maxPrice]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "membership", label: "Membership", options: membershipOptions, searchable: true },
    { key: "pricing_type", label: "Membership Type", options: pricingTypeOptions.map(t => ({ id: t, label: PRICING_TYPE_LABELS[t] ?? t })) },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
  ], [membershipOptions, pricingTypeOptions, staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    status: statusFilter,
    membership: membershipFilter,
    pricing_type: pricingTypeFilter,
    staff: staffFilterIds,
  }), [statusFilter, membershipFilter, pricingTypeFilter, staffFilterIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatusFilter(next.status ?? []);
    setMembershipFilter(next.membership ?? []);
    setPricingTypeFilter(next.pricing_type ?? []);
    setStaffFilterIds(next.staff ?? []);
  };

  const formatValue = (r: MemberSaleRow) => {
    if (r.valueAmount == null) return "—";
    if (r.pricingType === "percentage") return `${r.valueAmount}%`;
    if (r.pricingType === "value") return formatAmount(r.valueAmount);
    return "—";
  };

  const HEADERS = ["Date", "Expiry Date", "Invoice No", "Client", "Staff", "Membership", "Value", "Description", `Price Paid (${currencySymbol})`, "Payment Method", "Status"];
  const exportRows = () => rows.map(r => [
    r.purchasedAt, r.expiryDate, r.invoiceNo, r.clientName, r.staffName, r.membershipName,
    formatValue(r), r.extraBenefits, r.pricePaid, r.paymentMethod,
    STATUS_OPTIONS.find(o => o.id === r.status)?.label ?? r.status,
  ]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportViewToggle view={showChart ? "chart" : "table"} onChange={(v) => setShowChart(v === "chart")} />
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`membership-sale-${dateFrom}-${dateTo}`} variant="button" csv reportId="member_sale" />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Price Range ({currencySymbol})</label>
          <div className="rp-ms-price-range">
            <input type="number" min={0} placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            <span>—</span>
            <input type="number" min={0} placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
        </div>
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

      {showChart ? (
        <MemberSaleChartContent dateFrom={dateFrom} dateTo={dateTo} buildFilterBody={buildFilterBody} />
      ) : (
      <>
      <BulkDeleteBar count={bulkDelete.selectedIds.size} onDeleteClick={() => bulkDelete.setShowConfirm(true)} itemLabel="membership" />
      <SendCampaignBar count={bulkDelete.selectedIds.size} onSendClick={() => setShowCampaignModal(true)} />

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
              <th className="rp-row-checkbox-col">
                <input
                  type="checkbox"
                  className="rp-row-checkbox"
                  checked={rows.length > 0 && rows.every(r => bulkDelete.selectedIds.has(r.id))}
                  onChange={() => bulkDelete.toggleAll(rows.map(r => r.id))}
                />
              </th>
              <th>Date</th><th>Expiry Date</th><th>Invoice No</th><th>Client</th><th>Staff</th><th>Membership</th>
              <th>Value</th><th>Description</th><th>Price Paid ({currencySymbol})</th>
              <th>Payment Method</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={12} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={12} className="rp-detail-empty-cell">No membership sales found</td></tr>
            ) : rows.map((r) => (
              <tr
                key={r.id}
                className={r.clientId ? "rp-appt-row" : undefined}
              >
                <td className="rp-row-checkbox-col" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="rp-row-checkbox"
                    checked={bulkDelete.selectedIds.has(r.id)}
                    onChange={() => bulkDelete.toggleOne(r.id)}
                  />
                </td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.purchasedAt}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.expiryDate}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td className="fw-semibold" onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.clientName}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.staffName}</td>
                <td className="fw-semibold rp-ms-name" title={r.membershipName} onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.membershipName}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatValue(r)}</td>
                <td className="rp-ms-benefits" title={r.extraBenefits} onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.extraBenefits}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatAmount(r.pricePaid)}</td>
                <td className="rp-ms-payment" onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.paymentMethod}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}><span className={`rp-status-badge rp-status-${r.status}`}>{STATUS_OPTIONS.find(o => o.id === r.status)?.label ?? r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
      </>
      )}

      <SendCampaignModal
        show={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        contacts={rows
          .filter(r => bulkDelete.selectedIds.has(r.id) && r.clientPhone)
          .map(r => ({ phone: r.clientPhone, name: r.clientName }))}
        defaultCampaignName="Membership Sale"
        onSent={bulkDelete.clearSelection}
      />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="memberships" />
      )}

      <BulkDeleteConfirmModal
        show={bulkDelete.showConfirm}
        count={bulkDelete.selectedIds.size}
        names={rows.filter(r => bulkDelete.selectedIds.has(r.id)).map(r => r.membershipName)}
        deleting={bulkDelete.deleting}
        error={bulkDelete.error}
        itemLabel="membership"
        onCancel={() => { bulkDelete.setShowConfirm(false); bulkDelete.setError(null); }}
        onConfirm={bulkDelete.confirmDelete}
      />
    </div>
  );
}
