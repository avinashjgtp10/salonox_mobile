import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CLIENT_REVENUE_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import { useCurrency } from "../../../hooks/useCurrency";
import "./ClientRevenueReport.scss";

const REPORT_NAME = "Client Revenue";

interface ClientRevenueRow {
  client: string;
  clientId: string;
  contact: string;
  visits: number;
  totalSpend: number;
  avgTicket: number;
  lastVisit: string;
}

// Maps a row from the independent Client Revenue API
// (POST /api/report/client-revenue — reads sales/clients directly, never
// the Appointment API) to the table's existing ClientRevenueRow shape.
function mapRow(row: any): ClientRevenueRow {
  return {
    client: row.client_name || "Walk-in",
    clientId: row.client_id ? String(row.client_id) : "",
    contact: row.contact || "—",
    visits: Number(row.visits) || 0,
    totalSpend: Number(row.total_spend) || 0,
    avgTicket: Number(row.avg_ticket) || 0,
    lastVisit: row.last_visit || "",
  };
}

export default function ClientRevenueReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const { currencySymbol, formatAmount } = useCurrency();
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,        setRows]        = useState<ClientRevenueRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ totalClients: 0, totalRevenue: 0, avgSpend: 0, topClient: "—" });
  const [loading,     setLoading]     = useState(false);
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
      const res = await api.post(CLIENT_REVENUE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        totalClients: Number(s.total_clients) || 0,
        totalRevenue: Number(s.total_revenue) || 0,
        avgSpend: Number(s.avg_spend_per_client) || 0,
        topClient: s.top_client || "—",
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ totalClients: 0, totalRevenue: 0, avgSpend: 0, topClient: "—" });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch]);

  const HEADERS = ["Client", "Contact", "Visits", `Total Spend (${currencySymbol})`, `Avg Ticket (${currencySymbol})`, "Last Visit"];
  const exportRows = () => rows.map(r => [r.client, r.contact, r.visits, r.totalSpend, r.avgTicket, r.lastVisit]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`client-revenue-${dateFrom}-${dateTo}`} variant="button" csv />
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
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.totalClients}</div><div className="rp-sra-summary-label">Total Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalRevenue)}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.avgSpend)}</div><div className="rp-sra-summary-label">Avg Spend / Client</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val rp-cr-top">{stats.topClient}</div><div className="rp-sra-summary-label">Top Client</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client name or phone" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Client</th><th>Contact</th><th>Visits</th><th>Total Spend ({currencySymbol})</th><th>Avg Ticket ({currencySymbol})</th><th>Last Visit</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No client revenue data found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td className="fw-semibold">{r.client}</td>
                <td>{r.contact}</td>
                <td>{r.visits}</td>
                <td className="fw-semibold">{formatAmount(r.totalSpend)}</td>
                <td>{formatAmount(r.avgTicket)}</td>
                <td>{r.lastVisit || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="history" />
      )}
    </div>
  );
}
