import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF_PERFORMANCE_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { Pagination, Avatar, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { useCurrency } from "../../../hooks/useCurrency";
import StaffHistoryModal from "../../staff/components/StaffHistoryModal";
import "./StaffPerformanceReport.scss";

const REPORT_NAME = "Staff Performance";

interface FilterOption { id: string; label: string; }

const PAYMENT_STATUS_OPTIONS: FilterOption[] = [
  { id: "completed", label: "Paid" },
  { id: "partial", label: "Partial" },
  { id: "cancelled", label: "Cancelled" },
  { id: "refunded", label: "Refunded" },
];

const ITEM_TYPE_OPTIONS: FilterOption[] = [
  { id: "service", label: "Service" },
  { id: "product", label: "Product" },
  { id: "package", label: "Package" },
  { id: "membership", label: "Membership" },
];

interface StaffPerformanceRow {
  staffId: string;
  staffName: string;
  staffAvatar: string | null;
  contact: string;
  invoiceCount: number;
  serviceCount: number; serviceRevenue: number;
  productCount: number; productRevenue: number;
  packageCount: number; packageRevenue: number;
  membershipCount: number; membershipRevenue: number;
  totalRevenue: number;
  avgBill: number;
  commission: number;
  collected: number;
  due: number;
}

function initialsOf(name: string): string {
  return name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("");
}

function mapRow(row: any): StaffPerformanceRow {
  return {
    staffId: String(row.staff_id ?? ""),
    staffName: row.staff_name || "—",
    staffAvatar: row.staff_avatar || null,
    contact: row.contact || "—",
    invoiceCount: Number(row.invoice_count) || 0,
    serviceCount: Number(row.service_count) || 0,
    serviceRevenue: Number(row.service_revenue) || 0,
    productCount: Number(row.product_count) || 0,
    productRevenue: Number(row.product_revenue) || 0,
    packageCount: Number(row.package_count) || 0,
    packageRevenue: Number(row.package_revenue) || 0,
    membershipCount: Number(row.membership_count) || 0,
    membershipRevenue: Number(row.membership_revenue) || 0,
    totalRevenue: Number(row.total_revenue) || 0,
    avgBill: Number(row.avg_bill) || 0,
    commission: Number(row.commission) || 0,
    collected: Number(row.collected) || 0,
    due: Number(row.due) || 0,
  };
}

export default function StaffPerformanceReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [historyStaffId, setHistoryStaffId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;

  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [paymentModeFilter, setPaymentModeFilter] = useState<string[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>([]);
  const [itemTypeFilter, setItemTypeFilter] = useState<string[]>([]);
  const [packageFilter, setPackageFilter] = useState<string[]>([]);
  const [membershipFilter, setMembershipFilter] = useState<string[]>([]);
  // GST toggle under Filter -> Other. On by default (revenue shown gross of
  // GST); a single-element array ("1"/"0") is reused here so it still fits
  // JiraFilterMenu's per-field string[] draft/Apply/Clear lifecycle.
  const [gstFilter, setGstFilter] = useState<string[]>(["1"]);
  const includeGst = gstFilter[0] !== "0";

  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [staffOptions, setStaffOptions] = useState<FilterOption[]>([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>([]);
  const [packageOptions, setPackageOptions] = useState<FilterOption[]>([]);
  const [membershipOptions, setMembershipOptions] = useState<FilterOption[]>([]);

  const [rows, setRows] = useState<StaffPerformanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalStaff: 0, totalRevenue: 0, serviceRevenue: 0, productRevenue: 0,
    packageRevenue: 0, membershipRevenue: 0, totalCommission: 0, avgRevenuePerStaff: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
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
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (paymentModeFilter.length > 0) body.payment_modes = paymentModeFilter;
      if (paymentStatusFilter.length > 0) body.payment_statuses = paymentStatusFilter;
      if (itemTypeFilter.length > 0) body.item_types = itemTypeFilter;
      if (packageFilter.length > 0) body.package_ids = packageFilter;
      if (membershipFilter.length > 0) body.membership_ids = membershipFilter;
      body.include_gst = includeGst;

      const res = await api.post(STAFF_PERFORMANCE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalStaff: Number(s.total_staff) || 0,
        totalRevenue: Number(s.total_revenue) || 0,
        serviceRevenue: Number(s.service_revenue) || 0,
        productRevenue: Number(s.product_revenue) || 0,
        packageRevenue: Number(s.package_revenue) || 0,
        membershipRevenue: Number(s.membership_revenue) || 0,
        totalCommission: Number(s.total_commission) || 0,
        avgRevenuePerStaff: Number(s.avg_revenue_per_staff) || 0,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.staff)) setStaffOptions(avail.staff);
      if (Array.isArray(avail.payment_modes)) setPaymentModeOptions(avail.payment_modes);
      if (Array.isArray(avail.packages)) setPackageOptions(avail.packages);
      if (Array.isArray(avail.memberships)) setMembershipOptions(avail.memberships);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalStaff: 0, totalRevenue: 0, serviceRevenue: 0, productRevenue: 0, packageRevenue: 0, membershipRevenue: 0, totalCommission: 0, avgRevenuePerStaff: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, paymentModeFilter, paymentStatusFilter, itemTypeFilter, packageFilter, membershipFilter, includeGst, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, staffFilterIds, paymentModeFilter, paymentStatusFilter, itemTypeFilter, packageFilter, membershipFilter, includeGst, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "payment_mode", label: "Payment Mode", options: paymentModeOptions.map(m => ({ id: m, label: m })) },
    { key: "payment_status", label: "Payment Status", options: PAYMENT_STATUS_OPTIONS },
    { key: "item_type", label: "Item Type", options: ITEM_TYPE_OPTIONS },
    { key: "package", label: "Package", options: packageOptions, searchable: true },
    { key: "membership", label: "Membership", options: membershipOptions, searchable: true },
    {
      key: "other",
      label: "Other",
      options: [],
      render: (draft, setDraft) => {
        const checked = draft[0] !== "0";
        return (
          <label className="jfm-option">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => setDraft([checked ? "0" : "1"])}
            />
            <span>Include GST in revenue</span>
          </label>
        );
      },
    },
  ], [staffOptions, paymentModeOptions, packageOptions, membershipOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
    payment_mode: paymentModeFilter,
    payment_status: paymentStatusFilter,
    item_type: itemTypeFilter,
    package: packageFilter,
    membership: membershipFilter,
    // Only surfaced when GST is switched OFF (non-default) — otherwise the
    // Filters button's applied-count badge would permanently read "1" even
    // with no real filter active, since this field's draft is never empty.
    other: includeGst ? [] : gstFilter,
  }), [staffFilterIds, paymentModeFilter, paymentStatusFilter, itemTypeFilter, packageFilter, membershipFilter, includeGst, gstFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
    setPaymentModeFilter(next.payment_mode ?? []);
    setPaymentStatusFilter(next.payment_status ?? []);
    setItemTypeFilter(next.item_type ?? []);
    setPackageFilter(next.package ?? []);
    setMembershipFilter(next.membership ?? []);
    // "Other" (GST) isn't a multi-select list — an empty/missing draft here
    // means "cleared", which for a single on/off toggle should fall back to
    // the default (GST included), not read as "0 selected -> false".
    setGstFilter(next.other && next.other.length > 0 ? next.other : ["1"]);
  };

  const countRev = (count: number, revenue: number) => `${count} (${formatAmount(revenue)})`;

  const HEADERS = [
    "Staff Name", "Contact", "Invoice Count", "Services Sold", "Products Sold",
    "Packages Sold", "Memberships Sold", `Total Revenue (${currencySymbol})`,
    `Avg Bill (${currencySymbol})`, `Commission (${currencySymbol})`,
    `Due Amount (${currencySymbol})`,
  ];
  const exportRows = () => rows.map(r => [
    r.staffName, r.contact, r.invoiceCount,
    countRev(r.serviceCount, r.serviceRevenue),
    countRev(r.productCount, r.productRevenue),
    countRev(r.packageCount, r.packageRevenue),
    countRev(r.membershipCount, r.membershipRevenue),
    r.totalRevenue, r.avgBill, r.commission, r.due,
  ]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`staff-performance-${dateFrom}-${dateTo}`} variant="button" csv reportId="staff_performance" />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search service or product name"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date Range</label>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={8} /> : (
        <div className="rp-sra-summary-row rp-sp-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalStaff}</div><div className="rp-sra-summary-label">Total Staff</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRevenue)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.serviceRevenue)}</div><div className="rp-sra-summary-label">Service Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.productRevenue)}</div><div className="rp-sra-summary-label">Product Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.packageRevenue)}</div><div className="rp-sra-summary-label">Package Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.membershipRevenue)}</div><div className="rp-sra-summary-label">Membership Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalCommission)}</div><div className="rp-sra-summary-label">Total Commission</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.avgRevenuePerStaff)}</div><div className="rp-sra-summary-label">Average Revenue per Staff</div></div>
        </div>
      )}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table rp-sp-table">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Contact</th>
              <th>Invoice Count</th>
              <th>Services Sold</th>
              <th>Products Sold</th>
              <th>Packages Sold</th>
              <th>Memberships Sold</th>
              <th>Total Revenue ({currencySymbol})</th>
              <th>Avg Bill ({currencySymbol})</th>
              <th>Commission ({currencySymbol})</th>
              <th>Due Amount ({currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={11} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="rp-detail-empty-cell">No staff performance data available for the selected date/filter.</td></tr>
            ) : rows.map(r => (
              <tr
                key={r.staffId}
                className="rp-ss-clickable-row"
                title={`View ${r.staffName}'s history`}
                onClick={() => setHistoryStaffId(r.staffId)}
              >
                <td>
                  <div className="rp-sp-staff-cell">
                    {r.staffAvatar
                      ? <img src={r.staffAvatar} alt={r.staffName} className="rp-sp-avatar-img" />
                      : <Avatar initials={initialsOf(r.staffName)} size="sm" />}
                    <span className="fw-semibold">{r.staffName}</span>
                  </div>
                </td>
                <td>{r.contact}</td>
                <td>{r.invoiceCount}</td>
                <td>{countRev(r.serviceCount, r.serviceRevenue)}</td>
                <td>{countRev(r.productCount, r.productRevenue)}</td>
                <td>{countRev(r.packageCount, r.packageRevenue)}</td>
                <td>{countRev(r.membershipCount, r.membershipRevenue)}</td>
                <td className="fw-semibold">{formatAmount(r.totalRevenue)}</td>
                <td>{formatAmount(r.avgBill)}</td>
                <td>{formatAmount(r.commission)}</td>
                <td>{formatAmount(r.due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      <StaffHistoryModal staffId={historyStaffId} onClose={() => setHistoryStaffId(null)} />
    </div>
  );
}
