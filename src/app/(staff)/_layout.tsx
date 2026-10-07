import { Tabs } from "expo-router";

import { AppTabLayout, type AppTabItem } from "@/components/navigation/AppTabLayout";
import { useStaffSelfAttendance } from "@/features/attendance/components/StaffAttendanceGate";
import { canUnlockStaffApp } from "@/features/attendance/utils/staffAttendanceGate";
import { View } from "react-native";
import { StaffHomeRouteContent } from "./home";

export const unstable_settings = {
  initialRouteName: "home",
};

const STAFF_TABS: AppTabItem[] = [
  { icon: "home-outline", name: "home", title: "Home" },
  { icon: "calendar-number-outline", name: "appointments", title: "Appointments" },
  { icon: "calendar-outline", name: "calendar", title: "Calendar" },
  { icon: "settings-outline", name: "more", title: "Settings" },
];

export default function StaffTabsLayout() {
  const attendance = useStaffSelfAttendance();
  // Show the dashboard beneath the modal without loading business data or routes.
  if (!canUnlockStaffApp(attendance?.state ?? null)) return (
    <View style={{ flex: 1 }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <StaffHomeRouteContent locked />
    </View>
  );
  return (
    <AppTabLayout tabs={STAFF_TABS}>
      <Tabs.Screen name="appointment-details/[id]" options={{ href: null }} />

      <Tabs.Screen name="attendance" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </AppTabLayout>
  );
}
