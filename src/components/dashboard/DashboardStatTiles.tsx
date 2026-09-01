import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, type DimensionValue } from "react-native";

import { IconBadge } from "@/components/ui/IconBadge";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import {
  selectDashboardIsLoading,
  selectDashboardMetrics,
} from "@/store/dashboard/dashboard.slice";
import { selectClientsTotalCount } from "@/store/client/client.slice";
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

const REVENUE_BAR_COLORS = {
  current: "#2563EB",
  last: "#16A34A",
} as const;

function RevenueComparisonBars({
  currentMonthRevenue,
  lastMonthRevenue,
}: {
  currentMonthRevenue: number;
  lastMonthRevenue: number;
}) {
  const Colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const styles = useMemo(() => createStyles(Colors, isCompact), [Colors, isCompact]);
  const maxRevenue = Math.max(currentMonthRevenue, lastMonthRevenue, 1);
  const rows = [
    {
      barColor: REVENUE_BAR_COLORS.current,
      label: "This Month",
      value: currentMonthRevenue,
    },
    {
      barColor: REVENUE_BAR_COLORS.last,
      label: "Last Month",
      value: lastMonthRevenue,
    },
  ];

  return (
    <View style={styles.horizontalChart}>
      {rows.map((row) => {
        const widthPercent = `${Math.max(row.value === 0 ? 0 : 8, (row.value / maxRevenue) * 100)}%` as DimensionValue;

        return (
          <View key={row.label} style={styles.horizontalBarRow}>
            <View style={styles.horizontalBarTop}>
              <Text style={styles.horizontalBarLabel}>{row.label}</Text>
              <Text style={styles.horizontalBarValue}>{formatDashboardRevenue(row.value)}</Text>
            </View>
            <View style={styles.horizontalBarTrack}>
              <View
                style={[
                  styles.horizontalBarFill,
                  {
                    backgroundColor: row.barColor,
                    width: widthPercent,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

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
  const totalClients = useAppSelector(selectClientsTotalCount);
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
        bg: Colors.dashboardRevenueBg,
        color: Colors.dashboardRevenueAccent,
        icon: "cash-outline" as const,
        label: "This Month Revenue",
        route: "/sales" as Href,
        subtitle: "Current Calendar Month",
        value: formatDashboardRevenue(dashboardMetrics.monthlyRevenue),
      },
      {
        accent: "sky" as const,
        bg: Colors.dashboardAppointmentBg,
        color: Colors.dashboardAppointmentAccent,
        icon: "trending-up-outline" as const,
        label: "Today's Revenue",
        route: "/sales" as Href,
        value: formatDashboardRevenue(dashboardMetrics.todaysRevenue),
      },
      {
        accent: "indigo" as const,
        bg: Colors.dashboardClientBg,
        color: Colors.dashboardClientAccent,
        icon: "people-outline" as const,
        label: "Total Clients",
        route: "/clients" as Href,
        value: String(totalClients),
      },
      {
        accent: "green" as const,
        bg: Colors.dashboardWarningBg,
        color: Colors.dashboardWarningAccent,
        icon: "calendar-outline" as const,
        label: "Bookings",
        route: "/bookings" as Href,
        value: String(dashboardMetrics.bookings),
      },
      {
        accent: "blue" as const,
        bg: Colors.dashboardCard,
        color: Colors.dashboardRevenueAccent,
        currentMonthRevenue: dashboardMetrics.monthlyRevenue,
        icon: "analytics-outline" as const,
        kind: "revenueComparison" as const,
        label: "This Month vs Last Month",
        lastMonthRevenue: dashboardMetrics.lastMonthRevenue,
        revenueComparison,
      },
    ],
    [
      Colors,
      dashboardMetrics.bookings,
      dashboardMetrics.lastMonthRevenue,
      dashboardMetrics.monthlyRevenue,
      dashboardMetrics.todaysRevenue,
      totalClients,
      revenueComparison,
    ],
  );

  return (
    <View style={styles.row}>
      {ownerKpis.map((stat) => {
        const tileStyle = [
          styles.tile,
          { backgroundColor: stat.bg, borderColor: stat.color },
          "kind" in stat && stat.kind === "revenueComparison" && styles.comparisonTile,
        ];

        const tileContent = (
          <>
            {isDashboardLoading ? (
            <>
              <View style={styles.iconSkeleton} />
              <View style={styles.copy}>
                <View style={styles.valueSkeleton} />
                <View style={styles.labelSkeleton} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.tileTopRow}>
                <IconBadge accent={stat.accent} icon={stat.icon} size={isCompact ? "sm" : "md"} />
                <View style={[styles.accentBar, { backgroundColor: stat.color }]} />
              </View>
              <View style={styles.copy}>
                {"kind" in stat && stat.kind === "revenueComparison" ? (
                  <>
                    <Text numberOfLines={1} style={styles.stockTitle}>
                      {stat.label}
                    </Text>
                    <View style={styles.titleDivider} />
                    <View style={styles.comparisonChart}>
                      <RevenueComparisonBars
                        currentMonthRevenue={stat.currentMonthRevenue}
                        lastMonthRevenue={stat.lastMonthRevenue}
                      />
                    </View>
                    <View style={styles.comparisonRows}>
                      <View style={styles.comparisonMetric}>
                        <Text style={styles.comparisonLabel}>Last Month</Text>
                        <Text style={styles.comparisonValue}>
                          {formatDashboardRevenue(stat.lastMonthRevenue)}
                        </Text>
                      </View>
                      <View style={[styles.comparisonMetric, styles.comparisonMetricDivider]}>
                        <Text style={styles.comparisonLabel}>Current Month</Text>
                        <Text style={styles.comparisonValue}>
                          {formatDashboardRevenue(stat.currentMonthRevenue)}
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
                    <Text style={[styles.label, { color: stat.color }]}>{stat.label}</Text>
                    <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.value}>
                      {stat.value}
                    </Text>
                    <Text style={[styles.subtitle, !stat.subtitle && styles.subtitlePlaceholder]}>
                      {stat.subtitle || " "}
                    </Text>
                  </>
                )}
              </View>
            </>
            )}
          </>
        );

        const route = "route" in stat ? stat.route : undefined;

        if (route) {
          return (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.86}
              key={stat.label}
              onPress={() => router.push(route)}
              style={tileStyle}
            >
              {tileContent}
            </TouchableOpacity>
          );
        }

        return (
          <View key={stat.label} style={tileStyle}>
            {tileContent}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (Colors: ThemeColors, isCompact: boolean) => StyleSheet.create({
  row: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
  },
  tile: {
    alignItems: "flex-start",
    backgroundColor: Colors.dashboardCard,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "column",
    gap: isCompact ? 8 : 10,
    justifyContent: "space-between",
    minHeight: isCompact ? 118 : 128,
    minWidth: 0,
    paddingHorizontal: isCompact ? 12 : 14,
    paddingVertical: isCompact ? 13 : 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  tileTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  accentBar: {
    borderRadius: 999,
    height: 26,
    opacity: 0.28,
    width: 4,
  },
  stockTile: {
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "center",
  },
  comparisonTile: {
    alignItems: "flex-start",
    flexBasis: "100%",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: isCompact ? 154 : 168,
  },
  copy: {
    alignItems: "flex-start",
    flex: 0,
    minWidth: 0,
    width: "100%",
  },
  value: {
    color: Colors.heading,
    fontSize: isCompact ? 23 : 27,
    fontWeight: "900",
    includeFontPadding: false,
    lineHeight: isCompact ? 32 : 38,
    marginTop: isCompact ? 8 : 10,
    textAlign: "left",
  },
  label: {
    color: Colors.text2,
    fontSize: isCompact ? 11 : 12,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: isCompact ? 18 : 20,
    marginTop: isCompact ? 8 : 10,
    minHeight: 0,
    textAlign: "left",
    textAlignVertical: "center",
    textTransform: "uppercase",
  },
  subtitle: {
    color: Colors.text2,
    fontSize: isCompact ? 11 : 12,
    fontWeight: Typography.fontWeights.semibold,
    lineHeight: isCompact ? 14 : 16,
    marginTop: isCompact ? 5 : 6,
    textAlign: "left",
  },
  subtitlePlaceholder: {
    opacity: 0,
  },
  titleDivider: {
    backgroundColor: Colors.border,
    height: 1,
    marginTop: isCompact ? 8 : 10,
    opacity: 0.85,
    width: "100%",
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
  horizontalChart: {
    gap: isCompact ? 12 : 14,
    width: "100%",
  },
  horizontalBarRow: {
    width: "100%",
  },
  horizontalBarTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  horizontalBarLabel: {
    color: Colors.heading,
    flexShrink: 0,
    fontSize: isCompact ? 12 : 13,
    fontWeight: "800",
    marginRight: Spacing.md,
  },
  horizontalBarValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: isCompact ? 12 : 13,
    fontWeight: "900",
    textAlign: "right",
  },
  horizontalBarTrack: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: isCompact ? 18 : 22,
    overflow: "hidden",
    width: "100%",
  },
  horizontalBarFill: {
    borderRadius: Radius.full,
    height: "100%",
    minWidth: 0,
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
