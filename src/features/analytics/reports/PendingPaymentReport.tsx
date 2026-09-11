import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PENDING_PAYMENT_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DateRangeFilter, getDateRangePresetValue } from "../../../components/ui";
import type { JiraFilterField, DateRangeFilterValue } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import { useCurrency } from "../../../hooks/useCurrency";
import { maskMobile } from "../../../utils/maskMobile";
import { useRowSelection } from "./useRowSelection";
import { SendCampaignBar } from "./SendCampaignBar";
import { SendCampaignModal } from "../../marketing/components";
import "./PendingPaymentReport.scss";

const REPORT_NAME = "Pending Payment Report";

interface PendingPaymentRow {
  appointmentId: string;
  clientId: string;
  billDate: string | null;
  customerName: string;
  contact: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  staffName: string;
  daysPending: number;
}

function mapRow(row: any): PendingPaymentRow {
  return {
    appointmentId: row.appointment_id ? String(row.appointment_id) : "",
    clientId: row.client_id ? String(row.client_id) : "",
    billDate: row.bill_date || row.payment_date || null,
    customerName: row.customer_name || "Walk-in",
    contact: row.contact || "—",
    invoiceNumber: row.invoice_number || "—",
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    dueAmount: Number(row.due_amount) || 0,
    paymentMethod: row.payment_method || "—",
    staffName: row.staff_name || "—",
    daysPending: Number(row.days_pending) || 0,
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

export default function PendingPaymentReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  // On-screen the contact column is always masked; only the owner/admin role
  // gets the real number in Excel/CSV/PDF exports (staff/manager exports stay
  // masked too) — see maskMobile.
  const role = useAppSelector((s) => s.auth.role);
  const canViewFullContact = role === "salon_owner" || role === "admin";
  const { currencySymbol, formatAmount } = useCurrency();
  // Defaults to "this year" (rather than "this month" like most reports) so
  // it lines up with the Dashboard's Due Amount card, which sums every
  // outstanding balance without a date cutoff — a full calendar year is the
  // closest a date-scoped report can get to that.
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "this_year", ...getDateRangePresetValue("this_year") });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [methodOptions, setMethodOptions] = useState<{ id: string; label: string }[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [methodFilter, setMethodFilter] = useState<string[]>([]);
  const [search, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,    setRows]    = useState<PendingPaymentRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [stats,   setStats]   = useState({
    totalPendingAmount: 0, totalPendingTransactions: 0, totalCustomersWithDue: 0,
    averagePendingAmount: 0, oldestPendingPaymentDate: null as string | null,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  // Clicking a row opens the real bill drawer, where the balance can be
  // collected via its "Collect Due" action — the whole point of this report.
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const selection = useRowSelection();
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = dateFrom && dateTo && dateTo < dateFrom
    ? "To Date must be greater than or equal to From Date"
    : "";

  // Staff and payment-method options both come from filters_available on the
  // report response (see fetchData) so the lists only ever contain staff/
  // methods that actually have pending bills.
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
      if (methodFilter.length > 0) body.payment_methods = methodFilter;
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(PENDING_PAYMENT_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      // Options come from the salon's whole pending-payment history, not just
      // the visible page — a method that only appears on page 3 must still be
      // selectable from page 1.
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
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({
          totalPendingAmount: 0, totalPendingTransactions: 0, totalCustomersWithDue: 0,
          averagePendingAmount: 0, oldestPendingPaymentDate: null,
        });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, methodFilter, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, staffFilterIds, methodFilter, debouncedSearch]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "method", label: "Payment Method", options: methodOptions, searchable: true },
    { key: "staff",  label: "Staff", options: staffOptions, searchable: true },
  ], [methodOptions, staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    method: methodFilter,
    staff: staffFilterIds,
  }), [methodFilter, staffFilterIds]);

  // Applied together in one commit so Method + Staff narrow the result set
  // jointly (AND), instead of a later field replacing an earlier one. Clear
  // passes {}, hence the ?? [] defaults.
  const handleFiltersApply = (next: Record<string, string[]>) => {
    setMethodFilter(next.method ?? []);
    setStaffFilterIds(next.staff ?? []);
  };

  const HEADERS = [
    "Bill Date", "Invoice No.", "Client Name", "Contact",
    `Total Amount (${currencySymbol})`, `Paid Amount (${currencySymbol})`, `Due Amount (${currencySymbol})`,
    "Payment Method", "Status", "Days Pending", "Staff",
  ];
  const exportRows = () => rows.map(r => [
    formatDate(r.billDate), r.invoiceNumber, r.customerName, canViewFullContact ? r.contact : maskMobile(r.contact),
    r.totalAmount, r.paidAmount, r.dueAmount,
    r.paymentMethod, "Partial", r.daysPending, r.staffName,
  ]);

  const activeFilterLines = [
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
              reportId="pending_payment"
              filename={`pending-payment-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              disabled={!!dateRangeError}
              dateRangeLabel={`${formatDate(dateFrom)} - ${formatDate(dateTo)}`}
              filterLines={activeFilterLines}
              summaryLines={[
                `Total Pending Amount: ${formatAmount(stats.totalPendingAmount)}`,
                `Total Pending Transactions: ${stats.totalPendingTransactions}`,
                `Clients With Due: ${stats.totalCustomersWithDue}`,
                `Average Pending Amount: ${formatAmount(stats.averagePendingAmount)}`,
                `Oldest Pending Payment: ${formatDate(stats.oldestPendingPaymentDate)}`,
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

      {loading ? <SkeletonStatCards count={5} /> : (
        <div className="rp-sra-summary-row">
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

      <SendCampaignBar count={selection.selectedIds.size} onSendClick={() => setShowCampaignModal(true)} />

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
              <th>Bill Date</th><th>Invoice No.</th><th>Client Name</th><th>Contact</th>
              <th>Total Amount ({currencySymbol})</th>
              <th>Paid Amount ({currencySymbol})</th>
              <th>Due Amount ({currencySymbol})</th>
              <th>Payment Method</th><th>Status</th><th>Days Pending</th><th>Staff</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={12} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={12} className="rp-detail-empty-cell">No pending payments found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.appointmentId ? "rp-appt-row" : undefined}
              >
                <td className="rp-row-checkbox-col" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="rp-row-checkbox"
                    checked={selection.selectedIds.has(String(i))}
                    onChange={() => selection.toggleOne(String(i))}
                  />
                </td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{formatDate(r.billDate)}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}><span className="rp-detail-link">{r.invoiceNumber}</span></td>
                <td className="fw-semibold" onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.customerName}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{maskMobile(r.contact)}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{formatAmount(r.totalAmount)}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{formatAmount(r.paidAmount)}</td>
                <td className="fw-semibold" onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{formatAmount(r.dueAmount)}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.paymentMethod}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>
                  <span className="rp-status-badge rp-status-partial">Partial</span>
                </td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.daysPending}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.staffName}</td>
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

      <SendCampaignModal
        show={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        contacts={rows
          .filter((r, i) => selection.selectedIds.has(String(i)) && r.contact && r.contact !== "—")
          .map(r => ({ phone: r.contact, name: r.customerName }))}
        defaultCampaignName="Pending Payment Reminder"
        onSent={selection.clearSelection}
      />
    </div>
  );
}
