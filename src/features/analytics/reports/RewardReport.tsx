import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { REPORT } from "../../../services/api/endpoints";
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

export default function RewardReport({ onBack }: { onBack: () => void }) {
  const [search,      setSearch]      = useState("");
  const [rows,        setRows]        = useState<RewardClientRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await api.get(REPORT.REWARD_POINTS_TABLE(params.toString()), { signal: ctrl.signal });
      const raw: any[] = res.data?.data ?? [];
      setRows(raw.map((r: any) => ({
        clientId: r.clientId,
        clientName: r.clientName || "Walk-in Client",
        mobile: r.mobile || "—",
        pointsAvailable: Number(r.pointsAvailable) || 0,
        pointsEarned: Number(r.pointsEarned) || 0,
        pointsRedeemed: Number(r.pointsRedeemed) || 0,
        lastActivityAt: r.lastActivityAt ?? null,
      })));
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [rows]);

  const totalAvailable = rows.reduce((s, r) => s + r.pointsAvailable, 0);
  const totalEarned = rows.reduce((s, r) => s + r.pointsEarned, 0);
  const totalRedeemed = rows.reduce((s, r) => s + r.pointsRedeemed, 0);

  const HEADERS = ["Client", "Mobile", "Points Available", "Points Earned", "Points Redeemed", "Last Activity"];
  const exportRows = () => rows.map(r => [
    r.clientName, r.mobile, r.pointsAvailable, r.pointsEarned, r.pointsRedeemed,
    r.lastActivityAt ? String(r.lastActivityAt).slice(0, 10) : "—",
  ]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
              onChange={e => setSearch(e.target.value)}
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
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{totalAvailable.toLocaleString()}</div><div className="rp-sra-summary-label">Points Available</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{totalEarned.toLocaleString()}</div><div className="rp-sra-summary-label">Total Points Earned</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{totalRedeemed.toLocaleString()}</div><div className="rp-sra-summary-label">Total Points Redeemed</div></div>
        </div>
      )}

      <div className="rp-detail-drag-hint">{rows.length} client{rows.length !== 1 ? "s" : ""} with reward point activity</div>

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
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No reward point activity found</td></tr>
            ) : paged.map((r) => (
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

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
