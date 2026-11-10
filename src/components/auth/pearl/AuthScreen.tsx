import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, type ReactNode } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareForm } from "@/components/ui/KeyboardAwareForm";
import { StickyFooterLayout } from "@/components/ui/StickyFooterLayout";

import { PearlBackground } from "./PearlBackground";
import { pearlSpace } from "./tokens";

/**
 * Pearl background + safe area + keyboard-aware scroll.
 * `header` (e.g. TopBar) stays pinned at the top while the content scrolls.
 * With `footer`, the button bar is pinned to the bottom and rides above the keyboard.
 */
export function AuthScreen({ children, header, footer, center }: { children: ReactNode; header?: ReactNode; footer?: ReactNode; center?: boolean }) {
  const insets = useSafeAreaInsets();
  // Never carry the keyboard over to the next screen.
  useFocusEffect(useCallback(() => () => Keyboard.dismiss(), []));
  // KeyboardAwareForm owns the scroll container's bottom padding (keyboard space),
  // so the end-of-content gap lives on the inner stack. Without a footer the
  // content also has to clear the system navigation bar.
  const stack = (
    <View style={[styles.stack, center && styles.center, { paddingBottom: footer ? pearlSpace.xxl : insets.bottom + pearlSpace.xxl }]}>
      {children}
    </View>
  );

  return (
    <PearlBackground>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
        {footer ? (
          <StickyFooterLayout
            header={header}
            headerStyle={styles.header}
            footer={footer}
            contentContainerStyle={styles.content}
            footerContentStyle={styles.footerInner}
          >
            {stack}
          </StickyFooterLayout>
        ) : (
          <>
            {header ? <View style={styles.header}>{header}</View> : null}
            <KeyboardAwareForm autoReveal contentContainerStyle={styles.content}>
              {stack}
            </KeyboardAwareForm>
          </>
        )}
      </SafeAreaView>
    </PearlBackground>
  );
}

const MAX_CONTENT_WIDTH = 480;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: pearlSpace.lg + 2 },
  // Phones use the full width; tablets and large screens keep a readable column.
  stack: { flexGrow: 1, gap: pearlSpace.md + 2, paddingTop: pearlSpace.sm, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  center: { justifyContent: "center" },
  header: { paddingHorizontal: pearlSpace.lg + 2, width: "100%", maxWidth: MAX_CONTENT_WIDTH + (pearlSpace.lg + 2) * 2, alignSelf: "center" },
  footerInner: { gap: pearlSpace.sm + 2, paddingHorizontal: pearlSpace.lg + 2, paddingTop: pearlSpace.md + 2, width: "100%", maxWidth: MAX_CONTENT_WIDTH + (pearlSpace.lg + 2) * 2, alignSelf: "center" },
});
