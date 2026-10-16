import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/services/api";

/** Owns a complete catalog without inheriting another screen's Redux filters. */
export function useCatalogCollection<T>(fetchItems: () => Promise<T[]>, scopeKey?: string | null) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    setItems([]);
    return () => { generation.current += 1; };
  }, [scopeKey]);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchItems();
      if (request === generation.current) setItems(result);
    } catch (failure) {
      if (request === generation.current) setError(getApiErrorMessage(failure));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [fetchItems]);
  useEffect(() => { void load(); }, [load]);
  return { items, loading, error, load };

}
