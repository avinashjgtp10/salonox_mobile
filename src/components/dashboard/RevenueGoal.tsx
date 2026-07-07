import { StyleSheet, Text, View } from "react-native";

import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import {
  selectDashboardIsLoading,
  selectDashboardRevenueGoal,
} from "@/store/dashboard/dashboard.slice";

export default function RevenueGoal() {
  const { earned, target } = useAppSelector(selectDashboardRevenueGoal);
  const isLoading = useAppSelector(selectDashboardIsLoading);
  const pct = target > 0 ? Math.min(Math.round((earned / target) * 100), 100) : 0;

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.titleSkeleton} />
          <View style={styles.pctSkeleton} />
        </View>
        <View style={styles.barBg} />
      </View>
    );
  }

  if (target <= 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{"Today's revenue goal"}</Text>
        <Text style={styles.emptyText}>No revenue goal set yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{"Today's revenue goal"}</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>
          Earned <Text style={styles.metaValue}>Rs. {earned.toLocaleString()}</Text>
        </Text>
        <Text style={styles.metaText}>
          Target <Text style={styles.metaValue}>Rs. {target.toLocaleString()}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "600",
  },
  pct: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  barBg: {
    backgroundColor: Colors.bg2,
    borderRadius: 4,
    height: 7,
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    height: 7,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metaText: {
    color: Colors.text2,
    fontSize: 10,
  },
  metaValue: {
    color: Colors.heading,
    fontWeight: "600",
  },
  titleSkeleton: {
    backgroundColor: Colors.bg2,
    borderRadius: 999,
    height: 14,
    width: "42%",
  },
  pctSkeleton: {
    backgroundColor: Colors.bg2,
    borderRadius: 999,
    height: 14,
    width: 30,
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 6,
  },
});
