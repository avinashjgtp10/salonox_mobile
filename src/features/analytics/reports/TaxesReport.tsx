import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { BoxArrowUpRight, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { GST_REPORT } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import ReportRefreshButton from "./ReportRefreshButton";
import MultiSelectCheckbox from "../../../components/ui/MultiSelectCheckbox";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import DateRangeFields from "../../../components/ui/DateRangeFields";
import { useCurrency } from "../../../hooks/useCurrency";
import "./TaxesReport.scss";

const REPORT_NAME = "GST Report";

interface InvoiceTaxRow {
  date: string;
  invoiceNo: string;
  client: string;
  serviceAmount: number;
  productAmount: number;
  packageAmount: number;
  membershipAmount: number;
  taxableAmount: number;
  // sales.tax_amount is a single flat number — there is no per-tax-name
  // breakdown at the sales level (only payments.tax_breakdown has that, and
  // only for appointment-linked sales), so this is one flat column now,
  // not a dynamic CGST/SGST-style split.
  taxAmount: number;
  total: number;
}

// dd/MM/yyyy, consistently across the table and every export (CSV/Excel/PDF
// all read the same r.date via exportRows).
function formatDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Maps a row from the independent GST report API
// (POST /api/report/gst — reads sales directly, never the Appointment API)
// to the table's existing InvoiceTaxRow shape.
function mapRow(row: any): InvoiceTaxRow {
  return {
    date: row.date ? formatDate(row.date) : "—",
    invoiceNo: row.invoice_no ?? "—",
    client: row.client_name || "Walk-in",
    serviceAmount: Number(row.service_amount) || 0,
    productAmount: Number(row.product_amount) || 0,
    packageAmount: Number(row.package_amount) || 0,
    membershipAmount: Number(row.membership_amount) || 0,
    taxableAmount: Number(row.taxable_amount) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    total: Number(row.total) || 0,
  };
}

export default function TaxesReport({ onBack, category, categoryKey }: { onBack: () => void; category: string; categoryKey: string }) {
  const dispatch = useDispatch<AppDispatch>();
  const { currencySymbol, formatAmount } = useCurrency();
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [staffFilterIds, setStaffFilterIds] = useState<string[]>([]);
  const [staffOptions,   setStaffOptions]   = useState<{ id: string; label: string }[]>([]);
  const [customerFilter, setCustomerFilterInput] = useState("");
  const [debouncedCustomerFilter, setDebouncedCustomerFilter] = useState("");
  const [rows,        setRows]        = useState<InvoiceTaxRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [stats,       setStats]       = useState({ invoicesWithTax: 0, totalTax: 0, totalCollected: 0 });
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        id: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.id);
      setStaffOptions(opts);
    }).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustomerFilter(customerFilter.trim()), 300);
    return () => clearTimeout(t);
  }, [customerFilter]);

  // Real server-side pagination — page/limit are sent on every request, and
  // only that page's rows come back, along with stats computed by the
  // backend over the WHOLE filtered set (not just the current page).
  const fetchData = useCallback(async () => {
    if (dateTo && dateFrom && dateTo < dateFrom) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const body: Record<string, any> = {
        start_date: dateFrom, end_date: dateTo,
        page: currentPage, limit: pageSize,
      };
      if (staffFilterIds.length > 0) body.staff_ids = staffFilterIds;
      if (debouncedCustomerFilter) body.search = debouncedCustomerFilter;
      const res = await api.post(GST_REPORT.SUMMARY(), body, { signal: ctrl.signal });
      const data = res.data?.data;
      const raw: any[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(raw.map(mapRow));
      setTotal(Number(data?.pagination?.total) || 0);
      const s = data?.stats ?? {};
      setStats({
        invoicesWithTax: Number(s.invoices_with_tax) || 0,
        totalTax: Number(s.total_tax_collected) || 0,
        totalCollected: Number(s.total_amount_collected) || 0,
      });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setRows([]); setTotal(0);
        setStats({ invoicesWithTax: 0, totalTax: 0, totalCollected: 0 });
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilterIds, debouncedCustomerFilter, currentPage, pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setCurrentPage(1); }, [dateFrom, dateTo, staffFilterIds, debouncedCustomerFilter]);

  const avgTaxPerInvoice = stats.invoicesWithTax > 0 ? stats.totalTax / stats.invoicesWithTax : 0;

  const HEADERS = ["Date", "Invoice No", "Customer", `Service Amount (${currencySymbol})`, `Product Amount (${currencySymbol})`, `Package Amount (${currencySymbol})`, `Membership Amount (${currencySymbol})`, `Taxable Amount (${currencySymbol})`, `GST Amount (${currencySymbol})`, `Total Amount (${currencySymbol})`];
  const exportRows = () => rows.map(r => [r.date, r.invoiceNo, r.client, r.serviceAmount, r.productAmount, r.packageAmount, r.membershipAmount, r.taxableAmount, r.taxAmount, r.total]);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Breadcrumb current={REPORT_NAME} category={category} categoryKey={categoryKey} onBack={onBack} />
          <div className="rp-detail-view-icons">
            <a
              className="rp-gst-portal-btn"
              href="https://www.gst.gov.in"
              target="_blank"
              rel="noreferrer"
            >
              Open GST Portal <BoxArrowUpRight size={12} />
            </a>
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`gst-report-${dateFrom}-${dateTo}`} variant="button" csv />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <DateRangeFields from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <MultiSelectCheckbox
          label="Staff"
          containerClass="rp-detail-filter-group"
          options={staffOptions}
          selected={staffFilterIds}
          onChange={setStaffFilterIds}
          placeholder="All staff"
        />
        <div className="rp-detail-filter-actions">
          <ReportRefreshButton onClick={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? <SkeletonStatCards count={4} /> : (
      <div className="rp-sra-summary-row">
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{stats.invoicesWithTax}</div><div className="rp-sra-summary-label">Invoices with Tax</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalCollected)}</div><div className="rp-sra-summary-label">Total Amount</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(stats.totalTax)}</div><div className="rp-sra-summary-label">Total Tax</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{formatAmount(avgTaxPerInvoice)}</div><div className="rp-sra-summary-label">Average Tax per Invoice</div></div>
      </div>
      )}

      <div className="rp-detail-toolbar">
        <div className="rp-detail-search-wrap">
          <Search size={13} className="rp-detail-search-ic" />
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Search by customer name or invoice no…"
            value={customerFilter}
            onChange={e => setCustomerFilterInput(e.target.value)}
          />
        </div>
      </div>

      {!loading && <div className="rp-detail-drag-hint">{total} invoice{total !== 1 ? "s" : ""}</div>}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Date</th><th>Invoice No</th><th>Customer</th>
              <th>Service Amount ({currencySymbol})</th><th>Product Amount ({currencySymbol})</th>
              <th>Package Amount ({currencySymbol})</th><th>Membership Amount ({currencySymbol})</th>
              <th>Taxable Amount ({currencySymbol})</th>
              <th>GST Amount ({currencySymbol})</th>
              <th>Total Amount ({currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={10} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="rp-detail-empty-cell">No tax data found</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td>
                <td><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td>{r.client}</td>
                <td>{formatAmount(r.serviceAmount)}</td>
                <td>{formatAmount(r.productAmount)}</td>
                <td>{formatAmount(r.packageAmount)}</td>
                <td>{formatAmount(r.membershipAmount)}</td>
                <td>{formatAmount(r.taxableAmount)}</td>
                <td>{formatAmount(r.taxAmount)}</td>
                <td className="fw-semibold">{formatAmount(r.total)}</td>
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
