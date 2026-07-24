import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { findAttendanceRecordForStaff } from "@/features/attendance/utils/attendanceMatching";
import {
  formatAttendanceTime,
  getTodayAttendanceDateKey,
} from "@/features/attendance/utils/attendanceStatus";
import { selectAttendanceDate, selectAttendanceRecords } from "@/store/attendance/attendance.slice";
import { selectDashboardAppointments } from "@/store/dashboard/dashboard.slice";
import { useAppSelector } from "@/store/hooks";
import { selectStaffLoading, selectStaffMembers } from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { StaffMember } from "@/data/teamData";
import type { AttendanceRecord } from "@/types/attendance";

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

type AttendancePresentation = {
  bg: string;
  color: string;
  label: "Checked In" | "Checked Out" | "Leave" | "Not Marked" | "On Break";
  time: string;
};

const formatDisplayDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  const monthLabel = date.toLocaleString("en-US", { month: "short" });

  return `${date.getDate()} ${monthLabel} ${date.getFullYear()}`;
};

const getAttendancePresentation = (
  record: AttendanceRecord | null,
  staffMember: StaffMember,
): AttendancePresentation => {
  const status = staffMember.status.toLowerCase();

  if (status === "break") {
    return {
      bg: "rgba(245, 191, 79, 0.16)",
      color: "#F5C451",
      label: "On Break",
      time: formatAttendanceTime(record?.checkInTime),
    };
  }

  if (!record) {
    return {
      bg: "rgba(180, 180, 180, 0.12)",
      color: "#A9A9A9",
      label: "Not Marked",
      time: "--",
    };
  }

  if (record.statusKey === "onLeave" || record.statusKey === "inactive") {
    return {
      bg: "rgba(236, 127, 127, 0.16)",
      color: "#FF9B9B",
      label: "Leave",
      time: "--",
    };
  }

  if (record.checkOutTime) {
    return {
      bg: "rgba(99, 155, 255, 0.16)",
      color: "#78A9FF",
      label: "Checked Out",
      time: formatAttendanceTime(record.checkOutTime),
    };
  }

  return {
    bg: "rgba(139, 199, 162, 0.16)",
    color: "#91D68F",
    label: "Checked In",
    time: formatAttendanceTime(record.checkInTime),
  };
};

const getAvailabilityPresentation = (member: StaffMember, jobs: number) => {
  if (member.status === "Inactive" || member.status === "On Leave" || member.availability === "Offline") {
    return {
      bg: "rgba(236, 127, 127, 0.15)",
      color: "#FF9B9B",
      label: "Inactive",
    };
  }

  if (member.status === "Working") {
    return {
      bg: "rgba(139, 199, 162, 0.14)",
      color: "#91D68F",
      label: "Working",
    };
  }

  if (member.status === "Busy" || member.availability === "Busy" || jobs >= 3) {
    return {
      bg: "rgba(245, 191, 79, 0.15)",
      color: "#F5C451",
      label: "Busy",
    };
  }

  return {
    bg: "rgba(139, 199, 162, 0.14)",
    color: "#91D68F",
    label: "Available",
  };
};

const getProgressColor = (pct: number) => {
  if (pct >= 65) return "#91D68F";
  if (pct >= 35) return "#F5C451";
  return "#FF91A4";
};

export default function StaffWorkload() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const rawStaffMembers = useAppSelector(selectStaffMembers);
  const appointments = useAppSelector(selectDashboardAppointments);
  const isLoadingStaff = useAppSelector(selectStaffLoading);
  const attendanceRecords = useAppSelector(selectAttendanceRecords);
  const attendanceDate = useAppSelector(selectAttendanceDate) || getTodayAttendanceDateKey();

  const staffMembers = rawStaffMembers.filter((member) => member.status !== "Inactive");

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Live floor</Text>
          <Text style={styles.sectionTitle}>Staff Workload</Text>
        </View>
        <TouchableOpacity activeOpacity={0.78} onPress={() => router.push("/team")}>
          <Text style={styles.link}>Manage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateText}>Today • {formatDisplayDate(attendanceDate)}</Text>
        <Ionicons name="calendar-clear-outline" size={15} color={Colors.text2} />
      </View>

      {isLoadingStaff && staffMembers.length === 0 ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : staffMembers.length === 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.emptyText}>No active staff members found</Text>
        </View>
      ) : (
        <View style={styles.memberList}>
          {staffMembers.map((member) => {
            const staffAppointments = appointments.filter(
              (app) =>
                ACTIVE_WORKLOAD_STATUSES.has(app.status) && isStaffMatch(member.name, app.staffName),
            );
            const attendanceRecord = findAttendanceRecordForStaff(attendanceRecords, member) ?? null;
            const isOnLeave = attendanceRecord?.statusKey === "onLeave";
            const totalSlots = 8;
            const jobs = isOnLeave ? 0 : staffAppointments.length;
            const slotsLeft = isOnLeave ? 0 : Math.max(0, totalSlots - jobs);
            const pct = isOnLeave ? 0 : Math.min(100, Math.round((jobs / totalSlots) * 100));
            const attendance = getAttendancePresentation(attendanceRecord, member);
            const availability = getAvailabilityPresentation(member, jobs);
            const initials =
              member.initials ||
              member.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("") ||
              "ST";

            return (
              <TouchableOpacity
                key={member.id}
                activeOpacity={0.82}
                onPress={() => router.push(`/team/${member.id}` as Href)}
                style={styles.memberCard}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>

                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text numberOfLines={1} style={styles.memberName}>{member.name}</Text>
                    <View style={[styles.availabilityBadge, { backgroundColor: availability.bg }]}>
                      <Text style={[styles.availabilityText, { color: availability.color }]}>
                        {availability.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.chipRow}>
                    <View style={[styles.attendanceChip, { backgroundColor: attendance.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: attendance.color }]} />
                      <Text style={[styles.attendanceChipText, { color: attendance.color }]}>
                        {attendance.label}
                      </Text>
                    </View>
                    <View style={styles.timeChip}>
                      <Ionicons name="time-outline" size={13} color={Colors.text2} />
                      <Text style={styles.timeChipText}>{attendance.time}</Text>
                    </View>
                  </View>

                  <Text style={styles.memberMeta}>
                    {jobs} Job{jobs === 1 ? "" : "s"} Today • {slotsLeft} Slots Left
                  </Text>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: getProgressColor(pct),
                          width: `${pct}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={19} color={Colors.text2} />
              </TouchableOpacity>
            );
          })}

          <View style={styles.legendCard}>
            <View style={styles.legendHeader}>
              <Text style={styles.legendTitle}>Status guide</Text>
              <View style={styles.legendInfo}>
                <Ionicons name="information-circle-outline" size={15} color={Colors.text2} />
                <Text style={styles.legendInfoText}>Live</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <LegendItem color="#91D68F" label="Checked In" />
              <LegendItem color="#78A9FF" label="Checked Out" />
              <LegendItem color="#F5C451" label="On Break" />
              <LegendItem color="#A9A9A9" label="Not Marked" />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={legendStyles.label}>{label}</Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  dot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  item: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  label: {
    color: "#B8AEA3",
    fontSize: 11,
    fontWeight: "600",
  },
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  link: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "800",
    paddingBottom: 3,
  },
  dateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: Spacing.md,
  },
  dateText: {
    color: Colors.text2,
    fontSize: 15,
    fontWeight: "600",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: "rgba(32, 29, 26, 0.92)",
    borderColor: Colors.border,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 118,
    padding: Spacing.xl,
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
  },
  memberList: {
    gap: 12,
  },
  memberCard: {
    alignItems: "center",
    backgroundColor: "rgba(32, 29, 26, 0.92)",
    borderColor: "#2E2E2E",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 150,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 3,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#F3EFE7",
    borderRadius: 19,
    height: 58,
    justifyContent: "center",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    width: 58,
  },
  avatarText: {
    color: "#5B5249",
    fontSize: 18,
    fontWeight: "900",
  },
  memberInfo: {
    flex: 1,
    gap: 9,
    minWidth: 0,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
  },
  memberName: {
    color: Colors.heading,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  availabilityBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "900",
  },
  chipRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  attendanceChip: {
    alignItems: "center",
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    borderRadius: Radius.full,
    height: 7,
    width: 7,
  },
  attendanceChipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  timeChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: "rgba(255,255,255,0.055)",
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  timeChipText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
  },
  memberMeta: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
  },
  progressTrack: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: Radius.full,
    height: 6,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: Radius.full,
    height: "100%",
    minWidth: 8,
  },
  legendCard: {
    backgroundColor: "rgba(32, 29, 26, 0.92)",
    borderColor: "#2E2E2E",
    borderRadius: 20,
    borderWidth: 1,
    gap: Spacing.md,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 2,
  },
  legendHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
  },
  legendInfo: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  legendInfoText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
});
