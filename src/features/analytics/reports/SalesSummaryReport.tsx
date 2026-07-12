import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import { ChevronLeft, Search } from "react-bootstrap-icons";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import type { AppDispatch } from "../../../store/store";
import Button from "../../../components/ui/Button";
import { PageLoader } from "../../../components/ui/PageLoader";
import { Pagination } from "../../../components/ui";
import ReportExportButton from "../../../components/ui/ReportExportButton";
import "./SalesSummaryReport.scss";

const REPORT_NAME = "Sales Summary";

interface SaleRow {
  invoiceNo: string;
  name: string;
  contact: string;
  itemDescription: string;
  itemTypes: string;
  actualPrice: number;
  price: number;
  paid: number;
  balance: number;
  modes: string;
  status: string;
  date: string;
  tip: number;
}

function mapAppointment(appt: any): SaleRow {
  const items: { name: string; _t: string }[] = [
    ...(Array.isArray(appt.services)          ? appt.services.map((i: any)          => ({ name: i.name, _t: "service" }))    : []),
    ...(Array.isArray(appt.package_items)      ? appt.package_items.map((i: any)     => ({ name: i.name, _t: "package" }))    : []),
    ...(Array.isArray(appt.product_items)      ? appt.product_items.map((i: any)     => ({ name: i.name, _t: "product" }))    : []),
    ...(Array.isArray(appt.membership_items)   ? appt.membership_items.map((i: any)  => ({ name: i.name, _t: "membership" })) : []),
  ];
  const itemDescription = items.map(i => i.name ?? "Item").join(", ") || "—";
  const itemTypes = [...new Set(items.map(i => i._t))].join(", ") || "—";

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
  const taxAmount = Array.isArray(appt.tax_breakdown) && appt.tax_breakdown.length
    ? appt.tax_breakdown.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0)
    : taxableAmount * ((Number(appt.gst_percent) || 0) / 100);
  const tip = Number(appt.tip_amount) || 0;
  const price = Math.round(taxableAmount + taxAmount + tip);
  const paid = Number(appt.paid_amount) || 0;

  return {
    invoiceNo: appt.invoice_number != null ? String(appt.invoice_number) : String(appt.id ?? "—"),
    name: appt.client_name ?? "Walk-in",
    contact: appt.client_phone ?? "—",
    itemDescription,
    itemTypes,
    actualPrice: Math.round(itemsTotal),
    price,
    paid,
    balance: Math.max(price - paid, 0),
    modes: appt.payment_method ?? "—",
    status: appt.payment_status ?? "unpaid",
    date: String(appt.scheduled_at ?? appt.created_at ?? "").slice(0, 10),
    tip,
  };
}

export default function SalesSummaryReport({ onBack }: { onBack: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const today     = new Date().toISOString().slice(0, 10);
  const weekAgo   = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [dateFrom,      setDateFrom]      = useState(weekAgo);
  const [dateTo,        setDateTo]        = useState(today);
  const [staffFilter,   setStaffFilter]   = useState("All");
  const [staffOptions,  setStaffOptions]  = useState<{ label: string; value: string }[]>([{ label: "All Staff", value: "All" }]);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [search,        setSearch]        = useState("");
  const [allRows,       setAllRows]       = useState<SaleRow[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [pageSize,      setPageSize]      = useState(25);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    dispatch(fetchStaffThunk()).unwrap().then((list: any[]) => {
      const opts = list.map((s: any) => ({
        label: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "",
        value: String(s.id ?? ""),
      })).filter((o: any) => o.label && o.value);
      setStaffOptions([{ label: "All Staff", value: "All" }, ...opts]);
    }).catch(() => {});
  }, [dispatch]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const params: Record<string, string> = { start_date: dateFrom, end_date: dateTo, limit: "200" };
      if (staffFilter !== "All") params.staff_id = staffFilter;
      const res = await api.get(BOOKING.BASE, { params, signal: ctrl.signal });
      const raw = res.data?.data;
      const list: any[] =
        Array.isArray(raw?.items) ? raw.items :
        Array.isArray(raw?.data)  ? raw.data  :
        Array.isArray(raw)        ? raw        : [];
      setAllRows(list.map(mapAppointment));
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setAllRows([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [dateFrom, dateTo, staffFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const close = () => setShowStaffDrop(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const rows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.toLowerCase();
    return allRows.filter(r =>
      r.invoiceNo.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.contact.includes(q)
    );
  }, [allRows, search]);

  useEffect(() => { setCurrentPage(1); }, [rows]);

  const stats = useMemo(() => {
    const totalBill = rows.length;
    const totalSale = rows.reduce((s, r) => s + r.price, 0);
    const received  = rows.reduce((s, r) => s + r.paid, 0);
    const pending   = rows.reduce((s, r) => s + r.balance, 0);
    const returnSales = rows.filter(r => r.status === "refunded").reduce((s, r) => s + r.price, 0);
    const totalTip  = rows.reduce((s, r) => s + r.tip, 0);
    return {
      totalBill,
      billAverage: totalBill > 0 ? totalSale / totalBill : 0,
      totalSale, received, pending, returnSales, totalTip,
    };
  }, [rows]);

  const HEADERS = ["Invoice No", "Name", "Contact", "Item Description", "Item Types", "Actual Price", "Price", "Paid", "Balance", "Modes", "Status", "Date"];
  const exportRows = () => rows.map(r => [r.invoiceNo, r.name, r.contact, r.itemDescription, r.itemTypes, r.actualPrice, r.price, r.paid, r.balance, r.modes, r.status, r.date]);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const money = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  return (
    <div className="rp-detail-view">
      <div className="rp-detail-header">
        <div className="rp-detail-back-row">
          <Button variant="ghost" className="rp-detail-back" onClick={onBack}>
            <ChevronLeft size={15} /> {REPORT_NAME}
          </Button>
          <div className="rp-detail-view-icons">
            <ReportExportButton title={REPORT_NAME} headers={HEADERS} rows={exportRows} filename={`sales-summary-${dateFrom}-${dateTo}`} variant="button" csv print />
          </div>
        </div>
      </div>

      <div className="rp-detail-filters">
        <div className="rp-detail-filter-group">
          <label className="rp-detail-filter-label">Staff</label>
          <button className="rp-detail-select" onClick={() => setShowStaffDrop(v => !v)}>
            {(staffOptions.find(o => o.value === staffFilter)?.label ?? "All Staff").slice(0, 16)}
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
          <label className="rp-detail-filter-label">Date</label>
          <div className="rp-detail-date-range">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rp-detail-date-input" />
            <span className="rp-detail-date-sep">-</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="rp-detail-date-input" />
          </div>
        </div>
        <div className="rp-detail-filter-actions">
          <Button variant="dark" className="rp-ss-run-btn" onClick={fetchData} loading={loading}>
            Run Report
          </Button>
        </div>
      </div>

      <div className="rp-sra-summary-row rp-sales-stat-row">
        {[
          { label: "Total Bill",        value: stats.totalBill.toString() },
          { label: "Bill Average",      value: money(stats.billAverage) },
          { label: "Total Sale",        value: money(stats.totalSale) },
          { label: "Received Amount",   value: money(stats.received) },
          { label: "Pending Amount",    value: money(stats.pending) },
          { label: "Return Sales",      value: money(stats.returnSales) },
          { label: "Total Tip",         value: money(stats.totalTip) },
        ].map(c => (
          <div key={c.label} className="rp-sra-summary-card">
            <div className="rp-sra-summary-val">{c.value}</div>
            <div className="rp-sra-summary-label">{c.label}</div>
          </div>
        ))}
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
          <input
            type="text"
            className="rp-detail-search-input"
            placeholder="Invoice, name or phone"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rp-detail-table-wrap">
        <table className="rp-detail-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Item Description</th>
              <th>Item Types</th>
              <th>Actual Price</th>
              <th>Price</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Modes</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="rp-detail-loading-cell"><PageLoader /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={12} className="rp-detail-empty-cell">No sales found</td></tr>
            ) : paged.map((r, i) => (
              <tr key={i}>
                <td><span className="rp-detail-link">{r.invoiceNo}</span></td>
                <td className="fw-semibold">{r.name}</td>
                <td>{r.contact}</td>
                <td className="rp-ss-desc" title={r.itemDescription}>{r.itemDescription}</td>
                <td>{r.itemTypes}</td>
                <td>{money(r.actualPrice)}</td>
                <td className="fw-semibold">{money(r.price)}</td>
                <td>{money(r.paid)}</td>
                <td>{money(r.balance)}</td>
                <td className="rp-ss-mode">{r.modes}</td>
                <td><span className={`rp-status-badge rp-status-${r.status}`}>{r.status}</span></td>
                <td>{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage} pageSize={pageSize} totalItems={rows.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={size => { setPageSize(size); setCurrentPage(1); }}
      />
    </div>
  );
}
