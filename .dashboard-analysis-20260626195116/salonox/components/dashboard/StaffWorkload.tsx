import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors, Spacing, Radius } from "../../constants/theme";
import { STAFF } from "../../data/dashboardData";

export default function StaffWorkload() {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Live floor</Text>
          <Text style={styles.sectionTitle}>Stylist workload</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/team" as any)}>
          <Text style={styles.link}>Roster</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {STAFF.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => router.push(`/team/${s.id}` as any)}
          >
            <View style={styles.top}>
              <View style={[styles.avatar, { backgroundColor: s.avatarBg }]}>
                <Text style={[styles.avatarText, { color: s.avatarColor }]}>
                  {s.initials}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={styles.jobs}>{s.jobs} jobs</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: s.pillBg }]}>
                <Text style={[styles.pillText, { color: s.pillColor }]}>
                  {s.pct}%
                </Text>
              </View>
            </View>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.barFill,
                  { width: `${s.pct}%` as any, backgroundColor: s.barColor },
                ]}
              />
            </View>
            <View style={styles.meta}>
              <Text style={[styles.status, { color: s.barColor }]}>
                {s.status}
              </Text>
              <Text style={styles.slots}>{s.slotsLeft} slots left</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
  grid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.heading,
  },
  jobs: {
    fontSize: 10,
    color: Colors.text2,
  },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  barBg: {
    height: 5,
    backgroundColor: Colors.bg2,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 5,
    borderRadius: 3,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  status: {
    fontSize: 10,
    fontWeight: "600",
  },
  slots: {
    fontSize: 10,
    color: Colors.text2,
  },
});
