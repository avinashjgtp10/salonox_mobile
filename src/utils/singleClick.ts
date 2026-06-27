import { useRef, useCallback } from "react";

export function useSingleClick<T extends unknown[]>(
  handler: (...args: T) => void | Promise<void>,
  ms = 500,
): (...args: T) => void {
  const busyRef    = useRef(false);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;          // always points to latest handler

  return useCallback((...args: T) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const result = handlerRef.current(...args);
    if (result instanceof Promise) {
      result.finally(() => { busyRef.current = false; });
    } else {
      setTimeout(() => { busyRef.current = false; }, ms);
    }
  }, []); // stable forever — no dep on handler or ms
}
