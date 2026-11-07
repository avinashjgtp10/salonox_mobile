import type { ThemeColors } from "@/constants/theme";
import { useMemo } from "react";
import { useThemeColors } from "@/theme/ThemeProvider";
import { pearl } from "./tokens";
/** Prototype palette for pearl screens, preserving the theme's other semantic colors. */
export type PearlColors = { [Key in keyof ThemeColors]: ThemeColors[Key] extends string ? string : ThemeColors[Key] };
export function usePearlColors(enabled = true) {
  const colors = useThemeColors();
  return useMemo<PearlColors>(() => enabled ? { ...colors, bg: "#F7F6FA", bg2: pearl.glass, card: pearl.glass, heading: pearl.ink, text: pearl.ink, text2: pearl.muted, primary: pearl.accent, primaryDark: pearl.accentDeep, primaryText: pearl.accentDeep, placeholder: pearl.muted, focusBorder: pearl.accent, onPrimary: "#FFFFFF", border: pearl.glassBorder, outline: pearl.divider, glassEdge: pearl.glassBorder, backgroundSelected: pearl.accentTint, backgroundElement: pearl.glass, background: "#F7F6FA" } : colors, [colors, enabled]);
}
