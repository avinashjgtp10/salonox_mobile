import { useEffect, useRef } from "react";

/**
 * Automatically calls `onNavigate` after `delay` ms once `isReady` becomes true.
 * Cancels the timer if `isReady` flips back to false before the delay elapses.
 * Always invokes the latest version of `onNavigate` (via ref), so stale-closure
 * issues are avoided even when the callback captures local state.
 */
export function useAutoNavigate(
  isReady: boolean,
  onNavigate: () => void,
  delay = 500
) {
  const callbackRef = useRef(onNavigate);
  callbackRef.current = onNavigate;

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => callbackRef.current(), delay);
    return () => clearTimeout(timer);
  }, [isReady, delay]);
}
