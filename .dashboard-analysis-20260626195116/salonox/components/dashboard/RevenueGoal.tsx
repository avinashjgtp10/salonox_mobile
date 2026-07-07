import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, Radius } from "../../constants/theme";

interface RevenueGoalProps {
  earned?: number;
  target?: number;
}

export default function RevenueGoal({
  earned = 4320,
  target = 6000,
}: RevenueGoalProps) {
  const pct = Math.round((earned / target) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Today's revenue goal</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` as any }]} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          Earned <Text style={styles.metaValue}>₹{earned.toLocaleString()}</Text>
        </Text>
        <Text style={styles.metaText}>
          Target <Text style={styles.metaValue}>₹{target.toLocaleString()}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.heading,
  },
  pct: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
  barBg: {
    height: 7,
    backgroundColor: Colors.bg2,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metaText: {
    fontSize: 10,
    color: Colors.text2,
  },
  metaValue: {
    fontWeight: "600",
    color: Colors.heading,
  },
});
