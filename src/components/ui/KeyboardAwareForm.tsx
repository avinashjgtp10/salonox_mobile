import { createContext, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MeasurableField = Pick<View, "measureInWindow">;
// Last real keyboard height, reused so the first tap on a later screen pads correctly.
let lastKeyboardHeight = 0;
export type KeyboardAwareFormHandle = { revealField: (field: MeasurableField | null) => void };
export const FormFieldFocusContext = createContext<((field: MeasurableField | null) => void) | null>(null);

/** Keeps form fields visible while allowing taps to switch inputs without dismissing the keyboard. */
type KeyboardAwareFormProps = {
  children: ReactNode;
  /** A sheet already handles iOS keyboard avoidance and supplies a bounded height. */
  embedded?: boolean;
  autoReveal?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};
export const KeyboardAwareForm = forwardRef<KeyboardAwareFormHandle, KeyboardAwareFormProps>(function KeyboardAwareForm({ children, embedded = false, autoReveal = false, style, contentContainerStyle }, ref) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const focused = useRef<MeasurableField | null>(null);
  const open = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offset = useRef(0);
  const generation = useRef(0);
  // Top of the keyboard (window y) once it has fully opened; null while closed.
  const keyboardTop = useRef<number | null>(null);
  // Android: the height used for the bottom padding before the real one is known.
  const assumedKeyboardHeight = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  /**
   * One animated scroll per request. "comfort" moves the field a little above the
   * middle of the space over the keyboard (so the next field and button stay in
   * view); "ensureVisible" only nudges it back if a layout change hid it.
   */
  const reveal = useCallback((mode: "comfort" | "ensureVisible") => {
    const field = focused.current;
    const viewport = viewportRef.current;
    if (!open.current || !field || !viewport) return;
    const request = generation.current;
    viewport.measureInWindow((_x, viewportY) => {
      field.measureInWindow((_fieldX, fieldY, _width, height) => {
        if (!open.current || focused.current !== field || generation.current !== request || !height) return;
        const margin = 16;
        const kbTop = keyboardTop.current ?? Keyboard.metrics()?.screenY
          ?? Dimensions.get("window").height - (assumedKeyboardHeight.current || Dimensions.get("window").height * 0.4);
        const visibleTop = viewportY + insets.top + margin;
        const visibleBottom = kbTop - margin;
        let delta: number;
        if (mode === "comfort") {
          delta = fieldY - (visibleTop + Math.max(0, visibleBottom - visibleTop - height) * 0.35);
        } else if (fieldY + height > visibleBottom) {
          delta = fieldY + height - visibleBottom;
        } else if (fieldY < visibleTop) {
          delta = fieldY - visibleTop;
        } else {
          return;
        }
        const target = Math.max(0, offset.current + delta);
        // Skip tiny corrections; repeated small animations are what made it jerky.
        if (Math.abs(target - offset.current) > 24) scroll.current?.scrollTo({ y: target, animated: true });
      });
    });
  }, [insets.top]);

  const scheduleReveal = useCallback((mode: "comfort" | "ensureVisible", delay: number) => {
    clearTimer();
    generation.current += 1;
    timer.current = setTimeout(() => {
      timer.current = null;
      reveal(mode);
    }, delay);
  }, [reveal]);

  const revealField = useCallback((field: MeasurableField | null) => {
    if (!field) return;
    // Focus and touch-end both report the same field; scroll only once for it.
    if (focused.current === field && open.current) return;
    focused.current = field;
    open.current = true;
    if (Platform.OS === "android" && keyboardTop.current === null) {
      // Android draws edge-to-edge, so the form can only scroll up thanks to this
      // bottom padding. Add it on tap: the keyboard-show event can be skipped on
      // the first focus, and without padding there is nothing to scroll.
      assumedKeyboardHeight.current = Keyboard.metrics()?.height || lastKeyboardHeight || Dimensions.get("window").height * 0.4;
      setKeyboardHeight(assumedKeyboardHeight.current);
    }
    if (keyboardTop.current !== null) {
      // Keyboard already open (e.g. moving Email -> Password): scroll right away.
      scheduleReveal("comfort", 30);
    } else {
      // Wait for keyboardDidShow so we scroll once with the real keyboard size.
      // Android sometimes skips that event on first focus, so fall back after a pause.
      scheduleReveal("comfort", 450);
    }
  }, [scheduleReveal]);
  useImperativeHandle(ref, () => ({ revealField }), [revealField]);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) => {
      open.current = true;
      const { height, screenY } = event.endCoordinates;
      if (height > 0) {
        keyboardTop.current = screenY;
        lastKeyboardHeight = height;
        assumedKeyboardHeight.current = height;
        if (Platform.OS === "android") setKeyboardHeight(height);
      } else {
        // Android (edge-to-edge) reports height 0 on the first show; keep the
        // padding already applied on tap and derive the keyboard top from it.
        if (!assumedKeyboardHeight.current) assumedKeyboardHeight.current = lastKeyboardHeight || Dimensions.get("window").height * 0.4;
        if (Platform.OS === "android") setKeyboardHeight(assumedKeyboardHeight.current);
        keyboardTop.current = Dimensions.get("window").height - assumedKeyboardHeight.current;
      }
      // Let the bottom padding apply before the single scroll.
      scheduleReveal("comfort", 40);
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      open.current = false;
      focused.current = null;
      keyboardTop.current = null;
      generation.current += 1;
      clearTimer();
      setKeyboardHeight(0);
      scroll.current?.scrollTo({ y: 0, animated: true });
    });
    return () => {
      shown.remove(); hidden.remove();
      generation.current += 1;
      clearTimer();
    };
  }, [scheduleReveal]);

  // Content changes (e.g. a validation message appearing) only nudge if the field got hidden.
  // A pending focus scroll wins: the padding added for the keyboard also fires a
  // layout change, which used to cancel the scroll it was making room for.
  const onLayoutChange = useCallback(() => {
    if (open.current && focused.current && keyboardTop.current !== null && !timer.current) scheduleReveal("ensureVisible", 120);
  }, [scheduleReveal]);

  return (
    <View ref={viewportRef} collapsable={false} style={[embedded ? styles.embedded : styles.container, style]}>
    <KeyboardAvoidingView style={embedded ? styles.embedded : styles.container} behavior="padding" enabled={!embedded && Platform.OS === "ios"}>
      <ScrollView ref={scroll} style={embedded ? styles.embedded : undefined} contentContainerStyle={[styles.content, contentContainerStyle, { paddingBottom: keyboardHeight }]}
        nestedScrollEnabled={embedded}
        onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
        keyboardShouldPersistTaps="always" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
        onContentSizeChange={onLayoutChange} onLayout={onLayoutChange} showsVerticalScrollIndicator={false}>
        <FormFieldFocusContext.Provider value={autoReveal ? revealField : null}>
          <View style={styles.content}>{children}</View>
        </FormFieldFocusContext.Provider>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
});

const styles = StyleSheet.create({ container: { flex: 1 }, embedded: { flexGrow: 0, flexShrink: 1 }, content: { flexGrow: 1 } });
