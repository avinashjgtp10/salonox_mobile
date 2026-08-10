import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";

import { Card } from "@/components/ui/Card";
import { IconBadge, type IconBadgeAccent } from "@/components/ui/IconBadge";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type StatTileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  accent: IconBadgeAccent;
  value: string;
  label: string;
  subtitle?: string;
  children?: ReactNode;
};

export function StatTile({ icon, accent, value, label, subtitle, children }: StatTileProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Card style={styles.card}>
      <IconBadge icon={icon} accent={accent} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </Card>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    flex: 1,
  },
  label: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    textTransform: "uppercase",
  },
  value: {
    color: Colors.heading,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  subtitle: {
    color: Colors.hint,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
