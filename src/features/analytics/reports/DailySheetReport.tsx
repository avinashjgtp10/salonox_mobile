import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { DAILY_SHEET_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import { SkeletonTableRows, SkeletonStatCards } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import { useBulkAppointmentDelete } from "./useBulkAppointmentDelete";
import { BulkDeleteBar } from "./BulkDeleteBar";
import { useCurrency } from "../../../hooks/useCurrency";
import "./DailySheetReport.scss";

const REPORT_NAME = "Daily Sheet";

interface DailyRow {
  appointmentId: string | null;
  serviceId: string | null;
  staffId: string | null;
  time: string;
  invoiceNo: string;
  clientName: string;
  items: string;
  itemType: string;
  staff: string;
  amount: number;
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
    time: row.time || "—",
    invoiceNo: row.ticket_no ?? "—",
    clientName: row.client_name || "Walk-in",
    items: row.service || "—",
    itemType: row.item_type || "—",
    staff: row.staff || "—",
    amount: Number(row.amount) || 0,
    paymentMethod: row.payment_method || "N/A",
    status: row.status ?? "booked",
  };
}

interface FilterOption { id: string; label: string; }

const STATUS_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Booked", value: "booked" },
  { label: "Paid", value: "paid" },
  { label: "Partial", value: "partial" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No Show", value: "no-show" },
  { label: "Deleted", value: "deleted" },
];

const ITEM_TYPE_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Service", value: "service" },
  { label: "Product", value: "product" },
  { label: "Package", value: "package" },
  { label: "Membership", value: "membership" },
];

function FilterField({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) { setQuery(""); searchRef.current?.focus(); }
  }, [open]);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div className="rp-detail-filter-group rp-ds-filter-field" ref={wrapRef}>
      <label className="rp-detail-filter-label">{label}</label>
      <button type="button" className="rp-detail-select rp-ds-filter-select" onClick={() => setOpen(v => !v)}>
        {options.find(o => o.value === value)?.label ?? "All"}
        <span className="rp-detail-caret">▼</span>
      </button>
      {open && (
        <div className="rp-ds-filter-dropdown-wrap">
          <input
            ref={searchRef}
            type="text"
            className="rp-ds-filter-search"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          <div className="rp-ds-filter-list">
            {filtered.length === 0 ? (
              <div className="rp-ds-filter-no-match">No matches</div>
            ) : filtered.map(o => (
              <div key={o.value} className={`rp-detail-dropdown-item ${o.value === value ? "active" : ""}`}
                onClick={() => { onChange(o.value); setOpen(false); }}>{o.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MultiStaffField({ options, selected, onChange }: {
  options: FilterOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const label = selected.length === 0
    ? "All Staff"
    : selected.length === 1
      ? (options.find(o => o.id === selected[0])?.label ?? "1 selected")
      : `${selected.length} selected`;

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  return (
    <div className="rp-detail-filter-group rp-ds-filter-field" ref={wrapRef}>
      <label className="rp-detail-filter-label">Staff</label>
      <button type="button" className="rp-detail-select rp-ds-filter-select" onClick={() => setOpen(v => !v)}>
        {label}
        <span className="rp-detail-caret">▼</span>
      </button>
      {open && (
        <div className="rp-ds-filter-dropdown-wrap">
          <div className="rp-ds-filter-list">
            <label className="rp-ds-checkbox-item">
              <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} />
              All Staff
            </label>
            {options.map(o => (
              <label key={o.id} className="rp-ds-checkbox-item">
                <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
                {o.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DailySheetReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const today = new Date().toISOString().slice(0, 10);
  const [date,            setDate]            = useState(today);
  const [timeFrom,        setTimeFrom]        = useState("");
  const [timeTo,          setTimeTo]          = useState("");
  const [serviceFilter,   setServiceFilter]   = useState<string>("All");
  const [staffFilters,    setStaffFilters]    = useState<string[]>([]);
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("All");
  const [statusFilter,    setStatusFilter]    = useState<string>("All");
  const [itemTypeFilter,  setItemTypeFilter]  = useState<string>("All");
  const [search,          setSearch]          = useState("");
  // No separate /services or /staff calls — the daily-sheet API itself
  // returns filters_available (every service/staff that has ever appeared
  // in this salon's sales), so options are always complete regardless of
  // the current date/filter selection.
  const [serviceOptions,  setServiceOptions]  = useState<FilterOption[]>([]);
  const [staffOptions,    setStaffOptions]    = useState<FilterOption[]>([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [rows,            setRows]            = useState<DailyRow[]>([]);
  const [total,           setTotal]            = useState(0);
  const [stats, setStats] = useState({ invoiceCount: 0, clientCount: 0, itemsCount: 0, staffCount: 0, totalRevenue: 0 });
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
      if (timeFrom) body.time_from = timeFrom;
      if (timeTo) body.time_to = timeTo;
      if (serviceFilter !== "All") body.service_id = serviceFilter;
      if (staffFilters.length > 0) body.staff_ids = staffFilters;
      if (paymentModeFilter !== "All") body.payment_mode = paymentModeFilter;
      if (statusFilter !== "All") body.status = statusFilter;
      if (itemTypeFilter !== "All") body.item_type = itemTypeFilter;
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
        totalRevenue: Number(data?.total_amount) || 0,
      });
      setServiceOptions(Array.isArray(data?.filters_available?.services) ? data.filters_available.services : []);
      setStaffOptions(Array.isArray(data?.filters_available?.staff) ? data.filters_available.staff : []);
      const modes = data?.filters_available?.payment_modes;
      if (Array.isArray(modes)) {
        setPaymentModeOptions([{ label: "All", value: "All" }, ...modes.map((m: any) => ({ label: String(m), value: String(m) }))]);
      }
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ invoiceCount: 0, clientCount: 0, itemsCount: 0, staffCount: 0, totalRevenue: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [date, timeFrom, timeTo, serviceFilter, staffFilters, paymentModeFilter, statusFilter, itemTypeFilter, search, currentPage, pageSize]);

  const bulkDelete = useBulkAppointmentDelete(fetchData);
  const deletableIds = rows.filter(r => r.appointmentId).map(r => r.appointmentId as string);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter changes go back to page 1 — page/pageSize changes themselves
  // should not reset back to page 1.
  useEffect(() => { setCurrentPage(1); }, [date, timeFrom, timeTo, serviceFilter, staffFilters, paymentModeFilter, statusFilter, itemTypeFilter, search]);

  const activeFilterCount = [
    serviceFilter !== "All" ? 1 : 0,
    staffFilters.length > 0 ? 1 : 0,
    paymentModeFilter !== "All" ? 1 : 0,
    statusFilter !== "All" ? 1 : 0,
    itemTypeFilter !== "All" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setServiceFilter("All"); setStaffFilters([]);
    setPaymentModeFilter("All"); setStatusFilter("All"); setItemTypeFilter("All");
  };

  const HEADERS = ["Time", "Invoice No", "Client Name", "Items", "Staff", `Amount (${currencySymbol})`, "Payment Method", "Status"];
  const exportRows = () => rows.map(r => [r.time, r.invoiceNo, r.clientName, r.items, r.staff, r.amount, r.paymentMethod, r.status]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`${REPORT_NAME}-${date}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rp-detail-date-input rp-detail-date-input--boxed" />
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Time</label>
          <div className="rp-detail-date-range">
            <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="rp-detail-date-input rp-detail-date-input--boxed" />
            <span className="rp-detail-date-sep">-</span>
            <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="rp-detail-date-input rp-detail-date-input--boxed" />
          </div>
        </div>
        <button className="rp-ds-filters-btn" onClick={() => setShowFiltersPanel(true)}>
          Filters
          {activeFilterCount > 0 && <span className="rp-ds-filters-badge">{activeFilterCount}</span>}
        </button>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={5} className="rp-ds-stat-row" /> : (
        <div className="rp-sra-summary-row rp-ds-stat-row">
          {[
            { label: "Invoice Count", value: stats.invoiceCount.toString() },
            { label: "Client Count",  value: stats.clientCount.toString() },
            { label: "Items Count",   value: stats.itemsCount.toString() },
            { label: "Staff Count",   value: stats.staffCount.toString() },
            { label: "Total Revenue", value: formatAmount(stats.totalRevenue) },
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
              <th>Time</th>
              <th>Invoice No</th>
              <th>Client Name</th>
              <th>Items</th>
              <th>Staff</th>
              <th>Amount ({currencySymbol})</th>
              <th>Payment Method</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No data available</td></tr>
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
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.time || "—"}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>
                  <span className="rp-detail-link">{r.invoiceNo}</span>
                </td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}><span className="rp-detail-link">{r.clientName || "Walk-in"}</span></td>
                <td className="rp-ds-items" title={r.items} onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.items}</td>
                <td onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{r.staff}</td>
                <td className="fw-semibold" onClick={() => r.appointmentId && setSelectedAppointmentId(r.appointmentId)}>{formatAmount(r.amount)}</td>
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

      {showFiltersPanel && (
        <div className="rp-ds-filters-overlay" onClick={() => setShowFiltersPanel(false)}>
          <div className="rp-ds-filters-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filters</h3>
            </div>

            <div className="rp-ds-filters-body">
              <FilterField label="Service" value={serviceFilter} options={[{ label: "All", value: "All" }, ...serviceOptions.map(o => ({ label: o.label, value: o.id }))]} onChange={setServiceFilter} />
              <MultiStaffField options={staffOptions} selected={staffFilters} onChange={setStaffFilters} />
              <FilterField label="Payment Method" value={paymentModeFilter} options={paymentModeOptions} onChange={setPaymentModeFilter} />
              <FilterField label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
              <FilterField label="Item Type" value={itemTypeFilter} options={ITEM_TYPE_OPTIONS} onChange={setItemTypeFilter} />
            </div>

            <div className="rp-ds-filters-actions">
              <Button variant="ghost" onClick={() => { clearFilters(); }}>Clear</Button>
              <Button variant="dark" onClick={() => { setShowFiltersPanel(false); fetchData(); }}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
