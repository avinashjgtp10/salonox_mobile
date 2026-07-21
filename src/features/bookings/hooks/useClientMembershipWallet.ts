import { useState, useEffect } from "react";
import api from "../../../services/api/axios";
import type { ClientMembership } from "../../../services/api/endpoints/clientMemberships.endpoints";
import { isExpired } from "../utils/packageStatus";

/**
 * Fetches a client's active memberships (for wallet balance display/preview).
 * `primary` is the single membership with the highest wallet balance — the one
 * the backend will actually draw from at checkout (see deductWalletForBooking).
 */
// `refreshKey` lets a caller force a refetch (e.g. after selling a new
// membership from the same modal) without waiting on `clientId` to change —
// bump it and this effect re-runs. Purchasing a membership only updated a
// separate Redux slice this hook never read, so the newly bought membership
// used to stay invisible here until the whole modal was closed and reopened.
export function useClientMembershipWallet(clientId: string | null | undefined, refreshKey: number = 0) {
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId || clientId === "walk-in") { setMemberships([]); return; }
    let cancelled = false;
    setLoading(true);
    api.get("/api/v1/client-memberships", { params: { clientId, status: "active", limit: 20 } })
      .then((res) => {
        if (cancelled) return;
        // Backend "active" filtering aside, also guard against a membership
        // whose expiry date has passed but hasn't been flagged as such
        // server-side yet — an expired membership must never contribute wallet
        // balance to a booking.
        const items: ClientMembership[] = res.data?.data?.items ?? [];
        setMemberships(items.filter((m) => !isExpired(m.expiresAt)));
      })
      .catch(() => { if (!cancelled) setMemberships([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, refreshKey]);

  const primary = memberships.reduce<ClientMembership | null>((best, m) => {
    if (m.membershipWalletBalance <= 0) return best;
    if (!best || m.membershipWalletBalance > best.membershipWalletBalance) return m;
    return best;
  }, null);

  return { memberships, primary, loading };
}
