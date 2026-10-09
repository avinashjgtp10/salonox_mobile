import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type KeyboardAwareFormHandle = { revealField: (field: View | null) => void };

/** Keeps form fields visible while allowing taps to switch inputs without dismissing the keyboard. */
type KeyboardAwareFormProps = {
  children: ReactNode;
  /** A sheet already handles iOS keyboard avoidance and supplies a bounded height. */
  embedded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};
export const KeyboardAwareForm = forwardRef<KeyboardAwareFormHandle, KeyboardAwareFormProps>(function KeyboardAwareForm({ children, embedded = false, style, contentContainerStyle }, ref) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const focused = useRef<View | null>(null);
  const open = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const offset = useRef(0);
  const generation = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const reveal = useCallback(() => {
    const field = focused.current;
    const viewport = viewportRef.current;
    if (!open.current || !field || !viewport) return;
    const request = generation.current;
    viewport.measureInWindow((_x, viewportY) => {
      field.measureInWindow((_fieldX, fieldY, _width, height) => {
        if (!open.current || focused.current !== field || generation.current !== request || !height) return;
        const target = Math.max(0, offset.current + fieldY - viewportY - insets.top - 16);
        if (Math.abs(target - offset.current) > 2) scroll.current?.scrollTo({ y: target, animated: true });
      });
    });
  }, [insets.top]);

  const scheduleReveal = useCallback(() => {
    timers.current.forEach(clearTimeout);
    generation.current += 1;
    // Focus, Android resize, and the keyboard animation settle on different frames.
    timers.current = [60, 220, 420].map((delay) => setTimeout(reveal, delay));
  }, [reveal]);

  useImperativeHandle(ref, () => ({
    revealField(field) {
      if (!field) return;
      focused.current = field;
      open.current = true;
      // Focus must work even when Android does not deliver a keyboard-show event.
      if (Platform.OS === "android") setKeyboardHeight(Keyboard.metrics()?.height || Dimensions.get("window").height * 0.5);
      scheduleReveal();
    },
  }), [scheduleReveal]);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) => {
      open.current = true;
      if (Platform.OS === "android") setKeyboardHeight(event.endCoordinates.height);
      scheduleReveal();
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      open.current = false;
      focused.current = null;
      generation.current += 1;
      timers.current.forEach(clearTimeout);
      setKeyboardHeight(0);
      scroll.current?.scrollTo({ y: 0, animated: true });
    });
    return () => {
      shown.remove(); hidden.remove();
      generation.current += 1;
      timers.current.forEach(clearTimeout);
    };
  }, [scheduleReveal]);

  return (
    <View ref={viewportRef} collapsable={false} style={[embedded ? styles.embedded : styles.container, style]}>
    <KeyboardAvoidingView style={embedded ? styles.embedded : styles.container} behavior="padding" enabled={!embedded && Platform.OS === "ios"}>
      <ScrollView ref={scroll} style={embedded ? styles.embedded : undefined} contentContainerStyle={[styles.content, contentContainerStyle, { paddingBottom: keyboardHeight }]}
        nestedScrollEnabled={embedded}
        onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
        keyboardShouldPersistTaps="always" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
        onContentSizeChange={scheduleReveal} onLayout={scheduleReveal} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
  );
});

const styles = StyleSheet.create({ container: { flex: 1 }, embedded: { flexGrow: 0, flexShrink: 1 }, content: { flexGrow: 1 } });
