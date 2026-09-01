import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Portal } from "@/components/ui/Portal";
import { AppLayout } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

type UpdateAnnouncementModalProps = {
  androidStoreUrl?: string | null;
  currentVersion?: string | null;
  description?: string | null;
  iosStoreUrl?: string | null;
  isMandatory: boolean;
  latestVersion?: string | null;
  onClose: () => void;
  title?: string | null;
  visible: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const OPEN_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const CLOSE_EASING = Easing.bezier(0.4, 0, 1, 1);
const LOGO_SOURCE = require("../../../assets/images/logo.png");

const withAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");

  if (normalized.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export function UpdateAnnouncementModal({
  androidStoreUrl,
  currentVersion,
  description,
  iosStoreUrl,
  isMandatory,
  latestVersion,
  onClose,
  title,
  visible,
}: UpdateAnnouncementModalProps) {
  const { colors, scheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { gradientColors, styles } = useMemo(
    () => createStyles(colors, scheme, insets.bottom),
    [colors, insets.bottom, scheme],
  );
  const progress = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const buttonScale = useSharedValue(1);
  const [isPresented, setIsPresented] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsPresented(true);
      progress.value = withTiming(1, { duration: 280, easing: OPEN_EASING });
      logoScale.value = withSpring(1, { damping: 13, stiffness: 140 });
      return;
    }

    progress.value = withTiming(0, { duration: 220, easing: CLOSE_EASING }, (finished) => {
      if (finished) {
        runOnJS(setIsPresented)(false);
      }
    });
    logoScale.value = withTiming(0.9, { duration: 180 });
  }, [logoScale, progress, visible]);

  useEffect(() => {
    if (!visible || isMandatory) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [isMandatory, onClose, visible]);

  useEffect(() => {
    if (!visible && isMandatory) {
      setIsPresented(true);
      progress.value = 1;
    }
  }, [isMandatory, progress, visible]);

  const storeUrl = Platform.OS === "ios" ? iosStoreUrl : androidStoreUrl;
  const resolvedTitle = title?.trim() || "App Update Available!";
  const resolvedDescription =
    description?.trim() ||
    "We're constantly improving SalonOX.\n\nUpdate now to enjoy the latest features, improvements and bug fixes.";
  const versionLabel = latestVersion
    ? currentVersion
      ? `Current ${currentVersion}  •  Latest ${latestVersion}`
      : `Latest version ${latestVersion}`
    : null;

  const closeIfAllowed = () => {
    if (!isMandatory) {
      onClose();
    }
  };

  const handleUpdate = () => {
    if (storeUrl) {
      void Linking.openURL(storeUrl);
    }
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [height, 0]) }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const pressIn = () => {
    buttonScale.value = withTiming(0.98, { duration: 90 });
  };

  const pressOut = () => {
    buttonScale.value = withTiming(1, { duration: 120 }, (finished) => {
      if (finished) {
        runOnJS(handleUpdate)();
      }
    });
  };

  if (!isPresented) {
    return null;
  }

  return (
    <Portal>
      <Animated.View pointerEvents="auto" style={[styles.overlay, backdropStyle]}>
        <Pressable onPress={closeIfAllowed} style={styles.backdrop}>
          <Animated.View
            accessibilityRole="alert"
            accessibilityViewIsModal
            importantForAccessibility="yes"
            style={[styles.sheet, sheetStyle]}
          >
            <Pressable onPress={() => undefined} style={styles.sheetPressGuard}>
              <View style={styles.handle} />

              <View style={styles.logoSection}>
                <LinearGradient colors={gradientColors.logoGlow} style={styles.logoGlow}>
                  <Animated.View style={[styles.logoContainer, logoStyle]}>
                    <Image contentFit="contain" source={LOGO_SOURCE} style={styles.logo} />
                  </Animated.View>
                </LinearGradient>
              </View>

              <View style={styles.copy}>
                <Text style={styles.eyebrow}>SalonOX Update</Text>
                <Text accessibilityRole="header" style={styles.title}>
                  {resolvedTitle}
                </Text>
                <Text style={styles.description}>{resolvedDescription}</Text>
                {versionLabel ? <Text style={styles.versionText}>{versionLabel}</Text> : null}
              </View>

              <AnimatedPressable
                accessibilityRole="button"
                onPressIn={pressIn}
                onPressOut={pressOut}
                style={[styles.updateButton, buttonStyle]}
              >
                <LinearGradient colors={gradientColors.button} style={styles.updateButtonGradient}>
                  <Text style={styles.updateButtonText}>Update Now</Text>
                </LinearGradient>
              </AnimatedPressable>

              {!isMandatory ? (
                <TouchableOpacity activeOpacity={0.78} onPress={onClose} style={styles.laterButton}>
                  <Text style={styles.laterButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              ) : null}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Portal>
  );
}

type GradientColors = ComponentProps<typeof LinearGradient>["colors"];
type UpdateModalGradients = {
  button: GradientColors;
  logoGlow: GradientColors;
};

const createStyles = (Colors: ThemeColors, scheme: "light" | "dark", bottomInset: number) => {
  const isDark = scheme === "dark";
  const accentPurple = Colors.purple;

  const styles = StyleSheet.create({
      overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: withAlpha(Colors.shadow, isDark ? 0.72 : 0.34),
      },
      backdrop: {
        flex: 1,
        justifyContent: "flex-end",
      },
      sheet: {
        backgroundColor: Colors.card,
        borderColor: Colors.border,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        gap: Spacing.xl,
        paddingBottom: Math.max(bottomInset + Spacing.md, Spacing.xxl),
        paddingHorizontal: AppLayout.contentHorizontalPadding,
        paddingTop: Spacing.md,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: -18 },
        shadowOpacity: isDark ? 0.36 : 0.16,
        shadowRadius: 32,
        elevation: 24,
      },
      sheetPressGuard: {
        gap: Spacing.xl,
      },
      handle: {
        alignSelf: "center",
        backgroundColor: Colors.border,
        borderRadius: Radius.full,
        height: 4,
        opacity: isDark ? 0.9 : 0.7,
        width: 44,
      },
      logoSection: {
        alignItems: "center",
      },
      logoGlow: {
        alignItems: "center",
        borderRadius: Radius.full,
        height: 96,
        justifyContent: "center",
        width: 96,
      },
      logoContainer: {
        alignItems: "center",
        backgroundColor: isDark ? Colors.backgroundElement : Colors.card,
        borderColor: Colors.border,
        borderRadius: Radius.full,
        borderWidth: 1,
        height: 72,
        justifyContent: "center",
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0.3 : 0.16,
        shadowRadius: 18,
        width: 72,
      },
      logo: {
        height: 42,
        width: 42,
      },
      copy: {
        alignItems: "center",
        gap: Spacing.sm,
      },
      eyebrow: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0,
        lineHeight: 16,
        textTransform: "uppercase",
      },
      title: {
        color: Colors.heading,
        fontFamily: Typography.fontFamilies.display,
        fontSize: 24,
        fontWeight: "700",
        letterSpacing: 0,
        lineHeight: 30,
        textAlign: "center",
      },
      description: {
        color: Colors.text2,
        fontSize: 14,
        letterSpacing: 0,
        lineHeight: 22,
        textAlign: "center",
      },
      versionText: {
        color: Colors.hint,
        fontSize: 12,
        fontVariant: ["tabular-nums"],
        fontWeight: "600",
        letterSpacing: 0,
        lineHeight: 16,
        paddingTop: Spacing.xs,
        textAlign: "center",
      },
      updateButton: {
        borderRadius: Radius.xl,
        overflow: "hidden",
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: isDark ? 0.28 : 0.2,
        shadowRadius: 18,
        elevation: 10,
      },
      updateButtonGradient: {
        alignItems: "center",
        minHeight: 54,
        justifyContent: "center",
        paddingHorizontal: Spacing.xl,
      },
      updateButtonText: {
        color: Colors.onPrimary,
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 0,
        lineHeight: 22,
      },
      laterButton: {
        alignItems: "center",
        minHeight: 42,
        justifyContent: "center",
      },
      laterButtonText: {
        color: Colors.text2,
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0,
        lineHeight: 20,
      },
  });
  const gradientColors: UpdateModalGradients = {
    button: [Colors.primary, accentPurple],
    logoGlow: isDark
      ? [withAlpha(Colors.primary, 0.32), withAlpha(accentPurple, 0.16), withAlpha(Colors.card, 0)]
      : [withAlpha(Colors.primary, 0.18), withAlpha(accentPurple, 0.12), withAlpha(Colors.card, 0)],
  };

  return { gradientColors, styles };
};
