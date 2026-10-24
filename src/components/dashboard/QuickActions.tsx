import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { TourButton } from "@/features/userGuide/DashboardTour";

import type { ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import { OWNER_CALENDAR_ROUTE } from "@/utils/routeResolver";
import { requestQuickSaleLaunch } from "@/features/quickSale/utils/quickSaleLaunch";

const getActions = (
  Colors: ThemeColors,
): {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  onPress?: () => void;
  route: Href;
}[] => [
  { label: "Appointment", icon: "calendar-number-outline", iconBg: Colors.dashboardAppointmentBg, route: "/bookings/new" as Href },
  // Opens the Calendar tab with Quick Sale already open at today's current
  // slot (staff chosen inside Quick Sale).
  {
    label: "Quick Sale",
    icon: "flash-outline",
    iconBg: Colors.dashboardClientBg,
    onPress: () => {
      requestQuickSaleLaunch();
      router.navigate(OWNER_CALENDAR_ROUTE);
    },
    route: OWNER_CALENDAR_ROUTE,
  },
  { label: "Reports", icon: "stats-chart-outline", iconBg: Colors.dashboardWarningBg, route: "/reports" as Href },
  { label: "Attendance", icon: "checkmark-circle-outline", iconBg: Colors.dashboardAppointmentBg, route: "/team/attendance" as Href },
];

export default function QuickActions() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const actions = useMemo(() => getActions(Colors), [Colors]);

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <TourButton tourId={action.label}
          key={action.label}
          activeOpacity={0.7}
          onPress={action.onPress ?? (() => router.push(action.route))}
          style={styles.btn}
        >
          <View style={[styles.icon, { backgroundColor: action.iconBg }]}>
            <Ionicons name={action.icon} size={20} color={Colors.primaryText} />
          </View>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            numberOfLines={1}
            style={styles.label}
          >
            {action.label}
          </Text>
        </TourButton>
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
    backgroundColor: "transparent",
    borderWidth: 0,
    flex: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 66,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  icon: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 0,
    height: 56,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    width: 56,
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
