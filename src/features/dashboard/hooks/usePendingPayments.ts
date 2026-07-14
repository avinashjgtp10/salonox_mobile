import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../services/api/axios";
import { BOOKING } from "../../../services/api/endpoints";

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
        const price = Math.round(taxableAmount + taxAmount + (Number(appt.tip_amount) || 0));
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
