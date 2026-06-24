import React, { useEffect, useState } from "react";
import type { StaffMember, ShiftEntry } from "./types";
import { generateTimeOptions, calcTotalHours, formatDrawerDate } from "./utils";
import "./ShiftDrawer.scss";

const TIME_OPTS = generateTimeOptions();

interface ShiftDrawerProps {
  open: boolean;
  staff: StaffMember | null;
  date: string | null;
  shift?: ShiftEntry;
  onClose: () => void;
  onSave: (staffId: string, date: string, isAvailable: boolean, startTime: string, endTime: string) => void;
}

const ShiftDrawer: React.FC<ShiftDrawerProps> = ({
  open, staff, date, shift, onClose, onSave,
}) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [startTime, setStartTime] = useState("10:30 AM");
  const [endTime, setEndTime] = useState("09:00 PM");
  const [breaks, setBreaks] = useState<{ id: number; start: string; end: string }[]>([]);

  useEffect(() => {
    if (open && shift) {
      setIsAvailable(shift.isAvailable);
      setStartTime(shift.startTime || "10:30 AM");
      setEndTime(shift.endTime || "09:00 PM");
      setBreaks([]);
    } else if (open) {
      setIsAvailable(true);
      setStartTime("10:30 AM");
      setEndTime("09:00 PM");
      setBreaks([]);
    }
  }, [open, shift]);

  const addBreak = () => {
    setBreaks([...breaks, { id: Date.now(), start: "01:00 PM", end: "01:30 PM" }]);
  };

  const removeBreak = (id: number) => {
    setBreaks(breaks.filter((b) => b.id !== id));
  };

  const updateBreak = (id: number, field: "start" | "end", val: string) => {
    setBreaks(breaks.map((b) => (b.id === id ? { ...b, [field]: val } : b)));
  };

  const totalHours = isAvailable && startTime && endTime
    ? calcTotalHours(startTime, endTime)
    : "";

  const handleSave = () => {
    if (!staff || !date) return;
    onSave(staff.id, date, isAvailable, startTime, endTime);
    onClose();
  };

  if (!open || !staff || !date) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="shift-drawer__backdrop" onClick={onClose} />

      {/* Drawer panel */}
      <div className="shift-drawer__panel">

        {/* Header */}
        <div className="shift-drawer__header">
          <div>
            <h2 className="shift-drawer__title">Update Availability</h2>
            <p className="shift-drawer__subtitle">
              {staff.name} &bull; {formatDrawerDate(date)}
            </p>
          </div>
          <button className="shift-drawer__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="shift-drawer__body">

          {/* Availability toggle */}
          <div className="shift-drawer__availability">
            <span className="shift-drawer__availability-label" id="shift-drawer-availability-label">Staff is Available</span>
            <label className={`shift-drawer__toggle${isAvailable ? " shift-drawer__toggle--on" : ""}`}>
              <input
                type="checkbox"
                className="shift-drawer__toggle-input"
                aria-labelledby="shift-drawer-availability-label"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
              />
              <span className={`shift-drawer__toggle-thumb${isAvailable ? " shift-drawer__toggle-thumb--on" : ""}`} />
            </label>
          </div>

          {/* Time selectors + breaks (only when available) */}
          {isAvailable && (
            <div className="shift-drawer__schedule">

              {/* Start / End time */}
              <div className="shift-drawer__times">
                <div className="shift-drawer__time-field">
                  <label className="shift-drawer__field-label" htmlFor="shift-drawer-start-time">Start Time</label>
                  <select
                    id="shift-drawer-start-time"
                    className="shift-drawer__select"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  >
                    {TIME_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="shift-drawer__time-field">
                  <label className="shift-drawer__field-label" htmlFor="shift-drawer-end-time">End Time</label>
                  <select
                    id="shift-drawer-end-time"
                    className="shift-drawer__select"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  >
                    {TIME_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Breaks */}
              <div className="shift-drawer__breaks">
                <div className="shift-drawer__breaks-header">
                  <span className="shift-drawer__field-label">Breaks &amp; Lunches</span>
                  <span className="shift-drawer__breaks-badge">{breaks.length} Scheduled</span>
                </div>

                {breaks.map((brk, idx) => (
                  <div key={brk.id} className="shift-drawer__break-row">
                    <span className="shift-drawer__break-index">#{idx + 1}</span>
                    <select
                      className="shift-drawer__break-select"
                      aria-label={`Break ${idx + 1} start time`}
                      value={brk.start}
                      onChange={(e) => updateBreak(brk.id, "start", e.target.value)}
                    >
                      {TIME_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="shift-drawer__break-sep">to</span>
                    <select
                      className="shift-drawer__break-select"
                      aria-label={`Break ${idx + 1} end time`}
                      value={brk.end}
                      onChange={(e) => updateBreak(brk.id, "end", e.target.value)}
                    >
                      {TIME_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      className="shift-drawer__break-remove"
                      onClick={() => removeBreak(brk.id)}
                      aria-label="Remove break"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                <button className="shift-drawer__add-break" onClick={addBreak}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add Custom Break
                </button>
              </div>

              {/* Total hours summary */}
              <div className="shift-drawer__summary">
                <div className="shift-drawer__summary-inner">
                  <div className="shift-drawer__summary-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="shift-drawer__summary-label">Total Working Hours</div>
                    <div className="shift-drawer__summary-value">{totalHours}</div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shift-drawer__footer">
          <button className="shift-drawer__cancel" onClick={onClose}>Cancel</button>
          <button className="shift-drawer__save" onClick={handleSave}>Apply Changes</button>
        </div>

      </div>
    </>
  );
};

export default ShiftDrawer;
