import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { PACKAGE_SALE_REPORT } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import ClientHistoryModal from "../../clients/components/ClientHistoryModal";
import "./PackageSaleReport.scss";

const REPORT_NAME = "Package Sale";

interface PackageSaleRow {
  date: string;
  client: string;
  clientId: string;
  packageName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  gstAmount: number;
}

// Maps a row from the independent Package Sale API
// (POST /api/report/package-sale — reads client_packages directly, never
// the Appointment API) to the table's existing PackageSaleRow shape.
function mapRow(row: any): PackageSaleRow {
  return {
    date: row.date || "—",
    client: row.client_name || "—",
    clientId: row.client_id ? String(row.client_id) : "",
    packageName: row.package_name || "—",
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    pendingAmount: Number(row.pending_amount) || 0,
    paymentStatus: row.payment_status || "unpaid",
    gstAmount: Number(row.gst_amount) || 0,
  };
}

export default function PackageSaleReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows,        setRows]        = useState<PackageSaleRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ packagesSold: 0, totalSaleValue: 0, totalReceived: 0, uniquePackages: 0 });
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
      const res = await api.post(PACKAGE_SALE_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        packagesSold: Number(s.packages_sold) || 0,
        totalSaleValue: Number(s.total_sale_value) || 0,
        totalReceived: Number(s.total_received) || 0,
        uniquePackages: Number(s.unique_packages) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ packagesSold: 0, totalSaleValue: 0, totalReceived: 0, uniquePackages: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, debouncedSearch, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, debouncedSearch]);

  const HEADERS = ["Date", "Client", "Package Name", "Total Amount (₹)", "GST (₹)", "Paid (₹)", "Balance Due (₹)", "Status"];
  const exportRows = () => rows.map(r => [r.date, r.client, r.packageName, r.totalAmount, r.gstAmount, r.paidAmount, r.pendingAmount, r.paymentStatus]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`package-sale-${dateFrom}-${dateTo}`} variant="button" csv />
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
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.packagesSold}</div><div className="rp-sra-summary-label">Packages Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{stats.totalSaleValue.toLocaleString()}</div><div className="rp-sra-summary-label">Total Sale Value</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{stats.totalReceived.toLocaleString()}</div><div className="rp-sra-summary-label">Total Received</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.uniquePackages}</div><div className="rp-sra-summary-label">Unique Packages</div></div>
        </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input type="text" className="rp-detail-search-input" placeholder="Client or package name" value={search} onChange={e => setSearchInput(e.target.value)} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Client</th><th>Package Name</th><th>Total Amount (₹)</th><th>GST (₹)</th><th>Paid (₹)</th><th>Balance Due (₹)</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No package sales found</td></tr>
            ) : rows.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td>{r.date || "—"}</td>
                <td className="fw-semibold">{r.client}</td>
                <td>{r.packageName}</td>
                <td>₹{r.totalAmount.toLocaleString()}</td>
                <td>₹{r.gstAmount.toLocaleString()}</td>
                <td>₹{r.paidAmount.toLocaleString()}</td>
                <td>₹{r.pendingAmount.toLocaleString()}</td>
                <td><span className={`rp-status-badge rp-status-${(r.paymentStatus ?? "").toLowerCase()}`}>{r.paymentStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={total}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="packages" />
      )}
    </div>
  );
}
