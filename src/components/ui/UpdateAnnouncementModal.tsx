/**
 * Update popup — the prototype's `.update-overlay` / `.update-box`: a centered
 * card with the SalonOX mark in a tile, a version pill, a "What's new" block and
 * Update Now / Remind me later. Putting it off leaves the dashboard chip behind
 * (see UpdateChip), which brings this card back.
 *
 * Colours come from the pearl theme, not the prototype's violet on this one
 * screen: every other surface in the app uses the pearl accent.
 */
import { Text } from "@/components/ui/AppTypography";
import { appAlert as Alert } from "@/services/appAlert";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Portal } from "@/components/ui/Portal";
import { pearlGradients, pearlShadow } from "@/components/auth/pearl/tokens";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import type { AppReleaseNote } from "@/services/appUpdate.service";
import { updateChip } from "@/services/updateChip";
import { useAppTheme } from "@/theme/ThemeProvider";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

type UpdateAnnouncementModalProps = {
  androidStoreUrl?: string | null;
  description?: string | null;
  iosStoreUrl?: string | null;
  isMandatory: boolean;
  latestVersion?: string | null;
  onClose: () => void;
  onReopen: () => void;
  /** OTA updates: download and reload instead of opening the store. */
  onUpdate?: () => Promise<void>;
  isUpdating?: boolean;
  releaseNotes?: AppReleaseNote[];
  title?: string | null;
  visible: boolean;
};

const BRAND_MARK = require("../../../assets/images/brand/salonox-mark.png");

const OPEN_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const CLOSE_EASING = Easing.bezier(0.4, 0, 1, 1);

const isOpenableStoreUrl = (value?: string | null): value is string => {
  const url = value?.trim();

  if (!url) {
    return false;
  }

  return /^(https?|itms-apps|market):\/\//i.test(url);
};

export function UpdateAnnouncementModal({
  androidStoreUrl,
  description,
  iosStoreUrl,
  isMandatory,
  latestVersion,
  onClose,
  onReopen,
  onUpdate,
  isUpdating = false,
  releaseNotes = [],
  title,
  visible,
}: UpdateAnnouncementModalProps) {
  const palette = usePearlPalette();
  const isDark = useAppTheme().scheme === "dark";
  const { height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette, isDark, height), [height, isDark, palette]);
  const progress = useSharedValue(0);
  const iconScale = useSharedValue(0.9);
  const [isPresented, setIsPresented] = useState(visible);
  // The close animation finishes on the UI thread and reports back later. If the
  // modal was asked to open in the meantime (e.g. it mounted hidden and became
  // visible right after), that late report must not hide it again.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  // The chip outlives a render of this component, so it holds a stable opener.
  const reopenRef = useRef(onReopen);
  reopenRef.current = onReopen;
  const reopen = useCallback(() => reopenRef.current(), []);
  const hideIfStillClosed = useCallback(() => {
    if (!visibleRef.current) {
      setIsPresented(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setIsPresented(true);
      progress.value = withTiming(1, { duration: 320, easing: OPEN_EASING });
      iconScale.value = withSpring(1, { damping: 13, stiffness: 140 });
      return;
    }

    progress.value = withTiming(0, { duration: 200, easing: CLOSE_EASING }, (finished) => {
      if (finished) {
        runOnJS(hideIfStillClosed)();
      }
    });
    iconScale.value = withTiming(0.9, { duration: 160 });
  }, [hideIfStillClosed, iconScale, progress, visible]);

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

  // While the popup is put off, the dashboard carries the chip that reopens it.
  useEffect(() => {
    if (visible || isMandatory) {
      updateChip.hide();
      return undefined;
    }

    updateChip.show({ version: latestVersion, open: reopen });

    return () => updateChip.hide();
  }, [isMandatory, latestVersion, reopen, visible]);

  const storeUrl = Platform.OS === "ios" ? iosStoreUrl : androidStoreUrl;
  const isStoreUrlUsable = isOpenableStoreUrl(storeUrl);
  const resolvedTitle = title?.trim() || (isMandatory ? "Update Required" : "New Update Available");
  const resolvedDescription =
    description?.trim() || "We've made SalonOX even better with new features and improvements.";
  const bullets = releaseNotes
    .map(note => note.title?.trim() || note.description?.trim())
    .filter((note): note is string => Boolean(note));

  const closeIfAllowed = () => {
    if (!isMandatory) {
      onClose();
    }
  };

  const handleUpdate = () => {
    if (onUpdate) {
      if (isUpdating) return;
      void onUpdate().catch(() => {
        Alert.alert("Couldn't download the update", "Please check your internet connection and try again.");
      });
      return;
    }

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

  const boxStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.94, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!isPresented) {
    return null;
  }

  return (
    <Portal>
      <Animated.View pointerEvents="auto" style={[styles.overlay, backdropStyle]}>
        <Pressable onPress={closeIfAllowed} style={StyleSheet.absoluteFillObject} />
        <Animated.View
          accessibilityRole="alert"
          accessibilityViewIsModal
          importantForAccessibility="yes"
          style={[styles.box, boxStyle]}
        >
          <Animated.View style={[styles.iconTile, iconStyle]}>
            <Image source={BRAND_MARK} style={styles.mark} resizeMode="contain" />
          </Animated.View>

          <Text translate accessibilityRole="header" style={styles.title}>{resolvedTitle}</Text>

          {latestVersion ? (
            <View style={styles.versionPill}>
              <Text style={styles.versionText}>v{latestVersion}</Text>
            </View>
          ) : null}

          <Text translate style={styles.description}>{resolvedDescription}</Text>

          {bullets.length > 0 ? (
            <View style={styles.whatsNew}>
              <Text translate style={styles.whatsNewTitle}>What&apos;s new</Text>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.whatsNewList}>
                {bullets.map((bullet, index) => (
                  <Text key={`${bullet}-${index}`} translate style={styles.whatsNewLine}>{`• ${bullet}`}</Text>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isUpdating, disabled: isUpdating }}
              disabled={isUpdating}
              onPress={handleUpdate}
              style={({ pressed }) => [styles.updateButton, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={pearlGradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.updateButtonFill}
              >
                <Text translate style={styles.updateButtonText}>{isUpdating ? "Updating…" : "Update Now"}</Text>
              </LinearGradient>
            </Pressable>

            {!isMandatory && !isUpdating ? (
              <Pressable
                accessibilityRole="button"
                onPress={closeIfAllowed}
                style={({ pressed }) => [styles.remindButton, pressed && styles.remindPressed]}
              >
                <Text translate style={styles.remindText}>Remind me later</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Portal>
  );
}

const createStyles = (palette: ReturnType<typeof usePearlPalette>, isDark: boolean, screenHeight: number) =>
  themedStyles((p) => ({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      // Pearl dim (Sheet.tsx), deepened a little for a dialog over busy content.
      backgroundColor: "rgba(59,57,80,0.42)",
      justifyContent: "center",
      padding: 28,
    },
    box: {
      alignItems: "center",
      // A dialog over content needs a solid surface, as the pearl confirm card does.
      backgroundColor: isDark ? "#242038" : "#FBFAFD",
      borderColor: palette.glassBorder,
      borderCurve: "continuous",
      borderRadius: 24,
      borderWidth: 1,
      elevation: 24,
      gap: 14,
      maxWidth: 320,
      paddingBottom: 22,
      paddingHorizontal: 24,
      paddingTop: 28,
      shadowColor: "#46446E",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 40,
      width: "100%",
    },
    iconTile: {
      alignItems: "center",
      // The brand mark is dark navy + green, so it needs a light tile to read on;
      // in dark mode that stays light rather than following the card.
      backgroundColor: isDark ? "rgba(255,255,255,0.92)" : "rgba(230,227,243,0.9)",
      borderColor: p.white,
      borderCurve: "continuous",
      borderRadius: 16,
      borderWidth: 1,
      height: 64,
      justifyContent: "center",
      width: 64,
      ...pearlShadow.card,
    },
    mark: { height: 40, width: 39 },
    title: {
      color: palette.ink,
      fontSize: 17,
      fontWeight: "700",
      textAlign: "center",
    },
    versionPill: {
      backgroundColor: isDark ? "rgba(167,162,208,0.16)" : "rgba(126,120,176,0.12)",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    versionText: {
      color: palette.accentDeep,
      fontSize: 12,
      fontWeight: "600",
    },
    description: {
      color: palette.muted,
      fontSize: 13.5,
      lineHeight: 19.5,
      maxWidth: 260,
      textAlign: "center",
    },
    whatsNew: {
      backgroundColor: isDark ? "rgba(167,162,208,0.10)" : "rgba(126,120,176,0.06)",
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      width: "100%",
    },
    whatsNewTitle: {
      color: palette.ink,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 4,
    },
    whatsNewList: {
      flexGrow: 0,
      maxHeight: Math.max(96, screenHeight * 0.22),
    },
    whatsNewLine: {
      color: palette.muted,
      fontSize: 12.5,
      lineHeight: 19,
    },
    actions: {
      gap: 10,
      marginTop: 4,
      width: "100%",
    },
    updateButton: {
      borderCurve: "continuous",
      borderRadius: 14,
      overflow: "hidden",
      ...pearlShadow.button,
    },
    updateButtonFill: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 13,
    },
    updateButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    remindButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
    },
    remindPressed: { opacity: 0.6 },
    remindText: {
      color: palette.muted,
      fontSize: 14,
      fontWeight: "500",
    },
  }));
