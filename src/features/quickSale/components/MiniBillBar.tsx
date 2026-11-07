import type { PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { LinearGradient } from "expo-linear-gradient";
import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePearlColors } from "@/components/auth/pearl/usePearlColors";

const BRAND = pearl.accent;
// Solid disabled colours: opacity on these buttons let the form behind the
// floating bar show through on Android.
const DISABLED_BG = "#F4F1F3";
const DISABLED_BORDER = "#D9CDD4";
const DISABLED_TEXT = "#9A8E95";

type MiniBillBarProps = {
  total: number;
  disabled: boolean;
  /** Inside the Calendar's pop-up, which already sits clear of the system bars. */
  embedded?: boolean;
  isPricingLoading?: boolean;
  isSaving: boolean;
  onCheckout: () => void;
  onSavePending: () => void;
  savePendingDisabled: boolean;
};

function MiniBillBarComponent({
  total,
  disabled,
  embedded = false,
  isPricingLoading = false,
  isSaving,
  onCheckout,
  onSavePending,
  savePendingDisabled,
}: MiniBillBarProps) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const safeBottom = useSafeAreaInsets().bottom;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: 0, paddingBottom: embedded ? 12 : Math.max(safeBottom, 24), backgroundColor: "#F8F7FB", paddingHorizontal: 18, paddingTop: 14 }]}>
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
              Save pending
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
          <LinearGradient colors={disabled ? [DISABLED_BG, DISABLED_BG] : pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: "100%", height: 50, borderRadius: 16, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" }}><Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.ctaText, disabled && styles.disabledText]}
          >
            {isPricingLoading ? "Updating total…" : `Checkout \u00b7 ${formatCurrency(total)}`}
          </Text>
          {isPricingLoading ? <ActivityIndicator size="small" color={DISABLED_TEXT} /> : null}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

export const MiniBillBar = memo(MiniBillBarComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: {
    bottom: 18,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 80,
  },
  card: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: Colors.border,
    borderRadius: 0,
    borderWidth: 0,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0,
    shadowRadius: 26,
    elevation: 0,
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  pendingButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: "rgba(126,120,176,.45)",
    borderRadius: 16,
    borderWidth: 1.5,
    flexGrow: 0,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    height: 50,
    overflow: "hidden",
    paddingHorizontal: 16,
  },
  pendingButtonDisabled: {
    backgroundColor: DISABLED_BG,
    borderColor: DISABLED_BORDER,
  },
  pendingButtonText: {
    color: pearl.accentDeep,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  cta: {
    alignItems: "center",
    backgroundColor: BRAND,
    borderRadius: 16,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    height: 50,
    overflow: "hidden",
    paddingHorizontal: 0,
  },
  ctaText: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontSize: 15.5,
    fontWeight: "700",
  },
  disabledText: {
    color: DISABLED_TEXT,
  },
});
