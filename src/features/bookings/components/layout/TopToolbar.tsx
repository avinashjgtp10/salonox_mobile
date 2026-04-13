import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import type { ViewMode, IntervalOption } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatDateLabel } from "../../utils/timeUtils";
import MiniCalendar from "../shared/MiniCalendar.tsx";
import "../../styles/TopBar.scss";

interface TopBarProps {
  onNewAppointment: () => void;
  onBlockTime: () => void;
  onSettings: () => void;
}

const VIEW_OPTIONS: ViewMode[] = ["Day", "Week", "Month", "List Week"];
const INTERVAL_OPTIONS: IntervalOption[] = ["15 Mins", "30 Mins", "60 Mins"];

const TopBar: React.FC<TopBarProps> = ({ onNewAppointment, onBlockTime }) => {
  const { viewMode, setViewMode, currentDate, setCurrentDate, navigate, interval, setInterval } = useSchedulerContext();

  const [showViewDrop, setShowViewDrop] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewDropPos, setViewDropPos] = useState({ top: 0, left: 0 });
  const [datePickerPos, setDatePickerPos] = useState({ top: 0, left: 0 });

  const viewDropBtnRef = useRef<HTMLButtonElement>(null);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const viewDropRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = currentDate === today;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (viewDropRef.current && !viewDropRef.current.contains(target) && viewDropBtnRef.current && !viewDropBtnRef.current.contains(target))
        setShowViewDrop(false);
      if (datePickerRef.current && !datePickerRef.current.contains(target) && dateBtnRef.current && !dateBtnRef.current.contains(target))
        setShowDatePicker(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
  }, [showViewDrop, showDatePicker]);

  function getShortDateLabel() {
    if (viewMode === "Day") {
      return new Date(currentDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    }
    return formatDateLabel(currentDate, viewMode);
  }

  function openViewDrop() {
    if (viewDropBtnRef.current) {
      const r = viewDropBtnRef.current.getBoundingClientRect();
      setViewDropPos({ top: r.bottom + 4, left: r.left });
    }
    setShowViewDrop((v) => !v);
  }

  function openDatePicker() {
    if (dateBtnRef.current) {
      const r = dateBtnRef.current.getBoundingClientRect();
      setDatePickerPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
    }
    setShowDatePicker((v) => !v);
  }

  return (
    <>
      <div className="topbar">
        <button ref={viewDropBtnRef} className="topbar__view-btn" onMouseDown={(e) => { e.stopPropagation(); openViewDrop(); }}>
          {viewMode} <span className="topbar__arrow">▼</span>
        </button>

        <button className="topbar__nav-btn" onClick={() => navigate(-1)}>‹</button>

        <button
          ref={dateBtnRef}
          className={`topbar__date-btn${showDatePicker ? " topbar__date-btn--active" : ""}`}
          onMouseDown={(e) => { e.stopPropagation(); openDatePicker(); }}
        >
          {getShortDateLabel()} <span className="topbar__arrow topbar__arrow--faint">▼</span>
        </button>

        <button className="topbar__nav-btn" onClick={() => navigate(1)}>›</button>

        <button
          className={`topbar__today-btn${isToday ? " topbar__today-btn--current" : ""}`}
          onClick={() => setCurrentDate(today)}
        >
          Today
        </button>

        <div className="topbar__spacer" />

        <div className="topbar__interval-group">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`topbar__interval-btn${interval === opt ? " topbar__interval-btn--active" : ""}`}
              onClick={() => setInterval(opt)}
            >
              {opt.replace(" Mins", "m")}
            </button>
          ))}
        </div>

        <button className="topbar__add-btn" onClick={onNewAppointment}>Add +</button>

        <button className="topbar__block-btn" onClick={onBlockTime}>Block Time</button>
      </div>

      {/* View dropdown portal */}
      {showViewDrop && ReactDOM.createPortal(
        <div ref={viewDropRef} className="topbar-drop" style={{ top: viewDropPos.top, left: viewDropPos.left }}>
          {VIEW_OPTIONS.map((v) => (
            <button
              key={v}
              className={`topbar-drop__item${viewMode === v ? " topbar-drop__item--active" : ""}`}
              onClick={() => { setViewMode(v); setShowViewDrop(false); }}
            >
              {v}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {/* Date picker portal */}
      {showDatePicker && ReactDOM.createPortal(
        <div ref={datePickerRef} className="topbar-cal-portal" style={{ top: datePickerPos.top, left: datePickerPos.left }}>
          <MiniCalendar
            value={currentDate}
            onChange={(d) => { setCurrentDate(d); setShowDatePicker(false); }}
            onClose={() => setShowDatePicker(false)}
          />
        </div>,
        document.body,
      )}
    </>
  );
};

export default TopBar;