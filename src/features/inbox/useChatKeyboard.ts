import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, Platform, View, type KeyboardEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { chatKeyboardInset } from "./chatKeyboard";

export function useChatKeyboard() {
  const viewport = useRef<View>(null);
  const { bottom } = useSafeAreaInsets();
  const keyboardTop = useRef<number | null>(Keyboard.metrics()?.screenY ?? null);
  const [inset, setInset] = useState(bottom);
  const frame = useRef<number | null>(null);
  const generation = useRef(0);

  const cancelMeasurement = useCallback(() => {
    ++generation.current;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const measure = useCallback(() => {
    const current = ++generation.current;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      viewport.current?.measureInWindow((_x, y, _width, height) => {
        if (current !== generation.current || height <= 0) return;
        setInset(chatKeyboardInset(y + height, keyboardTop.current, bottom));
      });
    });
  }, [bottom]);

  useEffect(() => {
    const show = (event: KeyboardEvent) => {
      keyboardTop.current = event.endCoordinates.screenY;
      if (Platform.OS === "ios") Keyboard.scheduleLayoutAnimation(event);
      measure();
    };
    const hide = (event: KeyboardEvent) => {
      keyboardTop.current = null;
      cancelMeasurement();
      if (Platform.OS === "ios") Keyboard.scheduleLayoutAnimation(event);
      setInset(bottom);
    };
    const subscriptions = [
      Keyboard.addListener("keyboardDidShow", show),
      Keyboard.addListener("keyboardDidHide", hide),
      Dimensions.addEventListener("change", measure),
    ];
    if (Platform.OS === "ios") {
      subscriptions.push(Keyboard.addListener("keyboardWillChangeFrame", show));
      subscriptions.push(Keyboard.addListener("keyboardWillHide", hide));
    }
    measure();
    return () => {
      cancelMeasurement();
      subscriptions.forEach(subscription => subscription.remove());
    };
  }, [bottom, cancelMeasurement, measure]);

  const onFocus = () => {
    const metrics = Keyboard.metrics();
    if (metrics) keyboardTop.current = metrics.screenY;
    measure();
  };
  return { viewport, inset, onLayout: measure, onFocus };
}
