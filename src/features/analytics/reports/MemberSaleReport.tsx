import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { CLIENT_MEMBERSHIPS, type ClientMembership } from "../../../services/api/endpoints/clientMemberships.endpoints";
import Button from "../../../components/ui/Button";
import { PageLoader } from "../../../components/ui/PageLoader";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./MemberSaleReport.scss";

const REPORT_NAME = "Member Sale";

export default function MemberSaleReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearch]      = useState("");
  const [allRows,     setAllRows]     = useState<ClientMembership[]>([]);
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
      const res = await api.get(CLIENT_MEMBERSHIPS.BASE, { params: { limit: 500, search: search.trim() || undefined }, signal: ctrl.signal });
      const raw = res.data?.data;
      const items: ClientMembership[] = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
      setAllRows(items);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = useMemo(() => allRows.filter(m => {
    const purchased = String(m.purchasedAt ?? "").slice(0, 10);
    return (!dateFrom || purchased >= dateFrom) && (!dateTo || purchased <= dateTo);
  }), [allRows, dateFrom, dateTo]);

  useEffect(() => { setCurrentPage(1); }, [rows.length]);

  const totalRevenue = rows.reduce((s, r) => s + (r.pricePaid ?? 0), 0);
  const activeCount = rows.filter(r => r.status === "active").length;

  const HEADERS = ["Date", "Client", "Membership", "Price Paid (₹)", "Sessions", "Status"];
  const exportRows = () => rows.map(r => [String(r.purchasedAt ?? "").slice(0, 10), r.clientName, r.membershipName, r.pricePaid ?? 0, r.totalSessions === 0 ? "Unlimited" : `${r.usedSessions}/${r.totalSessions}`, r.status]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`member-sale-${dateFrom}-${dateTo}`} variant="button" csv print />
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

      <div className="rp-sra-summary-row">
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{rows.length}</div><div className="rp-sra-summary-label">Memberships Sold</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalRevenue.toLocaleString()}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{activeCount}</div><div className="rp-sra-summary-label">Active Memberships</div></div>
      </div>

      <div className="rp-detail-toolbar">
        <div className="rp-detail-show-n">
          <span>Show</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client or membership name" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Date</th><th>Client</th><th>Membership</th><th>Price Paid (₹)</th><th>Sessions</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No membership sales found</td></tr>
            ) : paged.map((r) => (
              <tr key={r.id}>
                <td>{String(r.purchasedAt ?? "").slice(0, 10)}</td>
                <td className="fw-semibold">{r.clientName}</td>
                <td>{r.membershipName}</td>
                <td>₹{(r.pricePaid ?? 0).toLocaleString()}</td>
                <td>{r.totalSessions === 0 ? "Unlimited" : `${r.usedSessions}/${r.totalSessions}`}</td>
                <td><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
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
