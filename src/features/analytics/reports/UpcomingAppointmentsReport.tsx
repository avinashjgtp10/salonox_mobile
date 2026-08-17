import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { UPCOMING_APPOINTMENTS_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonTableRows } from "./ReportSkeleton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { DateRangeFilter } from "../../../components/ui";
import type { DateRangeFilterValue } from "../../../components/ui";
import AppointmentDetailModal from "../../bookings/components/modals/AppointmentDetailModal";
import "./AppointmentDetailReport.scss";

const REPORT_NAME = "Upcoming Appointments Report";

interface UpcomingAppointmentRow {
  id: string;
  appointmentDate: string;
  time: string;
  clientName: string;
  mobileNumber: string;
  serviceName: string;
  packageName: string;
  staffName: string;
  appointmentStatus: string;
  appointmentType: string;
  description: string;
}

interface FilterOption { id: string; label: string; }

const STATUS_OPTIONS = [
  { id: "booked", label: "Booked" },
  { id: "paid", label: "Paid" },
  { id: "partial", label: "Partial" },
  { id: "cancelled", label: "Cancelled" },
  { id: "no-show", label: "No Show" },
];

const APPOINTMENT_TYPE_OPTIONS = [
  { id: "Regular", label: "Regular" },
  { id: "Package Service", label: "Package Service" },
  { id: "Membership Service", label: "Membership Service" },
];

const fmtLabel = (s: string) => s.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent Upcoming Appointments API
// (POST /api/report/upcoming-appointments — reads the appointments table
// directly via SQL, never the Appointment HTTP API/service) to the table's
// row shape.
function mapRow(row: any): UpcomingAppointmentRow {
  return {
    id: row.id,
    appointmentDate: row.appointment_date || "—",
    time: row.time || "—",
    clientName: row.client_name || "—",
    mobileNumber: row.mobile_number || "—",
    serviceName: row.service_name || "—",
    packageName: row.package_name || "—",
    staffName: row.staff_name || "—",
    appointmentStatus: row.appointment_status ?? "booked",
    appointmentType: row.appointment_type || "Regular",
    description: row.description || "—",
  };
}

export default function UpcomingAppointmentsReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const today     = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const abortRef = useRef<AbortController | null>(null);
  // This report looks FORWARD (today → a week ahead), unlike every other
  // report's backward-looking window — no fixed preset covers a future range,
  // so it starts as a custom one.
  const [dateRange, setDateRange] = useState<DateRangeFilterValue>({ preset: "custom", startDate: today, endDate: weekAhead });
  const { startDate: dateFrom, endDate: dateTo } = dateRange;
  const [search,   setSearch]   = useState("");
  const [clientFilterIds,  setClientFilterIds]  = useState<string[]>([]);
  const [staffFilterIds,   setStaffFilterIds]   = useState<string[]>([]);
  const [serviceFilterIds, setServiceFilterIds] = useState<string[]>([]);
  const [packageFilterIds, setPackageFilterIds] = useState<string[]>([]);
  const [statuses,         setStatuses]         = useState<string[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<string[]>([]);
  // No separate /clients, /staff, /services or /packages calls — the
  // upcoming-appointments API itself returns filters_available (every
  // client/staff/service/package that appears on a currently-upcoming
  // appointment), same convention as Daily Sheet's filters_available.
  const [clientOptions,  setClientOptions]  = useState<FilterOption[]>([]);
  const [staffOptions,   setStaffOptions]   = useState<FilterOption[]>([]);
  const [serviceOptions, setServiceOptions] = useState<FilterOption[]>([]);
  const [packageOptions, setPackageOptions] = useState<FilterOption[]>([]);
  const [rows,    setRows]    = useState<UpcomingAppointmentRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);

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
      if (search.trim()) body.search = search.trim();
      if (clientFilterIds.length > 0) body.client_ids = clientFilterIds;
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (serviceFilterIds.length > 0) body.service_ids = serviceFilterIds;
      if (packageFilterIds.length > 0) body.package_ids = packageFilterIds;
      if (statuses.length > 0) body.statuses = statuses;
      if (appointmentTypes.length > 0) body.appointment_types = appointmentTypes;
      const res = await api.post(UPCOMING_APPOINTMENTS_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      setClientOptions(Array.isArray(data?.filters_available?.clients) ? data.filters_available.clients : []);
      setStaffOptions(Array.isArray(data?.filters_available?.staff) ? data.filters_available.staff : []);
      setServiceOptions(Array.isArray(data?.filters_available?.services) ? data.filters_available.services : []);
      setPackageOptions(Array.isArray(data?.filters_available?.packages) ? data.filters_available.packages : []);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, search, clientFilterIds, staffFilterIds, serviceFilterIds, packageFilterIds, statuses, appointmentTypes, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, search, clientFilterIds, staffFilterIds, serviceFilterIds, packageFilterIds, statuses, appointmentTypes]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "client", label: "Client", options: clientOptions, searchable: true },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
    { key: "service", label: "Service", options: serviceOptions, searchable: true },
    { key: "package", label: "Package", options: packageOptions, searchable: true },
    { key: "status", label: "Appointment Status", options: STATUS_OPTIONS },
    { key: "appointment_type", label: "Appointment Type", options: APPOINTMENT_TYPE_OPTIONS },
  ], [clientOptions, staffOptions, serviceOptions, packageOptions]);

  const filterMenuSelected = useMemo(() => ({
    client: clientFilterIds,
    staff: staffFilterIds,
    service: serviceFilterIds,
    package: packageFilterIds,
    status: statuses,
    appointment_type: appointmentTypes,
  }), [clientFilterIds, staffFilterIds, serviceFilterIds, packageFilterIds, statuses, appointmentTypes]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setClientFilterIds(next.client ?? []);
    setStaffFilterIds(next.staff ?? []);
    setServiceFilterIds(next.service ?? []);
    setPackageFilterIds(next.package ?? []);
    setStatuses(next.status ?? []);
    setAppointmentTypes(next.appointment_type ?? []);
  };

  const HEADERS = ["Appointment Date", "Appointment Time", "Client Name", "Mobile Number", "Service Name", "Package Name", "Staff Name", "Appointment Status", "Description"];
  const exportRows = () => rows.map(r => [
    r.appointmentDate !== "—" ? formatDate(r.appointmentDate) : "—",
    r.time, r.clientName, r.mobileNumber, r.serviceName, r.packageName, r.staffName,
    fmtLabel(r.appointmentStatus), r.description,
  ]);

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
                ...(search.trim() ? [`Search: "${search.trim()}"`] : []),
                ...(clientFilterIds.length > 0
                  ? [`Client: ${clientOptions.filter(o => clientFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
                  : []),
                ...(staffFilterIds.length > 0
                  ? [`Staff: ${staffOptions.filter(o => staffFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
                  : []),
                ...(serviceFilterIds.length > 0
                  ? [`Service: ${serviceOptions.filter(o => serviceFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
                  : []),
                ...(packageFilterIds.length > 0
                  ? [`Package: ${packageOptions.filter(o => packageFilterIds.includes(o.id)).map(o => o.label).join(", ")}`]
                  : []),
                ...(statuses.length > 0 ? [`Appointment Status: ${statuses.map(fmtLabel).join(", ")}`] : []),
                ...(appointmentTypes.length > 0 ? [`Appointment Type: ${appointmentTypes.join(", ")}`] : []),
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

      {!loading && (
        <div className="rp-detail-drag-hint">
          {total} upcoming appointment{total !== 1 ? "s" : ""} found
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Client, mobile, service, package or staff name"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Appointment Date</th>
              <th>Appointment Time</th>
              <th>Client Name</th>
              <th>Mobile Number</th>
              <th>Service Name</th>
              <th>Package Name</th>
              <th>Staff Name</th>
              <th>Appointment Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={9} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="rp-detail-empty-cell">No upcoming appointments found</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="rp-appt-row" onClick={() => setSelectedId(row.id)}>
                  <td>{row.appointmentDate !== "—" ? formatDate(row.appointmentDate) : "—"}</td>
                  <td>{row.time}</td>
                  <td>{row.clientName || "—"}</td>
                  <td>{row.mobileNumber || "—"}</td>
                  <td>{row.serviceName}</td>
                  <td>{row.packageName}</td>
                  <td>{row.staffName || "—"}</td>
                  <td><span className={`rp-status-badge rp-status-${row.appointmentStatus}`}>{fmtLabel(row.appointmentStatus)}</span></td>
                  <td>{row.description}</td>
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
    </div>
  );
}
