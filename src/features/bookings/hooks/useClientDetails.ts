import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api/axios";
import type { ClientDetails, ClientStats } from "../types";

function formatDate(raw?: string | null): string {
  if (!raw || raw === "N/A") return "N/A";
  try {
    return new Date(raw).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return raw; }
}

function buildStats(d: ClientDetails): ClientStats {
  const rp = d.reward_points ?? d.rewardPoints;
  return {
    rewardPoints: (rp != null && Number(rp) > 0) ? String(rp) : "None",
    ewalletAmt:   Number(d.wallet_balance ?? d.ewallet_balance ?? 0),
    unpaidAmt:    Number(d.unpaid_amount ?? d.total_due ?? d.outstanding_amount ?? d.due_amount ?? 0),
    assignDiscount: Number(d.assign_discount ?? 0),
    discountValidity: d.discount_validity || "N/A",
    membership:   d.membership_tier || d.membership || "NA",
    cancelled:    Number(d.cancelled_count ?? 0),
    totalVisit:   Number(d.total_visits ?? 0),
    lastVisit:    formatDate(d.last_visit_date ?? d.last_visit_at),
    totalRevenue: Number(d.total_revenue ?? 0),
    noShow:       Number(d.no_show_count ?? 0),
  };
}

/**
 * Fetches a client's full profile + history stats whenever clientId changes.
 * Phase 1: fast profile fetch (profile API) → sets stat card immediately.
 * Phase 2: background history fetch → enriches total_visits, cancelled, total_revenue.
 */
export function useClientDetails(clientId: string | null | undefined) {
  const [details, setDetails]   = useState<ClientDetails | null>(null);
  const [stats, setStats]       = useState<ClientStats | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    let cancelled = false;

    try {
      // ── Phase 1: profile ─────────────────────────────────────────────────
      const res = await api.get(`/api/v1/clients/${id}`);
      const client: ClientDetails = res.data?.data ?? res.data;

      if (cancelled) return;

      const lastVisit = client.last_visit_date ?? client.last_visit_at ?? null;
      const resolvedPhone = (
        client.phone_number || client.phone ||
        client.mobile || client.mobile_number || client.phone_no || ""
      ).replace(/[^\d+]/g, "");

      const enriched: ClientDetails = {
        ...client,
        phone_number: resolvedPhone,
        last_visit_date: lastVisit,
        unpaid_amount: (client.unpaid_amount ?? 0) > 0 ? client.unpaid_amount : 0,
      };

      setDetails(enriched);
      setStats(buildStats(enriched));

      // ── Phase 2: history stats (background, non-blocking) ────────────────
      Promise.all([
        api.get(`/api/v1/clients/${id}/history`),
        api.get(`/api/v1/client-packages?clientId=${id}&limit=500`).catch(() => ({ data: null })),
      ]).then(([r, pkgRes]) => {
          if (cancelled) return;
          const histData = r.data?.data ?? r.data ?? null;
          const s = histData?.stats ?? null;

          const appts: any[] = histData?.appointments ?? [];

          const statusOf    = (a: any) => (a.payment_status ?? a.status ?? "").toLowerCase();
          const isPaid      = (a: any) => { const ps = statusOf(a); return ps === "paid" || ps === "completed"; };
          const isPartial   = (a: any) => statusOf(a) === "partial";
          const isCancelled = (a: any) => statusOf(a) === "cancelled";

          // Sum all item types on an appointment (services + products + packages + memberships),
          // plus extra charges. Discount is intentionally excluded (item totals are pre-discount)
          // and tip is intentionally excluded (shown only on the booking tooltip hover).
          const apptTotal = (a: any): number => {
            const svcs  = Array.isArray(a.services)          ? a.services          : [];
            const prods = Array.isArray(a.product_items    ?? a.productItems)    ? (a.product_items    ?? a.productItems    ?? []) : [];
            const pkgs  = Array.isArray(a.package_items    ?? a.packageItems)    ? (a.package_items    ?? a.packageItems    ?? []) : [];
            const mems  = Array.isArray(a.membership_items ?? a.membershipItems) ? (a.membership_items ?? a.membershipItems ?? []) : [];
            const allItems = [...svcs, ...prods, ...pkgs, ...mems];
            const exCharges = Number(a.ex_charges ?? a.exCharges ?? 0);
            if (allItems.length > 0) {
              return allItems.reduce((t: number, item: any) => t + Number(item.total ?? item.price ?? 0), 0) + exCharges;
            }
            return Number(a.grand_total ?? a.total_amount ?? a.total ?? a.amount ?? 0);
          };

          // Sort newest-first so first element = most recent appointment
          const sortedAppts = [...appts].sort((a, b) =>
            new Date(b.scheduled_at ?? 0).getTime() - new Date(a.scheduled_at ?? 0).getTime()
          );

          const paidAppts    = sortedAppts.filter(isPaid);
          const partialAppts = sortedAppts.filter(isPartial);

          // Most recent visit = newest paid or partial appointment
          const lastPaidAt = sortedAppts.find((a) => isPaid(a) || isPartial(a))?.scheduled_at ?? null;

          // Revenue: fully paid appointments + paid portion of partial appointments
          const paidRevenue    = paidAppts.reduce((sum: number, a: any) => sum + apptTotal(a), 0);
          const partialRevenue = partialAppts.reduce((sum: number, a: any) =>
            sum + Number(a.amount_paid ?? a.paid_amount ?? 0), 0);

          // Package purchases: add paid amount (money actually collected for the package)
          const pkgItems: any[] = pkgRes.data?.data?.items ?? pkgRes.data?.items ?? pkgRes.data?.data ?? [];
          const packageRevenue = Array.isArray(pkgItems)
            ? pkgItems.reduce((sum: number, p: any) => sum + Number(p.paidAmount ?? p.paid_amount ?? p.totalAmount ?? p.total_amount ?? 0), 0)
            : 0;

          const totalBilled = paidRevenue + partialRevenue + packageRevenue;

          // Unpaid amount = due portion of PARTIALLY-paid appointments only. A booked/
          // confirmed appointment that simply hasn't happened/been paid yet is not "unpaid
          // debt" — it shouldn't count here until the client has actually made a partial
          // payment against it.
          const unpaidFromHistory = sortedAppts
            .filter((a: any) => isPartial(a))
            .reduce((sum: number, a: any) => {
              const total = apptTotal(a);
              const paid  = Number(a.amount_paid ?? a.paid_amount ?? 0);
              return sum + Math.max(0, total - paid);
            }, 0);

          setDetails((prev) => {
            if (!prev) return prev;
            const updated: ClientDetails = {
              ...prev,
              total_visits:    paidAppts.length + partialAppts.length,
              cancelled_count: s
                ? (s.cancellations ?? s.cancelled_count ?? 0)
                : sortedAppts.filter(isCancelled).length,
              total_revenue:   totalBilled,
              last_visit_date: lastPaidAt ?? prev.last_visit_date ?? null,
              unpaid_amount:   unpaidFromHistory > 0 ? unpaidFromHistory : (prev.unpaid_amount ?? 0),
            };
            setStats(buildStats(updated));
            return updated;
          });
        })
        .catch(() => { /* history is best-effort */ });

    } catch (err: any) {
      if (!cancelled) setError(err?.message || "Failed to load client");
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!clientId || clientId === 'walk-in') {
      setDetails(null);
      setStats(null);
      setError(null);
      return;
    }
    fetch(clientId);
  }, [clientId, fetch]);

  /** Call after a payment to bump unpaidAmt locally without re-fetching */
  const patchUnpaidAmt = useCallback((newAmt: number) => {
    setDetails((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, unpaid_amount: newAmt };
      setStats(buildStats(updated));
      return updated;
    });
  }, []);

  return { details, stats, loading, error, patchUnpaidAmt };
}