import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
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

export default function ClientRevenueReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearch]      = useState("");
  const [allRows,     setAllRows]     = useState<ClientRevenueRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await api.get(BOOKING.BASE, { params: { start_date: dateFrom, end_date: dateTo, limit: "200" }, signal: ctrl.signal });
      const raw = res.data?.data;
      const appts: any[] =
        Array.isArray(raw?.items) ? raw.items :
        Array.isArray(raw?.data)  ? raw.data  :
        Array.isArray(raw)        ? raw        : [];
      const map = new Map<string, { client: string; clientId: string; contact: string; visits: number; totalSpend: number; lastVisit: string }>();
      appts.forEach((appt: any) => {
        // Only count money actually collected — an appointment with nothing paid
        // shouldn't contribute revenue or even appear for a client in this report.
        const paidAmount = Number(appt.paid_amount) || 0;
        if (paidAmount <= 0) return;
        const client = appt.client_name ?? "Walk-in";
        const clientId = appt.client_id ? String(appt.client_id) : "";
        const contact = appt.client_phone ?? "—";
        const key = `${client}||${contact}`;
        const date = String(appt.scheduled_at ?? appt.created_at ?? "").slice(0, 10);
        const e = map.get(key) ?? { client, clientId, contact, visits: 0, totalSpend: 0, lastVisit: "" };
        e.visits += 1;
        e.totalSpend += paidAmount;
        if (date > e.lastVisit) e.lastVisit = date;
        map.set(key, e);
      });
      const result: ClientRevenueRow[] = [...map.values()]
        .map(e => ({ ...e, avgTicket: e.visits > 0 ? Math.round(e.totalSpend / e.visits) : 0 }))
        .sort((a, b) => b.totalSpend - a.totalSpend);
      setAllRows(result);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.toLowerCase();
    return allRows.filter(r => r.client.toLowerCase().includes(q) || r.contact.includes(q));
  }, [allRows, search]);

  useEffect(() => { setCurrentPage(1); }, [rows]);

  const totalClients = rows.length;
  const totalRevenue = rows.reduce((s, r) => s + r.totalSpend, 0);
  const avgSpend = totalClients > 0 ? totalRevenue / totalClients : 0;
  const topClient = rows[0]?.client ?? "—";

  const HEADERS = ["Client", "Contact", "Visits", "Total Spend (₹)", "Avg Ticket (₹)", "Last Visit"];
  const exportRows = () => rows.map(r => [r.client, r.contact, r.visits, r.totalSpend, r.avgTicket, r.lastVisit]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
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
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{totalClients}</div><div className="rp-sra-summary-label">Total Clients</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalRevenue.toLocaleString()}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{avgSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="rp-sra-summary-label">Avg Spend / Client</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val rp-cr-top">{topClient}</div><div className="rp-sra-summary-label">Top Client</div></div>
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
          <input type="text" className="rp-detail-search-input" placeholder="Client name or phone" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Client</th><th>Contact</th><th>Visits</th><th>Total Spend (₹)</th><th>Avg Ticket (₹)</th><th>Last Visit</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No client revenue data found</td></tr>
            ) : paged.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td className="fw-semibold">{r.client}</td>
                <td>{r.contact}</td>
                <td>{r.visits}</td>
                <td className="fw-semibold">₹{r.totalSpend.toLocaleString()}</td>
                <td>₹{r.avgTicket.toLocaleString()}</td>
                <td>{r.lastVisit || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="history" />
      )}
    </div>
  );
}
