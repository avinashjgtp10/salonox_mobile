/**
 * "Update available" chip (prototype .update-chip, in pearl theme colours).
 *
 * Shown on the dashboard once the update popup has been put off with
 * "Remind me later"; tapping it brings the popup back.
 */
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { Text } from "@/components/ui/AppTypography";
import { Icon } from "@/components/pearl/Icon";
import { updateChip } from "@/services/updateChip";
import { useAppTheme } from "@/theme/ThemeProvider";

export function UpdateChip() {
  const state = useSyncExternalStore(updateChip.subscribe, updateChip.getSnapshot, updateChip.getSnapshot);
  const palette = usePearlPalette();
  const isDark = useAppTheme().scheme === "dark";
  const styles = useMemo(() => createStyles(palette), [palette]);
  // Prototype: @keyframes uc-pulse — 2s, opacity 1 → .4 → 1.
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!state) return undefined;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [pulse, state]);

  if (!state) return null;

  const version = state.version?.trim();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={version ? `Update available, version ${version}` : "Update available"}
      hitSlop={6}
      onPress={state.open}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <LinearGradient
        colors={isDark
          ? ["rgba(167,162,208,0.20)", "rgba(207,203,232,0.12)"]
          : ["rgba(126,120,176,0.14)", "rgba(207,203,232,0.12)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.chip, { borderColor: isDark ? "rgba(167,162,208,0.28)" : "rgba(126,120,176,0.22)" }]}
      >
        <Animated.View style={[styles.dot, { opacity: pulse }]} />
        <Text style={styles.text}>
          <Text translate>Update available</Text>{version ? ` — v${version}` : ""}
        </Text>
        <View style={styles.arrow}><Icon name="chevronRight" size={14} color={palette.accentDeep} strokeWidth={2.2} /></View>
      </LinearGradient>
    </Pressable>
  );
}

const createStyles = (palette: ReturnType<typeof usePearlPalette>) => StyleSheet.create({
  chip: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  dot: { backgroundColor: palette.accent, borderRadius: 4, height: 8, width: 8 },
  text: { color: palette.accentDeep, fontSize: 12.5, fontWeight: "600" },
  arrow: { marginLeft: "auto" },
});
