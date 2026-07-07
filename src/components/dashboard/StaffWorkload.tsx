import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import type { StaffMember } from "@/data/teamData";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { selectDashboardAppointments } from "@/store/dashboard/dashboard.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectStaffLoading, selectStaffMembers } from "@/store/staff/staff.slice";

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

export default function StaffWorkload() {
  const dispatch = useAppDispatch();
  const rawStaffMembers = useAppSelector(selectStaffMembers);
  const appointments = useAppSelector(selectDashboardAppointments);
  const isLoadingStaff = useAppSelector(selectStaffLoading);

  useEffect(() => {
    void dispatch(fetchStaffThunk({ reset: true }));
  }, [dispatch]);

  // Filter out Inactive staff members
  const staffMembers = rawStaffMembers.filter(
    (member) => member.status !== "Inactive"
  );

  const getStaffStatus = (member: StaffMember, hasInProgressApp: boolean) => {
    const statusStr = (member.status || member.availability || "").toLowerCase();

    if (statusStr.includes("leave")) {
      return {
        label: "On Leave",
        pillBg: Colors.warningBg,
        pillColor: Colors.warning,
        barColor: Colors.warning,
      };
    }

    if (statusStr.includes("busy") || hasInProgressApp) {
      return {
        label: "Busy",
        pillBg: Colors.errorBg,
        pillColor: Colors.error,
        barColor: Colors.error,
      };
    }

    return {
      label: "Open",
      pillBg: Colors.successBg,
      pillColor: Colors.success,
      barColor: Colors.primary,
    };
  };

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
                app.status !== "cancelled" && isStaffMatch(member.name, app.staffName)
            );

            const hasInProgressApp = staffAppointments.some(
              (app) => app.status === "in-progress"
            );

            const statusStr = (member.status || member.availability || "").toLowerCase();
            const isOnLeave = statusStr.includes("leave");

            const totalSlots = 8;
            const jobs = isOnLeave ? 0 : staffAppointments.length;
            const slotsLeft = isOnLeave ? 0 : Math.max(0, totalSlots - jobs);
            const pct = isOnLeave ? 0 : Math.min(100, Math.round((jobs / totalSlots) * 100));

            const statusConfig = getStaffStatus(member, hasInProgressApp);
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
                          backgroundColor: statusConfig.pillBg,
                          color: statusConfig.pillColor,
                        },
                      ]}
                    >
                      {statusConfig.label}
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
                            backgroundColor: statusConfig.barColor,
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

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
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
    letterSpacing: 0.6,
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
