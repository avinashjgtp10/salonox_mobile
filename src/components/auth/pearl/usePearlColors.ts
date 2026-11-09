import type { ThemeColors } from "@/constants/theme";
import { useMemo } from "react";
import { useThemeColors } from "@/theme/ThemeProvider";
import { usePearlPalette } from "./usePearlPalette";
/** Prototype palette for pearl screens, preserving the theme's other semantic colors. */
export type PearlColors = { [Key in keyof ThemeColors]: ThemeColors[Key] extends string ? string : ThemeColors[Key] };
export function usePearlColors(enabled = true) {
  const colors = useThemeColors();
  const palette = usePearlPalette();
  return useMemo<PearlColors>(() => enabled ? { ...colors, bg: palette.bgMid, bg2: palette.glass, card: palette.glass, heading: palette.ink, text: palette.ink, text2: palette.muted, primary: palette.accent, primaryDark: palette.accentDeep, primaryText: palette.accentDeep, placeholder: palette.muted, focusBorder: palette.accent, onPrimary: "#FFFFFF", border: palette.glassBorder, outline: palette.divider, glassEdge: palette.glassBorder, backgroundSelected: palette.accentTint, backgroundElement: palette.glass, background: palette.bgMid } : colors, [colors, enabled, palette]);
}
