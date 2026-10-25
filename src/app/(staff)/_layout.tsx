import { Tabs } from "expo-router";

import { AppTabLayout, type AppTabItem } from "@/components/navigation/AppTabLayout";
import { useAuth } from "@/context/AuthContext";
import { canUseStaffQuickSale } from "@/utils/staffAccess";
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
  { icon: "wallet-outline", name: "revenue", title: "Revenue" },
  { icon: "settings-outline", name: "more", title: "Settings" },
];

// With Calendar & Quick Sale access, the middle tab opens Quick Sale (as for
// owners); Appointments stays reachable from Home and the Calendar.
const STAFF_QUICK_SALE_TABS: AppTabItem[] = [
  { icon: "home-outline", name: "home", title: "Home" },
  { icon: "calendar-outline", name: "calendar", title: "Calendar" },
  { icon: "flash", name: "quick-sale-action", title: "Quick Sale", actionHref: "/quick-sale" },
  { icon: "wallet-outline", name: "revenue", title: "Revenue" },
  { icon: "settings-outline", name: "more", title: "Settings" },
];

export default function StaffTabsLayout() {
  const attendance = useStaffSelfAttendance();
  const quickSale = canUseStaffQuickSale(useAuth().user);
  // Show the dashboard beneath the modal without loading business data or routes.
  if (!canUnlockStaffApp(attendance?.state ?? null)) return (
    <View style={{ flex: 1 }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <StaffHomeRouteContent locked />
    </View>
  );
  return (
    <AppTabLayout tabs={quickSale ? STAFF_QUICK_SALE_TABS : STAFF_TABS}>
      <Tabs.Screen name={quickSale ? "appointments" : "quick-sale-action"} options={{ href: null }} />
      <Tabs.Screen name="appointment-details/[id]" options={{ href: null }} />

      <Tabs.Screen name="attendance" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </AppTabLayout>
  );
}
