import { useState, useEffect } from "react";
import api from "../../../services/api/axios";
import type { LoyaltyEligibility } from "../../../services/api/endpoints/memberships.endpoints";

/**
 * Salon-wide loyalty plans have no per-client purchase record — every client
 * is automatically eligible — so this fetches live eligibility (unlocked or
 * still-progressing) against the current visit/day count instead of reading
 * a client-membership balance the way useClientMembershipWallet does.
 */
export function useLoyaltyEligibility(clientId: string | null | undefined, refreshKey: number = 0) {
  const [eligibility, setEligibility] = useState<LoyaltyEligibility | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId || clientId === "walk-in") { setEligibility(null); return; }
    let cancelled = false;
    setLoading(true);
    api.get("/api/v1/memberships/loyalty-eligibility", { params: { clientId } })
      .then((res) => {
        if (cancelled) return;
        setEligibility(res.data?.data ?? null);
      })
      .catch(() => { if (!cancelled) setEligibility(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, refreshKey]);

  return { eligibility, loading };
}
