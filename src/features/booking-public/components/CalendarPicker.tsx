import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";
import { salonDateStr } from "../../online-booking/components/BookingFlow/shared";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// Monday-first, matching the mockup's Mon…Sun header row.
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Local midnight for a date, so comparisons ignore the time of day. */
const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Monday-first column index (JS getDay() is Sunday-first). */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

export interface CalendarPickerProps {
  /** Currently selected day. */
  value: Date;
  onChange: (date: Date) => void;
  /** Salon's maximum advance booking, in days from today. */
  maxAdvanceDays: number;
  /** False when the salon doesn't take same-day bookings. */
  allowSameDay: boolean;
  /** Extra dates to disable (e.g. a weekday the stylist never works). */
  isDateDisabled?: (date: Date) => boolean;
}

/**
 * Month-grid date picker for the public booking flow.
 *
 * Replaces the old fixed 8-day strip, which capped how far ahead anyone could
 * book regardless of the salon's setting — a salon configured for 30 or 90 days
 * had no way for a customer to reach those dates. The same rules the server
 * enforces are applied here so a disabled day is never submittable:
 * past dates, today when same-day booking is off, and anything beyond
 * maxAdvanceDays.
 */
export default function CalendarPicker({
  value, onChange, maxAdvanceDays, allowSameDay, isDateDisabled,
}: CalendarPickerProps) {
  const today = useMemo(() => atMidnight(new Date()), []);
  const lastBookable = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + Math.max(0, maxAdvanceDays));
    return d;
  }, [today, maxAdvanceDays]);

  // The month on screen, which the user can page through independently of the
  // selection — opening on the selected date's month.
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1)
  );

  const cells = useMemo(() => {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const leading = mondayIndex(firstOfMonth);

    const out: Array<Date | null> = Array(leading).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      out.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
    }
    // Pad to whole weeks so the grid keeps a stable height between months.
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [visibleMonth]);

  const disabledFor = (date: Date): boolean => {
    if (date < today) return true;
    if (date > lastBookable) return true;
    if (!allowSameDay && date.getTime() === today.getTime()) return true;
    return isDateDisabled?.(date) ?? false;
  };

  const canGoPrev = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1) <= lastBookable;

  const shiftMonth = (delta: number) =>
    setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const selectedKey = salonDateStr(value);

  return (
    <div className="pbc" role="group" aria-label="Choose a date">
      <div className="pbc__head">
        <button
          type="button" className="pbc__nav" aria-label="Previous month"
          disabled={!canGoPrev} onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="pbc__title" aria-live="polite">
          {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </span>
        <button
          type="button" className="pbc__nav" aria-label="Next month"
          disabled={!canGoNext} onClick={() => shiftMonth(1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="pbc__weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((d) => <span key={d} className="pbc__weekday">{d}</span>)}
      </div>

      <div className="pbc__grid">
        {cells.map((date, i) => {
          if (!date) return <span key={`pad-${i}`} className="pbc__pad" />;
          const disabled = disabledFor(date);
          const isSelected = salonDateStr(date) === selectedKey;
          const isToday = date.getTime() === today.getTime();
          return (
            <button
              key={date.toISOString()}
              type="button"
              className={[
                "pbc__day",
                isSelected ? "is-selected" : "",
                isToday && !isSelected ? "is-today" : "",
              ].filter(Boolean).join(" ")}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={date.toDateString()}
              onClick={() => onChange(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
