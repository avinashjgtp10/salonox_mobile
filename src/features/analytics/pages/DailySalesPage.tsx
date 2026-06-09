import { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addDays, subDays, parseISO } from "date-fns";
import { useDispatch, useSelector } from "react-redux";
import "../styles/DailySalesPage.scss";
import { exportDailySalesPDF } from "../utils/dailySalesExport";
import {
  FileEarmarkPdf,
  FileEarmarkText,
  FileEarmarkExcel,
  ChevronLeft,
  ChevronRight,
  CalendarDate,
  Plus,
  GraphUpArrow,
  Receipt,
  CheckCircleFill,
  ArrowCounterclockwise,
  ChevronDown,
} from "react-bootstrap-icons";
import TransactionSummary from "../components/TransactionSummary";
import CashMovementSummary from "../components/CashMovementSummary";
import QuickSaleDrawer from "../components/QuickSaleDrawer";
import MiniCalendar from "../../bookings/components/shared/MiniCalendar";
import { exportSalesThunk, fetchSalesThunk } from "../../../middleware/sale/sale.thunk";
import type { AppDispatch, RootState } from "../../../store/store";
import type { Sale } from "../../../types/sale.types";
import type { ClientItem } from "../../../types/client.types";
import { selectClientItems } from "../../../store/selectors/slices.selectors";
import { formatCurrency } from "../../../utils/format";

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
  const clientItems = useSelector(selectClientItems);

  const clientMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    clientItems.forEach((c: ClientItem) => {
      const name = (c.fullName || c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()) || "";
      if (c.id && name) m[String(c.id)] = name;
    });
    return m;
  }, [clientItems]);

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
      exportDailySalesPDF(daySales, selectedDate, clientMap);
    } else {
      const date = format(selectedDate, "yyyy-MM-dd");
      dispatch(exportSalesThunk({ format: exportFormat, date }));
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const revenue      = daySales.filter(s => s.status === "completed")
    .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0);
  const transactions = daySales.filter(s => s.status !== "draft").length;
  const completed    = daySales.filter(s => s.status === "completed").length;
  const refunded     = daySales.filter(s => s.status === "refunded").length;

  const stats = [
    {
      key: "revenue",
      label: "Total Revenue",
      value: formatCurrency(revenue),
      hint: "From completed sales",
      icon: <GraphUpArrow size={18} />,
      iconBg: "#f0fdf4",
      iconColor: "#059669",
      mod: "green",
      valueColor: "#059669",
    },
    {
      key: "transactions",
      label: "Transactions",
      value: transactions,
      hint: "Excl. drafts",
      icon: <Receipt size={18} />,
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
      mod: "blue",
      valueColor: "#0f172a",
    },
    {
      key: "completed",
      label: "Completed",
      value: completed,
      hint: "Successfully paid",
      icon: <CheckCircleFill size={17} />,
      iconBg: "#ecfeff",
      iconColor: "#0891b2",
      mod: "cyan",
      valueColor: "#0891b2",
    },
    {
      key: "refunded",
      label: "Refunded",
      value: refunded,
      hint: "Reversed today",
      icon: <ArrowCounterclockwise size={18} />,
      iconBg: "#fef2f2",
      iconColor: "#dc2626",
      mod: "red",
      valueColor: refunded > 0 ? "#dc2626" : "#0f172a",
    },
  ];

  return (
    <div className="dsp-page">
      <div className="dsp-container">

        {/* ── HEADER ── */}
        <div className="dsp-header">
          <div className="dsp-header__left">
            <h2 className="dsp-header__title">Daily sales</h2>
            <p className="dsp-header__sub">
              View, filter and export the transactions and cash movement for the day.
            </p>
          </div>

          <div className="dsp-header__actions" onClick={(e) => e.stopPropagation()}>
            {/* Export */}
            <div className="dsp-export-wrap" ref={exportRef}>
              <button
                className={`dsp-btn dsp-btn--outline${showExport ? " open" : ""}`}
                onClick={() => setShowExport((v) => !v)}
                disabled={isExporting}
              >
                {isExporting ? "Exporting…" : "Export"}
                <ChevronDown
                  size={12}
                  style={{ transform: showExport ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                />
              </button>

              {showExport && (
                <div className="dsp-export-menu">
                  <button className="dsp-export-menu__item" onClick={() => handleExport("pdf")}>
                    <FileEarmarkPdf size={17} color="#ef4444" /> PDF
                  </button>
                  <button className="dsp-export-menu__item" onClick={() => handleExport("csv")}>
                    <FileEarmarkText size={17} color="#3b82f6" /> CSV
                  </button>
                  <button className="dsp-export-menu__item" onClick={() => handleExport("excel")}>
                    <FileEarmarkExcel size={17} color="#22c55e" /> Excel
                  </button>
                </div>
              )}
            </div>

            {/* Add new */}
            <button
              className="dsp-btn dsp-btn--dark"
              onClick={() => navigate("/dashboard/sales/quick")}
            >
              <Plus size={15} /> Add new
            </button>
          </div>
        </div>

        {/* ── DATE NAVIGATION ── */}
        <div className="dsp-date-nav">
          <button className="dsp-date-nav__arrow" onClick={handlePrev} title="Previous day">
            <ChevronLeft size={14} />
          </button>

          <div className="dsp-date-nav__sep" />

          <button className="dsp-date-nav__today" onClick={handleToday}>Today</button>

          <div className="dsp-date-nav__sep" />

          <button
            ref={datePillRef}
            className={`dsp-date-nav__date-btn${showDatePicker ? " dsp-date-nav__date-btn--open" : ""}`}
            onMouseDown={handleDateBtnMouseDown}
            onClick={handleDateBtnClick}
          >
            <CalendarDate size={14} className="dsp-date-nav__date-btn-icon" />
            {format(selectedDate, "EEEE, d MMM yyyy")}
          </button>

          <div className="dsp-date-nav__sep" />

          <button className="dsp-date-nav__arrow" onClick={handleNext} title="Next day">
            <ChevronRight size={14} />
          </button>
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

        {/* ── STAT CARDS ── */}
        <div className="dsp-stats">
          {stats.map((s) => (
            <div key={s.key} className={`dsp-stat dsp-stat--${s.mod}`}>
              <div className="dsp-stat__accent" />
              <div className="dsp-stat__top">
                <div className="dsp-stat__label">{s.label}</div>
                <div className="dsp-stat__icon" style={{ background: s.iconBg, color: s.iconColor }}>
                  {s.icon}
                </div>
              </div>
              <div className="dsp-stat__value" style={{ color: s.valueColor }}>{s.value}</div>
              <div className="dsp-stat__hint">{s.hint}</div>
            </div>
          ))}
        </div>

        {/* ── TABLES GRID ── */}
        <div className="dsp-grid">
          <TransactionSummary sales={daySales} isLoading={isLoading} selectedDate={selectedDate} />
          <CashMovementSummary sales={daySales} isLoading={isLoading} selectedDate={selectedDate} />
        </div>
      </div>

      <QuickSaleDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
