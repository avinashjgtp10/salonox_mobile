import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import { mapApiBooking } from "../../bookings/utils/bookingMapper";
import type { TodayAppointment } from "../../../types/dashboard.types";

// Reuses the exact same grand-total logic (subtotal − discount + tax +
// tip, GST-inclusive) that the Calendar/Appointments screen and Reports
// already trust — see bookingMapper.ts's grandTotalVal. A hand-rolled
// recompute here previously read the wrong field names for tax/GST
// (snake_case that the API never sends) and silently priced bookings
// without GST, so this bill total must always come from that one shared
// mapper instead of being re-derived per screen.
function computeAmount(appt: any): number {
  return Number(mapApiBooking(appt).grandTotal) || 0;
}

// This one service line's own price (row.total when set — carries any
// per-row "Disc %" — else price × qty), used as its dashboard row amount.
function computeServiceAmount(svc: any): number {
  const qty = Number(svc.qty ?? svc.quantity) || 1;
  const t = Number(svc.total);
  return (svc.total !== undefined && svc.total !== null && isFinite(t)) ? t : (Number(svc.price) || 0) * qty;
}

// The backend never auto-flags a booking as "no-show" once its slot passes —
// that's a display-only inference the calendar computes itself (see
// bookingStatusUtils.computeChipStatusClass). Replicated here so a dashboard
// row doesn't sit stuck on "Upcoming" long after the calendar already shows
// the same booking as missed.
function computeStatus(appt: any): TodayAppointment["status"] {
  const bs = String(appt.status ?? "").toLowerCase();
  if (appt.deleted_at) return "deleted";
  if (bs === "cancelled") return "cancelled";
  if (bs === "paid")      return "completed";
  if (bs === "no-show")   return "no-show";
  // A partial payment means the client genuinely showed up and paid
  // something — it must never fall into the no-show inference below just
  // because the slot time has passed. Mirrors salon-dashboard.repository.ts's
  // mapStatus(), which gives 'partial' its own bucket instead of folding it
  // into "upcoming".
  if (bs === "partial")   return "partial";
  // booked intentionally falls through to the time-based check below.

  const endIso = appt.ends_at ?? appt.end_time;
  if (endIso) {
    const endMs = new Date(endIso).getTime();
    if (!isNaN(endMs) && endMs < Date.now()) return "no-show";
  }
  return "upcoming";
}

// DashboardPage's normalise() runs `time`/`startTime` through utcTimeToLocal,
// which expects a "hh:mm AM/PM" string that it treats as UTC and converts to
// the browser's local time — so the raw ISO scheduled_at has to be reduced to
// that same shape here rather than passed through as-is.
function toUtcAmPm(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * The backend's /dashboard/all endpoint returns todayAppointments as a stale
 * snapshot — amount doesn't reflect items added after the booking was created,
 * and status is never updated to "no-show" once a slot is missed. Both are
 * visibly correct in the calendar (it reads live booking data), so this fetches
 * that same live data instead of trusting the dashboard snapshot.
 */
export function useTodayAppointments() {
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Mount, document.visibilitychange, and window's "focus" event can each
  // independently call refetch() — the latter two commonly fire together on
  // a single tab-switch, and React StrictMode double-invokes the mount
  // effect in dev — so without this, a still-in-flight call kept getting
  // aborted-and-restarted by a second trigger firing milliseconds later,
  // showing up as a wasted, visibly "failed" cancelled request even though
  // nothing had actually changed between the two triggers. Skipping the
  // restart when one's already running coalesces those into a single real
  // request, while a later, genuinely separate trigger (nothing in flight
  // by then) still refetches normally.
  const refetch = useCallback(async () => {
    if (abortRef.current) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.get(BOOKING.BASE, {
        params: { start_date: today, end_date: today, limit: "200" },
        signal: ctrl.signal,
      });
      const raw = res.data?.data;
      const appts: any[] =
        Array.isArray(raw?.items) ? raw.items :
        Array.isArray(raw?.data)  ? raw.data  :
        Array.isArray(raw)        ? raw        : [];

      // One row per SERVICE, not per appointment — a booking with multiple
      // services (each with its own staff/time) used to collapse into a
      // single "Hair Spa +1 more" row showing only the first service and the
      // appointment-level staff, hiding who actually did the second service
      // and when. Products/packages/memberships/wallet items are deliberately
      // excluded — an appointment with none of its own `services` produces no
      // row at all.
      const mapped: TodayAppointment[] = appts.flatMap((appt) => {
        const services: any[] = Array.isArray(appt.services) ? appt.services : [];
        if (services.length === 0) return [];

        const status = computeStatus(appt);
        const totalPaid = Number(appt.paid_amount) || 0;
        const billTotal = computeAmount(appt);
        // Sum of raw pre-tax/pre-discount line items, used only as the base
        // to split billTotal (GST-inclusive) proportionally across rows below.
        const rawItemsTotal = services.reduce((s, svc) => s + computeServiceAmount(svc), 0);

        return services.map((svc, idx) => {
          const svcRaw = computeServiceAmount(svc);
          // Each row must show its share of the bill's true GST-inclusive
          // grand total, not the raw pre-tax line-item price — otherwise the
          // dashboard's Amount column silently excludes GST/discount/tip that
          // the same booking's grand total (shown on Calendar/Appointments)
          // already includes.
          const svcAmount = rawItemsTotal > 0
            ? Math.round(billTotal * (svcRaw / rawItemsTotal))
            : Math.round(billTotal / services.length);
          // Splits the appointment's overall paid amount proportionally by
          // each service's own share of the bill — so "₹X of ₹Y" per row
          // still sums back to what was actually collected on this booking,
          // instead of repeating the full appointment-level paid amount on
          // every one of its service rows.
          const svcPaid = billTotal > 0 ? Math.round(totalPaid * (svcAmount / billTotal)) : 0;
          return {
            id: `${appt.id}-${svc.service_id ?? idx}`,
            clientName: appt.client_name ?? "Walk-in",
            serviceName: svc.name || svc.service_name || "Service",
            staffName: svc.staff_name || appt.staff_name || "—",
            startTime: svc.start_time
              ? toUtcAmPm(svc.start_time)
              : (appt.scheduled_at ? toUtcAmPm(appt.scheduled_at) : "—"),
            status,
            amount: svcAmount,
            // appointments.repository.ts's listBySalonId already sums this
            // across payments (status IN completed/partial) per appointment —
            // used to show "₹X of ₹Y" instead of implying the full bill was paid.
            paidAmount: svcPaid,
          };
        });
      });
      setAppointments(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setAppointments([]);
        setError(e?.response?.data?.message || e?.message || "Failed to load today's appointments");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // Deliberately NO tab-focus/visibilitychange auto-refetch here — this
  // hook only loads on mount; use the dashboard's Refresh button (which
  // calls `refetch`) to pick up changes made elsewhere.

  return { appointments, loading, error, refetch };
}
