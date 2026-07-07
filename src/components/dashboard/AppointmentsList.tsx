import { useMemo } from "react";
import { router, type Href } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import { selectDashboardAppointments } from "@/store/dashboard/dashboard.slice";
import { formatDashboardRevenue } from "@/utils/dashboard";

type AppointmentStatus = "completed" | "in-progress" | "upcoming" | "cancelled";

const BADGE_STYLES: Record<AppointmentStatus, { bg: string; color: string; label: string }> = {
  cancelled: { bg: Colors.errorBg, color: Colors.error, label: "Cancelled" },
  completed: { bg: Colors.successBg, color: "#2E7049", label: "Completed" },
  "in-progress": { bg: "rgba(91, 141, 239, 0.12)", color: Colors.info, label: "In Progress" },
  upcoming: { bg: Colors.warningBg, color: "#9B6A12", label: "Upcoming" },
};

function Badge({ status }: { status: AppointmentStatus }) {
  const badgeStyle = BADGE_STYLES[status];

  return (
    <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
      <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{badgeStyle.label}</Text>
    </View>
  );
}

function StaffChip({ initials }: { initials: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{initials}</Text>
    </View>
  );
}

type DashboardAppointmentCard = {
  amount: number;
  clientName: string;
  id: string;
  service: string;
  staffInitials: string;
  staffName: string;
  status: AppointmentStatus;
  time: string;
};

const getStaffInitials = (staffName: string) =>
  staffName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "NA";

const getTimeParts = (time: string) => {
  const match = time.trim().match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);

  if (match) {
    return {
      ampm: match[2].toUpperCase(),
      time: match[1],
    };
  }

  return {
    ampm: "",
    time,
  };
};

function AppointmentCard({ appt }: { appt: DashboardAppointmentCard }) {
  const timeParts = getTimeParts(appt.time);
  const isLaterToday = timeParts.ampm === "PM";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push(`/appointments/${appt.id}` as Href)}
      style={styles.card}
    >
      <View style={[styles.timePill, isLaterToday && styles.timePillMuted]}>
        <Text style={[styles.timeText, isLaterToday && styles.timeTextMuted]}>
          {timeParts.time}
        </Text>
        {timeParts.ampm ? (
          <Text style={[styles.ampmText, isLaterToday && styles.ampmTextMuted]}>
            {timeParts.ampm}
          </Text>
        ) : null}
      </View>
      <View style={styles.divider} />
      <View style={styles.info}>
        <Text style={styles.name}>{appt.clientName}</Text>
        <Text style={styles.service}>{appt.service}</Text>
        <View style={styles.chips}>
          <StaffChip initials={appt.staffInitials} />
        </View>
        <Text style={styles.meta}>
          {appt.staffName} - {formatDashboardRevenue(appt.amount)}
        </Text>
      </View>
      <Badge status={appt.status} />
    </TouchableOpacity>
  );
}

export default function AppointmentsList() {
  const appointments = useAppSelector(selectDashboardAppointments);
  const visibleAppointments = useMemo(
    () =>
      appointments.slice(0, 3).map((appointment) => ({
        ...appointment,
        staffInitials: getStaffInitials(appointment.staffName),
      })),
    [appointments],
  );


  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Thursday</Text>
          <Text style={styles.sectionTitle}>Upcoming appointments</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/bookings")}>
          <Text style={styles.link}>View all</Text>
        </TouchableOpacity>
      </View>
      {visibleAppointments.length > 0 ? (
        visibleAppointments.map((appt) => <AppointmentCard key={appt.id} appt={appt} />)
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No appointments scheduled for today.</Text>
        </View>
      )}
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
  emptyState: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 92,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyStateText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: 8,
    padding: Spacing.md,
  },
  timePill: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    minWidth: 46,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  timePillMuted: {
    backgroundColor: Colors.bg2,
  },
  timeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  timeTextMuted: {
    color: Colors.text2,
  },
  ampmText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 8,
    marginTop: 1,
  },
  ampmTextMuted: {
    color: Colors.placeholder,
  },
  divider: {
    backgroundColor: Colors.border,
    height: 36,
    width: 1,
  },
  info: {
    flex: 1,
  },
  name: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "600",
  },
  service: {
    color: Colors.text2,
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: 2,
    textTransform: "uppercase",
  },
  chips: {
    flexDirection: "row",
    gap: 3,
    marginTop: 4,
  },
  chip: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  chipText: {
    color: Colors.primaryDark,
    fontSize: 8,
    fontWeight: "700",
  },
  meta: {
    color: Colors.placeholder,
    fontSize: 10,
    marginTop: 3,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
