import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

import { uniqueByKey } from "@/features/quickSale/utils/unique";

// Generic "recently used" list backed by real local usage — not a fabricated
// "popular"/"favourite" flag (the backend has no such field for services,
// products, or search terms). Newest first, de-duplicated, capped.
export const useRecentList = <T,>(storageKey: string, maxItems: number, getId: (item: T) => string) => {
  const [recentItems, setRecentItems] = useState<T[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const getIdRef = useRef(getId);
  getIdRef.current = getId;

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (!isMounted || !raw) {
          return;
        }

        try {
          const parsed = JSON.parse(raw) as T[];

          if (Array.isArray(parsed)) {
            setRecentItems(uniqueByKey(parsed, getIdRef.current).slice(0, maxItems));
          }
        } catch {
          // Corrupted cache entry — ignore and start fresh.
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [maxItems, storageKey]);

  const recordUsage = useCallback(
    (item: T) => {
      setRecentItems((current) => {
        const itemId = getIdRef.current(item);
        const withoutDuplicate = current.filter((existing) => getIdRef.current(existing) !== itemId);
        const next = [item, ...withoutDuplicate].slice(0, maxItems);

        void AsyncStorage.setItem(storageKey, JSON.stringify(next));

        return next;
      });
    },
    [maxItems, storageKey],
  );

  const clearRecent = useCallback(() => {
    setRecentItems([]);
    void AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  return { clearRecent, isLoaded, recentItems, recordUsage };
};
