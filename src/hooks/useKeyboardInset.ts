import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, Platform, View, type KeyboardEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Last real keyboard height seen anywhere in the app (any screen, any input).
// Android sometimes reports the first keyboard of a screen with height 0; this
// lets that first opening still lift the footer to the right place.
let lastKeyboardHeight = 0;
Keyboard.addListener("keyboardDidShow", (event) => {
  if (event.endCoordinates.height > 0) lastKeyboardHeight = event.endCoordinates.height;
});

const fallbackKeyboardHeight = () => lastKeyboardHeight || Math.round(Dimensions.get("screen").height * 0.38);

/**
 * Bottom inset for content pinned to the bottom of `viewport`: the part of the
 * viewport the keyboard covers while it is open, otherwise the bottom safe area
 * (home indicator / gesture bar). Works on iOS and Android, any screen size.
 *
 * Attach `viewport`, `onLayout` and `onTouchEndCapture` to the full-height container.
 */
export function useKeyboardInset() {
  const viewport = useRef<View>(null);
  const { bottom } = useSafeAreaInsets();
  const bottomRef = useRef(bottom);
  bottomRef.current = bottom;
  const [inset, setInset] = useState(bottom);
  const keyboardTop = useRef<number | null>(null);
  const generation = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Stable for the screen's lifetime: listeners are never torn down and re-added
  // mid-keyboard-animation (that used to drop the first measurement).
  const measure = useCallback(() => {
    const current = ++generation.current;
    requestAnimationFrame(() => {
      const apply = (y: number, height: number) => {
        if (current !== generation.current || height <= 0) return;
        const top = keyboardTop.current;
        const safe = bottomRef.current;
        // Never sit lower than the safe area, even while the keyboard animates away.
        setInset(top === null ? safe : Math.max(safe, y + height - top));
      };
      // Android draws edge-to-edge: page coordinates share the keyboard's origin.
      if (Platform.OS === "android") viewport.current?.measure((_x, _y, _w, height, _px, pageY) => apply(pageY, height));
      else viewport.current?.measureInWindow((_x, y, _w, height) => apply(y, height));
    });
  }, []);

  /** Reads the keyboard Android currently reports, if one is open. */
  const syncFromMetrics = useCallback(() => {
    const metrics = Keyboard.metrics();
    if (!Keyboard.isVisible() || !metrics) return false;
    keyboardTop.current = metrics.height > 0 ? metrics.screenY : Dimensions.get("screen").height - fallbackKeyboardHeight();
    measure();
    return true;
  }, [measure]);

  /** Android can deliver keyboard events late or with stale sizes: check again shortly. */
  const scheduleRechecks = useCallback((delays: number[]) => {
    if (Platform.OS !== "android") return;
    clearTimers();
    timers.current = delays.map((delay) => setTimeout(syncFromMetrics, delay));
  }, [clearTimers, syncFromMetrics]);

  useEffect(() => {
    const hide = (event?: KeyboardEvent) => {
      keyboardTop.current = null;
      clearTimers();
      ++generation.current;
      if (event && Platform.OS === "ios") Keyboard.scheduleLayoutAnimation(event);
      setInset(bottomRef.current);
    };
    const show = (event: KeyboardEvent) => {
      const { screenY, height } = event.endCoordinates;
      const screenHeight = Dimensions.get("screen").height;
      if (Platform.OS === "ios") {
        // iOS also reports frame changes for a keyboard that is leaving the screen.
        if (height <= 0 || screenY >= screenHeight) return hide(event);
        keyboardTop.current = screenY;
        Keyboard.scheduleLayoutAnimation(event);
        measure();
        return;
      }
      // Android: a zero-height report still means a keyboard is opening.
      keyboardTop.current = height > 0 ? screenY : screenHeight - fallbackKeyboardHeight();
      measure();
      scheduleRechecks([150, 400, 800]);
    };
    const subscriptions = [
      Keyboard.addListener("keyboardDidShow", show),
      Keyboard.addListener("keyboardDidHide", () => hide()),
      Dimensions.addEventListener("change", measure),
    ];
    if (Platform.OS === "ios") {
      subscriptions.push(Keyboard.addListener("keyboardWillChangeFrame", show));
      subscriptions.push(Keyboard.addListener("keyboardWillHide", hide));
    }
    // A keyboard may already be open when the screen mounts.
    if (!syncFromMetrics()) measure();
    // Invalidates measurements still in flight when the screen unmounts.
    const pending = generation;
    return () => {
      clearTimers();
      pending.current += 1;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [clearTimers, measure, scheduleRechecks, syncFromMetrics]);

  // Safe area changes (rotation, first layout) only need a re-measure.
  useEffect(() => {
    measure();
  }, [bottom, measure]);

  // A tap on an input is the earliest sign a keyboard is coming. If Android
  // skips or delays its keyboard event, these checks still catch it.
  const onTouchEndCapture = useCallback(() => {
    scheduleRechecks([250, 600, 1100]);
  }, [scheduleRechecks]);

  return { viewport, inset, onLayout: measure, onTouchEndCapture };
}
