import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { DashboardTypography as Typography, type ThemeColors } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import {
  selectDashboardIsLoading,
  selectDashboardMetrics,
} from "@/store/dashboard/dashboard.slice";
import { selectInventorySummary } from "@/store/product/product.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatDashboardRevenue } from "@/utils/dashboard";

// Split out of DashboardHero — same selectors/derived values, moved
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

  const ownerKpis = useMemo(
    () => [
      {
        icon: "cash-outline" as const,
        label: "Total Revenue",
        value: formatDashboardRevenue(dashboardMetrics.monthlyRevenue),
      },
      {
        icon: "trending-up-outline" as const,
        label: "Today's Revenue",
        value: formatDashboardRevenue(dashboardMetrics.todaysRevenue),
      },
      {
        icon: "cube-outline" as const,
        kind: "stock" as const,
        label: "Stock",
        stockMetrics: inventorySummary,
      },
      {
        icon: "calendar-outline" as const,
        label: "Bookings",
        value: String(dashboardMetrics.bookings),
      },
    ],
    [
      dashboardMetrics.bookings,
      dashboardMetrics.monthlyRevenue,
      dashboardMetrics.todaysRevenue,
      inventorySummary,
    ],
  );

  return (
    <View style={styles.row}>
      {ownerKpis.map((stat) => (
        <View key={stat.label} style={[styles.tile, stat.kind === "stock" && styles.stockTile]}>
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
              <View style={[
                styles.iconWrap,
                isCompact && styles.iconWrapCompact,
                stat.kind === "stock" && styles.stockIconWrap,
              ]}>
                <Ionicons name={stat.icon} size={22} color={Colors.heading} />
              </View>
              <View style={[styles.copy, stat.kind === "stock" && styles.stockCopy]}>
                {stat.kind === "stock" ? (
                  <>
                    <Text style={styles.stockTitle}>Stock</Text>
                    <View style={styles.stockRows}>
                      <View style={styles.stockMetric}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.stockValue}>
                          {stat.stockMetrics.totalProducts}
                        </Text>
                        <Text adjustsFontSizeToFit minimumFontScale={0.62} numberOfLines={1} style={styles.stockLabel}>
                          Available
                        </Text>
                      </View>
                      <View style={styles.stockMetric}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.stockValue}>
                          {stat.stockMetrics.lowStockProducts}
                        </Text>
                        <Text adjustsFontSizeToFit minimumFontScale={0.62} numberOfLines={1} style={styles.stockLabel}>
                          Low Stock
                        </Text>
                      </View>
                      <View style={styles.stockMetric}>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.stockValue}>
                          {stat.stockMetrics.outOfStockProducts}
                        </Text>
                        <Text adjustsFontSizeToFit minimumFontScale={0.62} numberOfLines={1} style={styles.stockLabel}>
                          Out of Stock
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.value}>
                      {stat.value}
                    </Text>
                    <Text style={styles.label}>{stat.label}</Text>
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
    gap: 12,
    paddingHorizontal: 22,
  },
  tile: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: isCompact ? "column" : "row",
    gap: isCompact ? 9 : 10,
    justifyContent: isCompact ? "center" : "flex-start",
    minHeight: isCompact ? 124 : 104,
    minWidth: 0,
    paddingHorizontal: isCompact ? 10 : 12,
    paddingVertical: isCompact ? 12 : 14,
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
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.backgroundElement,
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconWrapCompact: {
    borderRadius: 14,
    height: 40,
    width: 40,
  },
  copy: {
    flex: 1,
    minWidth: 0,
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
    fontSize: isCompact ? 15 : 17,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: isCompact ? 20 : 22,
  },
  label: {
    color: Colors.text2,
    fontSize: isCompact ? 11 : 12,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 0,
    lineHeight: isCompact ? 14 : 16,
    marginTop: isCompact ? 4 : 5,
  },
  stockTitle: {
    color: Colors.heading,
    fontSize: isCompact ? 13 : 14,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: isCompact ? 17 : 18,
    textAlign: "center",
    width: "100%",
  },
  stockRows: {
    flexDirection: "row",
    gap: isCompact ? 5 : 6,
    justifyContent: "space-between",
    marginTop: isCompact ? 7 : 8,
    minWidth: 0,
  },
  stockMetric: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    minWidth: 0,
  },
  stockLabel: {
    color: Colors.text2,
    fontSize: isCompact ? 9.5 : 10,
    fontWeight: Typography.fontWeights.semibold,
    lineHeight: isCompact ? 12 : 13,
    marginTop: 2,
    minWidth: 0,
    textAlign: "center",
    width: "100%",
  },
  stockValue: {
    color: Colors.heading,
    fontSize: isCompact ? 14 : 15,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: isCompact ? 17 : 18,
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
