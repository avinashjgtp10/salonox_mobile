import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PAYMENT_COLLECTION_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import { useCurrency } from "../../../hooks/useCurrency";
import "./PaymentCollectionReport.scss";

const REPORT_NAME = "Payment Collection Report";

const PAYMENT_STATUS_OPTIONS = [
  { id: "partial", label: "Partial" },
  { id: "paid",    label: "Paid" },
];

interface PaymentCollectionRow {
  appointmentId: string;
  clientId: string;
  paymentDate: string | null;
  customerName: string;
  contact: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  paymentStatus: "paid" | "partial";
  staffName: string;
}

function mapRow(row: any): PaymentCollectionRow {
  return {
    appointmentId: row.appointment_id ? String(row.appointment_id) : "",
    clientId: row.client_id ? String(row.client_id) : "",
    paymentDate: row.payment_date || null,
    customerName: row.customer_name || "Walk-in",
    contact: row.contact || "—",
    invoiceNumber: row.invoice_number || "—",
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    dueAmount: Number(row.due_amount) || 0,
    paymentMethod: row.payment_method || "—",
    paymentStatus: row.payment_status === "partial" ? "partial" : "paid",
    staffName: row.staff_name || "—",
  };
}

function formatDate(input: string | null): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function PaymentCollectionReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_month", ...getDateRangePresetValue("this_month") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [methodOptions, setMethodOptions] = useState<{ id: string; label: string }[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [methodFilter, setMethodFilter] = useState<string[]>([]);
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,    setRows]    = useState<PaymentCollectionRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [stats,   setStats]   = useState({
    totalPendingAmount: 0, totalPendingTransactions: 0, totalCustomersWithDue: 0,
    averagePendingAmount: 0, oldestPendingPaymentDate: null as string | null,
    totalBilled: 0, totalCollected: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  // Clicking a row opens the real bill drawer, where a pending balance can be
  // collected via its "Collect Due" action — the whole point of this report.
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  // Staff and payment-method options both come from filters_available on the
  // report response (see fetchData) rather than the staff thunk, so the lists
  // only ever contain staff who actually have billed appointments.
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
      // Both statuses selected is the same as no status filter — sending
      // neither keeps the backend's WHERE clause off entirely.
      if (statusFilter.length === 1) body.payment_statuses = statusFilter;
      if (methodFilter.length > 0) body.payment_methods = methodFilter;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(PAYMENT_COLLECTION_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      // Options come from the salon's whole payment history, not just the
      // visible page — a method that only appears on page 3 must still be
      // selectable from page 1. Staff options are filled here too, replacing
      // the roster-wide thunk list with only staff who actually have billed
      // appointments.
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.payment_methods)) {
        setMethodOptions(avail.payment_methods.map((o: any) => ({ id: String(o.id), label: o.label })));
      }
      if (Array.isArray(avail.staff) && avail.staff.length > 0) {
        setStaffOptions(avail.staff.map((o: any) => ({ id: String(o.id), label: o.label })));
      }
      const s = data?.stats ?? {};
      setStats({
        totalPendingAmount: Number(s.total_pending_amount) || 0,
        totalPendingTransactions: Number(s.total_pending_transactions) || 0,
        totalCustomersWithDue: Number(s.total_customers_with_due) || 0,
        averagePendingAmount: Number(s.average_pending_amount) || 0,
        oldestPendingPaymentDate: s.oldest_pending_payment_date ?? null,
        totalBilled: Number(s.total_billed) || 0,
        totalCollected: Number(s.total_collected) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({
          totalPendingAmount: 0, totalPendingTransactions: 0, totalCustomersWithDue: 0,
          averagePendingAmount: 0, oldestPendingPaymentDate: null, totalBilled: 0, totalCollected: 0,
        });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, statusFilter, methodFilter, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, staffFilterIds, statusFilter, methodFilter, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Payment Status", options: PAYMENT_STATUS_OPTIONS },
    { key: "method", label: "Payment Method", options: methodOptions, searchable: true },
    { key: "staff",  label: "Staff", options: staffOptions, searchable: true },
  ], [methodOptions, staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    status: statusFilter,
    method: methodFilter,
    staff: staffFilterIds,
  }), [statusFilter, methodFilter, staffFilterIds]);

  // Applied together in one commit so Status + Method + Staff narrow the
  // result set jointly (AND), instead of a later field replacing an earlier
  // one. Clear passes {}, hence the ?? [] defaults.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatusFilter(next.status ?? []);
    setMethodFilter(next.method ?? []);
    setStaffFilterIds(next.staff ?? []);
  };

  const HEADERS = [
    "Date", "Invoice No.", "Client Name", "Contact",
    `Total Amount (${currencySymbol})`, `Paid Amount (${currencySymbol})`, `Due Amount (${currencySymbol})`,
    "Payment Method", "Status", "Staff",
  ];
  const exportRows = () => rows.map(r => [
    formatDate(r.paymentDate), r.invoiceNumber, r.customerName, r.contact,
    r.totalAmount, r.paidAmount, r.dueAmount,
    r.paymentMethod, r.paymentStatus === "partial" ? "Partial" : "Paid", r.staffName,
  ]);

  const activeFilterLines = [
    ...(statusFilter.length
      ? [`Payment Status: ${PAYMENT_STATUS_OPTIONS.filter(o => statusFilter.includes(o.id)).map(o => o.label).join(", ")}`]
      : []),
    ...(methodFilter.length
      ? [`Payment Method: ${methodOptions.filter(o => methodFilter.includes(o.id)).map(o => o.label).join(", ")}`]
      : []),
    ...(staffFilterIds.length
      ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
      : []),
    ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
  ];

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
              filename={`payment-collection-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={activeFilterLines}
              summaryLines={[
                `Total Paid: ${formatAmount(stats.totalCollected)}`,
                `Total Pending Amount: ${formatAmount(stats.totalPendingAmount)}`,
                `Total Pending Transactions: ${stats.totalPendingTransactions}`,
                `Clients With Due: ${stats.totalCustomersWithDue}`,
                `Average Pending Amount: ${formatAmount(stats.averagePendingAmount)}`,
                `Oldest Pending Payment: ${formatDate(stats.oldestPendingPaymentDate)}`,
                `Billed: ${formatAmount(stats.totalBilled)} | Collected: ${formatAmount(stats.totalCollected)}`,
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

      {loading ? <SkeletonStatCards count={6} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card">
            <div className="rp-sra-summary-val">{formatAmount(stats.totalCollected)}</div>
            <div className="rp-sra-summary-label">Total Paid</div>
          </div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalPendingAmount)}</div><div className="rp-sra-summary-label">Total Pending Amount</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalPendingTransactions}</div><div className="rp-sra-summary-label">Total Pending Transactions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalCustomersWithDue}</div><div className="rp-sra-summary-label">Clients With Due Amount</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.averagePendingAmount)}</div><div className="rp-sra-summary-label">Average Pending Amount</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val rp-pc-date-val">{formatDate(stats.oldestPendingPaymentDate)}</div><div className="rp-sra-summary-label">Oldest Pending Payment</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client name, phone or invoice no." value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Invoice No.</th><th>Client Name</th><th>Contact</th>
              <th>Total Amount ({currencySymbol})</th>
              <th>Paid Amount ({currencySymbol})</th>
              <th>Due Amount ({currencySymbol})</th>
              <th>Payment Method</th><th>Status</th><th>Staff</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={10} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="rp-detail-empty-cell">No payments found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.appointmentId ? "rp-appt-row" : undefined}
                onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}
              >
                <td>{formatDate(r.paymentDate)}</td>
                <td><span className="rp-detail-link">{r.invoiceNumber}</span></td>
                <td className="fw-semibold">{r.customerName}</td>
                <td>{r.contact}</td>
                <td>{formatAmount(r.totalAmount)}</td>
                <td>{formatAmount(r.paidAmount)}</td>
                <td className="fw-semibold">{formatAmount(r.dueAmount)}</td>
                <td>{r.paymentMethod}</td>
                <td>
                  <span className={`rp-status-badge ${r.paymentStatus === "paid" ? "rp-status-paid" : "rp-status-partial"}`}>
                    {r.paymentStatus === "paid" ? "Paid" : "Partial"}
                  </span>
                </td>
                <td>{r.staffName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedAppointmentId && (
        <AppointmentDetailModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
          // A collected payment changes this row's due/paid figures, so pull
          // fresh data rather than leaving a stale balance on screen.
          onChanged={fetchData}
        />
      )}
    </div>
  );
}
