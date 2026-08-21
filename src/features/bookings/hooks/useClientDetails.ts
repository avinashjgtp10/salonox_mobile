import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api/axios";
import type { ClientDetails, ClientStats } from "../types";
import { formatDateDDMMYYYY } from "../../../utils/dateFormat";

function formatDate(raw?: string | null): string {
  if (!raw || raw === "N/A") return "N/A";
  try {
    return formatDateDDMMYYYY(new Date(raw));
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

    serviceRevenue:    Number(d.service_revenue ?? 0),
    productRevenue:    Number(d.product_revenue ?? 0),
    packageRevenue:    Number(d.package_revenue ?? 0),
    membershipRevenue: Number(d.membership_revenue ?? 0),
    serviceCount:      Number(d.service_count ?? 0),
    productCount:      Number(d.product_count ?? 0),
    activePackageCount: Number(d.active_package_count ?? 0),
    activeMembershipName: d.active_membership_name ?? null,
    activeMembershipExpiresAt: d.active_membership_expires_at ?? null,
  };
}

/**
 * Fetches a client's full profile — plus packages, memberships, visit
 * history, and loyalty eligibility — in ONE request via the consolidated
 * POST /clients/:id/details endpoint, instead of the 4-5 separate GETs
 * (profile, history, client-packages, client-memberships, loyalty-eligibility)
 * this used to fire independently.
 */
export function useClientDetails(
  clientId: string | null | undefined,
  refreshKey?: number,
) {
  const [details, setDetails]   = useState<ClientDetails | null>(null);
  const [stats, setStats]       = useState<ClientStats | null>(null);
  const [loading, setLoading]   = useState(false);
  // Kept for API compatibility with existing callers that show a separate
  // skeleton for history-derived fields — always resolves together with
  // `loading` now, since the consolidated endpoint returns everything in
  // one response instead of a fast Phase 1 + background Phase 2.
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetch = useCallback(async (id: string) => {
    setLoading(true);
    setHistoryLoading(true);
    setError(null);
    let cancelled = false;

    try {
      const res = await api.post(`/api/v1/clients/${id}/details`, {
        include: ["packages", "memberships", "history", "loyalty"],
      });
      const client: any = res.data?.data ?? res.data;

      if (cancelled) return;

      const lastVisit = client.history?.last_visit_date ?? client.last_visit_date ?? client.last_visit_at ?? null;
      const resolvedPhone = (
        client.phone_number || client.phone ||
        client.mobile || client.mobile_number || client.phone_no || ""
      ).replace(/[^\d+]/g, "");

      const pkgItems: any[] = Array.isArray(client.packages) ? client.packages : [];
      const memItems: any[] = Array.isArray(client.memberships) ? client.memberships : [];
      const activeMembership = memItems.find((m: any) => (m.status ?? "").toLowerCase() === "active") ?? null;

      const enriched: ClientDetails = {
        ...client,
        phone_number: resolvedPhone,
        last_visit_date: lastVisit,
        unpaid_amount: (client.unpaid_amount ?? 0) > 0 ? client.unpaid_amount : 0,
        total_visits:    client.history?.total_visits ?? 0,
        cancelled_count: client.history?.cancelled_count ?? 0,
        total_revenue:   client.history?.total_revenue ?? 0,
        active_package_count: pkgItems.filter((p: any) => (p.status ?? "").toLowerCase() === "active").length,
        active_membership_name: activeMembership?.membershipName ?? activeMembership?.membership_name ?? null,
        active_membership_expires_at: activeMembership?.expiresAt ?? activeMembership?.expires_at ?? null,
      };

      setDetails(enriched);
      setStats(buildStats(enriched));
    } catch (err: any) {
      if (!cancelled) setError(err?.message || "Failed to load client");
    } finally {
      if (!cancelled) { setLoading(false); setHistoryLoading(false); }
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