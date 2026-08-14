import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
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
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  scrollable?: boolean;
  subtitle?: string;
  title: string;
  visible: boolean;
};

const OPEN_DURATION = 280;
const CLOSE_DURATION = 220;
// Matches native bottom-sheet feel: quick ease-out on the way in, quick
// ease-in on the way out — no bounce/overshoot to keep it feeling "solid."
const OPEN_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const CLOSE_EASING = Easing.bezier(0.4, 0, 1, 1);

export function BottomSheet({
  children,
  footer,
  onClose,
  scrollable = true,
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
  // 0 = fully closed/off-screen, 1 = fully open. This single value is the
  // only animation controller for the sheet — both the backdrop opacity and
  // the sheet's translateY are pure derivations of it via useAnimatedStyle,
  // so there is never more than one thing driving the transition.
  const progress = useSharedValue(0);
  // Kept mounted for the duration of the close animation so it can play out;
  // unmounts only once fully closed, instead of vanishing the instant
  // `visible` flips false.
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
    // isPresented intentionally excluded — it's only read to gate the close
    // animation, and including it would re-trigger this on the state change
    // this very effect causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Modal's onRequestClose used to give us Android back-button handling for
  // free; a plain overlay needs it wired up explicitly.
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

  return (
    <Portal>
      <Animated.View pointerEvents="auto" style={[styles.overlay, backdropStyle]}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            pointerEvents="box-none"
            style={styles.keyboardAvoiding}
          >
            <Animated.View
              // No onPress of its own — Pressable still claims the touch
              // responder for taps that land on it, which is what stops them
              // bubbling up to the backdrop's onPress={onClose} above.
              style={[styles.sheet, { maxHeight: sheetMaxHeight }, sheetStyle]}
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
    </Portal>
  );
}

const createStyles = (Colors: ThemeColors, bottomInset: number) => StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(20, 18, 16, 0.42)",
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: "flex-end",
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
