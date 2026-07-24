import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import type { StaffMember } from "@/data/teamData";
import {
  formatAttendanceTime,
  getAttendanceAction,
  getAttendanceBadgeConfig,
  getWorkingHoursLabel,
} from "@/features/attendance/utils/attendanceStatus";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AttendanceRecord } from "@/types/attendance";

type AttendanceStaffRowProps = {
  canManageAttendance: boolean;
  isBusy: boolean;
  onOpenModal: () => void;
  onPrimaryAction: () => void;
  record: AttendanceRecord | null | undefined;
  staffMember: StaffMember;
};

function AttendanceStaffRowComponent({
  canManageAttendance,
  isBusy,
  onOpenModal,
  onPrimaryAction,
  record,
  staffMember,
}: AttendanceStaffRowProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const action = getAttendanceAction(record);
  const badgeConfig = getAttendanceBadgeConfig(record, Colors);
  const avatarBg = record?.avatarBg || staffMember.avatarBg || Colors.bg2;
  const avatarColor = record?.avatarColor || staffMember.avatarColor || Colors.primaryDark;
  const initials = record?.initials || staffMember.initials;
  const scheduledHoursLabel =
    typeof record?.scheduledHours === "number" && record.scheduledHours > 0
      ? `${record.scheduledHours.toFixed(record.scheduledHours % 1 === 0 ? 0 : 1)}h scheduled`
      : "Schedule --";
  const showPrimaryAction = canManageAttendance || action.kind !== "edit";

  const primaryButtonStyle = [
    styles.primaryButton,
    action.kind === "checkIn" && styles.primaryButtonCheckIn,
    action.kind === "checkOut" && styles.primaryButtonCheckOut,
    action.kind === "edit" && styles.primaryButtonEdit,
  ];

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {staffMember.name}
          </Text>
          <View style={[styles.chip, { backgroundColor: badgeConfig.bg }]}>
            <Ionicons name={badgeConfig.icon} size={11} color={badgeConfig.color} />
            <Text style={[styles.chipText, { color: badgeConfig.color }]}>{badgeConfig.label}</Text>
          </View>
        </View>
        <Text style={styles.role} numberOfLines={1}>
          {staffMember.role}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="log-in-outline" size={12} color={Colors.text2} />
            <Text style={styles.metaText}>{formatAttendanceTime(record?.checkInTime)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="log-out-outline" size={12} color={Colors.text2} />
            <Text style={styles.metaText}>{formatAttendanceTime(record?.checkOutTime)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="hourglass-outline" size={12} color={Colors.text2} />
            <Text style={styles.metaText}>{getWorkingHoursLabel(record)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-clear-outline" size={12} color={Colors.text2} />
            <Text style={styles.metaText}>{scheduledHoursLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        {showPrimaryAction ? (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isBusy}
            onPress={onPrimaryAction}
            style={[...primaryButtonStyle, isBusy && styles.buttonDisabled]}
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{action.label}</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {canManageAttendance && action.kind !== "edit" ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onOpenModal} style={styles.secondaryButton}>
            <Ionicons name="create-outline" size={15} color={Colors.primaryDark} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export const AttendanceStaffRow = memo(AttendanceStaffRowComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  row: {
    alignItems: "flex-start",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    marginVertical: Spacing.sm,
    padding: 14,
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
  info: {
    flex: 1,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  name: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  role: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 2,
  },
  chip: {
    alignItems: "center",
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  metaText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
  },
  actions: {
    alignItems: "flex-end",
    gap: 8,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 88,
    paddingHorizontal: 14,
  },
  primaryButtonCheckIn: {
    backgroundColor: Colors.success,
  },
  primaryButtonCheckOut: {
    backgroundColor: Colors.warning,
  },
  primaryButtonEdit: {
    backgroundColor: Colors.primaryDark,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
});
