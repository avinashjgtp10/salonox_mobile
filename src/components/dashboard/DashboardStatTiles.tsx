import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { IconBadge } from "@/components/ui/IconBadge";
import { MiniBarChart } from "@/components/ui/MiniBarChart";
import { DashboardTypography as Typography, type ThemeColors } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import {
  selectDashboardIsLoading,
  selectDashboardMetrics,
} from "@/store/dashboard/dashboard.slice";
import { selectInventorySummary } from "@/store/product/product.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatDashboardRevenue } from "@/utils/dashboard";

const getRevenueComparison = (currentMonth: number, lastMonth: number, revenueChange: number) => {
  if (currentMonth === 0 && lastMonth === 0) {
    return { detail: "No Revenue Yet", indicator: "\u2014", status: "", tone: "neutral" as const };
  }

  if (lastMonth === 0 && currentMonth > 0) {
    return { detail: "New Growth", indicator: "\u2191", status: "", tone: "positive" as const };
  }

  if (revenueChange > 0) {
    return { detail: "Increase", indicator: "\u2191", status: `${revenueChange}%`, tone: "positive" as const };
  }

  if (revenueChange < 0) {
    return { detail: "Decrease", indicator: "\u2193", status: `${Math.abs(revenueChange)}%`, tone: "negative" as const };
  }

  return { detail: "No Change", indicator: "\u2014", status: "", tone: "neutral" as const };
};

// Split out of DashboardHero ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â same selectors/derived values, moved
// verbatim, now rendered as separate premium tiles below the hero instead of
// an inline strip inside it.
export default function DashboardStatTiles() {
  const Colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const styles = useMemo(() => createStyles(Colors, isCompact), [Colors, isCompact]);
  const dashboardMetrics = useAppSelector(selectDashboardMetrics);
  const isDashboardLoading = useAppSelector(selectDashboardIsLoading);
  const inventorySummary = useAppSelector(selectInventorySummary);
  const revenueComparison = useMemo(
    () =>
      getRevenueComparison(
        dashboardMetrics.monthlyRevenue,
        dashboardMetrics.lastMonthRevenue,
        dashboardMetrics.revenueChange,
      ),
    [
      dashboardMetrics.lastMonthRevenue,
      dashboardMetrics.monthlyRevenue,
      dashboardMetrics.revenueChange,
    ],
  );

  const ownerKpis = useMemo(
    () => [
      {
        accent: "blue" as const,
        icon: "cash-outline" as const,
        label: "This Month Revenue",
        subtitle: "Current Calendar Month",
        value: formatDashboardRevenue(dashboardMetrics.monthlyRevenue),
      },
      {
        accent: "sky" as const,
        icon: "trending-up-outline" as const,
        label: "Today's Revenue",
        value: formatDashboardRevenue(dashboardMetrics.todaysRevenue),
      },
      {
        accent: "indigo" as const,
        icon: "cube-outline" as const,
        kind: "stock" as const,
        label: "Stock",
        stockMetrics: inventorySummary,
      },
      {
        accent: "green" as const,
        icon: "calendar-outline" as const,
        label: "Bookings",
        value: String(dashboardMetrics.bookings),
      },
      {
        accent: "blue" as const,
        currentMonthRevenue: dashboardMetrics.monthlyRevenue,
        icon: "analytics-outline" as const,
        kind: "revenueComparison" as const,
        label: "This Month vs Last Month",
        lastMonthRevenue: dashboardMetrics.lastMonthRevenue,
        revenueComparison,
      },
    ],
    [
      dashboardMetrics.bookings,
      dashboardMetrics.lastMonthRevenue,
      dashboardMetrics.monthlyRevenue,
      dashboardMetrics.todaysRevenue,
      inventorySummary,
      revenueComparison,
    ],
  );

  return (
    <View style={styles.row}>
      {ownerKpis.map((stat) => (
        <View
          key={stat.label}
          style={[
            styles.tile,
            stat.kind === "stock" && styles.stockTile,
            stat.kind === "revenueComparison" && styles.comparisonTile,
          ]}
        >
          {isDashboardLoading ? (
            <>
              <View style={styles.iconSkeleton} />
              <View style={[styles.copy, stat.kind === "stock" && styles.stockCopy]}>
                <View style={styles.valueSkeleton} />
                <View style={styles.labelSkeleton} />
              </View>
            </>
          ) : (
            <>
              <IconBadge accent={stat.accent} icon={stat.icon} size={isCompact ? "sm" : "md"} />
              <View
                style={[
                  styles.copy,
                  (stat.kind === "stock" || stat.kind === "revenueComparison") && styles.stockCopy,
                ]}
              >
                {stat.kind === "stock" ? (
                  <>
                    <Text style={styles.stockTitle}>Stock</Text>
                    <View style={styles.stockRows}>
                      <View style={[styles.stockMetric, styles.stockMetricRaised]}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.stockValue}>
                          {stat.stockMetrics.totalProducts}
                        </Text>
                        <Text style={styles.stockLabel}>
                          Available
                        </Text>
                      </View>
                      <View style={[styles.stockMetric, styles.stockMetricDivider]}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.stockValue}>
                          {stat.stockMetrics.lowStockProducts}
                        </Text>
                        <Text style={styles.stockLabel}>
                          Low Stock
                        </Text>
                      </View>
                      <View style={[styles.stockMetric, styles.stockMetricDivider]}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.stockValue}>
                          {stat.stockMetrics.outOfStockProducts}
                        </Text>
                        <Text style={styles.stockLabel}>
                          Out of Stock
                        </Text>
                      </View>
                    </View>
                  </>
                ) : stat.kind === "revenueComparison" ? (
                  <>
                    <Text numberOfLines={1} style={styles.stockTitle}>
                      {stat.label}
                    </Text>
                    <View style={styles.titleDivider} />
                    <View style={styles.comparisonChart}>
                      <MiniBarChart
                        accent={stat.accent}
                        data={[
                          { label: "Last Month", value: stat.lastMonthRevenue },
                          { label: "This Month", value: stat.currentMonthRevenue },
                        ]}
                      />
                    </View>
                    <View style={styles.comparisonRows}>
                      <View style={styles.comparisonMetric}>
                        <Text style={styles.comparisonLabel}>Current Month</Text>
                        <Text style={styles.comparisonValue}>
                          {formatDashboardRevenue(stat.currentMonthRevenue)}
                        </Text>
                      </View>
                      <View style={[styles.comparisonMetric, styles.comparisonMetricDivider]}>
                        <Text style={styles.comparisonLabel}>Last Month</Text>
                        <Text style={styles.comparisonValue}>
                          {formatDashboardRevenue(stat.lastMonthRevenue)}
                        </Text>
                      </View>
                      <View style={[styles.comparisonMetric, styles.comparisonMetricDivider]}>
                        <Text style={styles.comparisonLabel}>Change</Text>
                        <Text
                          style={[
                            styles.comparisonValue,
                            stat.revenueComparison.tone === "positive" && styles.comparisonStatusPositive,
                            stat.revenueComparison.tone === "negative" && styles.comparisonStatusNegative,
                          ]}
                        >
                          {[stat.revenueComparison.indicator, stat.revenueComparison.status].filter(Boolean).join(" ")}
                        </Text>
                        <Text
                          style={[
                            styles.comparisonStatus,
                            stat.revenueComparison.tone === "positive" && styles.comparisonStatusPositive,
                            stat.revenueComparison.tone === "negative" && styles.comparisonStatusNegative,
                          ]}
                        >
                          {stat.revenueComparison.detail}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>{stat.label}</Text>
                    <View style={styles.titleDivider} />
                    <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.value}>
                      {stat.value}
                    </Text>
                    {stat.subtitle ? <Text style={styles.subtitle}>{stat.subtitle}</Text> : null}
                  </>
                )}
              </View>
            </>
          )}
        </View>
      ))}
    </View>
  );
}

const createStyles = (Colors: ThemeColors, isCompact: boolean) => StyleSheet.create({
  row: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 20,
  },
  tile: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "column",
    gap: isCompact ? 9 : 10,
    justifyContent: "center",
    minHeight: isCompact ? 156 : 170,
    minWidth: 0,
    paddingHorizontal: isCompact ? 12 : 16,
    paddingVertical: isCompact ? 16 : 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  stockTile: {
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "center",
  },
  comparisonTile: {
    alignItems: "center",
    flexBasis: "100%",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: isCompact ? 148 : 164,
  },
  copy: {
    alignItems: "center",
    flex: 0,
    minWidth: 0,
    width: "100%",
  },
  stockCopy: {
    flex: 0,
    width: "100%",
  },
  stockIconWrap: {
    alignSelf: "center",
  },
  value: {
    color: Colors.heading,
    fontSize: isCompact ? 25 : 30,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: isCompact ? 32 : 38,
    marginTop: isCompact ? 4 : 6,
    textAlign: "center",
  },
  label: {
    color: Colors.heading,
    fontSize: isCompact ? 14 : 16,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: isCompact ? 18 : 20,
    marginTop: isCompact ? 4 : 6,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.text2,
    fontSize: isCompact ? 11 : 12,
    fontWeight: Typography.fontWeights.semibold,
    lineHeight: isCompact ? 14 : 16,
    marginTop: isCompact ? 5 : 6,
    textAlign: "center",
  },
  titleDivider: {
    backgroundColor: Colors.border,
    height: 1,
    marginTop: isCompact ? 8 : 10,
    opacity: 0.85,
    width: "86%",
  },
  stockTitle: {
    color: Colors.heading,
    fontSize: isCompact ? 16 : 18,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: isCompact ? 20 : 22,
    marginTop: isCompact ? 4 : 6,
    textAlign: "center",
    width: "100%",
  },
  stockRows: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: isCompact ? 16 : 18,
    minWidth: 0,
    width: "100%",
  },
  comparisonChart: {
    marginTop: isCompact ? 14 : 16,
    width: "100%",
  },
  comparisonRows: {
    flexDirection: "row",
    marginTop: isCompact ? 16 : 18,
    width: "100%",
  },
  comparisonMetric: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    minWidth: 0,
  },
  comparisonMetricDivider: {
    borderLeftColor: Colors.border,
    borderLeftWidth: 1,
  },
  comparisonLabel: {
    color: Colors.text2,
    fontSize: isCompact ? 11 : 12,
    fontWeight: Typography.fontWeights.semibold,
    textAlign: "center",
  },
  comparisonValue: {
    color: Colors.heading,
    fontSize: isCompact ? 16 : 18,
    fontWeight: "800",
    marginTop: isCompact ? 7 : 8,
    textAlign: "center",
  },
  comparisonStatus: {
    color: Colors.text2,
    fontSize: isCompact ? 11 : 12,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },
  comparisonStatusPositive: {
    color: Colors.success,
  },
  comparisonStatusNegative: {
    color: Colors.error,
  },
  stockMetric: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  stockMetricRaised: {
    transform: [{ translateY: -2 }],
  },
  stockMetricDivider: {
    borderLeftColor: Colors.border,
    borderLeftWidth: 1,
  },
  stockLabel: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: Typography.fontWeights.semibold,
    lineHeight: 12,
    marginTop: isCompact ? 5 : 6,
    minWidth: 0,
    textAlign: "center",
    width: "100%",
  },
  stockValue: {
    color: Colors.heading,
    fontSize: isCompact ? 18 : 20,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: isCompact ? 22 : 24,
    minWidth: 0,
    textAlign: "center",
    width: "100%",
  },
  valueSkeleton: {
    backgroundColor: Colors.bg2,
    borderRadius: 999,
    height: 20,
    width: "54%",
  },
  labelSkeleton: {
    backgroundColor: Colors.bg2,
    borderRadius: 999,
    height: 8,
    marginTop: 8,
    width: "44%",
  },
  iconSkeleton: {
    backgroundColor: Colors.bg2,
    borderRadius: 16,
    height: 44,
    width: 44,
  },
});
