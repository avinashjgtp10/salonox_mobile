import { useState, useRef, useEffect } from "react";
import { Calendar3 } from "react-bootstrap-icons";
import "./styles/DateRangePicker.scss";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface DateRangePickerProps {
  /** "YYYY-MM-DD" */
  startDate: string;
  /** "YYYY-MM-DD" */
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  /** Opt-in Today/This Week/This Month quick-pick row, shown above the calendar. */
  showQuickPresets?: boolean;
}

function getMonthDays(year: number, month0: number): (string | null)[] {
  const firstDay = new Date(year, month0, 1).getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(`${year}-${String(month0 + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`);
  }
  return days;
}

// dd/MM/yyyy, consistently with every report table/export — en-IN's
// {day:"2-digit",month:"short",year:"numeric"} used to render "30 Jun 2026",
// inconsistent with the rest of the app.
const fmtLabel = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function DateRangePicker({ startDate, endDate, onChange, showQuickPresets = false }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [viewYear, setViewYear] = useState(() => Number(startDate.slice(0, 4)));
  const [viewMonth0, setViewMonth0] = useState(() => Number(startDate.slice(5, 7)) - 1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setPickingEnd(false);
    setViewYear(Number(startDate.slice(0, 4)));
    setViewMonth0(Number(startDate.slice(5, 7)) - 1);
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const prevMonth = () => {
    if (viewMonth0 === 0) { setViewYear(y => y - 1); setViewMonth0(11); }
    else setViewMonth0(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth0 === 11) { setViewYear(y => y + 1); setViewMonth0(0); }
    else setViewMonth0(m => m + 1);
  };

  const pickDay = (day: string) => {
    if (!pickingEnd) {
      setDraftStart(day);
      setDraftEnd(day);
      setPickingEnd(true);
    } else if (day < draftStart) {
      setDraftStart(day);
      setDraftEnd(day);
    } else {
      setDraftEnd(day);
    }
  };

  const apply = () => {
    const lo = draftStart < draftEnd ? draftStart : draftEnd;
    const hi = draftStart < draftEnd ? draftEnd : draftStart;
    onChange(lo, hi);
    setOpen(false);
  };

  const thisMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const first = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const last = `${y}-${String(m + 1).padStart(2, "0")}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, "0")}`;
    onChange(first, last);
    setOpen(false);
  };

  const today = () => {
    const iso = toISO(new Date());
    onChange(iso, iso);
    setOpen(false);
  };

  const thisWeek = () => {
    const now = new Date();
    // Sunday-start week, matching DAYS_ABBR's Su-Sa header order above.
    const first = new Date(now);
    first.setDate(now.getDate() - now.getDay());
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    onChange(toISO(first), toISO(last));
    setOpen(false);
  };

  const days = getMonthDays(viewYear, viewMonth0);

  return (
    <div className="drp" ref={containerRef}>
      <button type="button" className="drp-trigger" onClick={() => setOpen(v => !v)}>
        {fmtLabel(startDate)} – {fmtLabel(endDate)}
        <Calendar3 size={13} />
      </button>
      {open && (
        <div className="drp-pop" onMouseDown={e => e.stopPropagation()}>
          {showQuickPresets && (
            <div className="drp-quick-presets">
              <button type="button" className="drp-quick-btn" onClick={today}>Today</button>
              <button type="button" className="drp-quick-btn" onClick={thisWeek}>This Week</button>
              <button type="button" className="drp-quick-btn" onClick={thisMonth}>This Month</button>
            </div>
          )}
          <div className="drp-nav-row">
            <button type="button" className="drp-nav-btn" onClick={prevMonth}>‹</button>
            <span className="drp-month-label">{MONTHS[viewMonth0]} {viewYear}</span>
            <button type="button" className="drp-nav-btn" onClick={nextMonth}>›</button>
          </div>
          <div className="drp-day-headers">
            {DAYS_ABBR.map(d => <div key={d} className="drp-day-name">{d}</div>)}
          </div>
          <div className="drp-day-grid">
            {days.map((day, i) => {
              const isEmpty = !day;
              const lo = draftStart < draftEnd ? draftStart : draftEnd;
              const hi = draftStart < draftEnd ? draftEnd : draftStart;
              const inRange = day && day >= lo && day <= hi;
              const isEdge = day === draftStart || day === draftEnd;
              return (
                <button
                  type="button"
                  key={i}
                  disabled={isEmpty}
                  className={[
                    "drp-day-btn",
                    isEmpty ? "drp-day-btn--empty" : "",
                    inRange ? "drp-day-btn--in-range" : "",
                    isEdge ? "drp-day-btn--edge" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => day && pickDay(day)}
                >
                  {day ? Number(day.slice(8, 10)) : ""}
                </button>
              );
            })}
          </div>
          <div className="drp-actions">
            <button type="button" className="drp-link" onClick={thisMonth}>This month</button>
            <button type="button" className="drp-apply-btn" onClick={apply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}
