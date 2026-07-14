import React, { useState, useRef, useEffect } from "react";
import type { ShiftTime } from "./AddShiftModal";
import "../styles/ShiftCell.scss";

interface ShiftCellProps {
  shift?: ShiftTime;
  isOff?: boolean;
  memberId: number;
  date: string;
  onAddShift: (memberId: number, date: string) => void;
  onEditDay: (memberId: number, date: string) => void;
  onSetRepeating: (memberId: number, date: string) => void;
  onAddTimeOff: (memberId: number, date: string) => void;
  onDeleteShift: (memberId: number, date: string) => void;
  onViewMember: (memberId: number) => void;
}

const ShiftCell: React.FC<ShiftCellProps> = ({
  shift,
  isOff,
  memberId,
  date,
  onAddShift,
  onEditDay,
  onSetRepeating,
  onAddTimeOff,
  onDeleteShift,
  onViewMember,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((p) => !p);
  };

  const act = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  if (isOff)
    return <div className="shift-cell shift-cell--off">Not working</div>;

  return (
    <div className="shift-cell" ref={ref}>
      {shift ? (
        <button ref={btnRef} className="shift-cell__badge" onClick={handleOpen}>
          {shift.start} – {shift.end}
        </button>
      ) : (
        <button
          ref={btnRef}
          className="shift-cell__plus-btn"
          onClick={handleOpen}
          aria-label="Add"
        >
          <span className="shift-cell__plus-icon">+</span>
        </button>
      )}

      {open && (
        <div
          className="shift-cell__popover"
          style={
            {
              "--shift-cell-popover-top": `${pos.top}px`,
              "--shift-cell-popover-left": `${pos.left}px`,
            } as React.CSSProperties
          }
        >
          {shift ? (
            <>
              <button
                className="shift-cell__pop-item"
                onClick={() => act(() => onEditDay(memberId, date))}
              >
                Edit this day
              </button>
              <button
                className="shift-cell__pop-item"
                onClick={() => act(() => onSetRepeating(memberId, date))}
              >
                Set repeating shifts
              </button>
              <button
                className="shift-cell__pop-item"
                onClick={() => act(() => onAddTimeOff(memberId, date))}
              >
                Add time off
              </button>
              <div className="shift-cell__pop-divider" />
              <button
                className="shift-cell__pop-item shift-cell__pop-item--red"
                onClick={() => act(() => onDeleteShift(memberId, date))}
              >
                Delete this shift
              </button>
              <div className="shift-cell__pop-divider" />
              <button
                className="shift-cell__pop-item"
                onClick={() => act(() => onViewMember(memberId))}
              >
                View team member
              </button>
            </>
          ) : (
            <>
              <button
                className="shift-cell__pop-item"
                onClick={() => act(() => onAddShift(memberId, date))}
              >
                Add shift
              </button>
              <button
                className="shift-cell__pop-item"
                onClick={() => act(() => onSetRepeating(memberId, date))}
              >
                Set repeating shifts
              </button>
              <button
                className="shift-cell__pop-item"
                onClick={() => act(() => onAddTimeOff(memberId, date))}
              >
                Add time off
              </button>
              <div className="shift-cell__pop-divider" />
              <button
                className="shift-cell__pop-item"
                onClick={() => act(() => onViewMember(memberId))}
              >
                View team member
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ShiftCell;
