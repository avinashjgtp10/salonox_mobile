import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";
import { mapApiBooking } from "../../bookings/utils/bookingMapper";

export interface PendingPaymentsSummary {
  count: number;
  amount: number;
}

/**
 * The backend's /dashboard/all endpoint always returns pendingPayments as
 * {count: 0, amount: 0} regardless of actual unpaid/partial invoices. Until
 * that's fixed server-side, compute it here the same way Sales Summary does —
 * from real appointment price/paid_amount — instead of trusting that field.
 */
export function usePendingPayments() {
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentsSummary | undefined>(undefined);
  const [pendingLoading, setPendingLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refetchPending = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPendingLoading(true);
    try {
      const res = await api.get(BOOKING.BASE, { params: { limit: "500" }, signal: ctrl.signal });
      const raw = res.data?.data;
      const appts: any[] =
        Array.isArray(raw?.items) ? raw.items :
        Array.isArray(raw?.data)  ? raw.data  :
        Array.isArray(raw)        ? raw        : [];

      const clientsWithDues = new Set<string>();
      let amount = 0;
      appts.forEach((appt: any) => {
        const status = String(appt.payment_status ?? "unpaid").toLowerCase();
        if (status !== "unpaid" && status !== "partial") return;

        // Reuses the same grand-total logic (subtotal − discount + tax +
        // tip, GST-inclusive) as Calendar/Appointments and Reports — see
        // bookingMapper.ts's grandTotalVal — instead of a separate
        // hand-rolled recompute that read tax/GST field names the API
        // never actually sends.
        const price = Number(mapApiBooking(appt).grandTotal) || 0;
        const paid = Number(appt.paid_amount) || 0;
        const balance = Math.max(price - paid, 0);
        if (balance <= 0) return;

        amount += balance;
        const clientKey = appt.client_id ? String(appt.client_id) : `${appt.client_name ?? "walkin"}|${appt.client_phone ?? ""}`;
        clientsWithDues.add(clientKey);
      });

      setPendingPayments({ count: clientsWithDues.size, amount: Math.round(amount) });
    } catch (e: any) {
      if (e?.code !== "ERR_CANCELED" && e?.name !== "CanceledError") setPendingPayments({ count: 0, amount: 0 });
    } finally {
      if (!ctrl.signal.aborted) setPendingLoading(false);
    }
  }, []);

  useEffect(() => { refetchPending(); }, [refetchPending]);

  return { pendingPayments, pendingLoading, refetchPending };
}
