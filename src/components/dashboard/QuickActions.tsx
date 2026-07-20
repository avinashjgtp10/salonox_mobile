import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

const getActions = (
  Colors: ThemeColors,
): {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  isAccent?: boolean;
  label: string;
  route: Href;
}[] => [
  { label: "Book", icon: "calendar-outline", iconBg: Colors.successBg, route: "/bookings" as Href },
  { label: "Client", icon: "person-add-outline", iconBg: Colors.infoBg, route: "/clients/new" as Href },
  {
    label: "Quick Sale",
    icon: "flash-outline",
    iconBg: Colors.warningBg,
    route: "/quick-sale" as Href,
    isAccent: true,
  },
  { label: "Products", icon: "cube-outline", iconBg: Colors.purpleBg, route: "/stock" as Href },
  { label: "Attendance", icon: "calendar-outline", iconBg: Colors.infoBg, route: "/team/attendance" as Href },
];

export default function QuickActions() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const actions = useMemo(() => getActions(Colors), [Colors]);

  return (
    <View style={styles.row}>
      {actions.map((action, index) => (
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

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
    justifyContent: "center",
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
    textAlign: "center",
  },
  labelAccent: {
    color: Colors.primary,
  },
});
