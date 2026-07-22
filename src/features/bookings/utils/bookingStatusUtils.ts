export type ChipStatusClass = "deleted" | "confirmed" | "partial" | "pending" | "cancelled" | "no-show";

/**
 * Single source of truth for how a booking's unified `status` maps to the
 * calendar chip's color class — shared by DayView (BookingChip), WeekView,
 * MonthView, and ListWeekView so they can't drift out of sync with each other.
 *
 * Backend flips "booked" to "no-show" once a scheduled end time passes with
 * nothing paid — both via a background sweep and (as a fallback for when that
 * sweep hasn't run yet) a read-time derivation on every fetch. Neither of
 * those helps a calendar tab that's just sitting open with data already
 * loaded, though — the status field in memory won't change until the next
 * fetch. So this ALSO re-derives "no-show" here, client-side, the same way
 * (past end time + still "booked"), so the chip flips live as the clock ticks
 * past instead of only updating on the next reload. Callers should re-run
 * this on a recurring tick (DayView already has one for the current-time
 * line) so the derivation re-evaluates as time passes, not just on data change.
 *
 * "deleted" outranks everything else — "Delete Appointment" is a soft delete
 * server-side (deleted_at, not a row removal) specifically so it can still
 * show here, greyed out, instead of vanishing without a trace.
 */
export function computeChipStatusClass(booking: {
  status?: string | null;
  isDeleted?: boolean;
  date?: string;
  endTime?: string;
}, now: Date = new Date()): ChipStatusClass {
  if (booking.isDeleted) return "deleted";

  const bs = (booking.status || "").toLowerCase();
  switch (bs) {
    case "deleted":   return "deleted";
    case "cancelled": return "cancelled";
    case "paid":      return "confirmed";
    case "partial":   return "partial";
    case "no-show":   return "no-show";
    default: {
      if (booking.date && booking.endTime) {
        const end = new Date(`${booking.date}T${booking.endTime}:00`);
        if (!isNaN(end.getTime()) && end < now) return "no-show";
      }
      return "pending";
    }
  }
}
