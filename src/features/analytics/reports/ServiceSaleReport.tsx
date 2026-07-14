import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import "./ServiceSaleReport.scss";

const REPORT_NAME = "Service Sale";

interface ServiceSaleRow {
  date: string;
  invoiceNo: string;
  client: string;
  clientId: string;
  staff: string;
  serviceName: string;
  price: number;
}

export default function ServiceSaleReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearch]      = useState("");
  const [allRows,     setAllRows]     = useState<ServiceSaleRow[]>([]);
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
      const rows: ServiceSaleRow[] = [];
      appts.forEach((appt: any) => {
        if (String(appt.payment_status ?? "unpaid").toLowerCase() === "unpaid") return;
        const date = String(appt.scheduled_at ?? appt.created_at ?? "").slice(0, 10);
        const invoiceNo = appt.invoice_number != null ? String(appt.invoice_number) : String(appt.id ?? "—");
        const client = appt.client_name ?? "Walk-in";
        const clientId = appt.client_id ? String(appt.client_id) : "";
        (Array.isArray(appt.services) ? appt.services : []).forEach((it: any) => {
          const price = Number(it.price) || 0;
          const staff = it.staff_name ?? appt.staff_name ?? "—";
          rows.push({ date, invoiceNo, client, clientId, staff, serviceName: String(it.name ?? "Service"), price });
        });
      });
      rows.sort((a, b) => (a.date < b.date ? 1 : -1));
      setAllRows(rows);
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
    return allRows.filter(r => r.serviceName.toLowerCase().includes(q) || r.client.toLowerCase().includes(q) || r.staff.toLowerCase().includes(q));
  }, [allRows, search]);

  useEffect(() => { setCurrentPage(1); }, [rows]);

  const totalCount = rows.length;
  const totalRev = rows.reduce((s, r) => s + r.price, 0);
  const avgTicket = totalCount > 0 ? totalRev / totalCount : 0;
  const uniqueServices = new Set(rows.map(r => r.serviceName)).size;

  const HEADERS = ["Date", "Invoice No", "Client", "Staff", "Service Name", "Price (₹)"];
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.client, r.staff, r.serviceName, r.price]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`service-sale-${dateFrom}-${dateTo}`} variant="button" csv />
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
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{totalCount}</div><div className="rp-sra-summary-label">Services Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalRev.toLocaleString()}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{avgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="rp-sra-summary-label">Avg Ticket</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{uniqueServices}</div><div className="rp-sra-summary-label">Unique Services</div></div>
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
          <input type="text" className="rp-detail-search-input" placeholder="Service, client or staff" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Date</th><th>Invoice No</th><th>Client</th><th>Staff</th><th>Service Name</th><th>Price (₹)</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={6} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="rp-detail-empty-cell">No service sales found</td></tr>
            ) : paged.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td>{r.date}</td>
                <td><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td>{r.client}</td>
                <td>{r.staff}</td>
                <td className="fw-semibold">{r.serviceName}</td>
                <td>₹{r.price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="services" />
      )}
    </div>
  );
}
