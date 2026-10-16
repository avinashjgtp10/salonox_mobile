import { useEffect } from "react";

export const SALES_LIST_SCREEN = "salesList";

const mountedCounts = new Map<string, number>();

/** Whether a screen that registered itself with `useActiveScreen` is mounted. */
export const isScreenActive = (name: string) => (mountedCounts.get(name) ?? 0) > 0;

/**
 * Registers the calling screen as mounted, so background refreshes of data
 * only that screen shows can be skipped while it is closed.
 */
export function useActiveScreen(name: string) {
  useEffect(() => {
    mountedCounts.set(name, (mountedCounts.get(name) ?? 0) + 1);
    return () => {
      const next = (mountedCounts.get(name) ?? 1) - 1;
      if (next > 0) mountedCounts.set(name, next);
      else mountedCounts.delete(name);
    };
  }, [name]);
}
