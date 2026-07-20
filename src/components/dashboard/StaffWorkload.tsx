import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { findAttendanceRecordForStaff } from "@/features/attendance/utils/attendanceMatching";
import { getAttendanceBadgeConfig } from "@/features/attendance/utils/attendanceStatus";
import { selectAttendanceRecords } from "@/store/attendance/attendance.slice";
import { selectDashboardAppointments } from "@/store/dashboard/dashboard.slice";
import { useAppSelector } from "@/store/hooks";
import { selectStaffLoading, selectStaffMembers } from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

const isStaffMatch = (staffName: string, appointmentStaffName: string) => {
  const sName = staffName.trim().toLowerCase();
  const aName = appointmentStaffName.trim().toLowerCase();
  if (sName === aName) return true;
  if (sName.includes(aName) || aName.includes(sName)) return true;
  const sFirst = sName.split(/\s+/)[0];
  const aFirst = aName.split(/\s+/)[0];
  if (sFirst && aFirst && sFirst === aFirst) return true;
  return false;
};

const ACTIVE_WORKLOAD_STATUSES = new Set(["in-progress", "upcoming"]);

export default function StaffWorkload() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const rawStaffMembers = useAppSelector(selectStaffMembers);
  const appointments = useAppSelector(selectDashboardAppointments);
  const isLoadingStaff = useAppSelector(selectStaffLoading);
  const attendanceRecords = useAppSelector(selectAttendanceRecords);

  // Filter out Inactive staff members
  const staffMembers = rawStaffMembers.filter(
    (member) => member.status !== "Inactive"
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Live floor</Text>
          <Text style={styles.sectionTitle}>Staff workload</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/team")}>
          <Text style={styles.link}>Manage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {isLoadingStaff && staffMembers.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : staffMembers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active staff members found</Text>
          </View>
        ) : (
          staffMembers.map((member, index) => {
            const staffAppointments = appointments.filter(
              (app) =>
                ACTIVE_WORKLOAD_STATUSES.has(app.status) && isStaffMatch(member.name, app.staffName)
            );

            const attendanceRecord = findAttendanceRecordForStaff(attendanceRecords, member);
            const badgeConfig = getAttendanceBadgeConfig(attendanceRecord, Colors);
            const isOnLeave = attendanceRecord?.statusKey === "onLeave";

            const totalSlots = 8;
            const jobs = isOnLeave ? 0 : staffAppointments.length;
            const slotsLeft = isOnLeave ? 0 : Math.max(0, totalSlots - jobs);
            const pct = isOnLeave ? 0 : Math.min(100, Math.round((jobs / totalSlots) * 100));

            const initials =
              member.initials ||
              member.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("") ||
              "ST";

            const avatarBg = member.avatarBg || Colors.bg2;
            const avatarColor = member.avatarColor || Colors.primaryDark;

            return (
              <TouchableOpacity
                key={member.id}
                activeOpacity={0.75}
                onPress={() => router.push(`/team/${member.id}` as Href)}
                style={[styles.memberRow, index > 0 && styles.memberBorder]}
              >
                <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                  <Text style={[styles.avatarText, { color: avatarColor }]}>
                    {initials}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: badgeConfig.bg,
                          color: badgeConfig.color,
                        },
                      ]}
                    >
                      {badgeConfig.label}
                    </Text>
                  </View>
                  <Text style={styles.memberMeta}>
                    {isOnLeave
                      ? "On leave today"
                      : `${jobs} job${jobs === 1 ? "" : "s"} today - ${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left`}
                  </Text>
                  {!isOnLeave && (
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: badgeConfig.color,
                            width: `${pct}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  link: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  memberRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  memberBorder: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  avatar: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  memberName: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  statusPill: {
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  memberMeta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 3,
  },
  progressTrack: {
    backgroundColor: Colors.bg2,
    borderRadius: 999,
    height: 6,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 999,
    height: "100%",
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "500",
  },
});
