import { Text } from "@/components/ui/AppTypography";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import MonthlyProjectionCard from "./MonthlyProjectionCard";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type DimensionValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TourButton, TourView } from "@/features/userGuide/DashboardTour";

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
import { useAppTheme, useThemeColors } from "@/theme/ThemeProvider";
import { formatCurrency, formatCurrencyRounded } from "@/utils/currency";



const STAT_TILE_GRADIENTS = {
  bookings: ["#FEF3C7", "#FDE68A"],
  clients: ["#EDE9FE", "#DDD6FE"],
  comparison: ["#FCE7F3", "#FBCFE8"],
  monthRevenue: ["#D1FAE5", "#A7F3D0"],
  todayRevenue: ["#DBEAFE", "#BFDBFE"],
} as const;

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

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
      barColor: Colors.primary,
      label: "This Month",
      value: currentMonthRevenue,
    },
    {
      barColor: Colors.gold,
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
              <Text style={styles.horizontalBarValue}>{formatCurrencyRounded(row.value)}</Text>
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

export default function DashboardStatTiles() {
  const [revenueView, setRevenueView] = useState<"comparison" | "projection" | null>(null);
  const insets = useSafeAreaInsets();
  const Colors = useThemeColors();
  const { scheme } = useAppTheme();
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
        gradient: STAT_TILE_GRADIENTS.monthRevenue,
        icon: "cash-outline" as const,
        label: "This Month Revenue",
        route: "/monthly-revenue" as Href,
        subtitle: "Current Calendar Month",
        value: formatCurrencyRounded(dashboardMetrics.monthlyRevenue),
      },
      {
        accent: "sky" as const,
        bg: Colors.dashboardAppointmentBg,
        color: Colors.dashboardAppointmentAccent,
        gradient: STAT_TILE_GRADIENTS.todayRevenue,
        icon: "trending-up-outline" as const,
        label: "Today's Revenue",
        route: "/today-revenue" as Href,
        value: formatCurrency(dashboardMetrics.todaysRevenue),
      },
      {
        accent: "indigo" as const,
        bg: Colors.dashboardClientBg,
        color: Colors.dashboardClientAccent,
        gradient: STAT_TILE_GRADIENTS.clients,
        icon: "people-outline" as const,
        label: "Total Clients",
        route: "/clients" as Href,
        value: String(totalClients),
      },
      {
        accent: "green" as const,
        bg: Colors.dashboardWarningBg,
        color: Colors.dashboardWarningAccent,
        gradient: STAT_TILE_GRADIENTS.bookings,
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
        gradient: STAT_TILE_GRADIENTS.comparison,
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
        const gradient = scheme === "dark" || !("gradient" in stat) ? null : stat.gradient;
        const tileStyle = [
          styles.tile,
          { backgroundColor: stat.bg },
          // Dark tile colors are translucent; Android draws the elevation shadow
          // through them as a lighter box inside the tile.
          scheme === "dark" && styles.flatTile,
          "kind" in stat && stat.kind === "revenueComparison" && styles.comparisonTile,
        ];

        const tileContent = (
          <>
            {gradient ? (
              <LinearGradient
                colors={gradient}
                end={GRADIENT_END}
                pointerEvents="none"
                start={GRADIENT_START}
                style={styles.tileGradient}
              />
            ) : null}
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
                {"kind" in stat && stat.kind === "revenueComparison" ? null : (
                  <>
                    <IconBadge accent={stat.accent} icon={stat.icon} size={isCompact ? "sm" : "md"} />
                    <View style={[styles.accentBar, { backgroundColor: stat.color }]} />
                  </>
                )}
              </View>
              <View style={styles.copy}>
                {"kind" in stat && stat.kind === "revenueComparison" ? (
                  <>
                    <View style={styles.revenueSelector}>
                      {(["comparison", "projection"] as const).map((option) => (
                        <Pressable
                          key={option}
                          accessibilityRole="button"
                          accessibilityHint={`Opens the ${option} popup`}
                          onPress={() => setRevenueView(option)}
                          style={[styles.revenueOption, revenueView === option && styles.revenueOptionActive]}
                        >
                          <IconBadge accent={option === "comparison" ? "indigo" : "green"} icon={option === "comparison" ? "bar-chart-outline" : "trending-up-outline"} size="sm" />
                          <View style={styles.revenueOptionFooter}>
                            <Text numberOfLines={1} style={styles.revenueOptionLabel}>{option === "comparison" ? "Comparison" : "Projection"}</Text>
                            <Ionicons name="open-outline" size={16} color={Colors.heading} />
                          </View>
                        </Pressable>
                      ))}
                    </View>
                    <Modal transparent animationType="fade" visible={revenueView !== null} onRequestClose={() => setRevenueView(null)}>
                      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalOverlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
                        <Pressable accessibilityRole="button" accessibilityLabel="Close revenue popup" onPress={() => setRevenueView(null)} style={styles.modalBackdrop} />
                        <View accessibilityViewIsModal style={styles.modalPanel}>
                          <View style={styles.modalHeader}>
                            <Text accessibilityRole="header" style={styles.modalTitle}>{revenueView === "projection" ? "Projection" : "Comparison"}</Text>
                            <Pressable accessibilityRole="button" accessibilityLabel="Close revenue popup" onPress={() => setRevenueView(null)} style={styles.modalClose}>
                              <Ionicons name="close" size={24} color={Colors.heading} />
                            </Pressable>
                          </View>
                          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.modalContent}>
                    {revenueView === "projection" ? <MonthlyProjectionCard /> : revenueView === "comparison" ? <>
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
                          {formatCurrencyRounded(stat.lastMonthRevenue)}
                        </Text>
                      </View>
                      <View style={[styles.comparisonMetric, styles.comparisonMetricDivider]}>
                        <Text style={styles.comparisonLabel}>Current Month</Text>
                        <Text style={styles.comparisonValue}>
                          {formatCurrencyRounded(stat.currentMonthRevenue)}
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
                    </> : null}
                          </ScrollView>
                        </View>
                      </KeyboardAvoidingView>
                    </Modal>
                  </>
                ) : (
                  <>
                    <Text style={[styles.label, { color: stat.color }]}>{stat.label}</Text>
                    <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={[styles.value, Platform.OS === "ios" && styles.iosValue]}>
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
            <TourButton tourId={stat.label}
              accessibilityRole="button"
              activeOpacity={0.86}
              key={stat.label}
              onPress={() => router.push(route)}
              style={tileStyle}
            >
              {tileContent}
            </TourButton>
          );
        }

        return (
          <TourView tourId={stat.label} key={stat.label} style={tileStyle}>
            {tileContent}
          </TourView>
        );
      })}
    </View>
  );
}

const createStyles = (Colors: ThemeColors, isCompact: boolean) => StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalPanel: { width: "100%", maxWidth: 560, maxHeight: "100%", flexShrink: 1, borderRadius: 24, backgroundColor: Colors.dashboardCard, overflow: "hidden" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 20, paddingRight: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { color: Colors.heading, fontSize: 18, fontWeight: "700" },
  modalClose: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  modalContent: { padding: isCompact ? 16 : 20 },
  revenueSelector: { flexDirection: "row", gap: 8, width: "100%" },
  revenueOption: { flex: 1, minWidth: 0, gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: Colors.glassEdge, backgroundColor: Colors.dashboardCard },
  revenueOptionActive: { borderColor: Colors.primary },
  revenueOptionFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, width: "100%" },
  revenueOptionLabel: { flexShrink: 1, color: Colors.heading, fontSize: 14, fontWeight: "700" },
  row: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
  },
  tile: {
    alignItems: "flex-start",
    backgroundColor: Colors.dashboardCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.glassEdge,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "column",
    gap: isCompact ? 8 : 10,
    justifyContent: "space-between",
    minHeight: isCompact ? 148 : 160,
    minWidth: 0,
    overflow: "hidden",
    paddingHorizontal: isCompact ? 16 : 20,
    paddingVertical: isCompact ? 16 : 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  flatTile: {
    elevation: 0,
    shadowOpacity: 0,
  },
  tileGradient: {
    ...StyleSheet.absoluteFillObject,
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
  iosValue: {
    width: "100%",
    flexShrink: 0,
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
