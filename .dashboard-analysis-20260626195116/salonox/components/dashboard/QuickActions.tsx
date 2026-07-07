import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Colors, Spacing } from "../../constants/theme";

const ACTIONS = [
  { label: "Book", icon: "📅", iconBg: "#EAF5EF", route: "/bookings/new" },
  { label: "Client", icon: "👤", iconBg: "#EEF4F1", route: "/clients/new" },
  { label: "Quick Sale", icon: "⚡", iconBg: "#FBF3E5", route: "/quick-sale", isAccent: true },
  { label: "Stock", icon: "📦", iconBg: "#F1EEF8", route: "/stock" },
];

export default function QuickActions() {
  return (
    <View style={styles.row}>
      {ACTIONS.map((action, i) => (
        <TouchableOpacity
          key={action.label}
          style={[styles.btn, i > 0 && styles.btnBorder]}
          activeOpacity={0.7}
          onPress={() => router.push(action.route as any)}
        >
          <View style={[styles.icon, { backgroundColor: action.iconBg }]}>
            <Text style={styles.iconText}>{action.icon}</Text>
          </View>
          <Text style={[styles.label, action.isAccent && styles.labelAccent]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  btnBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.text2,
  },
  labelAccent: {
    color: Colors.primary,
  },
});
