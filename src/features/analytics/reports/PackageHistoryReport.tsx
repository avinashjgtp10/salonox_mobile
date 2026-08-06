import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PACKAGE_HISTORY_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import "./PackageHistoryReport.scss";

const REPORT_NAME = "Package History";

interface FilterOption { id: string; label: string; }

const STATUS_OPTIONS: FilterOption[] = [
  { id: "ongoing", label: "Ongoing" },
  { id: "complete", label: "Complete" },
  { id: "expired", label: "Expired" },
];

interface HistoryRow {
  date: string;
  client: string;
  clientId: string;
  packageName: string;
  serviceName: string;
  sessionNo: number;
  remainingSessions: number;
  staff: string;
  status: string;
}

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

// Maps a row from the independent Package History API
// (POST /api/report/package-history — reads client_package_session_history
// directly, never the Appointment API) to the table's row shape.
function mapRow(row: any): HistoryRow {
  return {
    date: row.date ? formatDate(row.date) : "—",
    client: row.client_name || "—",
    clientId: row.client_id ? String(row.client_id) : "",
    packageName: row.package_name || "—",
    serviceName: row.service_name || "—",
    sessionNo: Number(row.session_no) || 0,
    remainingSessions: Number(row.remaining_sessions) || 0,
    staff: row.staff || "—",
    status: row.status || "ongoing",
  };
}

export default function PackageHistoryReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [packageFilter, setPackageFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [statusFilter,  setStatusFilter]  = useState<string[]>([]);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [rows,     setRows]     = useState<HistoryRow[]>([]);
  const [total,    setTotal]    = useState(0);
  const [stats,    setStats]    = useState({
    totalSessions: 0, completedSessions: 0, remainingSessions: 0,
    ongoingPackages: 0, completedPackages: 0, expiredPackages: 0,
  });
  // No separate /packages or /services API call — the package-history API
  // itself returns filters_available.packages/services, so options stay
  // complete regardless of the current date/filter selection. Staff comes
  // from the salon roster (fetchStaffThunk), same convention as the Staff
  // Sales / Staff Item Sales reports.
  const [packageOptions, setPackageOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [staffOptions,   setStaffOptions]   = useState<FilterOption[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions(opts.map((o: any) => ({ id: o.value, label: o.label })));
    }).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

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
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (debouncedSearch) body.search = debouncedSearch;
      if (packageFilter.length > 0) body.package_names = packageFilter;
      if (serviceFilter.length > 0) body.service_names = serviceFilter;
      if (statusFilter.length > 0) body.statuses = statusFilter;
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      const res = await api.post(PACKAGE_HISTORY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalSessions: Number(s.total_sessions) || 0,
        completedSessions: Number(s.completed_sessions) || 0,
        remainingSessions: Number(s.remaining_sessions) || 0,
        ongoingPackages: Number(s.ongoing_packages) || 0,
        completedPackages: Number(s.completed_packages) || 0,
        expiredPackages: Number(s.expired_packages) || 0,
      });
      const avail = data?.filters_available ?? {};
      if (Array.isArray(avail.packages)) setPackageOptions(avail.packages);
      if (Array.isArray(avail.services)) setServiceOptions(avail.services);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalSessions: 0, completedSessions: 0, remainingSessions: 0, ongoingPackages: 0, completedPackages: 0, expiredPackages: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, packageFilter, serviceFilter, statusFilter, staffFilterIds, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, packageFilter, serviceFilter, statusFilter, staffFilterIds]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "package", label: "Package", options: packageOptions.map(p => ({ id: p, label: p })), searchable: true },
    { key: "service", label: "Service", options: serviceOptions.map(s => ({ id: s, label: s })), searchable: true },
    { key: "status", label: "Status", options: STATUS_OPTIONS },
    { key: "staff", label: "Staff", options: staffOptions, searchable: true },
  ], [packageOptions, serviceOptions, staffOptions]);

  const filterMenuSelected = useMemo(() => ({
    package: packageFilter,
    service: serviceFilter,
    status: statusFilter,
    staff: staffFilterIds,
  }), [packageFilter, serviceFilter, statusFilter, staffFilterIds]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setPackageFilter(next.package ?? []);
    setServiceFilter(next.service ?? []);
    setStatusFilter(next.status ?? []);
    setStaffFilterIds(next.staff ?? []);
  };

  const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.id === s)?.label ?? s;

  const HEADERS = ["Date", "Client", "Package", "Service", "Session No.", "Remaining Sessions", "Staff", "Status"];
  const exportRows = () => rows.map(r => [r.date, r.client, r.packageName, r.serviceName, r.sessionNo, r.remainingSessions, r.staff, statusLabel(r.status)]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`package-history-${dateFrom}-${dateTo}`} variant="button" csv />
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

      {loading ? <SkeletonStatCards count={6} /> : (
        <div className="rp-sra-summary-row rp-ph-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalSessions}</div><div className="rp-sra-summary-label">Total Sessions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.completedSessions}</div><div className="rp-sra-summary-label">Completed Sessions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.remainingSessions}</div><div className="rp-sra-summary-label">Remaining Sessions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.ongoingPackages}</div><div className="rp-sra-summary-label">Ongoing Packages</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.completedPackages}</div><div className="rp-sra-summary-label">Completed Packages</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.expiredPackages}</div><div className="rp-sra-summary-label">Expired Packages</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client, package or service" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Client</th><th>Package</th><th>Service</th>
              <th>Session No.</th><th>Remaining Sessions</th><th>Staff</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No package session history found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td>{r.date}</td>
                <td className="fw-semibold">{r.client}</td>
                <td>{r.packageName}</td>
                <td>{r.serviceName}</td>
                <td>{r.sessionNo}</td>
                <td>{r.remainingSessions}</td>
                <td>{r.staff}</td>
                <td><span className={`rp-status-badge rp-ph-status-${r.status}`}>{statusLabel(r.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="packages" />
      )}
    </div>
  );
}
