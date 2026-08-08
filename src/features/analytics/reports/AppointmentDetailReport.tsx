import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { APPOINTMENT_DETAIL_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import { useBulkAppointmentDelete } from "./useBulkAppointmentDelete";
import { BulkDeleteBar, BulkDeleteConfirmModal } from "./BulkDeleteBar";
import { useCurrency } from "../../../hooks/useCurrency";
import "./AppointmentDetailReport.scss";

const REPORT_NAME = "Detailed Appointment Reports";

interface AppointmentRow {
  id: string;
  appointmentDate: string;
  time: string;
  bookedDate: string;
  clientName: string;
  itemName: string;
  itemType: string;
  staffName: string;
  duration: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
}

const APPT_STATUSES = ["booked", "paid", "partial", "cancelled", "no-show", "deleted"];
const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Wallet", "Membership", "Package"];
const fmtLabel = (s: string) => s.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const ITEM_TYPE_LABELS: Record<string, string> = {
  service: "Service",
  product: "Product",
  package: "Package",
  membership: "Membership",
};

function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent Appointment Detail API
// (POST /api/report/appointment-detail — reads the appointments table
// directly via SQL, never the Appointment HTTP API/service) to the table's
// existing AppointmentRow shape.
function mapRow(row: any): AppointmentRow {
  return {
    id: row.id,
    appointmentDate: row.appointment_date || "—",
    time: row.time || "—",
    bookedDate: row.booked_date || "—",
    clientName: row.client_name || "—",
    itemName: row.item_name || "—",
    itemType: row.item_type || "service",
    staffName: row.staff_name || "—",
    duration: Number(row.duration) || 0,
    amount: Number(row.amount) || 0,
    paymentMethod: row.payment_method || "—",
    paymentStatus: row.payment_status ?? "booked",
  };
}

export default function AppointmentDetailReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const today     = new Date().toISOString().slice(0, 10);
  const monthAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const abortRef = useRef<AbortController | null>(null);
  const [searchParams] = useSearchParams();
  // Deep-link support: /reports/appointments/appointment-detail?status=booked,partial
  // pre-applies the Appointment Status filter — used by the dashboard's
  // "Collect Now" (Pending Payments) shortcut.
  const initialStatuses = useMemo(() => {
    const raw = searchParams.get("status");
    if (!raw) return [];
    return raw.split(",").map(s => s.trim()).filter(s => APPT_STATUSES.includes(s));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [dateFrom,          setDateFrom]          = useState(monthAgo);
  const [dateTo,            setDateTo]            = useState(today);
  const [search,            setSearchInput]       = useState("");
  const [debouncedSearch,   setDebouncedSearch]   = useState("");
  const [selectedStatuses,  setSelectedStatuses]  = useState<string[]>(initialStatuses);
  const [paymentMethods,    setPaymentMethods]    = useState<string[]>([]);
  const [staffFilterIds,    setStaffFilterIds]    = useState<string[]>([]);
  const [staffOptions,      setStaffOptions]      = useState<{ id: string; label: string }[]>([]);
  const [rows,              setRows]              = useState<AppointmentRow[]>([]);
  const [total,             setTotal]              = useState(0);
  const [loading,           setLoading]           = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);

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

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back.
  const fetchData = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        from: dateFrom, to: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (selectedStatuses.length > 0) body.statuses = selectedStatuses;
      if (paymentMethods.length > 0) body.payment_methods = paymentMethods;
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      const res = await api.post(APPOINTMENT_DETAIL_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, selectedStatuses, paymentMethods, staffFilterIds, currentPage, pageSize]);

  const bulkDelete = useBulkAppointmentDelete(fetchData);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, debouncedSearch, selectedStatuses, paymentMethods, staffFilterIds]);

  // One shared Jira-style filter menu covering all three multi-select
  // fields — replaces the old separate MultiSelectCheckbox-per-field modal.
  // No "All" pseudo-status needed here (unlike the old modal): the backend
  // already treats an empty status selection as "every status, including
  // deleted" (see getAppointmentDetailReport), so leaving Status unchecked
  // is already equivalent to what "All" used to mean.
  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Appointment Status", options: APPT_STATUSES.map(s => ({ id: s, label: fmtLabel(s) })) },
    { key: "payment_method", label: "Payment Method", options: PAYMENT_METHODS.map(m => ({ id: m, label: m })) },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
  ], [staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    status: selectedStatuses,
    payment_method: paymentMethods,
    staff: staffFilterIds,
  }), [selectedStatuses, paymentMethods, staffFilterIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setSelectedStatuses(next.status ?? []);
    setPaymentMethods(next.payment_method ?? []);
    setStaffFilterIds(next.staff ?? []);
  };

  const HEADERS = ["Booked Date", "Time", "Client Name", "Item Name", "Staff Name", `Amount (${currencySymbol})`, "Payment Method", "Appointment Status"];
  const exportRows = () => rows.map(r => [r.bookedDate !== "—" ? formatDate(r.bookedDate) : "—", r.time, r.clientName, r.itemName, r.staffName, r.amount, r.paymentMethod, fmtLabel(r.paymentStatus)]);

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
              filename={`${REPORT_NAME}-${dateFrom}-${dateTo}`}
              variant="button"
              csv
              filterLines={[
                ...(debouncedSearch ? [`Search: "${debouncedSearch}"`] : []),
                ...(selectedStatuses.length > 0
                  ? [`Appointment Status: ${selectedStatuses.length === APPT_STATUSES.length ? "All" : selectedStatuses.map(fmtLabel).join(", ")}`]
                  : []),
                ...(paymentMethods.length > 0 ? [`Payment Method: ${paymentMethods.join(", ")}`] : []),
                ...(staffFilterIds.length > 0
                  ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
                  : []),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFields from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />

        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Filters" />

        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {!loading && (
        <div className="rp-detail-drag-hint">
          {total} appointment{total !== 1 ? "s" : ""} found
        </div>
      )}

      {bulkDelete.successMessage && (
        <div className="rp-detail-success-banner">{bulkDelete.successMessage}</div>
      )}

      <BulkDeleteBar count={bulkDelete.selectedIds.size} onDeleteClick={() => bulkDelete.setShowConfirm(true)} />

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search client name, item name or staff name"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
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
              <th>Booked Date</th>
              <th>Time</th>
              <th>Client Name</th>
              <th>Item Name</th>
              <th>Staff Name</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Appointment Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No data available</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className={row.paymentStatus === "deleted" ? "rp-appt-row rp-adr-deleted-row" : "rp-appt-row"}>
                  <td className="rp-row-checkbox-col" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rp-row-checkbox"
                      checked={bulkDelete.selectedIds.has(row.id)}
                      onChange={() => bulkDelete.toggleOne(row.id)}
                    />
                  </td>
                  <td onClick={() => setSelectedId(row.id)}>{row.bookedDate !== "—" ? formatDate(row.bookedDate) : "—"}</td>
                  <td onClick={() => setSelectedId(row.id)}>{row.time}</td>
                  <td onClick={() => setSelectedId(row.id)}>{row.clientName || "—"}</td>
                  <td className="rp-adr-service" title={row.itemName} onClick={() => setSelectedId(row.id)}>
                    {row.itemName}
                    <span className="rp-adr-item-type">
                      {row.itemType.split(", ").map(t => ITEM_TYPE_LABELS[t] ?? t).join(", ")}
                    </span>
                  </td>
                  <td onClick={() => setSelectedId(row.id)}>{row.staffName || "—"}</td>
                  <td onClick={() => setSelectedId(row.id)}>{row.amount > 0 ? formatAmount(Number(row.amount)) : "—"}</td>
                  <td onClick={() => setSelectedId(row.id)}>{row.paymentMethod || "—"}</td>
                  <td onClick={() => setSelectedId(row.id)}><span className={`rp-status-badge rp-status-${row.paymentStatus}`}>{fmtLabel(row.paymentStatus)}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />

      {selectedId && (
        <AppointmentDetailModal
          appointmentId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={fetchData}
        />
      )}

      <BulkDeleteConfirmModal
        show={bulkDelete.showConfirm}
        count={bulkDelete.selectedIds.size}
        names={rows.filter(r => bulkDelete.selectedIds.has(r.id)).map(r => r.clientName)}
        deleting={bulkDelete.deleting}
        error={bulkDelete.error}
        onCancel={() => { bulkDelete.setShowConfirm(false); bulkDelete.setError(null); }}
        onConfirm={bulkDelete.confirmDelete}
      />
    </div>
  );
}
