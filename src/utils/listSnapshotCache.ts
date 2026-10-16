const DEFAULT_TTL_MS = 2 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 8;

type Entry<T> = { value: T; savedAt: number };

/**
 * Holds full collections that must be loaded completely before they can be
 * sorted/sliced on the device (endpoints that ignore sort/pagination params).
 * A first-page request always reloads; later pages of the same query reuse
 * that snapshot instead of downloading the whole collection again.
 * Identical concurrent loads share one request.
 */
export function createListSnapshotCache<T>(options: { maxEntries?: number; ttlMs?: number } = {}) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const entries = new Map<string, Entry<T>>();
  const inFlight = new Map<string, Promise<T>>();
  let generation = 0;

  const getFresh = (key: string) => {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.savedAt > ttlMs) {
      entries.delete(key);
      return undefined;
    }
    return entry.value;
  };

  return {
    /** `reuse` serves a saved snapshot when one exists; otherwise the loader runs. */
    load(key: string, reuse: boolean, loader: () => Promise<T>): Promise<T> {
      const cached = reuse ? getFresh(key) : undefined;
      if (cached !== undefined) return Promise.resolve(cached);

      const pending = inFlight.get(key);
      if (pending) return pending;

      const requestGeneration = generation;
      const request = loader()
        .then((value) => {
          if (requestGeneration === generation) {
            entries.delete(key);
            entries.set(key, { value, savedAt: Date.now() });
            while (entries.size > maxEntries) {
              const oldestKey = entries.keys().next().value;
              if (oldestKey === undefined) break;
              entries.delete(oldestKey);
            }
          }
          return value;
        })
        .finally(() => {
          if (inFlight.get(key) === request) inFlight.delete(key);
        });
      inFlight.set(key, request);
      return request;
    },

    /** Drop every snapshot, e.g. after the underlying data was changed. */
    clear() {
      generation += 1;
      entries.clear();
      inFlight.clear();
    },
  };
}

/** Stable key for a flat params object, independent of property order. */
export const snapshotKey = (params: Record<string, unknown>) =>
  JSON.stringify(Object.keys(params).sort().map((key) => [key, params[key]]));
