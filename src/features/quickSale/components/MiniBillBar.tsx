import { useRegionalPreferences } from "@/localization/preferences";
import type { PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { LinearGradient } from "expo-linear-gradient";
import { pearlGradients } from "@/components/auth/pearl/tokens";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { memo, useMemo } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import { PearlActionFooter } from "@/components/ui/PearlActionFooter";
import { themedStyles, themedTokens } from "@/components/auth/pearl/themedStyles";

// Solid disabled colours: opacity on these buttons let the form behind the
// floating bar show through on Android. Resolved per theme so the disabled
// state is not a white slab in Dim mode.
const tone = themedTokens((p) => ({
  brand: p.accent,
  disabledBg: p.glassStrong,
  disabledBorder: p.glassBorder,
}));
const DISABLED_TEXT = "#9A8E95";

type MiniBillBarProps = {
  total: number;
  disabled: boolean;
  /** Inside the Calendar's pop-up, which already sits clear of the system bars. */
  embedded?: boolean;
  isPricingLoading?: boolean;
  isSaving: boolean;
  onCheckout: () => void;
  /** Omit to hide the save button: a brand-new Quick Sale goes straight to
   * Checkout, like the web, and only an existing draft or booking can be saved. */
  onSavePending?: () => void;
  savePendingDisabled?: boolean;
  /** Editing an invoice that is already paid: save only, never check out again. */
  saveOnly?: boolean;
};

function MiniBillBarComponent({
  total,
  disabled,
  embedded = false,
  isPricingLoading = false,
  isSaving,
  onCheckout,
  onSavePending,
  savePendingDisabled = false,
  saveOnly = false,
}: MiniBillBarProps) {
  "use no memo";
  useRegionalPreferences();
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const safeBottom = useSafeAreaInsets().bottom;

  return (
    <PearlActionFooter floating style={[styles.wrap, { bottom: 0 }]} contentStyle={{ flexDirection: "column", alignItems: "stretch", paddingBottom: embedded ? 12 : Math.max(safeBottom, 24), paddingHorizontal: 18 }}>
      <View style={styles.card}>
        {onSavePending ? <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isSaving, disabled: savePendingDisabled }}
          android_ripple={savePendingDisabled ? undefined : { color: "rgba(126, 120, 176, 0.12)", borderless: false }}
          disabled={savePendingDisabled}
          onPress={onSavePending}
          style={({ pressed }) => [
            styles.pendingButton,
            saveOnly && styles.pendingButtonFull,
            savePendingDisabled && styles.pendingButtonDisabled,
            pressed && !savePendingDisabled && styles.buttonPressed,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={tone.brand} size="small" />
          ) : (
            <Text translate
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              numberOfLines={1}
              style={[styles.pendingButtonText, savePendingDisabled && styles.disabledText]}
            >
              {saveOnly ? "Save changes" : "Save pending"}
            </Text>
          )}
        </Pressable> : null}

        {saveOnly ? null : <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: isPricingLoading }}
          android_ripple={disabled ? undefined : { color: "rgba(255, 255, 255, 0.12)", borderless: false }}
          disabled={disabled}
          onPress={onCheckout}
          style={({ pressed }) => [styles.cta, { backgroundColor: disabled ? tone.disabledBg : tone.brand }, pressed && !disabled && styles.buttonPressed]}
        >
          <LinearGradient colors={disabled ? [tone.disabledBg, tone.disabledBg] : pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: "100%", height: 50, borderRadius: 16, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" }}><Text
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            numberOfLines={1}
            style={[styles.ctaText, disabled && styles.disabledText]}
          >
            {`Checkout · ${formatCurrency(total)}`}
          </Text>
          </LinearGradient>
        </Pressable>}
      </View>
    </PearlActionFooter>
  );
}

export const MiniBillBar = memo(MiniBillBarComponent);

const createStyles = (Colors: ThemeColors) => themedStyles((p) => ({
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
  // Save-only (editing a paid bill): this is the single action, so it takes the
  // whole row. Without an explicit grow/basis it keeps pendingButton's
  // flexGrow: 0 and collapses to the padding, hiding its own label.
  pendingButtonFull: {
    alignSelf: "stretch",
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    width: "100%",
  },
  pendingButtonDisabled: {
    backgroundColor: tone.disabledBg,
    borderColor: tone.disabledBorder,
  },
  pendingButtonText: {
    color: p.accentDeep,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  cta: {
    alignItems: "center",
    backgroundColor: tone.brand,
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
}));
