import { useState, useEffect, useCallback, useRef } from "react";
import { Grid3x3Gap, InfoCircle, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import ReportRefreshButton from "./ReportRefreshButton";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./WaCampaignReport.scss";

const REPORT_NAME = "WA Marketing Campaign";

interface CampaignPerfRow {
  id: string;
  name: string;
  templateName: string;
  status: string;
  totalContacts: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  blocked: number;
  createdAt: string;
}

const CAMP_STATUSES = ["All", "COMPLETED", "RUNNING", "PAUSED", "SCHEDULED", "FAILED", "DRAFT"];

export default function WaCampaignReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const [rows,           setRows]           = useState<CampaignPerfRow[]>([]);
  const [allRows,        setAllRows]        = useState<CampaignPerfRow[]>([]);
  const [statusFilter,   setStatusFilter]   = useState("All");
  const [search,         setSearch]         = useState("");
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  useEffect(() => { setCurrentPage(1); }, [rows]);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await api.get("/api/v1/campaigns", { signal: ctrl.signal });
      const campaigns: any[] = res.data?.data?.data ?? res.data?.data ?? res.data?.campaigns ?? [];
      const mapped: CampaignPerfRow[] = campaigns.map((c: any) => ({
        id:            String(c.id ?? ""),
        name:          c.name ?? "—",
        templateName:  c.template_name ?? c.templateName ?? "—",
        status:        c.status ?? "—",
        totalContacts: c.total_contacts ?? c.totalContacts ?? 0,
        sent:          c.sent_count ?? c.sent ?? 0,
        delivered:     c.delivered_count ?? c.delivered ?? 0,
        read:          c.read_count ?? c.read ?? 0,
        failed:        c.failed_count ?? c.failed ?? 0,
        blocked:       c.blocked_count ?? c.blocked ?? 0,
        createdAt:     (c.created_at ?? c.createdAt ?? "").slice(0, 10),
      }));
      setAllRows(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let filtered = allRows;
    if (statusFilter !== "All") filtered = filtered.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(q) || r.templateName.toLowerCase().includes(q));
    }
    setRows(filtered);
  }, [allRows, statusFilter, search]);

  useEffect(() => {
    const close = () => setShowStatusDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pct = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";
  const campStatusClass = (s: string) =>
    s === "COMPLETED" ? "ok" : s === "RUNNING" ? "run" : s === "PAUSED" ? "warn" : s === "FAILED" ? "fail" : "neutral";

  const totalSent      = rows.reduce((s, r) => s + r.sent, 0);
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);

  const HEADERS = ["Campaign", "Template", "Status", "Contacts", "Sent", "Delivered", "Delivered%", "Read", "Read%", "Failed", "Blocked", "Date"];
  const exportRows = () => rows.map(r => [r.name, r.templateName, r.status, r.totalContacts, r.sent, r.delivered, pct(r.delivered, r.sent), r.read, pct(r.read, r.sent), r.failed, r.blocked, r.createdAt]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <button className="rp-detail-icon-btn" title="Column view"><Grid3x3Gap size={16} /></button>
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={REPORT_NAME} variant="button" csv />
            <button className="rp-detail-icon-btn" title="Info"><InfoCircle size={16} /></button>
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Search</label>
          <div className="rp-detail-date-range">
            <Search size={13} className="rp-wac-search-ic" />
            <input type="text" placeholder="Search campaign..." value={search} onChange={e => setSearch(e.target.value)} className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Status</label>
          <button className="rp-detail-select" onClick={() => setShowStatusDrop(v => !v)}>
            {statusFilter} <span className="rp-detail-caret">▼</span>
          </button>
          {showStatusDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {CAMP_STATUSES.map(s => (
                <div key={s} className={`rp-detail-dropdown-item ${s === statusFilter ? "active" : ""}`}
                  onClick={() => { setStatusFilter(s); setShowStatusDrop(false); }}>{s}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {!loading && (
        <div className="rp-detail-drag-hint">
          {rows.length} campaign{rows.length !== 1 ? "s" : ""}
          {rows.length > 0 && (
            <>&nbsp;·&nbsp;Total Sent: <strong>{totalSent.toLocaleString()}</strong>
            &nbsp;·&nbsp;Avg Delivery: <strong>{pct(totalDelivered, totalSent)}</strong></>
          )}
        </div>
      )}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Template</th>
              <th>Status</th>
              <th>Contacts</th>
              <th>Sent</th>
              <th>Delivered</th>
              <th>Read</th>
              <th>Failed</th>
              <th>Blocked</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={10} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="rp-detail-empty-cell">No data available</td></tr>
            ) : rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => (
              <tr key={i}>
                <td className="fw-semibold">{r.name}</td>
                <td><span className="rp-detail-link">{r.templateName}</span></td>
                <td><span className={`rp-wac-status rp-wac-status--${campStatusClass(r.status)}`}>{r.status}</span></td>
                <td>{r.totalContacts}</td>
                <td>{r.sent}</td>
                <td>{r.delivered} <span className="rp-wac-pct">({pct(r.delivered, r.sent)})</span></td>
                <td>{r.read} <span className="rp-wac-pct">({pct(r.read, r.sent)})</span></td>
                <td className={r.failed > 0 ? "rp-wac-warn" : undefined}>{r.failed}</td>
                <td className={r.blocked > 0 ? "rp-wac-warn" : undefined}>{r.blocked}</td>
                <td>{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
