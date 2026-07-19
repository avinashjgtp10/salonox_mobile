import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { ChevronLeft, BoxArrowUpRight } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/ui/Button";
import { SkeletonStatCards, SkeletonTableRows } from "./ReportSkeleton";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import { normalizePaymentStatus } from "../../bookings/utils/bookingMapper";
import "./TaxesReport.scss";

const REPORT_NAME = "GST Report";

interface InvoiceTaxRow {
  date: string;
  invoiceNo: string;
  client: string;
  staffId: string;
  taxableAmount: number;
  // Keyed by the exact tax name configured on the Tax Mapping settings page
  // at billing time (a per-invoice snapshot, not a live reference) — so this
  // report's columns always reflect whatever taxes were actually in use,
  // instead of assuming a fixed CGST/SGST/IGST set.
  taxAmounts: Record<string, number>;
  total: number;
}

export default function TaxesReport({ onBack }: { onBack: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const today   = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [dateFrom,    setDateFrom]    = useState(monthStart);
  const [dateTo,      setDateTo]      = useState(today);
  const [staffFilter,   setStaffFilter]   = useState("All");
  const [staffOptions,  setStaffOptions]  = useState<{ label: string; value: string }[]>([{ label: "All", value: "All" }]);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("");
  const [rows,        setRows]        = useState<InvoiceTaxRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions([{ label: "All", value: "All" }, ...opts]);
    }).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    const close = () => setShowStaffDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

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
      const result: InvoiceTaxRow[] = [];
      appts.forEach((appt: any) => {
        if (normalizePaymentStatus(appt.status) === "Unpaid") return;
        const breakdown: any[] = Array.isArray(appt.tax_breakdown) ? appt.tax_breakdown : [];
        if (breakdown.length === 0) return;
        if (staffFilter !== "All" && String(appt.staff_id ?? "") !== staffFilter) return;

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

        const taxAmounts: Record<string, number> = {};
        // Inclusive tax is already baked into taxableAmount, so it must not be
        // added again here — only exclusive (add-on-top) tax increases the
        // total. Same distinction the printed receipt's Payment Summary makes.
        let exclusiveTaxForAppt = 0;
        breakdown.forEach((t: any) => {
          const amt = Number(t.amount) || 0;
          const name = String(t.name ?? "").trim() || "Other Tax";
          taxAmounts[name] = (taxAmounts[name] ?? 0) + amt;
          if (!t.inclusive) exclusiveTaxForAppt += amt;
        });

        const total = taxableAmount + exclusiveTaxForAppt + (Number(appt.tip_amount) || 0);

        result.push({
          date, invoiceNo, client, staffId: String(appt.staff_id ?? ""), taxableAmount,
          taxAmounts, total,
        });
      });
      result.sort((a, b) => (a.date < b.date ? 1 : -1));
      setRows(result);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [rows]);

  const visibleRows = customerFilter.trim()
    ? rows.filter(r => r.client.toLowerCase().includes(customerFilter.trim().toLowerCase()))
    : rows;

  // Column set is whatever tax names actually appear in this date range —
  // not a fixed CGST/SGST/IGST list — so renaming/adding a tax on the Tax
  // Mapping settings page is reflected here automatically for new invoices.
  const taxColumns = Array.from(
    visibleRows.reduce((names, r) => {
      Object.keys(r.taxAmounts).forEach(n => names.add(n));
      return names;
    }, new Set<string>())
  ).sort((a, b) => a.localeCompare(b));

  const totalTax = visibleRows.reduce((s, r) => s + Object.values(r.taxAmounts).reduce((a, b) => a + b, 0), 0);
  const totalCollected = visibleRows.reduce((s, r) => s + r.total, 0);
  const selectedStaffLabel = staffOptions.find(o => o.value === staffFilter)?.label ?? "All";

  const HEADERS = ["Invoice No.", "Date", "Customer", "Taxable Value (₹)", ...taxColumns.map(n => `${n} (₹)`), "Total (₹)"];
  const exportRows = () => visibleRows.map(r => [
    r.invoiceNo, r.date, r.client, r.taxableAmount,
    ...taxColumns.map(n => r.taxAmounts[n] ?? 0),
    r.total,
  ]);
  const paged = visibleRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
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
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Staff</label>
          <button className="rp-detail-select" onClick={() => setShowStaffDrop(v => !v)}>
            {selectedStaffLabel.length > 16 ? selectedStaffLabel.slice(0, 16) + "…" : selectedStaffLabel}
            <span className="rp-detail-caret">▼</span>
          </button>
          {showStaffDrop && (
            <div className="rp-detail-dropdown" onMouseDown={e => e.stopPropagation()}>
              {staffOptions.map(o => (
                <div key={o.value} className={`rp-detail-dropdown-item ${o.value === staffFilter ? "active" : ""}`}
                  onClick={() => { setStaffFilter(o.value); setShowStaffDrop(false); }}>{o.label}</div>
              ))}
            </div>
          )}
        </div>
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Customer</label>
          <input
            type="text"
            className="rp-detail-date-input"
            placeholder="Search customer…"
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
          />
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="ghost" className="rp-detail-refresh-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      {loading ? <SkeletonStatCards count={3} /> : (
      <div className="rp-sra-summary-row">
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">{visibleRows.length}</div><div className="rp-sra-summary-label">Invoices with Tax</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalTax.toLocaleString()}</div><div className="rp-sra-summary-label">Total Tax Collected</div></div>
        <div className="rp-sra-summary-card"><div className="rp-sra-summary-val">₹{totalCollected.toLocaleString()}</div><div className="rp-sra-summary-label">Total Amount Collected</div></div>
      </div>
      )}

      {!loading && <div className="rp-detail-drag-hint">{visibleRows.length} invoice{visibleRows.length !== 1 ? "s" : ""}</div>}

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Invoice No.</th><th>Date</th><th>Customer</th><th>Taxable Value (₹)</th>
              {taxColumns.map(n => <th key={n}>{n} (₹)</th>)}
              <th>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows columns={5 + taxColumns.length} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={5 + taxColumns.length} className="rp-detail-empty-cell">No tax data found</td></tr>
            ) : paged.map((r, i) => (
              <tr key={i}>
                <td><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td>{r.date}</td>
                <td>{r.client}</td>
                <td>₹{r.taxableAmount.toLocaleString()}</td>
                {taxColumns.map(n => <td key={n}>₹{(r.taxAmounts[n] ?? 0).toLocaleString()}</td>)}
                <td className="fw-semibold">₹{r.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={visibleRows.length}
        onPageChange={setCurrentPage} onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }} />
    </div>
  );
}
