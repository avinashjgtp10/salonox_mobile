import { useThemeColors } from "@/theme/ThemeProvider";

// Derived from the real theme tokens (constants/theme.ts) so the onboarding
// welcome screen shares the app's active palette instead of a separate
// static gold/cream design system.
export const useLuxuryColors = () => {
  const Colors = useThemeColors();

  return {
    accent: Colors.primary,
    accentDark: Colors.primaryDark,
    background: Colors.bg,
    border: Colors.border,
    card: Colors.card,
    muted: Colors.text2,
    text: Colors.heading,
    white: "#FFFFFF",
  };
};

export type LuxuryColors = ReturnType<typeof useLuxuryColors>;

export const LuxurySpacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const LuxuryTypography = {
  serif: "Georgia",
  sans: undefined,
} as const;
