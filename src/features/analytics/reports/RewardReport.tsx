import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { REWARD_POINTS_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./RewardReport.scss";

const REPORT_NAME = "Reward";

interface RewardClientRow {
  clientId: string;
  clientName: string;
  mobile: string;
  pointsAvailable: number;
  pointsEarned: number;
  pointsRedeemed: number;
  lastActivityAt: string | null;
}

// Maps a row from the independent Reward Points API
// (POST /api/report/reward-points — reads clients/reward_points_ledger
// directly, never the Appointment API) to the table's existing row shape.
function mapRow(row: any): RewardClientRow {
  return {
    clientId: row.client_id,
    clientName: row.client_name || "Walk-in Client",
    mobile: row.mobile || "—",
    pointsAvailable: Number(row.points_available) || 0,
    pointsEarned: Number(row.points_earned) || 0,
    pointsRedeemed: Number(row.points_redeemed) || 0,
    lastActivityAt: row.last_activity_at ?? null,
  };
}

export default function RewardReport({ onBack }: { onBack: () => void }) {
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,        setRows]        = useState<RewardClientRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalAvailable: 0, totalEarned: 0, totalRedeemed: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
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
      const body: Record<string, any> = { page: currentPage, limit: pageSize };
      if (debouncedSearch) body.search = debouncedSearch;
      const res = await api.post(REWARD_POINTS_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalAvailable: Number(s.points_available) || 0,
        totalEarned: Number(s.total_points_earned) || 0,
        totalRedeemed: Number(s.total_points_redeemed) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalAvailable: 0, totalEarned: 0, totalRedeemed: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);

  const HEADERS = ["Client", "Mobile", "Points Available", "Points Earned", "Points Redeemed", "Last Activity"];
  const exportRows = () => rows.map(r => [
    r.clientName, r.mobile, r.pointsAvailable, r.pointsEarned, r.pointsRedeemed,
    r.lastActivityAt ? String(r.lastActivityAt).slice(0, 10) : "—",
  ]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`reward-points-${new Date().toISOString().slice(0, 10)}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group" style={{ minWidth: 260 }}>
          <label className="rp-detail-filter-label">Client</label>
          <div className="rp-detail-search-wrap">
            <Search size={14} className="rp-detail-search-ic" />
            <input
              type="text"
              className="rp-detail-search-input"
              placeholder="Search by name or mobile…"
              value={search}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={3} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalAvailable.toLocaleString()}</div><div className="rp-sra-summary-label">Points Available</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalEarned.toLocaleString()}</div><div className="rp-sra-summary-label">Total Points Earned</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalRedeemed.toLocaleString()}</div><div className="rp-sra-summary-label">Total Points Redeemed</div></div>
        </div>
      )}

      <div className="rp-detail-drag-hint">{total} client{total !== 1 ? "s" : ""} with reward point activity</div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Client</th><th>Mobile</th><th>Points Available</th>
              <th>Points Earned</th><th>Points Redeemed</th><th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No reward point activity found</td></tr>
            ) : rows.map((r) => (
              <tr key={r.clientId}>
                <td>{r.clientName}</td>
                <td>{r.mobile}</td>
                <td className="fw-semibold">{r.pointsAvailable.toLocaleString()}</td>
                <td>{r.pointsEarned.toLocaleString()}</td>
                <td>{r.pointsRedeemed.toLocaleString()}</td>
                <td>{r.lastActivityAt ? String(r.lastActivityAt).slice(0, 10) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
