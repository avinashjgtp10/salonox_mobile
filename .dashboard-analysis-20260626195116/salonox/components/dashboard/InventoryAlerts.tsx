import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors, Spacing, Radius } from "../../constants/theme";
import { INVENTORY_ALERTS } from "../../data/dashboardData";

export default function InventoryAlerts() {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Inventory</Text>
          <Text style={styles.sectionTitle}>Needs attention</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/stock" as any)}>
          <Text style={styles.link}>Order</Text>
        </TouchableOpacity>
      </View>

      {INVENTORY_ALERTS.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          activeOpacity={0.75}
          onPress={() => router.push(`/stock/${item.id}` as any)}
        >
          <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
            <Text style={[styles.icon, { color: item.iconColor }]}>
              {item.level === "warning" ? "⚠" : "⊗"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.sub}>{item.sub}</Text>
          </View>
          <Text style={[styles.action, { color: item.actionColor }]}>
            {item.action}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 18,
  },
  name: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.heading,
  },
  sub: {
    fontSize: 11,
    color: Colors.text2,
    marginTop: 2,
  },
  action: {
    fontSize: 12,
    fontWeight: "600",
  },
});
