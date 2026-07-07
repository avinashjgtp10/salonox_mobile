import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors, Spacing, Radius } from "../../constants/theme";
import { TOP_CLIENT } from "../../data/dashboardData";

export default function TopClientCard() {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Loyalty nudge</Text>
          <Text style={styles.sectionTitle}>Top client today</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/clients" as any)}>
          <Text style={styles.link}>All clients</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => router.push("/clients/priya-kapoor" as any)}
      >
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{TOP_CLIENT.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{TOP_CLIENT.name}</Text>
            <Text style={styles.meta}>
              {TOP_CLIENT.points} pts · {TOP_CLIENT.visits} visits · last{" "}
              {TOP_CLIENT.lastVisit}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{TOP_CLIENT.tag}</Text>
          </View>
        </View>

        <View style={styles.barBg}>
          <View
            style={[
              styles.barFill,
              { width: `${TOP_CLIENT.progressPct}%` as any },
            ]}
          />
        </View>

        <Text style={styles.hint}>
          <Text style={styles.hintAccent}>
            {TOP_CLIENT.nextRewardPts} pts to next reward
          </Text>{" "}
          — mention at checkout today
        </Text>
      </TouchableOpacity>
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
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg2,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.heading,
  },
  meta: {
    fontSize: 11,
    color: Colors.text2,
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#FBF3E5",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.goldDark,
  },
  barBg: {
    height: 6,
    backgroundColor: Colors.bg2,
    borderRadius: 3,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },
  hint: {
    fontSize: 11,
    color: Colors.text2,
    marginTop: 6,
  },
  hintAccent: {
    fontWeight: "600",
    color: Colors.primary,
  },
});
