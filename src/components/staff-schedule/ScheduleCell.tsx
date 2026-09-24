import React, { useRef, useState, useEffect } from "react";
import type { ShiftEntry } from "./types";
import CellDropdown from "./CellDropdown";

interface ScheduleCellProps {
  shift?: ShiftEntry;
  staffId: string;
  date: string;
  onEditWorkingHours: (staffId: string, date: string) => void;
  onAddTimeOff: (staffId: string, date: string) => void;
  onManageDayOff: (staffId: string, date: string) => void;
  onManageBlockedDay: (staffId: string, date: string) => void;
  onDeleteTimeBlock: (staffId: string, date: string) => void;
  isModalOpen?: boolean;
  readOnly?: boolean;
}

const ScheduleCell: React.FC<ScheduleCellProps> = ({
  shift,
  staffId,
  date,
  onEditWorkingHours,
  onAddTimeOff,
  onManageDayOff,
  onManageBlockedDay,
  onDeleteTimeBlock,
  isModalOpen,
  readOnly,
}) => {
  const [open, setOpen] = useState(false);
  const hasWorkingHours = shift?.type === "working";

  useEffect(() => {
    if (isModalOpen) {
      setOpen(false);
    }
  }, [isModalOpen]);
  const cellRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const typeClass = shift
    ? `sched-cell--${shift.type}`
    : "sched-cell--empty";

  // ── Empty cell ───────────────────────────────────────────────────────────────
  if (!shift) {
    // Inactive staff can't have new shifts added — no working hours configured
    // for this day, so there's nothing to show and nothing to edit.
    if (readOnly) {
      return <div className={`sched-cell ${typeClass} sched-cell--readonly`} />;
    }
    return (
      <div ref={cellRef} className={`sched-cell ${typeClass}`}>
        <button
          ref={btnRef}
          className="sched-cell__add"
          onClick={() => setOpen((p) => !p)}
          aria-label="Add shift"
        >
          <span className="sched-cell__add-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </button>
        {open && (
          <CellDropdown
            anchorRef={cellRef}
            hasWorkingHours={hasWorkingHours}
            onEditWorkingHours={() => onEditWorkingHours(staffId, date)}
            onAddTimeOff={() => onAddTimeOff(staffId, date)}
            onManageDayOff={() => onManageDayOff(staffId, date)}
            onManageBlockedDay={() => onManageBlockedDay(staffId, date)}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── Day off ────────────────────────────────────────────────────────────────
  if (shift.type === "dayoff") {
    return (
      <div
        ref={cellRef}
        className={`sched-cell ${typeClass} ${readOnly ? "sched-cell--readonly" : ""}`}
        onClick={readOnly ? undefined : () => setOpen((p) => !p)}
      >
        {!readOnly && (
          <button
            ref={btnRef}
            className="sched-cell__edit"
            onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
            aria-label="Manage day off"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}

        <div className="sched-cell__info">
          <div className="sched-cell__range">
            <span className="sched-cell__off-dot" /> OFF
          </div>
          <span className="sched-cell__pill">
            <span className="sched-cell__pill-dot" />
            Day Off
          </span>
        </div>

        {open && !readOnly && (
          <CellDropdown
            anchorRef={cellRef}
            hasWorkingHours={hasWorkingHours}
            onEditWorkingHours={() => onEditWorkingHours(staffId, date)}
            onAddTimeOff={() => onAddTimeOff(staffId, date)}
            onManageDayOff={() => onManageDayOff(staffId, date)}
            onManageBlockedDay={() => onManageBlockedDay(staffId, date)}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── Working / Blocked cell ────────────────────────────────────────────────────
  return (
    <div
      ref={cellRef}
      className={`sched-cell ${typeClass} ${readOnly ? "sched-cell--readonly" : ""}`}
      onClick={readOnly ? undefined : () => setOpen((p) => !p)}
    >
      {!readOnly && (
        <button
          ref={btnRef}
          className="sched-cell__edit"
          onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
          aria-label="Edit shift"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      <div className="sched-cell__info">
        <div className="sched-cell__range">{shift.startTime} – {shift.endTime}</div>
        <span className="sched-cell__pill">
          <span className="sched-cell__pill-dot" />
          {shift.type === "blocked" ? "Blocked" : "Working"}
        </span>
      </div>

      {open && !readOnly && (
        <CellDropdown
          anchorRef={cellRef}
          hasWorkingHours={hasWorkingHours}
          onEditWorkingHours={() => onEditWorkingHours(staffId, date)}
          onAddTimeOff={() => onAddTimeOff(staffId, date)}
          onManageDayOff={() => onManageDayOff(staffId, date)}
          onManageBlockedDay={() => onManageBlockedDay(staffId, date)}
          onDeleteTimeBlock={() => onDeleteTimeBlock(staffId, date)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};

export default ScheduleCell;
