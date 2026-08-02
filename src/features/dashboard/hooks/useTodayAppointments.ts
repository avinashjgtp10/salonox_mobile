import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import type { TodayAppointment } from "../../../types/dashboard.types";

function computeAmount(appt: any): number {
  const itemsTotal = [
    ...(Array.isArray(appt.services)        ? appt.services        : []),
    ...(Array.isArray(appt.package_items)    ? appt.package_items    : []),
    ...(Array.isArray(appt.product_items)    ? appt.product_items    : []),
    ...(Array.isArray(appt.membership_items) ? appt.membership_items : []),
  ].reduce((s: number, it: any) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const discount = appt.discount_type === "percentage"
    ? itemsTotal * ((Number(appt.discount_value) || 0) / 100)
    : (Number(appt.discount_value) || 0);
  const taxableAmount = Math.max(itemsTotal - discount, 0);
  const taxAmount = Array.isArray(appt.tax_breakdown) && appt.tax_breakdown.length
    ? appt.tax_breakdown.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0)
    : taxableAmount * ((Number(appt.gst_percent) || 0) / 100);
  return Math.round(taxableAmount + taxAmount + (Number(appt.tip_amount) || 0));
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

  const refetch = useCallback(async () => {
    abortRef.current?.abort();
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

      const mapped: TodayAppointment[] = appts.map((appt) => {
        const svcName =
          appt.services?.[0]?.name ?? appt.services?.[0]?.service_name ??
          appt.product_items?.[0]?.name ?? "Appointment";
        const extra = (appt.services?.length ?? 0) - 1;
        return {
          id: appt.id,
          clientName: appt.client_name ?? "Walk-in",
          serviceName: extra > 0 ? `${svcName} +${extra} more` : svcName,
          staffName: appt.staff_name ?? "—",
          startTime: appt.scheduled_at ? toUtcAmPm(appt.scheduled_at) : "—",
          status: computeStatus(appt),
          amount: computeAmount(appt),
          // appointments.repository.ts's listBySalonId already sums this
          // across payments (status IN completed/partial) per appointment —
          // used to show "₹X of ₹Y" instead of implying the full bill was paid.
          paidAmount: Number(appt.paid_amount) || 0,
        };
      });
      setAppointments(mapped);
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") {
        setAppointments([]);
        setError(e?.response?.data?.message || e?.message || "Failed to load today's appointments");
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // A checkout/payment completed elsewhere (Calendar, Quick Sale, another
  // tab) never pushes an update into this hook — it only ever fetched once,
  // on mount, so a booking paid AFTER that fetch kept showing whatever it
  // looked like (booked, and past its slot → "no-show") until the whole page
  // was reloaded. Refetch whenever the tab regains focus/visibility — the
  // common case of switching away to collect a payment then coming back.
  // Deliberately NOT a recurring timer — this used to also poll every 30s in
  // the background regardless of whether the dashboard was even open.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refetch);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refetch);
    };
  }, [refetch]);

  return { appointments, loading, error, refetch };
}
