import { useState, useEffect } from "react";
import api from "../../../services/api/axios";
import type { ClientMembership } from "../../../services/api/endpoints/clientMemberships.endpoints";
import { isExpired } from "../utils/packageStatus";

/**
 * Fetches a client's memberships (for wallet balance display/preview) and
 * exposes both the active-only subset and the full unfiltered list.
 * `primary` is the single active membership with the highest wallet balance
 * — the one the backend will actually draw from at checkout (see
 * deductWalletForBooking).
 */
// `refreshKey` lets a caller force a refetch (e.g. after selling a new
// membership from the same modal) without waiting on `clientId` to change —
// bump it and this effect re-runs. Purchasing a membership only updated a
// separate Redux slice this hook never read, so the newly bought membership
// used to stay invisible here until the whole modal was closed and reopened.
//
// Fetches unfiltered (no `status`, limit 200) rather than `status=active&limit=20`
// so this one request can also feed useClientDetails' revenue-by-category
// stats, which need every membership regardless of status — instead of that
// hook firing its own separate /client-memberships call for the same client
// right afterward. "active" filtering that the backend param used to do is
// now applied client-side below.
export function useClientMembershipWallet(clientId: string | null | undefined, refreshKey: number = 0) {
  const [allMemberships, setAllMemberships] = useState<ClientMembership[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId || clientId === "walk-in") { setAllMemberships([]); return; }
    let cancelled = false;
    setLoading(true);
    api.get("/api/v1/client-memberships", { params: { clientId, limit: 200 } })
      .then((res) => {
        if (cancelled) return;
        const items: ClientMembership[] = res.data?.data?.items ?? [];
        setAllMemberships(items);
      })
      .catch(() => { if (!cancelled) setAllMemberships([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, refreshKey]);

  // Active + not-yet-expired (guards against a membership whose expiry date
  // has passed but hasn't been flagged as such server-side yet — an expired
  // membership must never contribute wallet balance to a booking).
  const memberships = allMemberships.filter(
    (m) => m.status === "active" && !isExpired(m.expiresAt),
  );

  const primary = memberships.reduce<ClientMembership | null>((best, m) => {
    if (m.membershipWalletBalance <= 0) return best;
    if (!best || m.membershipWalletBalance > best.membershipWalletBalance) return m;
    return best;
  }, null);

  return { memberships, allMemberships, primary, loading };
}
