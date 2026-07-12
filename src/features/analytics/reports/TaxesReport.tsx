import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import Button from "../../../components/ui/Button";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./TaxesReport.scss";

const REPORT_NAME = "Taxes";

interface TaxRow {
  date: string;
  invoiceNo: string;
  client: string;
  taxableAmount: number;
  taxName: string;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export default function TaxesReport({ onBack }: { onBack: () => void }) {
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [rows,        setRows]        = useState<TaxRow[]>([]);
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
      const res = await api.get(BOOKING.BASE, { params: { start_date: dateFrom, end_date: dateTo, limit: "200" }, signal: ctrl.signal });
      const raw = res.data?.data;
      const appts: any[] =
        Array.isArray(raw?.items) ? raw.items :
        Array.isArray(raw?.data)  ? raw.data  :
        Array.isArray(raw)        ? raw        : [];
      const result: TaxRow[] = [];
      appts.forEach((appt: any) => {
        const breakdown: any[] = Array.isArray(appt.tax_breakdown) ? appt.tax_breakdown : [];
        if (breakdown.length === 0) return;

        const date = String(appt.scheduled_at ?? appt.created_at ?? "").slice(0, 10);
        const invoiceNo = appt.invoice_number != null ? String(appt.invoice_number) : String(appt.id ?? "—");
        const client = appt.client_name ?? "Walk-in";
        const itemsTotal = [
          ...(Array.isArray(appt.services) ? appt.services : []),
          ...(Array.isArray(appt.package_items) ? appt.package_items : []),
          ...(Array.isArray(appt.product_items) ? appt.product_items : []),
          ...(Array.isArray(appt.membership_items) ? appt.membership_items : []),
        ].reduce((s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
        const discount = appt.discount_type === "percentage"
          ? itemsTotal * ((Number(appt.discount_value) || 0) / 100)
          : (Number(appt.discount_value) || 0);
        const taxableAmount = Math.max(itemsTotal - discount, 0);
        const totalTaxForAppt = breakdown.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
        const total = taxableAmount + totalTaxForAppt + (Number(appt.tip_amount) || 0);

        breakdown.forEach((t: any) => {
          result.push({
            date, invoiceNo, client, taxableAmount,
            taxName: t.name ?? "Tax",
            taxRate: Number(t.rate) || 0,
            taxAmount: Number(t.amount) || 0,
            total,
          });
        });
      });
      result.sort((a, b) => (a.date < b.date ? 1 : -1));
      setRows(result);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [rows]);

  const totalTaxable = rows.reduce((s, r) => s + r.taxableAmount, 0);
  const totalTax = rows.reduce((s, r) => s + r.taxAmount, 0);
  const invoiceCount = new Set(rows.map(r => r.invoiceNo)).size;

  const HEADERS = ["Date", "Invoice No", "Client", "Taxable Amount (₹)", "Tax Name", "Rate (%)", "Tax Amount (₹)", "Total (₹)"];
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.client, r.taxableAmount, r.taxName, r.taxRate, r.taxAmount, r.total]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`taxes-${dateFrom}-${dateTo}`} variant="button" csv />
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

      {loading ? <SkeletonStatCards count={3} /> : (
      <div className="rp-sra-summary-row">
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{invoiceCount}</div><div className="rp-sra-summary-label">Invoices with Tax</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalTaxable.toLocaleString()}</div><div className="rp-sra-summary-label">Total Taxable Amount</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalTax.toLocaleString()}</div><div className="rp-sra-summary-label">Total Tax Collected</div></div>
      </div>
      )}

      {!loading && <div className="rp-detail-drag-hint">{rows.length} tax line{rows.length !== 1 ? "s" : ""}</div>}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr><th>Date</th><th>Invoice No</th><th>Client</th><th>Taxable Amount (₹)</th><th>Tax Name</th><th>Rate (%)</th><th>Tax Amount (₹)</th><th>Total (₹)</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={8} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="rp-detail-empty-cell">No tax data found</td></tr>
            ) : paged.map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td>
                <td><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td>{r.client}</td>
                <td>₹{r.taxableAmount.toLocaleString()}</td>
                <td>{r.taxName}</td>
                <td>{r.taxRate}%</td>
                <td className="fw-semibold">₹{r.taxAmount.toLocaleString()}</td>
                <td>₹{r.total.toLocaleString()}</td>
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
