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
  label: string;
  route: Href;
}[] => [
  { label: "Book", icon: "calendar-outline", iconBg: Colors.dashboardAppointmentBg, route: "/bookings" as Href },
  { label: "Client", icon: "person-add-outline", iconBg: Colors.dashboardClientBg, route: "/clients/new" as Href },
  {
    label: "Quick Sale",
    icon: "flash-outline",
    iconBg: Colors.dashboardWarningBg,
    route: "/quick-sale" as Href,
  },
  { label: "Products", icon: "cube-outline", iconBg: Colors.dashboardRevenueBg, route: "/stock" as Href },
  { label: "Attendance", icon: "calendar-outline", iconBg: Colors.dashboardAppointmentBg, route: "/team/attendance" as Href },
];

export default function QuickActions() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const actions = useMemo(() => getActions(Colors), [Colors]);

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          activeOpacity={0.7}
          onPress={() => router.push(action.route)}
          style={styles.btn}
        >
          <View style={[styles.icon, { backgroundColor: action.iconBg }]}>
            <Ionicons name={action.icon} size={20} color={Colors.primary} />
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            numberOfLines={1}
            style={styles.label}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  btn: {
    alignItems: "center",
    backgroundColor: Colors.dashboardCard,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 66,
    paddingHorizontal: 4,
    paddingVertical: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 7,
  },
  icon: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 0,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  label: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "500",
    includeFontPadding: false,
    lineHeight: 12,
    minWidth: 0,
    textAlign: "center",
    width: "100%",
  },
});
