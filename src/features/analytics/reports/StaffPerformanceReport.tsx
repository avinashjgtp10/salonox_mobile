import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { STAFF_PERFORMANCE_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import ReportRefreshButton from "./ReportRefreshButton";
import Select from "../../../components/ui/Select";
import MultiSelectCheckbox from "../../../components/ui/MultiSelectCheckbox";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { Pagination, Avatar } from "../../../components/ui";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { useCurrency } from "../../../hooks/useCurrency";
import StaffHistoryModal from "./StaffHistoryModal";
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

interface FiltersState {
  staffIds: string[];
  paymentMode: string;
  paymentStatus: string;
  itemType: string;
  packageId: string;
  membershipId: string;
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
  // No date-range control in the UI — always scoped to the current month.
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const defaultFilters: FiltersState = {
    staffIds: [], paymentMode: "All", paymentStatus: "All",
    itemType: "All", packageId: "All", membershipId: "All",
  };

  // Filters only take effect once "Apply" is clicked — draftFilters is what
  // the panel's inputs are bound to, appliedFilters is what fetchData
  // actually sends. Refresh re-runs with appliedFilters unchanged.
  const [draftFilters, setDraftFilters] = useState<FiltersState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(defaultFilters);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

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
  const [pageSize, setPageSize] = useState(25);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; name: string } | null>(null);
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
      const f = appliedFilters;
      const body: Record<string, any> = {
        start_date: monthStart, end_date: today,
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (f.staffIds.length > 0) body.staff_ids = f.staffIds;
      if (f.paymentMode !== "All") body.payment_mode = f.paymentMode;
      if (f.paymentStatus !== "All") body.payment_status = f.paymentStatus;
      if (f.itemType !== "All") body.item_type = f.itemType;
      if (f.packageId !== "All") body.package_id = f.packageId;
      if (f.membershipId !== "All") body.membership_id = f.membershipId;

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
  }, [appliedFilters, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [appliedFilters, debouncedSearch]);

  const activeFilterCount = [
    appliedFilters.staffIds.length > 0 ? 1 : 0,
    appliedFilters.paymentMode !== "All" ? 1 : 0,
    appliedFilters.paymentStatus !== "All" ? 1 : 0,
    appliedFilters.itemType !== "All" ? 1 : 0,
    appliedFilters.packageId !== "All" ? 1 : 0,
    appliedFilters.membershipId !== "All" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const openFiltersPanel = () => { setDraftFilters(appliedFilters); setShowFiltersPanel(true); };
  const applyFilters = () => { setAppliedFilters(draftFilters); setShowFiltersPanel(false); };
  // Clear applies immediately (not just the draft) — resets the actually
  // applied filters and refetches, same as Clear-then-Apply in one step.
  const clearFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setShowFiltersPanel(false);
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
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`staff-performance-${monthStart}-${today}`} variant="button" csv />
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
        <button className="rp-sp-filters-btn" onClick={openFiltersPanel}>
          Filters
          {activeFilterCount > 0 && <span className="rp-sp-filters-badge">{activeFilterCount}</span>}
        </button>
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
                title={`View ${r.staffName}'s sales history`}
                onClick={() => setSelectedStaff({ id: r.staffId, name: r.staffName })}
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

      {selectedStaff && (
        <StaffHistoryModal
          staffId={selectedStaff.id}
          staffName={selectedStaff.name}
          dateFrom={monthStart}
          dateTo={today}
          onClose={() => setSelectedStaff(null)}
        />
      )}

      {showFiltersPanel && (
        <div className="rp-sp-filters-overlay" onClick={() => setShowFiltersPanel(false)}>
          <div className="rp-sp-filters-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filters</h3>
            </div>

            <div className="rp-sp-filters-body">
              <MultiSelectCheckbox
                label="Staff"
                containerClass="rp-sp-filter-field"
                options={staffOptions}
                selected={draftFilters.staffIds}
                onChange={ids => setDraftFilters(f => ({ ...f, staffIds: ids }))}
                placeholder="All staff"
              />

              <Select label="Payment Mode" containerClass="rp-sp-filter-field" value={draftFilters.paymentMode} onChange={e => setDraftFilters(f => ({ ...f, paymentMode: e.target.value }))}>
                <option value="All">All payment modes</option>
                {paymentModeOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>

              <Select label="Payment Status" containerClass="rp-sp-filter-field" value={draftFilters.paymentStatus} onChange={e => setDraftFilters(f => ({ ...f, paymentStatus: e.target.value }))}>
                <option value="All">All</option>
                {PAYMENT_STATUS_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>

              <Select label="Item Type" containerClass="rp-sp-filter-field" value={draftFilters.itemType} onChange={e => setDraftFilters(f => ({ ...f, itemType: e.target.value }))}>
                <option value="All">All item types</option>
                {ITEM_TYPE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>

              <Select label="Package" containerClass="rp-sp-filter-field" value={draftFilters.packageId} onChange={e => setDraftFilters(f => ({ ...f, packageId: e.target.value }))}>
                <option value="All">All packages</option>
                {packageOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>

              <Select label="Membership" containerClass="rp-sp-filter-field" value={draftFilters.membershipId} onChange={e => setDraftFilters(f => ({ ...f, membershipId: e.target.value }))}>
                <option value="All">All memberships</option>
                {membershipOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            </div>

            <div className="rp-sp-filters-actions">
              <Button variant="ghost" onClick={clearFilters}>Clear</Button>
              <Button variant="dark" onClick={applyFilters}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
