import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar3, ChevronDown } from "react-bootstrap-icons";
import "./styles/DatePicker.scss";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// Monday-first, matching the calendar's own header row.
const DAYS_ABBR = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface DatePickerPanelProps {
  /** "YYYY-MM-DD", or "" when nothing is selected. */
  value: string;
  onChange: (value: string) => void;
  /** "YYYY-MM-DD" bounds — days outside them are disabled, as is Today when it falls outside. */
  min?: string;
  max?: string;
  /** Called after a pick, and on outside-click/Escape (unless
   *  manageDismissal is false). Only meaningful for the standalone panel —
   *  DatePicker handles its own dismissal. */
  onClose?: () => void;
  className?: string;
  /** Set false when a wrapping component already owns outside-click/Escape
   *  dismissal (see DatePicker below) — otherwise this panel's own listener
   *  and the wrapper's fire on the same click: mousedown closes it (the
   *  panel sees the trigger button as "outside" itself), then the trigger's
   *  own click handler immediately reopens it, so a second click on the
   *  trigger can never actually close the panel. Defaults true so every
   *  other (standalone) caller is unaffected. */
  manageDismissal?: boolean;
}

interface DatePickerProps extends Omit<DatePickerPanelProps, "onClose"> {
  /** Trigger text shown while `value` is empty. */
  placeholder?: string;
  disabled?: boolean;
  /** Separator for the displayed dd?mm?yyyy label. Defaults to "/" — pass
   *  "-" for a dd-mm-yyyy display without changing the "YYYY-MM-DD" value
   *  every caller already stores/sends. */
  separator?: "/" | "-";
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtLabel = (iso: string, separator: string = "/") => {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}${separator}${String(d.getMonth() + 1).padStart(2, "0")}${separator}${d.getFullYear()}`;
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
 * The calendar surface on its own — month/year dropdowns, day grid,
 * Clear/Today. Exported separately for callers that already own a trigger
 * and their own positioning (e.g. the scheduler toolbars, which portal this
 * out of an overflow-clipped bar). Everything else should use DatePicker,
 * which wraps this in a trigger + popover.
 */
export function DatePickerPanel({
  value, onChange, min, max, onClose, className = "", manageDismissal = true,
}: DatePickerPanelProps) {
  const today = toISO(new Date());
  const seed = value || today;
  const [viewYear, setViewYear] = useState(() => Number(seed.slice(0, 4)));
  const [viewMonth0, setViewMonth0] = useState(() => Number(seed.slice(5, 7)) - 1);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onClose || !manageDismissal) return;
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [onClose, manageDismissal]);

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

  const pick = (iso: string) => {
    if (outOfBounds(iso)) return;
    onChange(iso);
    onClose?.();
  };

  const days = getGridDays(viewYear, viewMonth0);

  return (
    <div className={`dp-panel${className ? ` ${className}` : ""}`} ref={panelRef}>
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
            <button type="button" className="dp-link" onClick={() => { onChange(""); onClose?.(); }}>
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
  );
}

/**
 * Standard single-date picker: trigger + the panel above.
 * The counterpart to DateRangeFilter — use this wherever ONE date is meant
 * (a day to view, an expiry, a birthday), and DateRangeFilter wherever a
 * from/to span is. Between them they're the only two date controls the app
 * should use, so spacing, palette and behaviour stay consistent everywhere.
 */
// Panel's fixed width (see .dp-panel in DatePicker.scss) plus a little
// breathing room, used to decide which edge to anchor to before the panel
// itself has mounted.
const PANEL_WIDTH = 268;
// Approximate rendered height (padding + month/year row + day-name row +
// 6-row day grid + footer) — the panel isn't mounted yet when this decision
// is made, so this is an estimate, deliberately padded a little high rather
// than cutting it close.
const PANEL_HEIGHT_ESTIMATE = 360;

export default function DatePicker({
  value, onChange, placeholder = "Select date", min, max, disabled = false, className = "", separator = "/",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Portaled to document.body and positioned from the trigger's own
  // getBoundingClientRect() instead of `position: absolute` anchored to
  // .dp — a caller with little space below the trigger (e.g. a field near
  // the top of a scrollable modal, like Record Purchase's Purchase Date)
  // had the panel visually collide with whatever content follows it,
  // since an absolutely-positioned element doesn't push later siblings
  // down. Portaling escapes that entirely, the same fix already used for
  // the Suppliers/ConsumableInventoryPage row-actions menus.
  const updateCoords = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Flip to the right edge when a left-anchored panel would run
    // off-screen (e.g. the "Select date" trigger in the booking Client
    // panel, which sits flush against the drawer's right edge).
    const left = rect.left + PANEL_WIDTH > window.innerWidth - 8
      ? Math.max(8, rect.right - PANEL_WIDTH)
      : rect.left;
    // Flip to open above the trigger when there isn't enough room below it
    // — e.g. Quick Sale's Edit Client "Date of Birth" field, which sits low
    // enough in that modal that opening downward ran the panel past the
    // modal's own footer (Save/Cancel) and, on shorter screens, past the
    // bottom of the viewport itself. Only flips when there's actually more
    // room above than below would need — otherwise falls back to the usual
    // below placement rather than picking a worse spot.
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < PANEL_HEIGHT_ESTIMATE && rect.top > PANEL_HEIGHT_ESTIMATE
      ? Math.max(8, rect.top - PANEL_HEIGHT_ESTIMATE - 6)
      : rect.bottom + 6;
    setCoords({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onReposition = () => updateCoords();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    // capture:true — scroll doesn't bubble, but a capture-phase listener on
    // window still sees scroll on any descendant container (a modal body,
    // a page's own scroll region), keeping the panel glued to its trigger
    // as you scroll instead of drifting away from it.
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open]);

  const handleToggle = () => {
    if (disabled) return;
    if (!open) updateCoords();
    setOpen(v => !v);
  };

  return (
    <div className={`dp${className ? ` ${className}` : ""}`} ref={containerRef}>
      <button
        type="button"
        className={`dp-trigger${open ? " dp-trigger--open" : ""}`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <Calendar3 size={13} />
        <span className={value ? undefined : "dp-trigger__placeholder"}>
          {value ? fmtLabel(value, separator) : placeholder}
        </span>
        <ChevronDown size={12} className={`dp-trigger__chevron${open ? " dp-trigger__chevron--open" : ""}`} />
      </button>

      {open && coords && createPortal(
        // Must outrank any modal overlay this trigger can sit inside — several
        // pages (e.g. SubscriptionPermissionsPage) use ad-hoc fixed-position
        // modals at z-index 9998/9999, which previously sat on top of this
        // panel and made the calendar invisible/unclickable when opened from
        // inside one.
        <div ref={panelRef} style={{ position: "fixed", top: coords.top, left: coords.left, zIndex: 100000 }}>
          {/* Remounted per open (key on `value`) so the grid always re-seeds
              to the current selection rather than wherever it was left
              last time. */}
          <DatePickerPanel
            key={value || "empty"}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            onClose={() => setOpen(false)}
            manageDismissal={false}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
