import { useCallback, useEffect, useMemo, useState } from "react";

import { buildClientProfileMetrics } from "@/features/clients/utils/clientProfile";
import { getApiErrorMessage } from "@/services/api";
import { clientService } from "@/services/client.service";
import type { ClientHistoryResult } from "@/types/client";

/** The selected client's web-style summary (balances, visits, revenue, plans),
 * computed the same way as the client details screen. */
export const useClientSummary = (clientId: string) => {
  const [history, setHistory] = useState<ClientHistoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setHistory(null);
    setError(null);

    if (!clientId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    clientService
      .getClientHistoryWithSummary(clientId)
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((requestError) => {
        if (!cancelled) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, reloadKey]);

  const metrics = useMemo(
    () =>
      history
        ? buildClientProfileMetrics({
            appointments: history.appointments,
            memberships: history.memberships,
            packages: history.packages,
            sales: history.sales,
            stats: history.stats,
          })
        : null,
    [history],
  );

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    error,
    loading,
    metrics,
    retry,
    stats: history?.stats ?? null,
    summary: history?.summary ?? null,
  };
};
