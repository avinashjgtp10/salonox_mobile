import { useState, useEffect, useRef } from "react";
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

  // ── Export dropdown ───────────────────────────────────────────────────────
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleExport = (exportFormat: "pdf" | "csv" | "excel") => {
    setShowExport(false);
    const date = format(selectedDate, "yyyy-MM-dd");
    dispatch(exportSalesThunk({ format: exportFormat, date }));
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

            <Button variant="dark" pill className="px-4" onClick={() => setDrawerOpen(true)}>
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
            <span className="date-text px-3 small fw-bold">
              {format(selectedDate, "EEEE d MMM, yyyy")}
            </span>
            <div className="vr mx-1" style={{ height: "20px", opacity: 0.1 }} />
            <Button variant="ghost" className="rounded-circle p-1" onClick={handleNext} iconLeft={<span>&#8250;</span>} />
          </div>
        </div>

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
