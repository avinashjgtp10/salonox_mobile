import { Tabs } from "expo-router";

import { AppTabLayout, type AppTabItem } from "@/components/navigation/AppTabLayout";

export const unstable_settings = {
  initialRouteName: "home",
};

const STAFF_TABS: AppTabItem[] = [
  { icon: "home-outline", name: "home", title: "Home" },
  { icon: "calendar-number-outline", name: "appointments", title: "Appointments" },
  { icon: "calendar-outline", name: "calendar", title: "Calendar" },
  { icon: "time-outline", name: "attendance", title: "Attendance" },
  { icon: "settings-outline", name: "more", title: "Settings" },
];

export default function StaffTabsLayout() {
  return (
    <AppTabLayout tabs={STAFF_TABS}>
      <Tabs.Screen name="appointment-details/[id]" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </AppTabLayout>
  );
}
