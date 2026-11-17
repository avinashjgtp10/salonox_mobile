import type { ThemeColors } from "@/constants/theme";
import { useMemo } from "react";
import { useThemeColors } from "@/theme/ThemeProvider";
import { usePearlPalette } from "./usePearlPalette";
/** Prototype palette for pearl screens, preserving the theme's other semantic colors. */
export type PearlColors = { [Key in keyof ThemeColors]: ThemeColors[Key] extends string ? string : ThemeColors[Key] };
export function usePearlColors(enabled = true) {
  const colors = useThemeColors();
  const palette = usePearlPalette();
  return useMemo<PearlColors>(() => enabled ? {
    ...colors,
    bg: palette.bgMid, bg2: palette.glass, card: palette.glass, heading: palette.ink, text: palette.ink,
    text2: palette.muted, primary: palette.accent, primaryDark: palette.accentDeep, primaryText: palette.accentDeep,
    placeholder: palette.muted, focusBorder: palette.accent, onPrimary: "#FFFFFF", border: palette.glassBorder,
    outline: palette.divider, glassEdge: palette.glassBorder, backgroundSelected: palette.accentTint,
    backgroundElement: palette.glass, background: palette.bgMid,
    // The appointment* tokens mirror the generic ones above. Without these they fell
    // through to the previous palette, so any screen styled from them came out
    // half pearl and half old theme even though it asked for pearl.
    appointmentBackground: palette.bgMid,
    appointmentSurface: palette.glass,
    appointmentSurfaceMuted: palette.accentWash,
    appointmentText: palette.ink,
    appointmentTextSecondary: palette.ink2,
    appointmentMuted: palette.muted,
    appointmentPlaceholder: palette.placeholder,
    appointmentAccent: palette.accent,
    appointmentAccentDark: palette.accentDeep,
    appointmentAccentSoft: palette.accentTint,
    appointmentBorder: palette.glassBorder,
    appointmentDivider: palette.divider,
  } : colors, [colors, enabled, palette]);
}
