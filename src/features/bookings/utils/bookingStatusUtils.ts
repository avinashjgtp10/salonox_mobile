export type ChipStatusClass = "deleted" | "confirmed" | "partial" | "pending" | "cancelled" | "no-show";

/**
 * Single source of truth for how a booking's unified `status` maps to the
 * calendar chip's color class — shared by DayView (BookingChip), WeekView,
 * MonthView, and ListWeekView so they can't drift out of sync with each other.
 *
 * Backend now owns the full status lifecycle directly (booked/paid/partial/
 * cancelled/no-show/deleted) — no-show is flipped automatically server-side
 * once a booking's scheduled end time passes with nothing paid, so this is a
 * straight rename to the chip's existing class names, not a live computation.
 *
 * "deleted" outranks everything else — "Delete Appointment" is a soft delete
 * server-side (deleted_at, not a row removal) specifically so it can still
 * show here, greyed out, instead of vanishing without a trace.
 */
export function computeChipStatusClass(booking: {
  status?: string | null;
  isDeleted?: boolean;
}): ChipStatusClass {
  if (booking.isDeleted) return "deleted";

  const bs = (booking.status || "").toLowerCase();
  switch (bs) {
    case "deleted":   return "deleted";
    case "cancelled": return "cancelled";
    case "paid":      return "confirmed";
    case "partial":   return "partial";
    case "no-show":   return "no-show";
    default:          return "pending";
  }
}
