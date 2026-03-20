import React, { useState, useRef, useEffect } from "react";
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
const VIEW_ICONS: Record<ViewMode, string> = {
  Day: "⬛", Week: "⬛", Month: "📅", "List Week": "☰",
};
const INTERVAL_OPTIONS: IntervalOption[] = ["15 Mins", "30 Mins", "60 Mins"];
type DownloadRange = "Week" | "15 Days" | "Month";

const TopBar: React.FC<TopBarProps> = ({ onNewAppointment, onBlockTime, onSettings }) => {
  const { viewMode, setViewMode, currentDate, setCurrentDate, navigate, interval, setInterval } = useSchedulerContext();
  const { verifyPin } = useAuthContext();
  const { bookings }  = useBookings();

  const [showViewDrop,     setShowViewDrop]     = useState(false);
  const [showDownloadDrop, setShowDownloadDrop] = useState(false);
  const [showDatePicker,   setShowDatePicker]   = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pin,          setPin]          = useState("");
  const [pinError,     setPinError]     = useState("");
  const [pendingRange, setPendingRange] = useState<DownloadRange | null>(null);
  const [pinShake,     setPinShake]     = useState(false);

  const viewDropRef     = useRef<HTMLDivElement>(null);
  const downloadDropRef = useRef<HTMLDivElement>(null);
  const datePickerRef   = useRef<HTMLDivElement>(null);
  const pinInputRef     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (viewDropRef.current && !viewDropRef.current.contains(e.target as Node))
        setShowViewDrop(false);
      if (downloadDropRef.current && !downloadDropRef.current.contains(e.target as Node))
        setShowDownloadDrop(false);
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node))
        setShowDatePicker(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (showPinModal) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
      setPin("");
      setPinError("");
    }
  }, [showPinModal]);

  function handleDownloadClick(range: DownloadRange) {
    setShowDownloadDrop(false);
    setPendingRange(range);
    setShowPinModal(true);
  }

  function handlePinSubmit() {
    if (verifyPin(pin)) {
      setShowPinModal(false);
      setPin("");
      setPinError("");
      if (pendingRange) executeDownload(pendingRange);
    } else {
      setPinError("Incorrect PIN. Try again.");
      setPinShake(true);
      setPin("");
      setTimeout(() => setPinShake(false), 500);
    }
  }

  function getDatesInRange(range: DownloadRange): string[] {
    const start = new Date(currentDate);
    const days  = range === "Week" ? 7 : range === "15 Days" ? 15 : 30;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  function executeDownload(range: DownloadRange) {
    const dates         = getDatesInRange(range);
    const startLabel    = new Date(dates[0]).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const endLabel      = new Date(dates[dates.length - 1]).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    const rangeBookings = bookings.filter(b => dates.includes(b.date));

    const grouped: Record<string, typeof bookings> = {};
    dates.forEach(d => { grouped[d] = []; });
    rangeBookings.forEach(b => { if (grouped[b.date]) grouped[b.date].push(b); });

    const totalRevenue = rangeBookings.reduce((a, b) => a + (b.grandTotal || 0), 0);
    const totalPaid    = rangeBookings.reduce((a, b) => a + (b.payingNow || 0), 0);
    const totalDue     = rangeBookings.reduce((a, b) => a + (b.dueAmount || 0), 0);
    const generatedAt  = new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

    const rows = dates.map(date => {
      const dayBk    = grouped[date];
      const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
      if (dayBk.length === 0) return `
        <tr style="background:#fafafa">
          <td colspan="8" style="color:#9ca3af;font-style:italic;padding:10px 12px">${dayLabel} — No appointments</td>
        </tr>`;
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
          <td style="padding:8px 12px;text-align:center">
            <span style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${b.status}</span>
          </td>
          <td style="padding:8px 12px;text-align:right;font-weight:600">&#8377;${(b.grandTotal || 0).toFixed(2)}</td>
        </tr>`;
      }).join("");
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Appointment Report — ${range}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',sans-serif;padding:32px;color:#111;position:relative}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
      .salon-name{font-size:22px;font-weight:800;color:#1f2937}
      .report-label{font-size:13px;color:#6b7280;margin-top:4px}
      .range-badge{background:#1f2937;color:#fff;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600}
      .summary{display:flex;gap:16px;margin-bottom:24px}
      .summary-card{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px}
      .summary-card .val{font-size:20px;font-weight:800;color:#1f2937;margin-bottom:4px}
      .summary-card .lbl{font-size:12px;color:#6b7280}
      table{width:100%;border-collapse:collapse;font-size:13px}
      thead tr{background:#1f2937;color:#fff}
      thead th{padding:10px 12px;text-align:left;font-weight:600}
      tbody tr:hover{background:#f9fafb}
      .footer{margin-top:24px;font-size:12px;color:#9ca3af;display:flex;justify-content:space-between}
      .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(0,0,0,0.04);pointer-events:none;white-space:nowrap;z-index:9999;letter-spacing:4px;user-select:none}
      .confidential{background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 16px;font-size:12px;color:#ef4444;font-weight:600;text-align:center;margin-bottom:20px;letter-spacing:.5px}
      @media print{body{padding:16px}@page{margin:1cm}}
    </style></head>
    <body>
    <div class="watermark">CONFIDENTIAL</div>
    <div class="confidential">🔒 CONFIDENTIAL — This report is for internal use only. Unauthorized sharing is strictly prohibited.</div>
    <div class="header">
      <div>
        <div class="salon-name">Salon Scheduler</div>
        <div class="report-label">Appointment Report &nbsp;·&nbsp; ${startLabel} to ${endLabel}</div>
      </div>
      <div class="range-badge">${range}</div>
    </div>
    <div class="summary">
      <div class="summary-card"><div class="val">${rangeBookings.length}</div><div class="lbl">Total Appointments</div></div>
      <div class="summary-card"><div class="val">&#8377;${totalRevenue.toFixed(2)}</div><div class="lbl">Total Revenue</div></div>
      <div class="summary-card"><div class="val" style="color:#22c55e">&#8377;${totalPaid.toFixed(2)}</div><div class="lbl">Total Paid</div></div>
      <div class="summary-card"><div class="val" style="color:#ef4444">&#8377;${totalDue.toFixed(2)}</div><div class="lbl">Total Due</div></div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Time</th><th>Client</th><th>Phone</th><th>Services</th><th>Staff</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">
      <span>Generated: ${generatedAt}</span>
      <span>🔒 Admin Access Only</span>
    </div>
    </body></html>`;

    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) { alert("Please allow popups."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  }

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 16px", background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        flexWrap: "wrap", zIndex: 20, minHeight: 56,
      }}>

        {/* View dropdown */}
        <div style={{ position: "relative" }} ref={viewDropRef}>
          <button onClick={() => setShowViewDrop(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 12px", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
            {viewMode} <span style={{ fontSize: 10 }}>▼</span>
          </button>
          {showViewDrop && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.1)", minWidth: 150, overflow: "hidden" }}>
              {VIEW_OPTIONS.map(v => (
                <button key={v} onClick={() => { setViewMode(v); setShowViewDrop(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", width: "100%", background: viewMode === v ? "#f3f4f6" : "#fff", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", fontWeight: viewMode === v ? 600 : 400, fontFamily: "inherit" }}>
                  {VIEW_ICONS[v]} {v}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 12px", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>‹</button>

        {/* Date picker */}
        <div style={{ position: "relative" }} ref={datePickerRef}>
          <button onClick={() => setShowDatePicker(v => !v)} style={{ fontSize: 14, fontWeight: 600, color: "#111827", minWidth: 200, textAlign: "center", background: showDatePicker ? "#f3f4f6" : "none", border: "1px solid " + (showDatePicker ? "#d1d5db" : "transparent"), borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}>
            {formatDateLabel(currentDate, viewMode)} <span style={{ fontSize: 10, marginLeft: 6, opacity: .5 }}>▼</span>
          </button>
          {showDatePicker && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", zIndex: 200 }}>
              <MiniCalendar value={currentDate} onChange={d => { setCurrentDate(d); setShowDatePicker(false); }} onClose={() => setShowDatePicker(false)} />
            </div>
          )}
        </div>

        <button onClick={() => navigate(1)} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 12px", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>›</button>

        <div style={{ flex: 1 }} />

        {/* Interval */}
        <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 8, padding: 4 }}>
          {INTERVAL_OPTIONS.map(opt => (
            <button key={opt} onClick={() => setInterval(opt)} style={{ padding: "5px 10px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", background: interval === opt ? "#1f2937" : "transparent", color: interval === opt ? "#fff" : "#6b7280" }}>
              {opt.replace(" Mins", "m")}
            </button>
          ))}
        </div>

        {/* Settings */}
        <button
          onClick={onSettings}
          title="Settings"
          style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 16 }}
        >⚙️</button>

        {/* Download dropdown */}
        <div style={{ position: "relative" }} ref={downloadDropRef}>
          <button onClick={() => setShowDownloadDrop(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 12px", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", color: "#374151" }}>
            🔒 Download <span style={{ fontSize: 10 }}>▼</span>
          </button>
          {showDownloadDrop && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.1)", minWidth: 180, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", fontSize: 11, color: "#9ca3af", fontWeight: 600, borderBottom: "1px solid #f0f0f0", letterSpacing: ".3px" }}>
                🔒 ADMIN ACCESS ONLY
              </div>
              {(["Week", "15 Days", "Month"] as DownloadRange[]).map(range => (
                <button key={range} onClick={() => handleDownloadClick(range)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", width: "100%", background: "#fff", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                >
                  {range === "Week" ? "📅 This Week (7 days)" : range === "15 Days" ? "📆 Next 15 Days" : "🗓 This Month (30 days)"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add */}
        <button onClick={onNewAppointment} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1f2937", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          Add +
        </button>

        {/* Block Time */}
        <button onClick={onBlockTime} style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", background: "#fff", fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap" }}>
          Block Time
        </button>

      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { setShowPinModal(false); setPin(""); setPinError(""); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: 32, width: "min(360px,90vw)", boxShadow: "0 8px 40px rgba(0,0,0,.2)", animation: pinShake ? "shake .4s" : "none" }}
          >
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

            <input
              ref={pinInputRef}
              type="password"
              maxLength={4}
              value={pin}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(val);
                setPinError("");
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

            {pinError && (
              <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 600, textAlign: "center", marginTop: 8 }}>❌ {pinError}</div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowPinModal(false); setPin(""); setPinError(""); }}
                style={{ flex: 1, padding: "10px 0", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={handlePinSubmit}
                style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 8, background: "#1f2937", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Confirm
              </button>
            </div>
          </div>

          <style>{`
            @keyframes shake {
              0%,100%{transform:translateX(0)}
              20%{transform:translateX(-8px)}
              40%{transform:translateX(8px)}
              60%{transform:translateX(-6px)}
              80%{transform:translateX(6px)}
            }
          `}</style>
        </div>
      )}
    </>
  );
};

export default TopBar;
