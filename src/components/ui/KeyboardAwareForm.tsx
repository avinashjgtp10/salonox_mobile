import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type KeyboardAwareFormHandle = { revealField: (field: View | null) => void };

/** Keeps form fields visible while allowing taps to switch inputs without dismissing the keyboard. */
export const KeyboardAwareForm = forwardRef<KeyboardAwareFormHandle, { children: ReactNode }>(function KeyboardAwareForm({ children }, ref) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const content = useRef<View>(null);
  const focused = useRef<View | null>(null);
  const open = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const reveal = useCallback(() => {
    const field = focused.current;
    if (!open.current || !field || !content.current) return;
    field.measureLayout(content.current, (_x, y) => {
      if (open.current && focused.current === field) {
        scroll.current?.scrollTo({ y: Math.max(0, y - insets.top - 16), animated: true });
      }
    }, () => undefined);
  }, [insets.top]);

  const scheduleReveal = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    // Do not move an input while its focus-triggering tap is still in progress.
    timer.current = setTimeout(reveal, 250);
  }, [reveal]);

  useImperativeHandle(ref, () => ({
    revealField(field) { focused.current = field; scheduleReveal(); },
  }), [scheduleReveal]);

  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (event) => {
      open.current = true;
      if (Platform.OS === "android") setKeyboardHeight(event.endCoordinates.height);
      scheduleReveal();
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => {
      open.current = false;
      if (timer.current) clearTimeout(timer.current);
      setKeyboardHeight(0);
      scroll.current?.scrollTo({ y: 0, animated: true });
    });
    return () => {
      shown.remove(); hidden.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [scheduleReveal]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" enabled={Platform.OS === "ios"}>
      <ScrollView ref={scroll} contentContainerStyle={[styles.content, { paddingBottom: keyboardHeight }]}
        keyboardShouldPersistTaps="always" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
        onContentSizeChange={scheduleReveal} onLayout={scheduleReveal} showsVerticalScrollIndicator={false}>
        <View ref={content} collapsable={false} style={styles.content}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({ container: { flex: 1 }, content: { flexGrow: 1 } });
