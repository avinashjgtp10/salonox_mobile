import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import type { ViewMode, IntervalOption } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { useAuthContext } from "../../context/AuthContext";
import { formatDateLabel, formatTime12 } from "../../utils/timeUtils";
import { useBookings } from "../../hooks/useBookings";
import { STAFF_LIST } from "../../utils/schedulerMockData";
import MiniCalendar from "../shared/MiniCalendar.tsx";

interface TopBarProps {
  onNewAppointment: () => void;
  onBlockTime: () => void;
  onSettings: () => void;
}

const VIEW_OPTIONS: ViewMode[] = ["Day", "Week", "Month", "List Week"];
const INTERVAL_OPTIONS: IntervalOption[] = ["15 Mins", "30 Mins", "60 Mins"];
type DownloadRange = "Week" | "15 Days" | "Month";

const TopBar: React.FC<TopBarProps> = ({ onNewAppointment, onBlockTime }) => {
  const { viewMode, setViewMode, currentDate, setCurrentDate, navigate, interval, setInterval } = useSchedulerContext();
  const { verifyPin } = useAuthContext();
  const { bookings } = useBookings();

  const [showViewDrop,   setShowViewDrop]   = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPinModal,   setShowPinModal]   = useState(false);
  const [pin,            setPin]            = useState("");
  const [pinError,       setPinError]       = useState("");
  const [pendingRange]                      = useState<DownloadRange | null>(null);
  const [pinShake,       setPinShake]       = useState(false);

  // ── Portal position state ─────────────────────────────────────────────────
  const [viewDropPos,   setViewDropPos]   = useState({ top: 0, left: 0 });
  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });

  const viewDropBtnRef  = useRef<HTMLButtonElement>(null);
  const dateBtnRef      = useRef<HTMLButtonElement>(null);
  const viewDropRef     = useRef<HTMLDivElement>(null);
  const datePickerRef   = useRef<HTMLDivElement>(null);
  const pinInputRef     = useRef<HTMLInputElement>(null);

  const today   = new Date().toISOString().slice(0, 10);
  const isToday = currentDate === today;

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      // View drop
      if (
        viewDropRef.current && !viewDropRef.current.contains(target) &&
        viewDropBtnRef.current && !viewDropBtnRef.current.contains(target)
      ) setShowViewDrop(false);
      // Date picker
      if (
        datePickerRef.current && !datePickerRef.current.contains(target) &&
        dateBtnRef.current && !dateBtnRef.current.contains(target)
      ) setShowDatePicker(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (showPinModal) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
      setPin(""); setPinError("");
    }
  }, [showPinModal]);

  // ── Recalculate portal positions on scroll/resize ─────────────────────────
  useEffect(() => {
    function reposition() {
      if (showViewDrop && viewDropBtnRef.current) {
        const r = viewDropBtnRef.current.getBoundingClientRect();
        setViewDropPos({ top: r.bottom + 4, left: r.left });
      }
      if (showDatePicker && dateBtnRef.current) {
        const r = dateBtnRef.current.getBoundingClientRect();
        setDatePickerPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
      }
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [showViewDrop, showDatePicker]);

  function handlePinSubmit() {
    if (verifyPin(pin)) {
      setShowPinModal(false); setPin(""); setPinError("");
      if (pendingRange) executeDownload(pendingRange);
    } else {
      setPinError("Incorrect PIN. Try again.");
      setPinShake(true); setPin("");
      setTimeout(() => setPinShake(false), 500);
    }
  }

  function getDatesInRange(range: DownloadRange): string[] {
    const start = new Date(currentDate);
    const days = range === "Week" ? 7 : range === "15 Days" ? 15 : 30;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  function executeDownload(range: DownloadRange) {
    const dates = getDatesInRange(range);
    const startLabel = new Date(dates[0]).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const endLabel   = new Date(dates[dates.length - 1]).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const rangeBookings = bookings.filter(b => dates.includes(b.date));
    const grouped: Record<string, typeof bookings> = {};
    dates.forEach(d => { grouped[d] = []; });
    rangeBookings.forEach(b => { if (grouped[b.date]) grouped[b.date].push(b); });
    const totalRevenue = rangeBookings.reduce((a, b) => a + (b.grandTotal || 0), 0);
    const totalPaid    = rangeBookings.reduce((a, b) => a + (b.payingNow  || 0), 0);
    const totalDue     = rangeBookings.reduce((a, b) => a + (b.dueAmount  || 0), 0);
    const generatedAt  = new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

    const rows = dates.map(date => {
      const dayBk   = grouped[date];
      const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
      if (dayBk.length === 0)
        return `<tr style="background:#fafafa"><td colspan="8" style="color:#9ca3af;font-style:italic;padding:10px 12px">${dayLabel} — No appointments</td></tr>`;
      return dayBk.map((b, i) => {
        const staffName   = STAFF_LIST.find(s => s.id === b.staffId)?.name || b.staffId || "—";
        const statusColor = b.status === "Confirmed" ? "#22c55e" : b.status === "Pending" ? "#f59e0b" : "#ef4444";
        return `<tr style="border-bottom:1px solid #f0f0f0">
          ${i === 0 ? `<td rowspan="${dayBk.length}" style="font-weight:700;vertical-align:top;padding:10px 12px;border-right:2px solid #e5e7eb;white-space:nowrap">${dayLabel}</td>` : ""}
          <td style="padding:8px 12px">${formatTime12(b.startTime)} – ${formatTime12(b.endTime)}</td>
          <td style="padding:8px 12px;font-weight:600">${b.clientName}</td>
          <td style="padding:8px 12px;color:#6b7280">${b.clientPhone || "—"}</td>
          <td style="padding:8px 12px">${b.services.map(s => s.service).join(", ")}</td>
          <td style="padding:8px 12px">${staffName}</td>
          <td style="padding:8px 12px;text-align:center"><span style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${b.status}</span></td>
          <td style="padding:8px 12px;text-align:right;font-weight:600">&#8377;${(b.grandTotal || 0).toFixed(2)}</td>
        </tr>`;
      }).join("");
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Appointment Report — ${range}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;padding:32px;color:#111}table{width:100%;border-collapse:collapse;font-size:13px}thead tr{background:#1f2937;color:#fff}thead th{padding:10px 12px;text-align:left}@media print{body{padding:16px}}</style></head>
    <body>
    <div style="display:flex;justify-content:space-between;margin-bottom:24px"><div><div style="font-size:22px;font-weight:800">Salon Scheduler</div><div style="font-size:13px;color:#6b7280">Appointment Report · ${startLabel} to ${endLabel}</div></div></div>
    <div style="display:flex;gap:16px;margin-bottom:24px">
      <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px"><div style="font-size:20px;font-weight:800">${rangeBookings.length}</div><div style="font-size:12px;color:#6b7280">Total Appointments</div></div>
      <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px"><div style="font-size:20px;font-weight:800">&#8377;${totalRevenue.toFixed(2)}</div><div style="font-size:12px;color:#6b7280">Total Revenue</div></div>
      <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px"><div style="font-size:20px;font-weight:800;color:#22c55e">&#8377;${totalPaid.toFixed(2)}</div><div style="font-size:12px;color:#6b7280">Total Paid</div></div>
      <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px"><div style="font-size:20px;font-weight:800;color:#ef4444">&#8377;${totalDue.toFixed(2)}</div><div style="font-size:12px;color:#6b7280">Total Due</div></div>
    </div>
    <table><thead><tr><th>Date</th><th>Time</th><th>Client</th><th>Phone</th><th>Services</th><th>Staff</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div style="margin-top:24px;font-size:12px;color:#9ca3af;display:flex;justify-content:space-between"><span>Generated: ${generatedAt}</span><span>Admin Access Only</span></div>
    </body></html>`;

    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) { alert("Please allow popups."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  function getShortDateLabel() {
    if (viewMode === "Day") {
      return new Date(currentDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      });
    }
    return formatDateLabel(currentDate, viewMode);
  }

  // ── Open helpers — measure button position then show portal ───────────────
  function openViewDrop() {
    if (viewDropBtnRef.current) {
      const r = viewDropBtnRef.current.getBoundingClientRect();
      setViewDropPos({ top: r.bottom + 4, left: r.left });
    }
    setShowViewDrop(v => !v);
  }

  function openDatePicker() {
    if (dateBtnRef.current) {
      const r = dateBtnRef.current.getBoundingClientRect();
      setDatePickerPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
    }
    setShowDatePicker(v => !v);
  }

  return (
    <>
      {/* ── TopBar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 10px", background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        height: 48, flexShrink: 0,
        // ✅ NO position/zIndex here — portals escape stacking context entirely
      }}>

        {/* View dropdown trigger */}
        <button
          ref={viewDropBtnRef}
          onMouseDown={e => { e.stopPropagation(); openViewDrop(); }}
          style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 9px", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {viewMode} <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
        </button>

        {/* Prev */}
        <button onClick={() => navigate(-1)} style={{ flexShrink: 0, background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 8px", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>‹</button>

        {/* Date picker trigger */}
        <button
          ref={dateBtnRef}
          onMouseDown={e => { e.stopPropagation(); openDatePicker(); }}
          style={{ fontSize: 13, fontWeight: 600, color: "#111827", textAlign: "center", background: showDatePicker ? "#f3f4f6" : "none", border: "1px solid " + (showDatePicker ? "#d1d5db" : "transparent"), borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {getShortDateLabel()} <span style={{ fontSize: 9, opacity: 0.5 }}>▼</span>
        </button>

        {/* Next */}
        <button onClick={() => navigate(1)} style={{ flexShrink: 0, background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 8px", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>›</button>

        {/* Today */}
        <button
          onClick={() => setCurrentDate(today)}
          style={{
            flexShrink: 0,
            border:     isToday ? "1px solid #e5e7eb" : "1px solid #3b82f6",
            borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            background: isToday ? "#f9fafb" : "#eff6ff",
            color:      isToday ? "#9ca3af" : "#3b82f6",
            transition: "all 0.15s",
          }}
        >Today</button>

        {/* Spacer */}
        <div style={{ flex: 1, minWidth: 0 }} />

        {/* Interval pills */}
        <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 6, padding: 3, flexShrink: 0 }}>
          {INTERVAL_OPTIONS.map(opt => (
            <button key={opt} onClick={() => setInterval(opt)}
              style={{ padding: "4px 8px", fontSize: 11, fontWeight: 600, border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: interval === opt ? "#1f2937" : "transparent", color: interval === opt ? "#fff" : "#6b7280", whiteSpace: "nowrap" }}>
              {opt.replace(" Mins", "m")}
            </button>
          ))}
        </div>

        {/* Add + */}
        <button onClick={onNewAppointment} style={{ flexShrink: 0, background: "#1f2937", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
          Add +
        </button>

        {/* Block Time */}
        <button onClick={onBlockTime} style={{ flexShrink: 0, border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", background: "#fff", fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap" }}>
          Block Time
        </button>
      </div>

      {/* ── View dropdown PORTAL — renders at document.body, escapes all stacking ── */}
      {showViewDrop && ReactDOM.createPortal(
        <div
          ref={viewDropRef}
          style={{
            position: "fixed",
            top: viewDropPos.top,
            left: viewDropPos.left,
            zIndex: 99999,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,.12)",
            minWidth: 140,
            overflow: "hidden",
          }}
        >
          {VIEW_OPTIONS.map(v => (
            <button key={v}
              onClick={() => { setViewMode(v); setShowViewDrop(false); }}
              style={{ display: "flex", alignItems: "center", padding: "9px 14px", width: "100%", background: viewMode === v ? "#f3f4f6" : "#fff", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", fontWeight: viewMode === v ? 600 : 400, fontFamily: "inherit" }}
            >
              {v}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* ── Date picker PORTAL — renders at document.body, escapes all stacking ── */}
      {showDatePicker && ReactDOM.createPortal(
        <div
          ref={datePickerRef}
          style={{
            position: "fixed",
            top: datePickerPos.top,
            left: datePickerPos.left,
            transform: "translateX(-50%)",
            zIndex: 99999,
          }}
        >
          <MiniCalendar
            value={currentDate}
            onChange={d => { setCurrentDate(d); setShowDatePicker(false); }}
            onClose={() => setShowDatePicker(false)}
          />
        </div>,
        document.body
      )}

      {/* ── PIN Modal ── */}
      {showPinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { setShowPinModal(false); setPin(""); setPinError(""); }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 32, width: "min(360px,90vw)", boxShadow: "0 8px 40px rgba(0,0,0,.2)", animation: pinShake ? "shake .4s" : "none" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px" }}>🔒</div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Admin Access Required</h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>Enter admin PIN to download the report</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: pin.length > i ? "#1f2937" : "#e5e7eb", transition: "background .15s" }} />
              ))}
            </div>
            <input ref={pinInputRef} type="password" maxLength={4} value={pin}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(val); setPinError("");
                if (val.length === 4) {
                  setTimeout(() => {
                    if (verifyPin(val)) {
                      setShowPinModal(false); setPin(""); setPinError("");
                      if (pendingRange) executeDownload(pendingRange);
                    } else {
                      setPinError("Incorrect PIN. Try again.");
                      setPinShake(true); setPin("");
                      setTimeout(() => setPinShake(false), 500);
                    }
                  }, 200);
                }
              }}
              onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
              style={{ width: "100%", textAlign: "center", fontSize: 24, letterSpacing: 8, padding: "10px", border: "2px solid " + (pinError ? "#ef4444" : "#e5e7eb"), borderRadius: 8, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              placeholder="••••"
            />
            {pinError && <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 600, textAlign: "center", marginTop: 8 }}>❌ {pinError}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowPinModal(false); setPin(""); setPinError(""); }}
                style={{ flex: 1, padding: "10px 0", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handlePinSubmit}
                style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 8, background: "#1f2937", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Confirm</button>
            </div>
          </div>
          <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
        </div>
      )}
    </>
  );
};

export default TopBar;