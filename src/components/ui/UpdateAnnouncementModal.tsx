import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
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
  type ThemeColors,
} from "@/constants/theme";
import type { AppReleaseNote } from "@/services/appUpdate.service";
import { useAppTheme } from "@/theme/ThemeProvider";

type UpdateAnnouncementModalProps = {
  androidStoreUrl?: string | null;
  currentVersion?: string | null;
  description?: string | null;
  iosStoreUrl?: string | null;
  isMandatory: boolean;
  latestVersion?: string | null;
  onClose: () => void;
  onReopen: () => void;
  releaseNotes?: AppReleaseNote[];
  title?: string | null;
  visible: boolean;
};

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const OPEN_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const CLOSE_EASING = Easing.bezier(0.4, 0, 1, 1);
const LOGO_SOURCE = require("../../../assets/images/logo.png");
const NOTE_ICONS: IoniconName[] = [
  "sparkles-outline",
  "shield-checkmark-outline",
  "trending-up-outline",
];

// Store links are backend-controlled, so treat them as untrusted input: only
// http(s) and the platform store schemes are ever handed to Linking.openURL.
const isOpenableStoreUrl = (value?: string | null): value is string => {
  const url = value?.trim();

  if (!url) {
    return false;
  }

  return /^(https?|itms-apps|market):\/\//i.test(url);
};

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
  onReopen,
  releaseNotes = [],
  title,
  visible,
}: UpdateAnnouncementModalProps) {
  const { colors, scheme } = useAppTheme();
  const [showReminder, setShowReminder] = useState(false);
  useEffect(() => {
    if (!showReminder) return;
    const timer = setTimeout(() => setShowReminder(false), 4000);
    return () => clearTimeout(timer);
  }, [showReminder]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { gradientColors, styles } = useMemo(
    () => createStyles(colors, scheme, insets.bottom, height),
    [colors, height, insets.bottom, scheme],
  );
  const progress = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const buttonScale = useSharedValue(1);
  const [isPresented, setIsPresented] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsPresented(true);
      progress.value = withTiming(1, { duration: 360, easing: OPEN_EASING });
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
    if (!visible) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isMandatory) {
        onClose();
      }

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
  const isStoreUrlUsable = isOpenableStoreUrl(storeUrl);
  const resolvedTitle =
    title?.trim() || (latestVersion ? `SalonOX v${latestVersion}` : "SalonOX Update");
  const resolvedDescription =
    description?.trim() ||
    "Update SalonOX to get the latest improvements, fixes, and experience updates.";
  const eyebrow = isMandatory ? "Update required" : "New update available";
  const versionLabel = latestVersion
    ? currentVersion
      ? `Current ${currentVersion} - Latest ${latestVersion}`
      : `Latest version ${latestVersion}`
    : null;

  const closeIfAllowed = () => {
    if (!isMandatory) {
      onClose();
    }
  };

  // A blocking update screen whose only button silently does nothing is a dead
  // end, so an unusable store URL is surfaced rather than swallowed.
  const handleUpdate = () => {
    if (!isStoreUrlUsable) {
      Alert.alert(
        "Update link unavailable",
        `Please update SalonOX manually from the ${
          Platform.OS === "ios" ? "App Store" : "Play Store"
        }.`,
      );
      return;
    }

    void Linking.openURL(storeUrl as string).catch(() => {
      Alert.alert(
        "Couldn't open the store",
        `Please update SalonOX manually from the ${
          Platform.OS === "ios" ? "App Store" : "Play Store"
        }.`,
      );
    });
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
    buttonScale.value = withTiming(1, { duration: 120 });
  };

  if (!isPresented) {
    if (isMandatory) return null;
    return (
      <Portal>
        <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
          {showReminder ? (
            <View pointerEvents="none" style={styles.reminderContainer}>
              <View accessibilityLiveRegion="polite" style={styles.reminderCard}>
                <View style={styles.noteIcon}>
                  <Ionicons name="notifications" color="#F4B740" size={24} />
                </View>
                <View style={styles.noteCopy}>
                  <Text style={styles.noteTitle}>Reminder set!</Text>
                  <Text style={styles.reminderText}>We&apos;ll remind you on a future launch after 24 hours.</Text>
                </View>
              </View>
            </View>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => { setShowReminder(false); onReopen(); }}
            style={[styles.showUpdateButton, { bottom: insets.bottom + 72 }]}
          >
            <Text style={styles.showUpdateText}>Show Update</Text>
          </TouchableOpacity>
        </View>
      </Portal>
    );
  }

  return (
    <Portal>
      <Animated.View pointerEvents="auto" style={[styles.overlay, backdropStyle]}>
        <View style={styles.backdrop}>
          <Pressable onPress={closeIfAllowed} style={StyleSheet.absoluteFillObject} />
          <Animated.View
            accessibilityRole="alert"
            accessibilityViewIsModal
            importantForAccessibility="yes"
            style={[styles.sheet, sheetStyle]}
          >
            <View style={styles.sheetPressGuard}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <View style={styles.logoGlow}>
                  <Animated.View style={logoStyle}>
                    <Image contentFit="contain" source={LOGO_SOURCE} style={styles.logo} />
                  </Animated.View>
                </View>

                <View style={styles.headerCopy}>
                  <Text style={styles.eyebrow}>{eyebrow}</Text>
                  <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
                    {resolvedTitle}
                  </Text>
                  {versionLabel ? <Text style={styles.versionText}>{versionLabel}</Text> : null}
                </View>
              </View>

              <LinearGradient colors={gradientColors.divider} style={styles.divider} />

                <View style={styles.notesSection}>
                  <ScrollView
                    contentContainerStyle={styles.notesContent}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    style={styles.notes}
                  >
                    <Text style={styles.description}>{resolvedDescription}</Text>
                    {releaseNotes.length > 0 ? <Text style={styles.sectionTitle}>What&apos;s new</Text> : null}
                    {releaseNotes.map((note, index) => {
                      const iconName = NOTE_ICONS[index % NOTE_ICONS.length];

                      return (
                        <View
                          key={`${note.title ?? note.description ?? "note"}-${index}`}
                          style={styles.note}
                        >
                          <View style={styles.noteIcon}>
                            <Ionicons color={colors.primary} name={iconName} size={19} />
                          </View>
                          <View style={styles.noteCopy}>
                            {note.title ? <Text style={styles.noteTitle}>{note.title}</Text> : null}
                            {note.description ? (
                              <Text style={styles.noteDescription}>{note.description}</Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

              <View style={styles.actions}>
                <AnimatedPressable
                  accessibilityRole="button"
                  onPress={handleUpdate}
                  onPressIn={pressIn}
                  onPressOut={pressOut}
                  style={[styles.updateButton, buttonStyle]}
                >
                  <LinearGradient colors={gradientColors.button} style={styles.updateButtonGradient}>
                    <Text style={styles.updateButtonText}>Update Now</Text>
                  </LinearGradient>
                </AnimatedPressable>

                {!isMandatory ? (
                  <TouchableOpacity
                    activeOpacity={0.78}
                    onPress={() => {
                      closeIfAllowed();
                      setShowReminder(true);
                    }}
                    style={styles.laterButton}
                  >
                    <Text style={styles.laterButtonText}>Maybe Later</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Portal>
  );
}

type GradientColors = ComponentProps<typeof LinearGradient>["colors"];
type UpdateModalGradients = {
  button: GradientColors;
  divider: GradientColors;
  logoGlow: GradientColors;
};

const createStyles = (
  Colors: ThemeColors,
  scheme: "light" | "dark",
  bottomInset: number,
  screenHeight: number,
) => {
  const isDark = scheme === "dark";
  const accentPink = Colors.primary;
  const accentPurple = Colors.purple;
  const sheetMaxHeight = Math.min(screenHeight * 0.56, 480);

  const styles = StyleSheet.create({
    reminderContainer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    reminderCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: Colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#F7D6E3",
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      elevation: 8,
      shadowColor: accentPink,
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    reminderText: { color: accentPink, fontSize: 13, lineHeight: 19 },
    showUpdateButton: {
      position: "absolute",
      alignSelf: "center",
      backgroundColor: "#EF78A3",
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingVertical: 12,
      elevation: 6,
    },
    showUpdateText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? "rgba(10, 8, 14, 0.78)" : "rgba(30, 20, 40, 0.45)",
    },
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: Colors.card,
      borderColor: isDark ? withAlpha(Colors.primary, 0.22) : "#F7D6E3",
      borderRadius: 28,
      borderWidth: 1,
      height: sheetMaxHeight,
      marginBottom: Math.max(bottomInset, 8),
      marginHorizontal: 8,
      paddingBottom: 16,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingTop: Spacing.md,
      shadowColor: accentPink,
      shadowOffset: { width: 0, height: -16 },
      shadowOpacity: isDark ? 0.28 : 0.2,
      shadowRadius: 30,
      elevation: 24,
    },
    sheetPressGuard: {
      flex: 1,
      flexShrink: 1,
      minHeight: 0,
      gap: 10,
    },
    handle: {
      alignSelf: "center",
      backgroundColor: isDark ? withAlpha(Colors.primary, 0.32) : "#FCD7E4",
      borderRadius: Radius.full,
      height: 4,
      width: 38,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.md,
      paddingTop: Spacing.xs,
    },
    logoGlow: {
      alignItems: "center",
      borderRadius: Radius.xl,
      height: 46,
      justifyContent: "center",
      width: 46,
    },
    logoContainer: {
      alignItems: "center",
      backgroundColor: isDark ? Colors.backgroundElement : Colors.card,
      borderColor: isDark ? withAlpha(Colors.primary, 0.28) : "#F8D7E5",
      borderRadius: 16,
      borderWidth: 1,
      height: 44,
      justifyContent: "center",
      shadowColor: accentPink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.25 : 0.18,
      shadowRadius: 14,
      width: 44,
    },
    logo: {
      height: 32,
      width: 32,
    },
    badge: {
      alignItems: "center",
      backgroundColor: accentPink,
      borderColor: Colors.card,
      borderRadius: Radius.full,
      borderWidth: 2,
      height: 19,
      justifyContent: "center",
      position: "absolute",
      right: -7,
      top: -7,
      width: 19,
    },
    badgeText: {
      color: Colors.onPrimary,
      fontSize: 11,
      fontWeight: "900",
      lineHeight: 14,
    },
    headerCopy: {
      flex: 1,
      gap: 4,
    },
    eyebrow: {
      color: accentPink,
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.3,
      lineHeight: 12,
      textTransform: "uppercase",
    },
    title: {
      color: Colors.heading,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: -0.2,
      lineHeight: 20,
    },
    versionText: {
      color: Colors.hint,
      fontSize: 10,
      fontVariant: ["tabular-nums"],
      fontWeight: "700",
      lineHeight: 16,
    },
    divider: {
      borderRadius: Radius.full,
      height: 1,
      width: "100%",
    },
    copy: {
      gap: Spacing.sm,
    },
    description: {
      color: Colors.text2,
      fontSize: 11,
      lineHeight: 16,
    },
    notesSection: {
      flex: 1,
      flexShrink: 1,
      minHeight: 0,
      gap: Spacing.md,
    },
    sectionTitle: {
      color: "#EF8DB2",
      textTransform: "uppercase",
      fontSize: 10,
      fontWeight: "800",
      lineHeight: 14,
    },
    notes: {
      flex: 1,
      flexShrink: 1,
    },
    notesContent: {
      gap: Spacing.md,
      paddingBottom: 2,
    },
    note: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: Spacing.md,
      paddingVertical: 2,
      shadowColor: accentPink,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0,
      shadowRadius: 12,
    },
    noteIcon: {
      alignItems: "center",
      backgroundColor: isDark ? withAlpha(Colors.primary, 0.15) : "#FDEAF2",
      borderRadius: 13,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    noteCopy: {
      flex: 1,
      gap: 3,
    },
    noteTitle: {
      color: Colors.heading,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 17,
    },
    noteDescription: {
      color: Colors.text2,
      fontSize: 11,
      lineHeight: 16,
    },
    actions: {
      flexShrink: 0,
      gap: Spacing.sm,
    },
    updateButton: {
      borderRadius: 14,
      overflow: "hidden",
      shadowColor: accentPink,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.28 : 0.26,
      shadowRadius: 18,
      elevation: 10,
    },
    updateButtonGradient: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: Spacing.xl,
    },
    updateButtonText: {
      color: Colors.onPrimary,
      fontSize: 16,
      fontWeight: "900",
      lineHeight: 22,
    },
    laterButton: {
      alignItems: "center",
      backgroundColor: isDark ? withAlpha(Colors.primary, 0.08) : Colors.card,
      borderColor: isDark ? withAlpha(Colors.primary, 0.2) : "#F4CEDD",
      borderRadius: 14,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 42,
    },
    laterButtonText: {
      color: accentPink,
      fontSize: 15,
      fontWeight: "800",
      lineHeight: 20,
    },
  });

  const gradientColors: UpdateModalGradients = {
    button: isDark ? [accentPurple, accentPink] : ["#F9A8C9", "#EF648F"],
    divider: [
      withAlpha(accentPink, 0),
      withAlpha(accentPink, isDark ? 0.36 : 0.32),
      withAlpha(accentPink, 0),
    ],
    logoGlow: isDark
      ? [withAlpha(accentPink, 0.26), withAlpha(accentPurple, 0.12)]
      : ["#FFF4F8", "#FDE3EC"],
  };

  return { gradientColors, styles };
};
