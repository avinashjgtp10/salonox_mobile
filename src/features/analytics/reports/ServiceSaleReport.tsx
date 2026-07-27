import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { SERVICE_SALE_REPORT } from "../../../services/api/endpoints";
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
  taxAmount: number;
}

// Maps a row from the independent Service Sale API
// (POST /api/report/service-sale — reads sales/sale_items directly, never
// the Appointment API) to the table's existing ServiceSaleRow shape.
function mapRow(row: any): ServiceSaleRow {
  return {
    date: row.date || "—",
    invoiceNo: row.invoice_no ?? "—",
    client: row.client_name || "Walk-in",
    clientId: row.client_id ? String(row.client_id) : "",
    staff: row.staff_name || "—",
    serviceName: row.service_name || "Service",
    price: Number(row.price) || 0,
    taxAmount: Number(row.tax_amount) || 0,
  };
}

export default function ServiceSaleReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,        setRows]        = useState<ServiceSaleRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ servicesSold: 0, totalRev: 0, avgTicket: 0, uniqueServices: 0 });
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
      const res = await api.post(SERVICE_SALE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        servicesSold: Number(s.services_sold) || 0,
        totalRev: Number(s.total_revenue) || 0,
        avgTicket: Number(s.avg_ticket) || 0,
        uniqueServices: Number(s.unique_services) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ servicesSold: 0, totalRev: 0, avgTicket: 0, uniqueServices: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch]);

  const HEADERS = ["Date", "Invoice No", "Client", "Staff", "Service Name", "Price (₹)", "GST (₹)", "Total (₹)"];
  // Total column is gross = line base + its own GST.
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.client, r.staff, r.serviceName, r.price, r.taxAmount, r.price + r.taxAmount]);

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
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.servicesSold}</div><div className="rp-sra-summary-label">Services Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{stats.totalRev.toLocaleString()}</div><div className="rp-sra-summary-label">Total Revenue</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{stats.avgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div><div className="rp-sra-summary-label">Avg Ticket</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.uniqueServices}</div><div className="rp-sra-summary-label">Unique Services</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Service, client or staff" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Date</th><th>Invoice No</th><th>Client</th><th>Staff</th><th>Service Name</th><th>Price (₹)</th><th>GST (₹)</th><th>Total (₹)</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No service sales found</td></tr>
            ) : rows.map((r, i) => (
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
                <td>₹{r.taxAmount.toLocaleString()}</td>
                <td className="fw-semibold">₹{(r.price + r.taxAmount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="services" />
      )}
    </div>
  );
}
