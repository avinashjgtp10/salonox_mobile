import { useCallback, useEffect, useMemo, useState } from "react";

import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { clientService } from "@/services/client.service";
import type { ClientListItem } from "@/types/client";

type UseRecentClientsArgs = {
  enabled: boolean;
  salonId: string | null | undefined;
  searchQuery: string;
};

/**
 * Loads the short client list shown on Quick Sale's "choose client" step:
 * the 3 most recent clients, or up to 8 matches while a search is typed.
 */
export function useRecentClients({ enabled, salonId, searchQuery }: UseRecentClientsArgs) {
  const [options, setOptions] = useState<ClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 260);
  const trimmedSearchQuery = debouncedSearchQuery.trim();
  const limit = trimmedSearchQuery ? 8 : 3;

  useEffect(() => {
    let isSubscribed = true;

    if (!enabled) {
      return () => {
        isSubscribed = false;
      };
    }

    const query = {
      inactive: false,
      limit,
      offset: 0,
      search: trimmedSearchQuery,
      sort_by: "created_at",
      sort_order: "desc" as const,
    };

    setIsLoading(true);
    setError(null);

    const request = trimmedSearchQuery
      ? clientService.searchClients(query, salonId)
      : clientService.getClients(query, salonId);

    request
      .then((response) => {
        if (!isSubscribed) return;
        setOptions(response.clients);
      })
      .catch((requestError) => {
        if (!isSubscribed) return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load clients.");
        setOptions([]);
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [enabled, limit, reloadKey, salonId, trimmedSearchQuery]);

  const clients = useMemo(() => options.slice(0, limit), [limit, options]);
  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  return {
    clients,
    error,
    isLoading,
    isSearching: trimmedSearchQuery.length > 0,
    reload,
  };
}
