import { useCallback, useEffect, useRef, useState } from "react";

import { uniqueByKey } from "@/features/quickSale/utils/unique";
import { getApiErrorMessage } from "@/services/api";

export type EntitySearchPage<T> = {
  hasMore: boolean;
  items: T[];
};

// A self-contained, Redux-free search-as-you-type list: used by the global
// search dropdown so typing here never clobbers the full paginated
// Client/Service/Product Redux slices that the dedicated browse tabs rely on
// (those two concerns would otherwise fight over the same `state.client.
// clients` / `state.service.services` / `state.product.products` arrays).
export const useEntitySearch = <T,>(
  searchPage: (query: string, offset: number) => Promise<EntitySearchPage<T>>,
  query: string,
  pageSize: number,
  getItemKey?: (item: T) => string,
) => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const requestIdRef = useRef(0);
  const itemCountRef = useRef(0);
  const getItemKeyRef = useRef(getItemKey);
  getItemKeyRef.current = getItemKey;

  useEffect(() => {
    const trimmed = query.trim();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!trimmed) {
      setItems([]);
      setHasMore(false);
      setError(null);
      setLoading(false);
      itemCountRef.current = 0;
      return;
    }

    setLoading(true);
    setError(null);

    searchPage(trimmed, 0)
      .then((page) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        const pageItems = getItemKeyRef.current ? uniqueByKey(page.items, getItemKeyRef.current) : page.items;

        setItems(pageItems);
        setHasMore(page.hasMore);
        itemCountRef.current = page.items.length;
      })
      .catch((searchError) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setError(getApiErrorMessage(searchError));
        setItems([]);
        setHasMore(false);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [query, searchPage]);

  const loadMore = useCallback(() => {
    const trimmed = query.trim();

    if (!trimmed || loading || loadingMore || !hasMore) {
      return;
    }

    const requestId = requestIdRef.current;

    setLoadingMore(true);

    searchPage(trimmed, itemCountRef.current)
      .then((page) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        const nextOffset = itemCountRef.current + page.items.length;

        setItems((current) => {
          const nextItems = getItemKeyRef.current
            ? uniqueByKey([...current, ...page.items], getItemKeyRef.current)
            : [...current, ...page.items];

          return nextItems;
        });
        setHasMore(page.hasMore);
        itemCountRef.current = nextOffset;
      })
      .catch(() => {
        // Silently keep the already-loaded page — the user can retry by
        // scrolling again, and a full-dropdown error banner for a
        // load-more failure would be disproportionate.
      })
      .finally(() => setLoadingMore(false));
  }, [hasMore, loading, loadingMore, query, searchPage]);

  return { error, hasMore, items, loading, loadingMore, loadMore, pageSize };
};
