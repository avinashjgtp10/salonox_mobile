import { createContext, useCallback, useContext, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

export const ScrollFooterContext = createContext<((hidden: boolean) => void) | null>(null);

/** Observe actual vertical scrolling without taking over touch gestures. */
export function useScrollFooter() {
  const setHidden = useContext(ScrollFooterContext);
  const previous = useRef(0);
  const distance = useRef(0);
  const dragging = useRef(false);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!setHidden) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxOffset = Math.max(0, contentSize.height - layoutMeasurement.height);
    const y = Math.max(0, Math.min(contentOffset.y, maxOffset));
    const delta = y - previous.current;
    previous.current = y;
    // Calendar auto-positioning, restored offsets and tour scrolling must not hide navigation.
    if (!dragging.current) return;
    if (y <= 0) {
      distance.current = 0;
      setHidden(false);
      return;
    }
    if (delta === 0) return;
    distance.current = Math.sign(delta) === Math.sign(distance.current) ? distance.current + delta : delta;
    if (Math.abs(distance.current) >= 16) {
      setHidden(distance.current > 0);
      distance.current = 0;
    }
  }, [setHidden]);
  const onScrollBeginDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    previous.current = Math.max(0, event.nativeEvent.contentOffset.y);
    distance.current = 0;
    dragging.current = true;
  }, []);
  const onScrollEndDrag = useCallback(() => { dragging.current = false; }, []);
  return { onScroll, onScrollBeginDrag, onScrollEndDrag };
}
