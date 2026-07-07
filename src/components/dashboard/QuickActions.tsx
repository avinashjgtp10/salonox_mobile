import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DashboardColors as Colors } from "@/constants/theme";

const ACTIONS: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  isAccent?: boolean;
  label: string;
  route: Href;
}[] = [
  { label: "Book", icon: "calendar-outline", iconBg: "#EAF5EF", route: "/bookings" as Href },
  { label: "Client", icon: "person-add-outline", iconBg: "#EEF4F1", route: "/clients/new" as Href },
  {
    label: "Quick Sale",
    icon: "flash-outline",
    iconBg: "#FBF3E5",
    route: "/quick-sale" as Href,
    isAccent: true,
  },
  { label: "Stock", icon: "cube-outline", iconBg: "#F1EEF8", route: "/stock" as Href },
];

export default function QuickActions() {
  return (
    <View style={styles.row}>
      {ACTIONS.map((action, index) => (
        <TouchableOpacity
          key={action.label}
          activeOpacity={0.7}
          onPress={() => router.push(action.route)}
          style={[styles.btn, index > 0 && styles.btnBorder]}
        >
          <View style={[styles.icon, { backgroundColor: action.iconBg }]}>
            <Ionicons name={action.icon} size={20} color={Colors.primary} />
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
    backgroundColor: Colors.card,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
  },
  btn: {
    alignItems: "center",
    flex: 1,
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  btnBorder: {
    borderLeftColor: Colors.border,
    borderLeftWidth: 1,
  },
  icon: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  label: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "500",
  },
  labelAccent: {
    color: Colors.primary,
  },
});
