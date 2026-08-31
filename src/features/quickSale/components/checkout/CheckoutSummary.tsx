import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/constants/theme";

export function SummaryRow({ label, tone, value }: { label: string; tone?: "discount"; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, tone === "discount" && styles.summaryValueDiscount]}>{value}</Text>
    </View>
  );
}

export function SummaryTile({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.summaryTile}>
      <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.summaryTileLabel}>
        {label}
      </Text>
      <Text numberOfLines={1} style={styles.summaryTileValue}>{value}</Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  summaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  summaryValueDiscount: {
    color: Colors.error,
  },
  summaryTile: {
    flex: 1,
  },
  summaryTileLabel: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 13,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  summaryTileValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
});
