import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { DAILY_SHEET_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import { SkeletonTableRows, SkeletonStatCards } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu, DatePicker } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import { useBulkAppointmentDelete } from "./useBulkAppointmentDelete";
import { BulkDeleteBar } from "./BulkDeleteBar";
import { useCurrency } from "../../../hooks/useCurrency";
import { formatPaymentMode } from "../../../utils/paymentMode";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";
import "./DailySheetReport.scss";

const REPORT_NAME = "Daily Sheet";

interface DailyRow {
  appointmentId: string | null;
  serviceId: string | null;
  staffId: string | null;
  billTime: string;
  invoiceNo: string;
  clientName: string;
  items: string;
  itemType: string;
  staff: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  grandTotal: number;
  paymentMethod: string;
  status: string;
}

// Maps a row from the independent Daily Sheet API
// (POST /api/report/daily-sheet — reads sales/sale_items directly, never
// the Appointment API) to the table's existing DailyRow shape.
function mapRow(row: any): DailyRow {
  return {
    appointmentId: row.appointment_id ? String(row.appointment_id) : null,
    serviceId: row.service_id ? String(row.service_id) : null,
    staffId: row.staff_id ? String(row.staff_id) : null,
    billTime: row.bill_time || "—",
    invoiceNo: row.ticket_no ?? "—",
    clientName: row.client_name || "Walk-in",
    items: row.service || "—",
    itemType: row.item_type || "—",
    staff: row.staff || "—",
    amount: Number(row.amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    dueAmount: Number(row.due_amount) || 0,
    // Reconciled invoice total — same Paid + Due composition Sales Summary's
    // Grand Total uses, matching the receipt's own Grand Total line.
    grandTotal: (Number(row.paid_amount) || 0) + (Number(row.due_amount) || 0),
    paymentMethod: formatPaymentMode(row.payment_method, row.payment_reference),
    status: row.status ?? "booked",
  };
}

interface FilterOption { id: string; label: string; }

const STATUS_OPTIONS = [
  { id: "booked", label: "Booked" },
  { id: "paid", label: "Paid" },
  { id: "partial", label: "Partial" },
  { id: "cancelled", label: "Cancelled" },
  { id: "no-show", label: "No Show" },
  { id: "deleted", label: "Deleted" },
];

const ITEM_TYPE_OPTIONS = [
  { id: "service", label: "Service" },
  { id: "product", label: "Product" },
  { id: "package", label: "Package" },
  { id: "membership", label: "Membership" },
];

export default function DailySheetReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const today = new Date().toISOString().slice(0, 10);
  const [date,            setDate]            = useState(today);
  const [serviceFilterIds, setServiceFilterIds] = useState<string[]>([]);
  const [staffFilters,     setStaffFilters]     = useState<string[]>([]);
  const [paymentModes,     setPaymentModes]     = useState<string[]>([]);
  const [statuses,         setStatuses]         = useState<string[]>([]);
  const [itemTypes,        setItemTypes]        = useState<string[]>([]);
  const [search,          setSearch]          = useState("");
  // No separate /services or /staff calls — the daily-sheet API itself
  // returns filters_available (every service/staff that has ever appeared
  // in this salon's sales), so options are always complete regardless of
  // the current date/filter selection.
  const [serviceOptions,  setServiceOptions]  = useState<FilterOption[]>([]);
  const [staffOptions,    setStaffOptions]    = useState<FilterOption[]>([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState<FilterOption[]>([]);
  const [rows,            setRows]            = useState<DailyRow[]>([]);
  const [total,           setTotal]            = useState(0);
  const [stats, setStats] = useState({
    invoiceCount: 0, clientCount: 0, itemsCount: 0, staffCount: 0,
    totalPaid: 0, totalDue: 0, pendingPaymentCount: 0, fullyPaidCount: 0,
  });
  const [loading,         setLoading]         = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = { date, page: currentPage, limit: pageSize };
      if (serviceFilterIds.length > 0) body.service_ids = serviceFilterIds;
      if (staffFilters.length > 0) body.staff_ids = staffFilters;
      if (paymentModes.length > 0) body.payment_modes = paymentModes;
      if (statuses.length > 0) body.statuses = statuses;
      if (itemTypes.length > 0) body.item_types = itemTypes;
      if (search.trim()) body.search = search.trim();
      const res = await api.post(DAILY_SHEET_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      setStats({
        invoiceCount: Number(data?.invoice_count) || 0,
        clientCount: Number(data?.client_count) || 0,
        itemsCount: Number(data?.items_count) || 0,
        staffCount: Number(data?.staff_count) || 0,
        totalPaid: Number(data?.total_paid) || 0,
        totalDue: Number(data?.total_due) || 0,
        pendingPaymentCount: Number(data?.pending_payment_count) || 0,
        fullyPaidCount: Number(data?.fully_paid_count) || 0,
      });
      setServiceOptions(Array.isArray(data?.filters_available?.services) ? data.filters_available.services : []);
      setStaffOptions(Array.isArray(data?.filters_available?.staff) ? data.filters_available.staff : []);
      const modes = data?.filters_available?.payment_modes;
      if (Array.isArray(modes)) {
        setPaymentModeOptions(modes.map((m: any) => ({ label: formatPaymentMode(String(m)), id: String(m) })));
      }
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({
          invoiceCount: 0, clientCount: 0, itemsCount: 0, staffCount: 0,
          totalPaid: 0, totalDue: 0, pendingPaymentCount: 0, fullyPaidCount: 0,
        });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [date, serviceFilterIds, staffFilters, paymentModes, statuses, itemTypes, search, currentPage, pageSize]);

  const bulkDelete = useBulkAppointmentDelete(fetchData);
  const deletableIds = rows.filter(r => r.appointmentId).map(r => r.appointmentId as string);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter changes go back to page 1 — page/pageSize changes themselves
  // should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [date, serviceFilterIds, staffFilters, paymentModes, statuses, itemTypes, search]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "service", label: "Service", options: serviceOptions, searchable: true },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "payment_mode", label: "Payment Method", options: paymentModeOptions },
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "item_type", label: "Item Type", options: ITEM_TYPE_OPTIONS },
  ], [serviceOptions, staffOptions, paymentModeOptions]);

  const filterMenuSelected = useMemo(() => ({
    service: serviceFilterIds,
    staff: staffFilters,
    payment_mode: paymentModes,
    status: statuses,
    item_type: itemTypes,
  }), [serviceFilterIds, staffFilters, paymentModes, statuses, itemTypes]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setServiceFilterIds(next.service ?? []);
    setStaffFilters(next.staff ?? []);
    setPaymentModes(next.payment_mode ?? []);
    setStatuses(next.status ?? []);
    setItemTypes(next.item_type ?? []);
  };

  const HEADERS = ["Bill Time", "Invoice No", "Client Name", "Items", "Staff", `Grand Total (${currencySymbol})`, `Paid Amount (${currencySymbol})`, `Due Amount (${currencySymbol})`, "Payment Method", "Status"];
  const exportRows = () => rows.map(r => [r.billTime, r.invoiceNo, r.clientName, r.items, r.staff, r.grandTotal, r.paidAmount, r.dueAmount, r.paymentMethod, r.status]);

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
              filename={`${REPORT_NAME}-${date}`}
              variant="button"
              csv
              dateRangeLabel={date ? formatDateDDMMYYYY(date) : undefined}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={7} className="rp-ds-stat-row" /> : (
        <div className="rp-sra-summary-row rp-ds-stat-row">
          {[
            { label: "Invoice Count", value: stats.invoiceCount.toString() },
            { label: "Client Count",  value: stats.clientCount.toString() },
            { label: "Items Count",   value: stats.itemsCount.toString() },
            { label: "Staff Count",   value: stats.staffCount.toString() },
            { label: "Paid Amount",   value: formatAmount(stats.totalPaid) },
            { label: "Due Amount",    value: formatAmount(stats.totalDue) },
            { label: "Payment Status", value: `${stats.fullyPaidCount} Paid / ${stats.pendingPaymentCount} Pending` },
          ].map(c => (
            <div key={c.label} className="rp-sra-summary-card">
              <div className="rp-sra-summary-val">{c.value}</div>
              <div className="rp-sra-summary-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Invoice, client or staff name"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <BulkDeleteBar count={bulkDelete.selectedIds.size} onDeleteClick={() => { setDeleteInput(""); bulkDelete.setShowConfirm(true); }} />

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th className="rp-row-checkbox-col">
                <input
                  type="checkbox"
                  className="rp-row-checkbox"
                  checked={deletableIds.length > 0 && deletableIds.every(id => bulkDelete.selectedIds.has(id))}
                  onChange={() => bulkDelete.toggleAll(deletableIds)}
                  disabled={deletableIds.length === 0}
                />
              </th>
              <th>Bill Time</th>
              <th>Invoice No</th>
              <th>Client Name</th>
              <th>Items</th>
              <th>Staff</th>
              <th>Grand Total ({currencySymbol})</th>
              <th>Paid Amount ({currencySymbol})</th>
              <th>Due Amount ({currencySymbol})</th>
              <th>Payment Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={11} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className={r.appointmentId ? "rp-appt-row" : undefined}>
                <td className="rp-row-checkbox-col" onClick={e => e.stopPropagation()}>
                  {r.appointmentId && (
                    <input
                      type="checkbox"
                      className="rp-row-checkbox"
                      checked={bulkDelete.selectedIds.has(r.appointmentId)}
                      onChange={() => bulkDelete.toggleOne(r.appointmentId as string)}
                    />
                  )}
                </td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.billTime || "—"}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>
                  <span className="rp-detail-link">{r.invoiceNo}</span>
                </td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}><span className="rp-detail-link">{r.clientName || "Walk-in"}</span></td>
                <td className="rp-ds-items" title={r.items} onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.items}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.staff}</td>
                <td className="fw-semibold" onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{formatAmount(r.grandTotal)}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{formatAmount(r.paidAmount)}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{formatAmount(r.dueAmount)}</td>
                <td className="rp-ds-payment" onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.paymentMethod}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />

      {selectedAppointmentId && (
        <AppointmentDetailModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}

      {/* Daily-Sheet-only delete confirmation — standardized on the same
          type-DELETE-to-confirm pattern as Catalog → Products
          (ProductsListPage.tsx), not the simpler shared BulkDeleteConfirmModal
          used by Sales Summary/Appointment Detail. */}
      <Modal
        show={bulkDelete.showConfirm}
        onClose={bulkDelete.deleting ? () => {} : () => { bulkDelete.setShowConfirm(false); bulkDelete.setError(null); }}
        title="Delete selected records?"
        footer={
          <div className="d-flex flex-column gap-2 w-100">
            <Button
              variant="danger"
              fullWidth
              disabled={deleteInput !== "DELETE" || bulkDelete.deleting}
              loading={bulkDelete.deleting}
              onClick={bulkDelete.confirmDelete}
            >
              Delete {bulkDelete.selectedIds.size} record{bulkDelete.selectedIds.size !== 1 ? "s" : ""}
            </Button>
            <Button
              variant="outline-dark"
              fullWidth
              onClick={() => { bulkDelete.setShowConfirm(false); bulkDelete.setError(null); setDeleteInput(""); }}
              disabled={bulkDelete.deleting}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-muted small mb-4">
          This will permanently delete {bulkDelete.selectedIds.size} selected record{bulkDelete.selectedIds.size !== 1 ? "s" : ""}.
          This action cannot be undone.
        </p>
        <Input
          label="Type DELETE to confirm"
          placeholder="DELETE"
          value={deleteInput}
          onChange={e => setDeleteInput(e.target.value)}
        />
        {bulkDelete.error && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{bulkDelete.error}</p>}
      </Modal>

    </div>
  );
}
