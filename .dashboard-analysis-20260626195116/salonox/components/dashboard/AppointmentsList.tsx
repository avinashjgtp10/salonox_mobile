import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors, Spacing, Radius, Typography } from "../../constants/theme";
import { APPOINTMENTS, AppointmentStatus } from "../../data/dashboardData";

const BADGE_STYLES: Record<AppointmentStatus, { bg: string; color: string }> = {
  Paid: { bg: Colors.successBg, color: "#2E7049" },
  Due: { bg: Colors.warningBg, color: "#9B6A12" },
  VIP: { bg: "#FBF3E5", color: Colors.goldDark },
};

function Badge({ status }: { status: AppointmentStatus }) {
  const s = BADGE_STYLES[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{status}</Text>
    </View>
  );
}

function StaffChip({ initials, bg, color }: { initials: string; bg: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: Colors.card }]}>
      <Text style={[styles.chipText, { color }]}>{initials}</Text>
    </View>
  );
}

function AppointmentCard({ appt }: { appt: typeof APPOINTMENTS[0] }) {
  const isPast = appt.ampm === "PM";
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/appointments/${appt.id}` as any)}
    >
      <View style={[styles.timePill, isPast && styles.timePillMuted]}>
        <Text style={[styles.timeText, isPast && styles.timeTextMuted]}>{appt.time}</Text>
        <Text style={[styles.ampmText, isPast && styles.ampmTextMuted]}>{appt.ampm}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.info}>
        <Text style={styles.name}>{appt.name}</Text>
        <Text style={styles.service}>{appt.service}</Text>
        <View style={styles.chips}>
          {appt.staff.map((s) => (
            <StaffChip key={s.initials} {...s} />
          ))}
        </View>
        <Text style={styles.meta}>{appt.meta}</Text>
      </View>
      <Badge status={appt.status} />
    </TouchableOpacity>
  );
}

export default function AppointmentsList() {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Thursday</Text>
          <Text style={styles.sectionTitle}>Upcoming appointments</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/bookings" as any)}>
          <Text style={styles.link}>View all</Text>
        </TouchableOpacity>
      </View>
      {APPOINTMENTS.map((appt) => (
        <AppointmentCard key={appt.id} appt={appt} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Colors.text2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.heading,
    marginTop: 2,
  },
  link: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  timePill: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    minWidth: 46,
  },
  timePillMuted: {
    backgroundColor: Colors.bg2,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 16,
  },
  timeTextMuted: {
    color: Colors.text2,
  },
  ampmText: {
    fontSize: 8,
    color: "rgba(255,255,255,0.6)",
    marginTop: 1,
  },
  ampmTextMuted: {
    color: Colors.placeholder,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.heading,
  },
  service: {
    fontSize: 10,
    color: Colors.text2,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  chips: {
    flexDirection: "row",
    gap: 3,
    marginTop: 4,
  },
  chip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 8,
    fontWeight: "700",
  },
  meta: {
    fontSize: 10,
    color: Colors.placeholder,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
