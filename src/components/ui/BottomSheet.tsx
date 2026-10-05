import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Portal } from "@/components/ui/Portal";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type BottomSheetProps = {
  centered?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  renderInline?: boolean;
  scrollable?: boolean;
  stacked?: boolean;
  subtitle?: string;
  title: string;
  visible: boolean;
};

const OPEN_DURATION = 280;
const CLOSE_DURATION = 220;
const OPEN_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const CLOSE_EASING = Easing.bezier(0.4, 0, 1, 1);

export function BottomSheet({
  centered = false,
  children,
  footer,
  onClose,
  renderInline = false,
  scrollable = true,
  stacked = false,
  subtitle,
  title,
  visible,
}: BottomSheetProps) {
  const Colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(Colors, insets.bottom), [Colors, insets.bottom]);
  const { height: screenHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.round(screenHeight * 0.9);
  const scrollMaxHeight = Math.round(screenHeight * 0.72);
  const progress = useSharedValue(0);
  const [isPresented, setIsPresented] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsPresented(true);
      progress.value = withTiming(1, { duration: OPEN_DURATION, easing: OPEN_EASING });
      return;
    }

    if (isPresented) {
      progress.value = withTiming(0, { duration: CLOSE_DURATION, easing: CLOSE_EASING }, (finished) => {
        if (finished) {
          runOnJS(setIsPresented)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [visible, onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * screenHeight }],
  }));

  if (!isPresented) {
    return null;
  }

  const overlay = (
      <Animated.View
        pointerEvents="auto"
        style={[
          styles.overlay,
          renderInline && styles.overlayInline,
          renderInline && stacked && styles.overlayInlineStacked,
          backdropStyle,
        ]}
      >
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            pointerEvents="box-none"
            style={[styles.keyboardAvoiding, centered && styles.keyboardAvoidingCentered]}
          >
            <Animated.View
              style={[styles.sheet, centered && styles.sheetCentered, { maxHeight: sheetMaxHeight }, sheetStyle]}
            >
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.headerCopy}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                <TouchableOpacity activeOpacity={0.84} onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={18} color={Colors.primaryDark} />
                </TouchableOpacity>
              </View>

              {scrollable ? (
                <ScrollView
                  contentContainerStyle={styles.content}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
                  showsVerticalScrollIndicator
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.content}>{children}</View>
              )}

              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </Animated.View>
          </KeyboardAvoidingView>
      </Animated.View>
  );

  return renderInline ? overlay : <Portal>{overlay}</Portal>;
}

const createStyles = (Colors: ThemeColors, bottomInset: number) => StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(20, 18, 16, 0.42)",
    flex: 1,
  },
  overlayInline: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  overlayInlineStacked: {
    elevation: 60,
    zIndex: 1200,
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: "flex-end",
  },
  keyboardAvoidingCentered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Math.max(bottomInset, Spacing.lg),
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 16,
  },
  sheetCentered: {
    borderRadius: 12,
    maxWidth: 520,
    width: "100%",
  },
  handle: {
    alignSelf: "center",
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    height: 4,
    marginBottom: Spacing.md,
    width: 42,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: Colors.heading,
    fontFamily: Typography.fontFamilies.display,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0,
  },
  subtitle: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: Colors.backgroundElement,
    borderRadius: AppRadius.control,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  content: {
    paddingTop: Spacing.lg,
  },
  scroll: {
    flexShrink: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingTop: Spacing.md,
  },
});
