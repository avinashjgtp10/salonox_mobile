import { useState, useMemo } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import { useListClientPackagesQuery } from "../../../services/api/endpoints/packages.endpoints";
import Button from "../../../components/ui/Button";
import { PageLoader } from "../../../components/ui/PageLoader";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./PackageSaleReport.scss";

const REPORT_NAME = "Package Sale";

export default function PackageSaleReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);

  const { data, isFetching, refetch } = useListClientPackagesQuery({ page: 1, limit: 500, search: search.trim() || undefined });

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter(p => {
      const created = String(p.createdDate ?? "").slice(0, 10);
      return (!dateFrom || created >= dateFrom) && (!dateTo || created <= dateTo);
    });
  }, [data, dateFrom, dateTo]);

  const totalSale = rows.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (r.paidAmount ?? 0), 0);
  const totalPending = rows.reduce((s, r) => s + (r.pendingAmount ?? 0), 0);

  const HEADERS = ["Date", "Client", "Package", "Total Amount (₹)", "Paid (₹)", "Pending (₹)", "Status"];
  const exportRows = () => rows.map(r => [r.createdDate, r.clientName, r.packageName, r.totalAmount, r.paidAmount, r.pendingAmount, r.paymentStatus]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paged = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`package-sale-${dateFrom}-${dateTo}`} variant="button" csv print />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={() => refetch()} loading={isFetching}>
            Run Report
          </Button>
        </div>
      </div>

      <div className="rp-sra-summary-row">
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{rows.length}</div><div className="rp-sra-summary-label">Packages Sold</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalSale.toLocaleString()}</div><div className="rp-sra-summary-label">Total Sale Value</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalPaid.toLocaleString()}</div><div className="rp-sra-summary-label">Received Amount</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalPending.toLocaleString()}</div><div className="rp-sra-summary-label">Pending Amount</div></div>
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
          <input type="text" className="rp-detail-search-input" placeholder="Client or package name" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Date</th><th>Client</th><th>Package</th><th>Total Amount (₹)</th><th>Paid (₹)</th><th>Pending (₹)</th><th>Status</th></tr>
          </thead>
          <tbody>
            {isFetching ? (
              <tr><td colSpan={7} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No package sales found</td></tr>
            ) : paged.map((r) => (
              <tr key={r.id}>
                <td>{String(r.createdDate ?? "").slice(0, 10)}</td>
                <td className="fw-semibold">{r.clientName}</td>
                <td>{r.packageName}</td>
                <td>₹{(r.totalAmount ?? 0).toLocaleString()}</td>
                <td>₹{(r.paidAmount ?? 0).toLocaleString()}</td>
                <td>₹{(r.pendingAmount ?? 0).toLocaleString()}</td>
                <td><span className={`rp-status-badge rp-status-${(r.paymentStatus ?? "").toLowerCase()}`}>{r.paymentStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={safePage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
