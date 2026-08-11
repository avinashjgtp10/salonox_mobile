import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { REWARD_POINTS_REPORT } from "../../../services/api/endpoints";
import ReportRefreshButton from "./ReportRefreshButton";
import { Pagination, JiraFilterMenu } from "../../../components/ui";
import type { JiraFilterField } from "../../../components/ui";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import "./RewardReport.scss";

const REPORT_NAME = "Reward";

const STATUS_OPTIONS = [
  { id: "active", label: "Active (has balance)" },
  { id: "inactive", label: "Inactive (no balance)" },
];

interface RewardClientRow {
  clientId: string;
  clientName: string;
  mobile: string;
  pointsAvailable: number;
  pointsEarned: number;
  pointsRedeemed: number;
  lastActivityAt: string | null;
}

// dd/MM/yyyy, consistently across the table and every export (CSV/Excel/PDF
// all read the same r.lastActivityAt via exportRows).
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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

export default function RewardReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [minAvailable, setMinAvailable] = useState("");
  const [maxAvailable, setMaxAvailable] = useState("");
  const [minRedeemed,  setMinRedeemed]  = useState("");
  const [maxRedeemed,  setMaxRedeemed]  = useState("");
  const [rows,        setRows]        = useState<RewardClientRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalAvailable: 0, totalEarned: 0, totalRedeemed: 0, activeClients: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(10);
  const abortRef = useRef<AbortController | null>(null);

  const dateRangeError = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    if (isNaN(new Date(dateFrom).getTime()) || isNaN(new Date(dateTo).getTime())) return "Enter valid dates.";
    if (dateFrom > dateTo) return "From Date cannot be after To Date.";
    return null;
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    if (dateRangeError) return;
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
      // The backend's status knob is a single value (active | inactive) —
      // checking exactly one of the two options narrows normally; checking
      // both (or neither) is equivalent to "no filter", so nothing is sent.
      if (statusFilter.length === 1) body.status = statusFilter[0];
      if (minAvailable !== "") body.points_available_min = Number(minAvailable);
      if (maxAvailable !== "") body.points_available_max = Number(maxAvailable);
      if (minRedeemed !== "") body.points_redeemed_min = Number(minRedeemed);
      if (maxRedeemed !== "") body.points_redeemed_max = Number(maxRedeemed);
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
        activeClients: Number(s.active_reward_clients) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalAvailable: 0, totalEarned: 0, totalRedeemed: 0, activeClients: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, dateRangeError, debouncedSearch, statusFilter, minAvailable, maxAvailable, minRedeemed, maxRedeemed, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch, statusFilter, minAvailable, maxAvailable, minRedeemed, maxRedeemed]);

  const filterFields: JiraFilterField[] = useMemo(() => [
    { key: "status", label: "Reward Status", options: STATUS_OPTIONS },
  ], []);

  const filterMenuSelected = useMemo(() => ({ status: statusFilter }), [statusFilter]);

  const handleFiltersApply = (next: Record<string, string[]>) => {
    setStatusFilter(next.status ?? []);
  };

  const HEADERS = ["Client", "Mobile", "Points Available", "Points Earned", "Points Redeemed", "Last Activity"];
  const exportRows = () => rows.map(r => [
    r.clientName, r.mobile, r.pointsAvailable, r.pointsEarned, r.pointsRedeemed,
    r.lastActivityAt ? formatDate(r.lastActivityAt) : "—",
  ]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`reward-points-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFields from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} hideLabel />
        <JiraFilterMenu fields={filterFields} selected={filterMenuSelected} onApply={handleFiltersApply} triggerLabel="Reward Status" />
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Available Points</label>
          <div className="rp-rw-range-inputs">
            <input type="number" min={0} placeholder="Min" value={minAvailable} onChange={e => setMinAvailable(e.target.value)} />
            <span>—</span>
            <input type="number" min={0} placeholder="Max" value={maxAvailable} onChange={e => setMaxAvailable(e.target.value)} />
          </div>
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Redeemed Points</label>
          <div className="rp-rw-range-inputs">
            <input type="number" min={0} placeholder="Min" value={minRedeemed} onChange={e => setMinRedeemed(e.target.value)} />
            <span>—</span>
            <input type="number" min={0} placeholder="Max" value={maxRedeemed} onChange={e => setMaxRedeemed(e.target.value)} />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row rp-rw-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalAvailable.toLocaleString()}</div><div className="rp-sra-summary-label">Available Points</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalEarned.toLocaleString()}</div><div className="rp-sra-summary-label">Total Points Earned</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalRedeemed.toLocaleString()}</div><div className="rp-sra-summary-label">Total Points Redeemed</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.activeClients.toLocaleString()}</div><div className="rp-sra-summary-label">Active Reward Clients</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search by name or mobile…"
            value={search}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
      </div>

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
                <td>{r.lastActivityAt ? formatDate(r.lastActivityAt) : "—"}</td>
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
