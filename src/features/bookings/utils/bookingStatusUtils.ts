export type ChipStatusClass = "confirmed" | "partial" | "pending" | "cancelled" | "no-show";

/**
 * Single source of truth for how a booking's raw status/paymentStatus map to
 * the calendar chip's color class — shared by DayView (BookingChip), WeekView,
 * MonthView, and ListWeekView so they can't drift out of sync with each other.
 *
 * "no-show" is a display-only auto-detection (scheduled end time has passed
 * with nothing paid at all) — it never writes back to the booking's real
 * status, so the booking stays exactly as editable as any other.
 */
export function computeChipStatusClass(booking: {
  status?: string | null;
  paymentStatus?: string | null;
  date?: string | null;
  endTime?: string | null;
}): ChipStatusClass {
  const ps = (booking.paymentStatus || "").toLowerCase();
  const bs = (booking.status || "").toLowerCase();
  const isPaid = ps === "paid" || ps === "completed";
  const isPartial = ps === "partial";
  const isCancelled = bs === "cancelled";
  const isCompleted = bs === "completed" || bs === "no_show";

  if (isCancelled) return "cancelled";
  if (isCompleted) return "confirmed";
  if (isPaid) return "confirmed";
  if (isPartial) return "partial";

  if (booking.date && booking.endTime) {
    const endMs = new Date(`${booking.date}T${booking.endTime}:00`).getTime();
    if (!isNaN(endMs) && endMs < Date.now()) return "no-show";
  }
  return "pending";
}
