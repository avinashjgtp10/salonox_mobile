import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PACKAGE_HISTORY_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import "./PackageHistoryReport.scss";

const REPORT_NAME = "Package History";

interface HistoryRow {
  date: string;
  client: string;
  clientId: string;
  packageName: string;
  serviceName: string;
  sessionNo: number;
  staff: string;
  status: string;
}

// Maps a row from the independent Package History API
// (POST /api/report/package-history — reads client_package_session_history
// directly, never the Appointment API) to the table's existing row shape.
function mapRow(row: any): HistoryRow {
  return {
    date: row.date || "—",
    client: row.client_name || "—",
    clientId: row.client_id ? String(row.client_id) : "",
    packageName: row.package_name || "—",
    serviceName: row.service_name || "—",
    sessionNo: Number(row.session_no) || 0,
    staff: row.staff || "—",
    status: row.status || "—",
  };
}

export default function PackageHistoryReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,     setRows]     = useState<HistoryRow[]>([]);
  const [total,    setTotal]    = useState(0);
  const [stats,    setStats]    = useState({ totalSessions: 0, completedSessions: 0, uniqueClients: 0, uniquePackages: 0 });
  const [loading,  setLoading]  = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
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
      const res = await api.post(PACKAGE_HISTORY_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalSessions: Number(s.total_sessions) || 0,
        completedSessions: Number(s.completed_sessions) || 0,
        uniqueClients: Number(s.unique_clients) || 0,
        uniquePackages: Number(s.unique_packages) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalSessions: 0, completedSessions: 0, uniqueClients: 0, uniquePackages: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch]);

  const HEADERS = ["Date", "Client", "Package", "Service", "Session No", "Staff", "Status"];
  const exportRows = () => rows.map(r => [r.date, r.client, r.packageName, r.serviceName, r.sessionNo, r.staff, r.status]);

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
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalSessions}</div><div className="rp-sra-summary-label">Total Sessions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.completedSessions}</div><div className="rp-sra-summary-label">Completed Sessions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.uniqueClients}</div><div className="rp-sra-summary-label">Unique Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.uniquePackages}</div><div className="rp-sra-summary-label">Unique Packages</div></div>
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
            <tr><th>Date</th><th>Client</th><th>Package</th><th>Service</th><th>Session No</th><th>Staff</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={7} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No package session history found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td>{r.date || "—"}</td>
                <td className="fw-semibold">{r.client}</td>
                <td>{r.packageName}</td>
                <td>{r.serviceName}</td>
                <td>{r.sessionNo}</td>
                <td>{r.staff || "—"}</td>
                <td><span className={`rp-status-badge rp-status-${(r.status ?? "").toLowerCase()}`}>{r.status}</span></td>
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
