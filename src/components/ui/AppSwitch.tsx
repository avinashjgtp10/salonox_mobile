/**
 * The app's one toggle.
 *
 * Every switch in SalonOX renders through this, so ON, OFF and disabled look
 * the same everywhere — Settings, Staff, Permissions, Inventory, Clients and
 * the rest. Call sites pass behaviour (`value`, `onValueChange`, `disabled`,
 * an accessibility label) and never colours or size: a `trackColor` or
 * `thumbColor` per screen is how the design drifted apart in the first place.
 *
 * Platform note: the stock Android switch draws noticeably smaller than the
 * iOS one, so each is nudged to a common size.
 */
import { Platform, StyleSheet, Switch, type SwitchProps } from "react-native";

import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";

export type AppSwitchProps = Omit<
  SwitchProps,
  "trackColor" | "thumbColor" | "ios_backgroundColor"
>;

export function AppSwitch({ disabled, style, ...props }: AppSwitchProps) {
  const palette = usePearlPalette();

  return (
    <Switch
      {...props}
      disabled={disabled}
      // ON = pearl accent, OFF = the divider tint, thumb always white.
      trackColor={{ false: palette.divider, true: palette.accent }}
      thumbColor="#FFFFFF"
      // Without this the iOS off-track is plain white and reads as "missing".
      ios_backgroundColor={palette.divider}
      style={[styles.switch, disabled && styles.disabled, style]}
    />
  );
}

const styles = StyleSheet.create({
  switch: {
    transform: Platform.OS === "android" ? [{ scaleX: 1.1 }, { scaleY: 1.1 }] : [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  disabled: { opacity: 0.45 },
});
