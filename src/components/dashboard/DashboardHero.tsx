import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardColors as Colors,
  DashboardSpacing as Spacing,
  DashboardTypography as Typography,
} from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import {
  selectDashboardIsLoading,
  selectDashboardMetrics,
} from "@/store/dashboard/dashboard.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { formatDashboardRevenue } from "@/utils/dashboard";
import {
  DEFAULT_BUSINESS_NAME,
  getUserBusinessName,
  getUserFullName,
  getUserInitials,
  getUserRoleLabel,
} from "@/utils/userProfile";

export default function DashboardHero() {
  const currentUser = useAppSelector(selectCurrentUser);
  const dashboardMetrics = useAppSelector(selectDashboardMetrics);
  const isDashboardLoading = useAppSelector(selectDashboardIsLoading);
  const businessName = getUserBusinessName(currentUser);
  const fullName = getUserFullName(currentUser);
  const initials = getUserInitials(currentUser);
  const roleLabel = getUserRoleLabel(currentUser).toUpperCase();
  const isDefaultBusinessName = businessName === DEFAULT_BUSINESS_NAME;
  const ownerKpis = useMemo(
    () => [
      {
        label: "Bookings",
        value: String(dashboardMetrics.bookings),
      },
      {
        label: "Monthly Revenue",
        value: formatDashboardRevenue(dashboardMetrics.monthlyRevenue),
      },
      {
        label: "Today's Revenue",
        value: formatDashboardRevenue(dashboardMetrics.todaysRevenue),
      },
    ],
    [dashboardMetrics.bookings, dashboardMetrics.monthlyRevenue, dashboardMetrics.todaysRevenue],
  );


  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View>
          <Text numberOfLines={1} style={styles.eyebrow}>{roleLabel}</Text>
          <Text style={styles.name}>
            {isDefaultBusinessName ? (
              <>
                Salon<Text style={styles.nameAccent}>OX</Text>
              </>
            ) : (
              businessName
            )}
          </Text>
          <Text numberOfLines={1} style={styles.ownerName}>{fullName}</Text>
        </View>
        <View style={styles.right}>
          <TouchableOpacity style={styles.bell} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={17} color="#FFFFFF" />
            <View style={styles.bellDot} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Open profile"
            activeOpacity={0.8}
            onPress={() => router.push("/profile" as Href)}
          >
            {currentUser?.avatarUrl ? (
              <Image contentFit="cover" source={{ uri: currentUser.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.strip}>
        {ownerKpis.map((stat, index) => (
          <View
            key={stat.label}
            style={[styles.statCell, index > 0 && styles.statCellBorder]}
          >
            {isDashboardLoading ? (
              <>
                <View style={styles.statValueSkeleton} />
                <View style={styles.statLabelSkeleton} />
              </>
            ) : (
              <>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.primaryDark,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 9,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 1,
    marginBottom: 3,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  ownerName: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: Typography.fontWeights.medium,
    marginTop: 4,
  },
  nameAccent: {
    color: Colors.gold,
  },
  right: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  bell: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  bellDot: {
    backgroundColor: Colors.gold,
    borderColor: Colors.primaryDark,
    borderRadius: 4,
    borderWidth: 1.5,
    height: 8,
    position: "absolute",
    right: 5,
    top: 5,
    width: 8,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.gold,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarImage: {
    backgroundColor: Colors.gold,
    borderRadius: 18,
    height: 36,
    width: 36,
  },
  avatarText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: Typography.fontWeights.bold,
  },
  strip: {
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    flexDirection: "row",
  },
  statCell: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 14,
  },
  statCellBorder: {
    borderLeftColor: "rgba(255,255,255,0.1)",
    borderLeftWidth: 1,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: Typography.fontWeights.bold,
    lineHeight: 26,
  },
  statValueSkeleton: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    height: 24,
    width: "62%",
  },
  statLabel: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 9,
    letterSpacing: 0.6,
    marginTop: 2,
    textTransform: "uppercase",
  },
  statLabelSkeleton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 10,
    marginTop: 8,
    width: "52%",
  },
});
