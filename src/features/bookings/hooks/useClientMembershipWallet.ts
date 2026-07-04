import { useState, useEffect } from "react";
import api from "../../../services/api/axios";
import type { ClientMembership } from "../../../services/api/endpoints/clientMemberships.endpoints";

/**
 * Fetches a client's active memberships (for wallet balance display/preview).
 * `primary` is the single membership with the highest wallet balance — the one
 * the backend will actually draw from at checkout (see deductWalletForBooking).
 */
export function useClientMembershipWallet(clientId: string | null | undefined) {
  const [memberships, setMemberships] = useState<ClientMembership[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId || clientId === "walk-in") { setMemberships([]); return; }
    let cancelled = false;
    setLoading(true);
    api.get("/api/v1/client-memberships", { params: { clientId, status: "active", limit: 20 } })
      .then((res) => { if (!cancelled) setMemberships(res.data?.data?.items ?? []); })
      .catch(() => { if (!cancelled) setMemberships([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  const primary = memberships.reduce<ClientMembership | null>((best, m) => {
    if (m.membershipWalletBalance <= 0) return best;
    if (!best || m.membershipWalletBalance > best.membershipWalletBalance) return m;
    return best;
  }, null);

  return { memberships, primary, loading };
}
