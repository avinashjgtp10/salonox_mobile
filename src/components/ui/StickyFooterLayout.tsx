import { useFocusEffect } from "expo-router";
import { useCallback, type ReactNode } from "react";
import { Keyboard, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { KeyboardAwareForm } from "@/components/ui/KeyboardAwareForm";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { PearlActionFooter } from "@/components/ui/PearlActionFooter";

type StickyFooterLayoutProps = {
  /** Scrollable form content. */
  children: ReactNode;
  /** Pinned top content (back button + title). Stays put while the form scrolls. */
  header?: ReactNode;
  /** Pinned bottom content, usually the primary action button(s). */
  footer: ReactNode;
  /** Wrapper around the header (padding, width). */
  headerStyle?: StyleProp<ViewStyle>;
  /** Style for the scroll content (padding, gaps). */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Outer footer bar (background, border, radius). */
  footerStyle?: StyleProp<ViewStyle>;
  /** Inner footer row (padding, gap). The bottom padding gets the keyboard / safe-area inset added. */
  footerContentStyle?: StyleProp<ViewStyle>;
  /** Space between the footer content and the keyboard or the bottom safe area. */
  footerBottomSpacing?: number;
};

/**
 * Standard screen layout for any screen with a bottom action button:
 * - `header` (back button + title) is pinned at the top and never scrolls away,
 * - the form scrolls in between and a tapped field is scrolled into view,
 * - `footer` is pinned at the bottom and rides on top of the keyboard,
 * - the keyboard closes when the screen loses focus, so it never carries over.
 *
 * Place it below the screen's top safe area; it handles the bottom safe area itself.
 *
 * @example
 * <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
 *   <StickyFooterLayout header={<TopBar title="Edit client" onBack={router.back} />} footer={<PrimaryButton title="Save" onPress={save} />}>
 *     {fields}
 *   </StickyFooterLayout>
 * </SafeAreaView>
 */
export function StickyFooterLayout({
  children,
  header,
  footer,
  headerStyle,
  contentContainerStyle,
  footerStyle,
  footerContentStyle,
  footerBottomSpacing = 12,
}: StickyFooterLayoutProps) {
  // Measures how much of this layout the keyboard covers (or the bottom safe
  // area when it is closed), handling Android's edge-to-edge window.
  const keyboard = useKeyboardInset();
  useFocusEffect(useCallback(() => () => Keyboard.dismiss(), []));

  return (
    <View ref={keyboard.viewport} collapsable={false} onLayout={keyboard.onLayout} onTouchEndCapture={keyboard.onTouchEndCapture} style={styles.root}>
      {header ? <View style={headerStyle}>{header}</View> : null}
      {/* The footer already lifts the form above the keyboard, so the form must not do it again. */}
      <KeyboardAwareForm autoReveal avoidKeyboard={false} padForKeyboard={false} contentContainerStyle={contentContainerStyle}>
        {children}
      </KeyboardAwareForm>
      <PearlActionFooter style={footerStyle} contentStyle={[styles.footerRow, footerContentStyle, { paddingBottom: keyboard.inset + footerBottomSpacing }]}>
        {footer}
      </PearlActionFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  footerRow: { flexDirection: "row", gap: 10 },
});
