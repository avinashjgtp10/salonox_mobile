import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type CardPadding = keyof typeof Spacing;

type CardProps = {
  children: ReactNode;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
};

// The soft-elevation card pattern already repeated across the app (border +
// subtle shadow + white background) — for new JSX only in this pass (stat
// tiles, day-strip container). Existing bespoke cards aren't retrofitted
// onto this in Phase 1.
export function Card({ children, padding = "lg", style }: CardProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return <View style={[styles.card, { padding: Spacing[padding] }, style]}>{children}</View>;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 3,
  },
});
