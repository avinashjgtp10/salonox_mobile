import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Typography, Spacing } from "../../constants/theme";

export default function DashboardHero() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View>
          <Text style={styles.eyebrow}>SALON DASHBOARD</Text>
          <Text style={styles.name}>
            Salon<Text style={styles.nameAccent}>OX</Text>
          </Text>
        </View>
        <View style={styles.right}>
          <TouchableOpacity style={styles.bell} activeOpacity={0.7}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.bellDot} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AS</Text>
          </View>
        </View>
      </View>

      {/* Stats strip */}
      <View style={styles.strip}>
        {[
          { value: "38", label: "Bookings" },
          { value: "₹4.8k", label: "Revenue" },
          { value: "82%", label: "Seats" },
        ].map((stat, i) => (
          <View
            key={stat.label}
            style={[styles.statCell, i > 0 && styles.statCellBorder]}
          >
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.primaryDark,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 1,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: Typography.fontWeights.bold,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  nameAccent: {
    color: Colors.gold,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: {
    fontSize: 16,
  },
  bellDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
    position: "absolute",
    top: 5,
    right: 5,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primaryDark,
  },
  strip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  statCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  statCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.1)",
  },
  statValue: {
    fontSize: 22,
    fontWeight: Typography.fontWeights.bold,
    color: "#FFFFFF",
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
