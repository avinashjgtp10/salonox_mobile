import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Lets a focused numeric input be adjusted with the mouse wheel: scroll up
 * increases the value, scroll down decreases it. Only intervenes while the
 * input has focus, so unfocused scrolling still scrolls the page normally.
 *
 * Registered as a native (non-passive) listener because React's onWheel is
 * passive by default, which would silently ignore preventDefault().
 */
export function useWheelStepInput(
  ref: RefObject<HTMLInputElement | null>,
  onValueChange: (next: string) => void,
  options?: { min?: number; step?: number; fineStep?: number }
) {
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const min = options?.min ?? 0;
  const step = options?.step ?? 1;
  const fineStep = options?.fineStep ?? 0.01;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (document.activeElement !== el) return; // not focused: let the page scroll normally

      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY < 0 ? 1 : -1;
      const stepSize = e.shiftKey ? fineStep : step;
      const current = parseFloat(el.value) || 0;
      const next = Math.max(min, round2(current + delta * stepSize));

      onValueChangeRef.current(String(next));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [ref, min, step, fineStep]);
}
