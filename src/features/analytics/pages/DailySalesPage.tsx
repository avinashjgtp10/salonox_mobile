import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addDays, subDays, parseISO } from "date-fns";
import { useDispatch, useSelector } from "react-redux";
import "../styles/DailySalesPage.scss";
import {
  FileEarmarkPdf,
  FileEarmarkText,
  FileEarmarkExcel,
} from "react-bootstrap-icons";
import TransactionSummary from "../components/TransactionSummary";
import CashMovementSummary from "../components/CashMovementSummary";
import QuickSaleDrawer from "../components/QuickSaleDrawer";
import MiniCalendar from "../../bookings/components/shared/MiniCalendar";
import { exportSalesThunk, fetchSalesThunk } from "../../../middleware/sale/sale.thunk";
import type { AppDispatch, RootState } from "../../../store/store";
import type { Sale } from "../../../types/sale.types";

// UI Components
import Button from "../../../components/ui/Button";

export default function DailySalesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();

  // ── Redux ─────────────────────────────────────────────────────────────────
  const isExporting = useSelector(
    (state: RootState) => (state.sale as any).loading?.export as boolean ?? false,
  );
  const allSales = useSelector(
    (state: RootState) => (state.sale as any).items as Sale[],
  );
  const isLoading = useSelector(
    (state: RootState) => (state.sale as any).loading?.fetchAll as boolean ?? false,
  );

  // ── Date logic ────────────────────────────────────────────────────────────
  const urlDate = searchParams.get("report-date");
  const initialDate = urlDate ? parseISO(urlDate) : new Date();
  const [selectedDate, setSelectedDate] = useState(initialDate);

  useEffect(() => {
    if (urlDate) setSelectedDate(parseISO(urlDate));
  }, [urlDate]);

  const updateDate = (newDate: Date) => {
    const formatted = format(newDate, "yyyy-MM-dd");
    navigate(`/dashboard/sales/daily?report-date=${formatted}`);
  };

  const handlePrev  = () => { const d = subDays(selectedDate, 1); setSelectedDate(d); updateDate(d); };
  const handleNext  = () => { const d = addDays(selectedDate, 1); setSelectedDate(d); updateDate(d); };
  const handleToday = () => { const d = new Date(); setSelectedDate(d); updateDate(d); };

  // ── Fetch sales for the selected date ────────────────────────────────────
  useEffect(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    dispatch(fetchSalesThunk({ startDate: dateStr, endDate: dateStr }));
  }, [dispatch, selectedDate]);

  // ── Filter sales to selected date (client-side guard) ─────────────────────
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const daySales = allSales.filter((s) => {
    try { return s.created_at.startsWith(dateStr); } catch { return false; }
  });

  // ── Drawer ────────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Mini calendar ─────────────────────────────────────────────────────────
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calPos, setCalPos] = useState({ top: 0, left: 0 });
  const datePillRef = useRef<HTMLButtonElement>(null);
  // tracks whether calendar was open at the moment the button is pressed,
  // so the onClick handler knows not to reopen it.
  const wasOpenOnMouseDownRef = useRef(false);

  function handleDateBtnMouseDown() {
    wasOpenOnMouseDownRef.current = showDatePicker;
    if (showDatePicker) setShowDatePicker(false);
  }

  function handleDateBtnClick() {
    if (wasOpenOnMouseDownRef.current) {
      wasOpenOnMouseDownRef.current = false;
      return;
    }
    if (datePillRef.current) {
      const r = datePillRef.current.getBoundingClientRect();
      setCalPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
    }
    setShowDatePicker(true);
  }

  // ── Export dropdown ───────────────────────────────────────────────────────
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleExport = (exportFormat: "pdf" | "csv" | "excel") => {
    setShowExport(false);
    if (exportFormat === "pdf") {
      exportPdfFrontend();
      return;
    }
    const date = format(selectedDate, "yyyy-MM-dd");
    dispatch(exportSalesThunk({ format: exportFormat, date }));
  };

  const exportPdfFrontend = () => {
    const dateLabel = format(selectedDate, "dd MMMM yyyy");
    const shortId   = (id: string | number) => String(id).slice(0, 8).toUpperCase();
    const money     = (v: string | number) => `₹${parseFloat(String(v) || "0").toFixed(2)}`;
    const capFirst  = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

    const rows = daySales.filter(s => s.status !== "draft").map(s => {
      const clientLabel = s.client_name
        ? s.client_name
        : s.client_id
          ? shortId(s.client_id)
          : "Walk-in";
      return `
        <tr>
          <td>${shortId(s.id)}</td>
          <td><span class="badge badge-${s.status}">${capFirst(s.status)}</span></td>
          <td>${clientLabel}</td>
          <td>${money(s.subtotal)}</td>
          <td>${money(s.discount_amount)}</td>
          <td>${money(s.tip_amount)}</td>
          <td>${money(s.tax_amount)}</td>
          <td class="total">${money(s.total_amount)}</td>
          <td>${capFirst(s.payment_method ?? "")}</td>
          <td>${format(new Date(s.created_at), "dd/MM/yyyy HH:mm")}</td>
        </tr>`;
    }).join("");

    const grandTotal = daySales
      .filter(s => s.status === "completed")
      .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Daily Sales Report – ${dateLabel}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 24px; }
    h1 { font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 4px; }
    .sub { text-align:center; color:#666; font-size:13px; margin-bottom:20px; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    th { background:#1a1a1a; color:#fff; padding:8px 10px; font-size:11px; text-align:left; white-space:nowrap; }
    td { padding:7px 10px; border-bottom:1px solid #e5e7eb; font-size:12px; vertical-align:middle; }
    tr:nth-child(even) td { background:#f9fafb; }
    td.total { font-weight:700; color:#1a1a1a; }
    .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:600; }
    .badge-completed { background:#ecfdf5; color:#059669; }
    .badge-refunded  { background:#fef2f2; color:#dc2626; }
    .badge-cancelled { background:#f3f4f6; color:#374151; }
    .summary { background:#f8f9fb; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; display:flex; gap:32px; margin-top:4px; }
    .summary-item label { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; display:block; margin-bottom:3px; }
    .summary-item span  { font-size:15px; font-weight:700; }
    @media print { body { padding:12px; } }
  </style>
</head>
<body>
  <h1>Daily Sales Report</h1>
  <p class="sub">Date: ${dateLabel}</p>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Status</th>
        <th>Client</th>
        <th>Subtotal</th>
        <th>Discount</th>
        <th>Tip</th>
        <th>Tax</th>
        <th>Total</th>
        <th>Payment</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="10" style="text-align:center;padding:20px;color:#9ca3af;">No completed sales for this date</td></tr>'}</tbody>
  </table>
  <div class="summary">
    <div class="summary-item">
      <label>Total Revenue</label>
      <span>₹${grandTotal.toFixed(2)}</span>
    </div>
    <div class="summary-item">
      <label>Transactions</label>
      <span>${daySales.filter(s => s.status !== "draft").length}</span>
    </div>
    <div class="summary-item">
      <label>Completed</label>
      <span>${daySales.filter(s => s.status === "completed").length}</span>
    </div>
    <div class="summary-item">
      <label>Refunded</label>
      <span>${daySales.filter(s => s.status === "refunded").length}</span>
    </div>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setShowExport(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="sales-layout">
      <div className="sales-container">
        {/* ── HEADER ── */}
        <div className="sales-header d-flex align-items-center justify-content-between mb-4">
          <div>
            <h2 className="h3 fw-bold mb-1">Daily sales</h2>
            <p className="text-muted small mb-0">
              View, filter and export the transactions and cash movement for the day.
            </p>
          </div>

          <div
            className="header-actions d-flex align-items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="export-wrapper position-relative" ref={exportRef}>
              <Button
                variant="outline-dark"
                onClick={() => setShowExport(!showExport)}
                disabled={isExporting}
                iconRight={
                  <span className={`ms-1 transition-all ${showExport ? "rotate-180" : ""}`}>▾</span>
                }
              >
                {isExporting ? "Exporting…" : "Export"}
              </Button>

              {showExport && (
                <div
                  className="export-dropdown shadow-lg border position-absolute end-0 mt-2 bg-white z-2 rounded-3 overflow-hidden"
                  style={{ minWidth: "150px" }}
                >
                  <Button variant="ghost" fullWidth className="text-start p-2 rounded-0 border-bottom" onClick={() => handleExport("pdf")}>
                    <FileEarmarkPdf size={18} className="text-danger me-2" /> PDF
                  </Button>
                  <Button variant="ghost" fullWidth className="text-start p-2 rounded-0 border-bottom" onClick={() => handleExport("csv")}>
                    <FileEarmarkText size={18} className="text-primary me-2" /> CSV
                  </Button>
                  <Button variant="ghost" fullWidth className="text-start p-2 rounded-0" onClick={() => handleExport("excel")}>
                    <FileEarmarkExcel size={18} className="text-success me-2" /> Excel
                  </Button>
                </div>
              )}
            </div>

            <Button variant="dark" pill className="px-4" onClick={() => navigate("/dashboard/sales/quick")}>
              Add new
            </Button>
          </div>
        </div>

        {/* ── DATE BAR ── */}
        <div className="date-bar mb-4">
          <div className="date-pill-container d-inline-flex align-items-center bg-light rounded-pill p-1 gap-1">
            <Button variant="ghost" className="rounded-circle p-1" onClick={handlePrev} iconLeft={<span>&#8249;</span>} />
            <div className="vr mx-1" style={{ height: "20px", opacity: 0.1 }} />
            <Button variant="ghost" className="px-3 small fw-bold" onClick={handleToday}>Today</Button>
            <div className="vr mx-1" style={{ height: "20px", opacity: 0.1 }} />
            <button
              ref={datePillRef}
              className={`date-text-btn px-3 small fw-bold${showDatePicker ? " date-text-btn--active" : ""}`}
              onMouseDown={handleDateBtnMouseDown}
              onClick={handleDateBtnClick}
            >
              {format(selectedDate, "EEEE d MMM, yyyy")}
              <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 4 }}>▼</span>
            </button>
            <div className="vr mx-1" style={{ height: "20px", opacity: 0.1 }} />
            <Button variant="ghost" className="rounded-circle p-1" onClick={handleNext} iconLeft={<span>&#8250;</span>} />
          </div>
        </div>

        {/* ── MINI CALENDAR PORTAL ── */}
        {showDatePicker && ReactDOM.createPortal(
          <div
            style={{
              position: "fixed",
              top: calPos.top,
              left: calPos.left,
              transform: "translateX(-50%)",
              zIndex: 99999,
            }}
          >
            <MiniCalendar
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(d) => {
                const newDate = parseISO(d);
                setSelectedDate(newDate);
                updateDate(newDate);
                setShowDatePicker(false);
              }}
              onClose={() => setShowDatePicker(false)}
            />
          </div>,
          document.body,
        )}

        {/* ── SUMMARY STATS ROW ── */}
        <div className="row g-3 mb-4">
          {[
            {
              label: "Total revenue",
              value: `₹${daySales.filter(s => s.status === "completed").reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0).toFixed(2)}`,
              color: "#1a7a40",
            },
            {
              label: "Transactions",
              value: daySales.filter(s => s.status !== "draft").length,
              color: "#11141a",
            },
            {
              label: "Completed",
              value: daySales.filter(s => s.status === "completed").length,
              color: "#1a7a40",
            },
            {
              label: "Refunded",
              value: daySales.filter(s => s.status === "refunded").length,
              color: "#d93025",
            },
          ].map((card) => (
            <div key={card.label} className="col-md-3">
              <div className="daily-stat-card">
                <div className="daily-stat-label">{card.label}</div>
                <div className="daily-stat-value" style={{ color: card.color }}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── GRID ── */}
        <div className="sales-grid">
          <TransactionSummary sales={daySales} isLoading={isLoading} selectedDate={selectedDate} />
          <CashMovementSummary sales={daySales} isLoading={isLoading} selectedDate={selectedDate} />
        </div>
      </div>

      <QuickSaleDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
