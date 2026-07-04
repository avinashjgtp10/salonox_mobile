import { useRef, useCallback } from "react";

export function useSingleClick<T extends unknown[]>(
  handler: (...args: T) => void | Promise<void>,
  ms = 500,
): (...args: T) => Promise<void> {
  const busyRef    = useRef(false);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;          // always points to latest handler

  return useCallback(async (...args: T) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const result = handlerRef.current(...args);
      if (result instanceof Promise) {
        await result;
      } else {
        await new Promise<void>((resolve) => setTimeout(resolve, ms));
      }
    } finally {
      busyRef.current = false;
    }
  }, []); // stable forever — no dep on handler or ms
}
