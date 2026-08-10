import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { IconBadgeAccent } from "@/components/ui/IconBadge";

type MiniBarChartProps = {
  data: { label: string; value: number }[];
  accent: IconBadgeAccent;
  height?: number;
};

const ACCENT_KEYS = {
  blue: "accentBlue",
  sky: "accentSky",
  indigo: "accentIndigo",
  green: "accentGreen",
} as const;

// Vertical bar-height chart — a different shape from StaffWorkload.tsx's
// horizontal %-fill progress bar, so it doesn't reuse that component.
export function MiniBarChart({ data, accent, height = 64 }: MiniBarChartProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors, height), [Colors, height]);
  const maxValue = Math.max(1, ...data.map((entry) => entry.value));
  const barColor = Colors[ACCENT_KEYS[accent]];

  return (
    <View>
      <View style={styles.track}>
        {data.map((entry, index) => {
          const isLast = index === data.length - 1;
          const barHeight = Math.max(4, (entry.value / maxValue) * height);

          return (
            <View key={entry.label} style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: isLast ? barColor : Colors.border,
                    height: barHeight,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        {data.map((entry) => (
          <Text key={entry.label} numberOfLines={1} style={styles.labelText}>
            {entry.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors, height: number) => StyleSheet.create({
  track: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: Spacing.sm,
    height,
  },
  barWrap: {
    flex: 1,
  },
  bar: {
    borderRadius: 4,
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  labelText: {
    color: Colors.hint,
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
});
