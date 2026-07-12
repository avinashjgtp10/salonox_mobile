import { useState, useMemo } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import { useListClientPackagesQuery } from "../../../services/api/endpoints/packages.endpoints";
import Button from "../../../components/ui/Button";
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

export default function PackageHistoryReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data, isFetching, refetch } = useListClientPackagesQuery({ page: 1, limit: 500 });

  const allRows = useMemo(() => {
    const items = data?.items ?? [];
    const rows: HistoryRow[] = [];
    items.forEach(pkg => {
      pkg.services.forEach(svc => {
        (svc.sessionHistory ?? []).forEach(sh => {
          // The backend formats this as a locale display string (e.g. "11 Jul 2026"),
          // not ISO — re-parse it so it can be compared against the ISO date-range filters below.
          const parsed = sh.date ? new Date(sh.date) : null;
          const isoDate = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : "";
          rows.push({
            date: isoDate,
            client: pkg.clientName,
            clientId: pkg.clientId ? String(pkg.clientId) : "",
            packageName: pkg.packageName,
            serviceName: svc.serviceName,
            sessionNo: sh.sessionNo,
            staff: sh.staff,
            status: sh.status,
          });
        });
      });
    });
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [data]);

  const rows = useMemo(() => {
    let r = allRows.filter(h => (!dateFrom || h.date >= dateFrom) && (!dateTo || h.date <= dateTo));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(h => h.client.toLowerCase().includes(q) || h.packageName.toLowerCase().includes(q) || h.serviceName.toLowerCase().includes(q));
    }
    return r;
  }, [allRows, dateFrom, dateTo, search]);

  const completedCount = rows.filter(r => r.status === "completed").length;
  const uniqueClients = new Set(rows.map(r => r.client)).size;
  const uniquePackages = new Set(rows.map(r => r.packageName)).size;

  const HEADERS = ["Date", "Client", "Package", "Service", "Session No", "Staff", "Status"];
  const exportRows = () => rows.map(r => [r.date, r.client, r.packageName, r.serviceName, r.sessionNo, r.staff, r.status]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paged = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`package-history-${dateFrom}-${dateTo}`} variant="button" csv print />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={() => refetch()} loading={isFetching}>
            Run Report
          </Button>
        </div>
      </div>

      {isFetching ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{rows.length}</div><div className="rp-sra-summary-label">Total Sessions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{completedCount}</div><div className="rp-sra-summary-label">Completed Sessions</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{uniqueClients}</div><div className="rp-sra-summary-label">Unique Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{uniquePackages}</div><div className="rp-sra-summary-label">Unique Packages</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-show-n">
          <span>Show</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client, package or service" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Date</th><th>Client</th><th>Package</th><th>Service</th><th>Session No</th><th>Staff</th><th>Status</th></tr>
          </thead>
          <tbody>
            {isFetching ? (
              <SkeletonTableRows columns={7} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No package session history found</td></tr>
            ) : paged.map((r, i) => (
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

      <Pagination currentPage={safePage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="packages" />
      )}
    </div>
  );
}
