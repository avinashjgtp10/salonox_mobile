import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import type { ViewMode, IntervalOption } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatDateLabel } from "../../utils/timeUtils";
import MiniCalendar from "../shared/MiniCalendar.tsx";

interface TopBarProps {
  onNewAppointment: () => void;
  onBlockTime: () => void;
  onSettings: () => void;
}

const VIEW_OPTIONS: ViewMode[] = ["Day", "Week", "Month", "List Week"];
const INTERVAL_OPTIONS: IntervalOption[] = ["15 Mins", "30 Mins", "60 Mins"];

const TopBar: React.FC<TopBarProps> = ({ onNewAppointment, onBlockTime }) => {
  const { viewMode, setViewMode, currentDate, setCurrentDate, navigate, interval, setInterval } = useSchedulerContext();

  const [showViewDrop,   setShowViewDrop]   = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Portal position state ─────────────────────────────────────────────────
  const [viewDropPos,   setViewDropPos]   = useState({ top: 0, left: 0 });
  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });

  const viewDropBtnRef = useRef<HTMLButtonElement>(null);
  const dateBtnRef     = useRef<HTMLButtonElement>(null);
  const viewDropRef    = useRef<HTMLDivElement>(null);
  const datePickerRef  = useRef<HTMLDivElement>(null);

  const today   = new Date().toISOString().slice(0, 10);
  const isToday = currentDate === today;

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        viewDropRef.current && !viewDropRef.current.contains(target) &&
        viewDropBtnRef.current && !viewDropBtnRef.current.contains(target)
      ) setShowViewDrop(false);
      if (
        datePickerRef.current && !datePickerRef.current.contains(target) &&
        dateBtnRef.current && !dateBtnRef.current.contains(target)
      ) setShowDatePicker(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  function getShortDateLabel() {
    if (viewMode === "Day") {
      return new Date(currentDate + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      });
    }
    return formatDateLabel(currentDate, viewMode);
  }

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

      {/* ── View dropdown PORTAL ── */}
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

      {/* ── Date picker PORTAL ── */}
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
    </>
  );
};

export default TopBar;