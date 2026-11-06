/** Dashboard lists (prototype): Next appointments and Staff on the floor. */
import { router, type Href } from "expo-router";
import { Fragment, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { pearl, pearlType, type PearlTone } from "@/components/auth/pearl/tokens";
import { Avatar, Card, Divider, ListRow, SectionHeader, Skeleton, SmallButton, StatusPill, type PillTone } from "@/components/pearl/ui";
import { Text } from "@/components/ui/AppTypography";
import { findAttendanceRecordForStaff } from "@/features/attendance/utils/attendanceMatching";
import { formatAttendanceTime, getAttendanceBadgeConfig } from "@/features/attendance/utils/attendanceStatus";
import { useLocalDay } from "@/hooks/useLocalDay";
import { selectAttendanceDate, selectAttendanceRecords } from "@/store/attendance/attendance.slice";
import { useAppSelector } from "@/store/hooks";
import { selectStaffLoading, selectStaffMembers } from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AttendanceRecord } from "@/types/attendance";
import { type DashboardAppointmentStatus, useTodayAppointments } from "./useTodayAppointments";

const APPOINTMENT_STATUS: Record<DashboardAppointmentStatus, { tone: PillTone; label: string }> = {
  upcoming: { tone: "neutral", label: "Upcoming" },
  "in-progress": { tone: "warning", label: "In progress" },
  completed: { tone: "success", label: "Completed" },
};

const splitTime = (time: string) => {
  const match = time.trim().match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);
  return match ? { time: match[1], ampm: match[2].toUpperCase() } : { time, ampm: "" };
};

export function NextAppointments({ refreshKey }: { refreshKey?: number }) {
  const appointments = useTodayAppointments(refreshKey);

  return (
    <>
      <SectionHeader title="Next appointments" action="View all" onAction={() => router.push("/bookings" as Href)} />
      <Card>
        {appointments.length ? appointments.map((appointment, index) => {
          const { time, ampm } = splitTime(appointment.time);
          return (
            <Fragment key={appointment.id}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                left={(
                  <View style={styles.time}>
                    <Text style={[pearlType.label, { fontWeight: "700", color: pearl.ink }]}>{time}</Text>
                    {ampm ? <Text style={[pearlType.small, { fontSize: 10.5, lineHeight: 13 }]}>{ampm}</Text> : null}
                  </View>
                )}
                title={appointment.clientName}
                subtitle={[appointment.service, appointment.staffName ? `with ${appointment.staffName}` : ""].filter(Boolean).join(" · ")}
                right={<StatusPill {...APPOINTMENT_STATUS[appointment.status]} />}
                onPress={() => router.push(`/appointments/${appointment.id}` as Href)}
                label={`${appointment.time}, ${appointment.clientName}, ${APPOINTMENT_STATUS[appointment.status].label}`}
              />
            </Fragment>
          );
        }) : (
          <View style={styles.empty}>
            <Text style={pearlType.small}>No more appointments today.</Text>
            <SmallButton title="Book one" icon="plus" onPress={() => router.push("/bookings/new" as Href)} />
          </View>
        )}
      </Card>
    </>
  );
}

/** Attendance label → pill colour; the label itself is always shown as text. */
const attendanceTone = (label: string): PillTone => {
  const key = label.toLowerCase();
  if (key === "present") return "success";
  if (key === "absent" || key === "on leave") return "danger";
  if (key === "not marked") return "neutral";
  return "warning"; // Late, Half Day, On Break
};

const attendanceNote = (record: AttendanceRecord | null, label: string) => {
  if (record?.checkInTime) {
    const parts = [`In ${formatAttendanceTime(record.checkInTime)}`];
    if (record.checkOutTime) parts.push(`Out ${formatAttendanceTime(record.checkOutTime)}`);
    return parts.join(" · ");
  }
  return label.toLowerCase() === "on leave" ? "On leave today" : "No check-in yet";
};

const initialsOf = (name: string, fallback?: string) =>
  fallback || name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "ST";

export function StaffOnFloor() {
  const Colors = useThemeColors();
  const rawStaffMembers = useAppSelector(selectStaffMembers);
  const isLoadingStaff = useAppSelector(selectStaffLoading);
  const attendanceRecords = useAppSelector(selectAttendanceRecords);
  const attendanceDate = useLocalDay();
  const recordsDate = useAppSelector(selectAttendanceDate);
  const staffMembers = useMemo(() => rawStaffMembers.filter(member => member.status !== "Inactive"), [rawStaffMembers]);

  return (
    <>
      <SectionHeader title="Staff on the floor" action="Attendance" onAction={() => router.push("/team/attendance" as Href)} />
      {isLoadingStaff && staffMembers.length === 0 ? <Skeleton h={120} r={22} /> : (
        <Card>
          {staffMembers.length ? staffMembers.map((member, index) => {
            const record = recordsDate === attendanceDate ? findAttendanceRecordForStaff(attendanceRecords, member) ?? null : null;
            const rawLabel = getAttendanceBadgeConfig(record, Colors).label;
            const label = rawLabel.charAt(0) + rawLabel.slice(1).toLowerCase();
            const tone = attendanceTone(rawLabel);
            return (
              <Fragment key={member.id}>
                {index > 0 ? <Divider /> : null}
                <ListRow
                  left={<Avatar initials={initialsOf(member.name, member.initials)} tone={tone as PearlTone} />}
                  title={member.name}
                  subtitle={attendanceNote(record, rawLabel)}
                  right={<StatusPill tone={tone} label={label} />}
                  onPress={() => router.push(`/team/${member.id}` as Href)}
                  label={`${member.name}, ${label}`}
                />
              </Fragment>
            );
          }) : (
            <View style={styles.empty}><Text style={pearlType.small}>No active staff members yet.</Text></View>
          )}
        </Card>
      )}
      <View style={styles.legend} accessibilityLabel="Status guide: Present, Late, Absent, Not marked">
        <StatusPill tone="success" label="Present" />
        <StatusPill tone="warning" label="Late" />
        <StatusPill tone="danger" label="Absent" />
        <StatusPill tone="neutral" label="Not marked" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  time: { width: 50, height: 46, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.75)", alignItems: "center", justifyContent: "center" },
  empty: { padding: 16, alignItems: "center", gap: 8 },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, opacity: 0.9 },
});
