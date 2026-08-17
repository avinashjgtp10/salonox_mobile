import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar3, ChevronDown } from "react-bootstrap-icons";
import "./styles/DatePicker.scss";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Monday-first, matching the calendar's own header row.
const DAYS_ABBR = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface DatePickerProps {
  /** "YYYY-MM-DD", or "" when nothing is selected. */
  value: string;
  onChange: (value: string) => void;
  /** Trigger text shown while `value` is empty. */
  placeholder?: string;
  /** "YYYY-MM-DD" bounds — days outside them are disabled, as is Today when it falls outside. */
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtLabel = (iso: string) => {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/** Every cell of the 6-row grid, including the leading/trailing days that
 *  belong to the neighbouring months (rendered muted, still selectable). */
function getGridDays(year: number, month0: number): { iso: string; outside: boolean }[] {
  const first = new Date(year, month0, 1);
  // getDay() is Sunday-based (0=Sun); shift so Monday is column 0.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month0, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { iso: toISO(d), outside: d.getMonth() !== month0 };
  });
}

/**
 * Standard single-date picker: trigger + month/year dropdowns + calendar.
 * The counterpart to DateRangeFilter — use this wherever ONE date is meant
 * (a day to view, an expiry, a birthday), and DateRangeFilter wherever a
 * from/to span is. Between them they're the only two date controls the app
 * should use, so spacing, palette and behaviour stay consistent everywhere.
 */
export default function DatePicker({
  value, onChange, placeholder = "Select date", min, max, disabled = false, className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = toISO(new Date());
  const seed = value || today;
  const [viewYear, setViewYear] = useState(() => Number(seed.slice(0, 4)));
  const [viewMonth0, setViewMonth0] = useState(() => Number(seed.slice(5, 7)) - 1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  // Wide enough to cover birthdays at one end and future expiries at the
  // other, then widened further if min/max reach past it.
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    let lo = now - 100;
    let hi = now + 10;
    if (min) lo = Math.min(lo, Number(min.slice(0, 4)));
    if (max) hi = Math.max(hi, Number(max.slice(0, 4)));
    return Array.from({ length: hi - lo + 1 }, (_, i) => hi - i);
  }, [min, max]);

  const outOfBounds = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  const openPanel = () => {
    if (disabled) return;
    if (!open) {
      const s = value || today;
      setViewYear(Number(s.slice(0, 4)));
      setViewMonth0(Number(s.slice(5, 7)) - 1);
    }
    setOpen(v => !v);
  };

  const pick = (iso: string) => {
    if (outOfBounds(iso)) return;
    onChange(iso);
    setOpen(false);
  };

  const days = getGridDays(viewYear, viewMonth0);

  return (
    <div className={`dp${className ? ` ${className}` : ""}`} ref={containerRef}>
      <button
        type="button"
        className={`dp-trigger${open ? " dp-trigger--open" : ""}`}
        onClick={openPanel}
        disabled={disabled}
      >
        <Calendar3 size={13} />
        <span className={value ? undefined : "dp-trigger__placeholder"}>
          {value ? fmtLabel(value) : placeholder}
        </span>
        <ChevronDown size={12} className={`dp-trigger__chevron${open ? " dp-trigger__chevron--open" : ""}`} />
      </button>

      {open && (
        <div className="dp-panel" onMouseDown={e => e.stopPropagation()}>
          <div className="dp-selects">
            <div className="dp-select-wrap">
              <select
                className="dp-select"
                value={viewMonth0}
                onChange={e => setViewMonth0(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <ChevronDown size={11} className="dp-select__icon" />
            </div>
            <div className="dp-select-wrap dp-select-wrap--year">
              <select
                className="dp-select"
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={11} className="dp-select__icon" />
            </div>
          </div>

          <div className="dp-day-headers">
            {DAYS_ABBR.map(d => <div key={d} className="dp-day-name">{d}</div>)}
          </div>

          <div className="dp-day-grid">
            {days.map(({ iso, outside }) => {
              const blocked = outOfBounds(iso);
              return (
                <button
                  type="button"
                  key={iso}
                  disabled={blocked}
                  className={[
                    "dp-day",
                    outside ? "dp-day--outside" : "",
                    iso === value ? "dp-day--selected" : "",
                    iso === today && iso !== value ? "dp-day--today" : "",
                    blocked ? "dp-day--blocked" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => pick(iso)}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              );
            })}
          </div>

          <div className="dp-footer">
            <button type="button" className="dp-link" onClick={() => { onChange(""); setOpen(false); }}>
              Clear
            </button>
            <button
              type="button"
              className="dp-link"
              disabled={outOfBounds(today)}
              onClick={() => pick(today)}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
