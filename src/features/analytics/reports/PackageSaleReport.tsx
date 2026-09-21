import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, Trash } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PACKAGE_SALE_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue, ConfirmDialog } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { useRowSelection } from "./useRowSelection";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import PackageSaleChartContent from "./PackageSaleChartContent";
import ReportViewToggle from "./ReportViewToggle";
import "./PackageSaleReport.scss";

const REPORT_NAME = "Package Sale";

interface PackageSaleRow {
  id: string;
  date: string;
  invoiceNo: string;
  client: string;
  clientId: string;
  clientPhone: string;
  staff: string;
  packageName: string;
  expiryDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  status: string;
  gstAmount: number;
}

interface FilterOption { id: string; label: string; }

const PACKAGE_STATUS_OPTIONS: FilterOption[] = [
  { id: "Active", label: "Active" },
  { id: "Completed", label: "Completed" },
];

const PAYMENT_STATUS_OPTIONS: FilterOption[] = [
  { id: "Paid", label: "Paid" },
  { id: "Partial", label: "Partial" },
  { id: "Unpaid", label: "Unpaid" },
];

const PAYMENT_METHOD_OPTIONS: FilterOption[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "upi", label: "UPI" },
  { id: "net_banking", label: "Net banking" },
  { id: "split", label: "Split" },
];

// dd/MM/yyyy, consistently across the table and every export (CSV/Excel/PDF
// all read the same r.date via exportRows).
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent Package Sale API
// (POST /api/report/package-sale — reads client_packages directly, never
// the Appointment API) to the table's existing PackageSaleRow shape.
function mapRow(row: any): PackageSaleRow {
  return {
    id: String(row.id ?? ""),
    date: row.date ? formatDate(row.date) : "—",
    invoiceNo: row.invoice_no ?? "—",
    client: row.client_name || "—",
    clientId: row.client_id ? String(row.client_id) : "",
    clientPhone: row.client_phone || "",
    staff: row.staff_name || "—",
    packageName: row.package_name || "—",
    expiryDate: row.expiry_date ? formatDate(row.expiry_date) : "—",
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    pendingAmount: Number(row.pending_amount) || 0,
    paymentStatus: row.payment_status || "unpaid",
    paymentMethod: row.payment_method || "N/A",
    status: row.status || "—",
    gstAmount: Number(row.gst_amount) || 0,
  };
}

export default function PackageSaleReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [packageFilter,  setPackageFilter]  = useState<string[]>([]);
  const [packageStatusFilter, setPackageStatusFilter] = useState<string[]>([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string[]>([]);
  const [minAmount,       setMinAmount]       = useState("");
  const [maxAmount,       setMaxAmount]       = useState("");
  const [rows,        setRows]        = useState<PackageSaleRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ packagesSold: 0, totalSaleValue: 0, totalReceived: 0, outstandingBalance: 0, distinctPackagesSold: 0 });
  // No separate /staff or /packages API call — the package-sale API itself
  // returns filters_available.staff/packages, so options stay complete
  // regardless of the current date/filter selection.
  const [staffOptions,   setStaffOptions]   = useState<FilterOption[]>([]);
  const [packageOptions, setPackageOptions] = useState<string[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const selection = useRowSelection();
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Deleting a row here removes the client's assigned package AND every
  // record tied to that specific assignment (usage/redemption history,
  // future-booked sessions, and — critically — the sale/sale_item/commission
  // trail it created), so revenue reports drop accordingly too — see
  // clientPackagesRepository.delete() for the full cleanup this triggers.
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; packageName: string; client: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Shared with the Graph page below — same filter set the table/stats use,
  // minus pagination.
  const buildFilterBody = useCallback((): Record<string, any> => {
    const body: Record<string, any> = { start_date: dateFrom, end_date: dateTo };
    if (debouncedSearch) body.search = debouncedSearch;
    if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
    if (packageFilter.length > 0) body.package_names = packageFilter;
    if (packageStatusFilter.length > 0) body.package_statuses = packageStatusFilter;
    if (paymentStatusFilter.length > 0) body.payment_statuses = paymentStatusFilter;
    if (paymentMethodFilter.length > 0) body.payment_methods = paymentMethodFilter;
    if (minAmount !== "") body.min_amount = Number(minAmount);
    if (maxAmount !== "") body.max_amount = Number(maxAmount);
    return body;
  }, [dateFrom, dateTo, debouncedSearch, staffFilterIds, packageFilter, packageStatusFilter, paymentStatusFilter, paymentMethodFilter, minAmount, maxAmount]);

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
      const res = await api.post(PACKAGE_SALE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        packagesSold: Number(s.packages_sold) || 0,
        totalSaleValue: Number(s.total_sale_value) || 0,
        totalReceived: Number(s.total_received) || 0,
        outstandingBalance: Number(s.outstanding_balance) || 0,
        distinctPackagesSold: Number(s.unique_packages) || 0,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.staff)) setStaffOptions(avail.staff);
      if (Array.isArray(avail.packages)) setPackageOptions(avail.packages);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ packagesSold: 0, totalSaleValue: 0, totalReceived: 0, outstandingBalance: 0, distinctPackagesSold: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [buildFilterBody, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDeletePackage() {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.delete(`/api/v1/client-packages/${deleteTarget.id}`);
      setDeleteTarget(null);
      // Re-fetch rather than splicing the row out locally — stats (Total
      // Sale Value, Total Received, Outstanding Balance) are computed
      // server-side over the whole filtered set, so they need a real
      // refetch to reflect the removed sale, not just the table row.
      fetchData();
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error?.message || "Failed to delete this package sale.");
    } finally {
      setDeleteBusy(false);
    }
  }

  // Filter/search changes go back to page 1 — page/pageSize changes
  // themselves should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, staffFilterIds, packageFilter, packageStatusFilter, paymentStatusFilter, paymentMethodFilter, minAmount, maxAmount]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "package", label: "Package", options: packageOptions.map(p => ({ id: p, label: p })), searchable: true },
    { key: "package_status", label: "Package Status", options: PACKAGE_STATUS_OPTIONS },
    { key: "payment_status", label: "Payment Status", options: PAYMENT_STATUS_OPTIONS },
    { key: "payment_method", label: "Payment Method", options: PAYMENT_METHOD_OPTIONS },
  ], [staffOptions, packageOptions]);

  const filterMenuSelected = useMemo(() => ({
    staff: staffFilterIds,
    package: packageFilter,
    package_status: packageStatusFilter,
    payment_status: paymentStatusFilter,
    payment_method: paymentMethodFilter,
  }), [staffFilterIds, packageFilter, packageStatusFilter, paymentStatusFilter, paymentMethodFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStaffFilterIds(next.staff ?? []);
    setPackageFilter(next.package ?? []);
    setPackageStatusFilter(next.package_status ?? []);
    setPaymentStatusFilter(next.payment_status ?? []);
    setPaymentMethodFilter(next.payment_method ?? []);
  };

  const HEADERS = ["Date", "Invoice No", "Client", "Staff", "Package Name", "Expiry Date", `Total Amount (${currencySymbol})`, `GST (${currencySymbol})`, `Paid (${currencySymbol})`, `Balance Due (${currencySymbol})`, "Payment Method", "Status"];
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.client, r.staff, r.packageName, r.expiryDate, r.totalAmount, r.gstAmount, r.paidAmount, r.pendingAmount, r.paymentMethod, r.status]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportViewToggle view={showChart ? "chart" : "table"} onChange={(v) => setShowChart(v === "chart")} />
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`package-sale-${dateFrom}-${dateTo}`} variant="button" csv reportId="package_sale" />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Amount Range ({currencySymbol})</label>
          <div className="rp-pkg-amount-range">
            <input type="number" min={0} placeholder="Min" value={minAmount} onChange={e => setMinAmount(e.target.value)} />
            <span>—</span>
            <input type="number" min={0} placeholder="Max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={5} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.packagesSold}</div><div className="rp-sra-summary-label">Packages Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalSaleValue)}</div><div className="rp-sra-summary-label">Total Sale Value</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalReceived)}</div><div className="rp-sra-summary-label">Total Received</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.outstandingBalance)}</div><div className="rp-sra-summary-label">Outstanding Balance</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.distinctPackagesSold}</div><div className="rp-sra-summary-label">Distinct Packages Sold</div></div>
        </div>
      )}

      {showChart ? (
        <PackageSaleChartContent dateFrom={dateFrom} dateTo={dateTo} buildFilterBody={buildFilterBody} />
      ) : (
      <>
      <SendCampaignBar count={selection.selectedIds.size} onSendClick={() => setShowCampaignModal(true)} />

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client, package name, or invoice no" value={search} onChange={e => setSearchInput(e.target.value)} />
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
                  checked={rows.length > 0 && rows.every((_r, i) => selection.selectedIds.has(String(i)))}
                  onChange={() => selection.toggleAll(rows.map((_r, i) => String(i)))}
                />
              </th>
              <th>Date</th><th>Invoice No</th><th>Client</th><th>Staff</th><th>Package Name</th><th>Expiry Date</th>
              <th>Total Amount ({currencySymbol})</th><th>GST ({currencySymbol})</th><th>Paid ({currencySymbol})</th>
              <th>Balance Due ({currencySymbol})</th><th>Payment Method</th><th>Status</th><th className="rp-pkg-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={14} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={14} className="rp-detail-empty-cell">No package sales found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
              >
                <td className="rp-row-checkbox-col" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="rp-row-checkbox"
                    checked={selection.selectedIds.has(String(i))}
                    onChange={() => selection.toggleOne(String(i))}
                  />
                </td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.date}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td className="fw-semibold" onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.client}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.staff}</td>
                <td className="fw-semibold rp-pkg-name" title={r.packageName} onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.packageName}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.expiryDate}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatAmount(r.totalAmount)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatAmount(r.gstAmount)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatAmount(r.paidAmount)}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{formatAmount(r.pendingAmount)}</td>
                <td className="rp-pkg-payment" onClick={() => r.clientId && setSelectedClientId(r.clientId)}>{r.paymentMethod}</td>
                <td onClick={() => r.clientId && setSelectedClientId(r.clientId)}><span className={`rp-status-badge rp-status-${(r.status ?? "").toLowerCase()}`}>{r.status}</span></td>
                <td className="rp-pkg-actions-col" onClick={e => e.stopPropagation()}>
                  {r.id && (
                    <button
                      type="button"
                      className="rp-pkg-delete-btn"
                      title="Delete this package sale"
                      onClick={() => { setDeleteError(""); setDeleteTarget({ id: r.id, packageName: r.packageName, client: r.client }); }}
                      style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center" }}
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </td>
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
          .filter((r, i) => selection.selectedIds.has(String(i)) && r.clientPhone)
          .map(r => ({ phone: r.clientPhone, name: r.client }))}
        defaultCampaignName="Package Sale"
        onSent={selection.clearSelection}
      />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="packages" />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Package Sale"
          message={(
            <>
              Are you sure you want to delete the <strong>{deleteTarget.packageName}</strong> package assigned to{" "}
              <strong>{deleteTarget.client}</strong>? This removes the client's assigned package, its usage/session
              history, and the sale it created — revenue reports will update accordingly. This action cannot be undone.
              {deleteError && <div style={{ marginTop: 10, color: "#dc2626", fontSize: 12.5 }}>{deleteError}</div>}
            </>
          )}
          confirmLabel={deleteBusy ? "Deleting…" : "Delete"}
          danger
          confirmDisabled={deleteBusy}
          onConfirm={handleDeletePackage}
          onCancel={() => !deleteBusy && setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
