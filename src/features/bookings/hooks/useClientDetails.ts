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
  return {
    ewalletAmt:   Number(d.wallet_balance ?? d.ewallet_balance ?? 0),
    rewardPoints: Number(d.reward_points_balance ?? 0),
    referralBalance: Number(d.referral_balance ?? 0),
    referralCode: d.referral_code ?? null,
    referredByClientId: d.referred_by_client_id ?? null,
    referralPending: !!d.referred_by_client_id && d.referral_reward_status === "pending",
    referralEarnings: Number(d.total_referral_earnings ?? 0),
    unpaidAmt:    Number(d.unpaid_amount ?? d.total_due ?? d.outstanding_amount ?? d.due_amount ?? 0),
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
export function useClientDetails(clientId: string | null | undefined, refreshKey?: number) {
  const [details, setDetails]   = useState<ClientDetails | null>(null);
  const [stats, setStats]       = useState<ClientStats | null>(null);
  const [loading, setLoading]   = useState(false);
  // True from when Phase 2 (history/packages/memberships — total visits, last
  // visit, total revenue) kicks off until it resolves. Separate from `loading`
  // (Phase 1 only) so callers can show a skeleton for just those fields
  // instead of quietly popping them in once the background fetch finishes.
  const [historyLoading, setHistoryLoading] = useState(false);
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
      setHistoryLoading(true);
      Promise.all([
        api.get(`/api/v1/clients/${id}/history`),
        api.get(`/api/v1/client-packages?clientId=${id}&limit=500`).catch(() => ({ data: null })),
        api.get(`/api/v1/client-memberships?clientId=${id}&limit=200`).catch(() => ({ data: null })),
      ]).then(([r, pkgRes, memRes]) => {
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

          // Revenue: fully paid appointments + paid portion of partial appointments.
          // For fully-paid appointments, prefer the payment's actual net_amount over
          // the raw catalog apptTotal() — net_amount is already reduced by any
          // membership-wallet/package coverage, whose value was already recognized
          // as revenue when that membership/package was originally sold. Falling back
          // to apptTotal() only when no payment record exists (net_amount is null).
          const paidRevenue = paidAppts.reduce((sum: number, a: any) => {
            const net = a.net_amount;
            return sum + ((net !== null && net !== undefined) ? Number(net) : apptTotal(a));
          }, 0);
          // amount_paid intentionally includes eWallet/membership-wallet money (it
          // represents "how much of this bill is settled", used elsewhere for
          // Paid/Partial status) — subtract those back out here since neither is
          // new money for the salon, same reasoning as paidRevenue above.
          const partialRevenue = partialAppts.reduce((sum: number, a: any) => {
            const collected = Number(a.amount_paid ?? a.paid_amount ?? 0);
            const walletPortion = Number(a.ewallet_used ?? 0) + Number(a.membership_wallet_used ?? 0);
            return sum + Math.max(0, collected - walletPortion);
          }, 0);

          // Package purchases: add paid amount (money actually collected for the package)
          const pkgItems: any[] = pkgRes.data?.data?.items ?? pkgRes.data?.items ?? pkgRes.data?.data ?? [];
          const packageRevenue = Array.isArray(pkgItems)
            ? pkgItems.reduce((sum: number, p: any) => sum + Number(p.paidAmount ?? p.paid_amount ?? p.totalAmount ?? p.total_amount ?? 0), 0)
            : 0;

          // Membership purchases (e.g. "Sell to client") — these create a
          // client_memberships row directly with no appointment/payment/sale
          // record, so they'd otherwise never be counted anywhere as revenue.
          const memItems: any[] = memRes?.data?.data?.items ?? memRes?.data?.items ?? [];
          const membershipRevenue = Array.isArray(memItems)
            ? memItems.reduce((sum: number, m: any) => sum + Number(m.pricePaid ?? m.price_paid ?? 0), 0)
            : 0;

          const totalBilled = paidRevenue + partialRevenue + packageRevenue + membershipRevenue;

          // Unpaid amount = due portion of PARTIALLY-paid appointments only. A booked/
          // confirmed appointment that simply hasn't happened/been paid yet is not "unpaid
          // debt" — it shouldn't count here until the client has actually made a partial
          // payment against it.
          // Uses the backend's authoritative due_amount (already net of discount/eWallet/
          // membership-wallet deductions — see payments.service.ts) rather than recomputing
          // from the appointment's raw catalog total, which doesn't know about those
          // deductions and would overstate what's actually still owed.
          const unpaidFromHistory = sortedAppts
            .filter((a: any) => isPartial(a))
            .reduce((sum: number, a: any) => sum + Math.max(0, Number(a.due_amount ?? 0)), 0);

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
        .catch(() => { /* history is best-effort */ })
        .finally(() => { if (!cancelled) setHistoryLoading(false); });

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
      setHistoryLoading(false);
      return;
    }
    fetch(clientId);
  }, [clientId, fetch, refreshKey]);

  /** Call after a payment to bump unpaidAmt locally without re-fetching */
  const patchUnpaidAmt = useCallback((newAmt: number) => {
    setDetails((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, unpaid_amount: newAmt };
      setStats(buildStats(updated));
      return updated;
    });
  }, []);

  return { details, stats, loading, historyLoading, error, patchUnpaidAmt };
}