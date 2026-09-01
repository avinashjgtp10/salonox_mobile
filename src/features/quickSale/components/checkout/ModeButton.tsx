import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { DashboardRadius as Radius, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

export function ModeButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        numberOfLines={1}
        style={[styles.modeButtonText, active && styles.modeButtonTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  modeButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 6,
    width: "50%",
  },
  modeButtonActive: {
    backgroundColor: Colors.primaryDark,
  },
  modeButtonText: {
    color: Colors.text2,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  modeButtonTextActive: {
    color: Colors.onPrimary,
  },
});
