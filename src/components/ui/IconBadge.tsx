import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { useThemeColors } from "@/theme/ThemeProvider";

export type IconBadgeAccent = "blue" | "sky" | "indigo" | "green";

type IconBadgeProps = {
  icon: keyof typeof Ionicons.glyphMap;
  accent: IconBadgeAccent;
  size?: "sm" | "md";
};

const ACCENT_KEYS = {
  blue: ["accentBlue", "accentBlueSoft"],
  sky: ["accentSky", "accentSkySoft"],
  indigo: ["accentIndigo", "accentIndigoSoft"],
  green: ["accentGreen", "accentGreenSoft"],
} as const;

export function IconBadge({ icon, accent, size = "md" }: IconBadgeProps) {
  const Colors = useThemeColors();
  const [colorKey, softKey] = ACCENT_KEYS[accent];
  const styles = useMemo(() => createStyles(size), [size]);

  return (
    <View style={[styles.badge, { backgroundColor: Colors[softKey] }]}>
      <Ionicons name={icon} size={size === "sm" ? 16 : 18} color={Colors[colorKey]} />
    </View>
  );
}

const createStyles = (size: "sm" | "md") => StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: size === "sm" ? 10 : 14,
    height: size === "sm" ? 36 : 40,
    justifyContent: "center",
    width: size === "sm" ? 36 : 40,
  },
});
