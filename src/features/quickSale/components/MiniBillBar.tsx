import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { DashboardRadius as Radius, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

const BRAND = "#A3467F";
// Solid disabled colours: opacity on these buttons let the form behind the
// floating bar show through on Android.
const DISABLED_BG = "#F4F1F3";
const DISABLED_BORDER = "#D9CDD4";
const DISABLED_TEXT = "#9A8E95";

type MiniBillBarProps = {
  disabled: boolean;
  isPricingLoading?: boolean;
  isSaving: boolean;
  itemCount: number;
  onCheckout: () => void;
  onSavePending: () => void;
  savePendingDisabled: boolean;
};

function MiniBillBarComponent({
  disabled,
  isPricingLoading = false,
  isSaving,
  itemCount,
  onCheckout,
  onSavePending,
  savePendingDisabled,
}: MiniBillBarProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const progress = useRef(new Animated.Value(itemCount > 0 ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
      toValue: itemCount > 0 ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [itemCount, progress]);

  const animatedStyle = {
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, animatedStyle]}>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isSaving, disabled: savePendingDisabled }}
          android_ripple={savePendingDisabled ? undefined : { color: "rgba(163, 70, 127, 0.12)", borderless: false }}
          disabled={savePendingDisabled}
          onPress={onSavePending}
          style={({ pressed }) => [
            styles.pendingButton,
            savePendingDisabled && styles.pendingButtonDisabled,
            pressed && !savePendingDisabled && styles.buttonPressed,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={BRAND} size="small" />
          ) : (
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              numberOfLines={1}
              style={[styles.pendingButtonText, savePendingDisabled && styles.disabledText]}
            >
              Save Pending
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: isPricingLoading }}
          android_ripple={disabled ? undefined : { color: "rgba(255, 255, 255, 0.12)", borderless: false }}
          disabled={disabled}
          onPress={onCheckout}
          style={({ pressed }) => [styles.cta, { backgroundColor: disabled ? DISABLED_BG : BRAND }, pressed && !disabled && styles.buttonPressed]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.ctaText, disabled && styles.disabledText]}
          >
            {isPricingLoading ? "Updating total…" : "Checkout"}
          </Text>
          {isPricingLoading ? <ActivityIndicator size="small" color={DISABLED_TEXT} /> : <Ionicons name="arrow-forward" size={18} color={disabled ? DISABLED_TEXT : "#FFFFFF"} />}
        </Pressable>
      </View>
    </Animated.View>
  );
}

export const MiniBillBar = memo(MiniBillBarComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: {
    bottom: 18,
    left: 16,
    position: "absolute",
    right: 16,
    zIndex: 80,
  },
  card: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 84,
    paddingHorizontal: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 18,
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  pendingButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: BRAND,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 52,
    overflow: "hidden",
    paddingHorizontal: 10,
  },
  pendingButtonDisabled: {
    backgroundColor: DISABLED_BG,
    borderColor: DISABLED_BORDER,
  },
  pendingButtonText: {
    color: BRAND,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  cta: {
    alignItems: "center",
    backgroundColor: BRAND,
    borderRadius: Radius.full,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    overflow: "hidden",
    paddingHorizontal: 10,
  },
  ctaText: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  disabledText: {
    color: DISABLED_TEXT,
  },
});
