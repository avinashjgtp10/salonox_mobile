import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { AppLayout, AppRadius } from "@/constants/layout";
import type { StaffAvailability, StaffMember, StaffStatus } from "@/data/teamData";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatStaffDisplayName } from "@/utils/name";

type StaffCardProps = {
  index: number;
  onCall: (staffMember: StaffMember) => void;
  onMessage: (staffMember: StaffMember) => void;
  onMore: (staffMember: StaffMember) => void;
  staffMember: StaffMember;
};

const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString("en-IN")}`;

const getStatusPalette = (status: StaffStatus, Colors: ThemeColors) => {
  switch (status) {
    case "Available":
      return { backgroundColor: Colors.successBg, color: Colors.success };
    case "Busy":
      return { backgroundColor: Colors.warningBg, color: Colors.warning };
    case "Break":
      return { backgroundColor: Colors.warningBg, color: Colors.warning };
    case "On Leave":
      return { backgroundColor: Colors.errorBg, color: Colors.error };
    case "Inactive":
      return { backgroundColor: Colors.bg2, color: Colors.text2 };
    case "Working":
    default:
      return { backgroundColor: Colors.bg2, color: Colors.primaryDark };
  }
};

const getAvailabilityPalette = (availability: StaffAvailability, Colors: ThemeColors) => {
  switch (availability) {
    case "Available":
      return { dot: Colors.success, text: Colors.success };
    case "Busy":
      return { dot: Colors.warning, text: Colors.warning };
    case "On Leave":
      return { dot: Colors.error, text: Colors.error };
    case "Offline":
    default:
      return { dot: Colors.text2, text: Colors.text2 };
  }
};

function ActionIcon({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.actionIcon}>
      <Ionicons name={icon} size={16} color={Colors.primaryDark} />
    </TouchableOpacity>
  );
}

function StaffCardComponent({ index, onCall, onMessage, onMore, staffMember }: StaffCardProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const statusPalette = getStatusPalette(staffMember.status, Colors);
  const availabilityPalette = getAvailabilityPalette(staffMember.availability, Colors);

  return (
    <Animated.View
      entering={FadeInDown.duration(240).delay(Math.min(index * 35, 180))}
      layout={LinearTransition.duration(180)}
      style={styles.animatedWrap}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/team/${staffMember.id}` as Href)}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <View style={[styles.avatar, { backgroundColor: staffMember.avatarBg }]}>
            <Text style={[styles.avatarText, { color: staffMember.avatarColor }]}>
              {staffMember.initials}
            </Text>
          </View>

          <View style={styles.primaryCopy}>
            <Text numberOfLines={1} style={styles.name}>
              {formatStaffDisplayName(staffMember.name)}
            </Text>

            <View style={styles.statusBadgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusPalette.backgroundColor }]}>
                <Text style={[styles.statusBadgeText, { color: statusPalette.color }]}>
                  {staffMember.status}
                </Text>
              </View>
            </View>

            <Text numberOfLines={1} style={styles.role}>
              {staffMember.role}
            </Text>

            <View style={styles.availabilityRow}>
              <View style={[styles.availabilityDot, { backgroundColor: availabilityPalette.dot }]} />
              <Text numberOfLines={1} style={[styles.availabilityText, { color: availabilityPalette.text }]}>
                {staffMember.availabilityLabel}
              </Text>
            </View>
          </View>

          <View style={styles.actionRail}>
            <ActionIcon icon="call-outline" onPress={() => onCall(staffMember)} />
            <ActionIcon icon="chatbubble-ellipses-outline" onPress={() => onMessage(staffMember)} />
            <ActionIcon
              icon="person-circle-outline"
              onPress={() => router.push(`/team/${staffMember.id}` as Href)}
            />
            <ActionIcon icon="ellipsis-horizontal" onPress={() => onMore(staffMember)} />
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricChip}>
            <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
            <Text style={styles.metricValue}>{staffMember.todayAppointments}</Text>
            <Text style={styles.metricLabel}>Appointments</Text>
          </View>
          <View style={styles.metricChip}>
            <Ionicons name="cash-outline" size={13} color={Colors.primary} />
            <Text style={styles.metricValue}>{formatCurrency(staffMember.todayRevenue)}</Text>
            <Text style={styles.metricLabel}>Revenue</Text>
          </View>
          <View style={styles.metricChip}>
            <Ionicons name="sparkles-outline" size={13} color={Colors.primary} />
            <Text style={styles.metricValue}>{staffMember.servicesCompleted}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.performanceSection}>
          <Text style={styles.performanceLabel}>Performance</Text>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceValue}>{staffMember.todayAppointments}</Text>
              <Text style={styles.performanceCaption}>Today</Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceValue}>{formatCurrency(staffMember.todayRevenue)}</Text>
              <Text style={styles.performanceCaption}>Revenue</Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceValue}>{staffMember.averageRating.toFixed(1)}</Text>
              <Text style={styles.performanceCaption}>Rating</Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceValue}>{staffMember.servicesCompleted}</Text>
              <Text style={styles.performanceCaption}>Services</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export const StaffCard = memo(StaffCardComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  animatedWrap: {
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  avatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  primaryCopy: {
    flex: 1,
    marginLeft: Spacing.md,
    minWidth: 0,
  },
  name: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
  },
  statusBadgeRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  role: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 4,
  },
  availabilityRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  availabilityDot: {
    borderRadius: Radius.full,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  availabilityText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  actionRail: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    marginLeft: Spacing.md,
    width: 104,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.control,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.md,
  },
  metricChip: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  metricValue: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  metricLabel: {
    color: Colors.text2,
    fontSize: 10,
    marginTop: 3,
    textAlign: "center",
  },
  performanceSection: {
    marginTop: Spacing.md,
  },
  performanceLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  performanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  performanceCard: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    minWidth: "48%",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  performanceValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  performanceCaption: {
    color: Colors.text2,
    fontSize: 10,
    marginTop: 4,
  },
});
