import { useState, useMemo } from "react";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import { useListClientPackagesQuery } from "../../../services/api/endpoints/packages.endpoints";
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
}

export default function PackageSaleReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [search,      setSearch]      = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Packages sold from the Packages section go through the dedicated client-packages
  // API (createClientPackage → /client-packages), not the booking/appointment flow —
  // there's no appointment record for them at all, so this must read the same source
  // PackageHistoryReport uses rather than deriving rows from bookings' package_items[].
  const { data, isFetching, refetch } = useListClientPackagesQuery({ page: 1, limit: 500 });

  const allRows = useMemo(() => {
    const items = data?.items ?? [];
    return items.map((pkg): PackageSaleRow => ({
      date: String(pkg.createdDate ?? "").slice(0, 10),
      client: pkg.clientName,
      clientId: pkg.clientId ? String(pkg.clientId) : "",
      packageName: pkg.packageName,
      totalAmount: Number(pkg.totalAmount) || 0,
      paidAmount: Number(pkg.paidAmount) || 0,
      pendingAmount: Number(pkg.pendingAmount) || 0,
      paymentStatus: pkg.paymentStatus || "unpaid",
    }));
  }, [data]);

  const rows = useMemo(() => {
    let r = allRows.filter(row => (!dateFrom || row.date >= dateFrom) && (!dateTo || row.date <= dateTo));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(row => row.client.toLowerCase().includes(q) || row.packageName.toLowerCase().includes(q));
    }
    return r;
  }, [allRows, dateFrom, dateTo, search]);

  const totalPackages = rows.length;
  const totalSaleValue = rows.reduce((s, r) => s + r.totalAmount, 0);
  const totalReceived = rows.reduce((s, r) => s + r.paidAmount, 0);
  const uniquePackages = new Set(rows.map(r => r.packageName)).size;

  const HEADERS = ["Date", "Client", "Package Name", "Total Amount (₹)", "Paid (₹)", "Balance Due (₹)", "Status"];
  const exportRows = () => rows.map(r => [r.date, r.client, r.packageName, r.totalAmount, r.paidAmount, r.pendingAmount, r.paymentStatus]);
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
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`package-sale-${dateFrom}-${dateTo}`} variant="button" csv />
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

      {isFetching ? <SkeletonStatCards count={4} /> : (
        <div className="rp-sra-summary-row">
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{totalPackages}</div><div className="rp-sra-summary-label">Packages Sold</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalSaleValue.toLocaleString()}</div><div className="rp-sra-summary-label">Total Sale Value</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalReceived.toLocaleString()}</div><div className="rp-sra-summary-label">Total Received</div></div>
          <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{uniquePackages}</div><div className="rp-sra-summary-label">Unique Packages</div></div>
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
          <input type="text" className="rp-detail-search-input" placeholder="Client or package name" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Client</th><th>Package Name</th><th>Total Amount (₹)</th><th>Paid (₹)</th><th>Balance Due (₹)</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isFetching ? (
              <SkeletonTableRows columns={7} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} className="rp-detail-empty-cell">No package sales found</td></tr>
            ) : paged.map((r, i) => (
              <tr
                key={i}
                className={r.clientId ? "rp-appt-row" : undefined}
                onClick={() => r.clientId && setSelectedClientId(r.clientId)}
              >
                <td>{r.date || "—"}</td>
                <td className="fw-semibold">{r.client}</td>
                <td>{r.packageName}</td>
                <td>₹{r.totalAmount.toLocaleString()}</td>
                <td>₹{r.paidAmount.toLocaleString()}</td>
                <td>₹{r.pendingAmount.toLocaleString()}</td>
                <td><span className={`rp-status-badge rp-status-${(r.paymentStatus ?? "").toLowerCase()}`}>{r.paymentStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={safePage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />

      {selectedClientId && (
        <ClientHistoryModal clientId={selectedClientId} onClose={() => setSelectedClientId(null)} initialTab="packages" />
      )}
    </div>
  );
}
