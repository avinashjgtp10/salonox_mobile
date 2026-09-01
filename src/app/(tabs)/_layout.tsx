import { Tabs } from "expo-router";

import { AppTabLayout, type AppTabItem } from "@/components/navigation/AppTabLayout";

export const unstable_settings = {
  initialRouteName: "dashboard",
};

const OWNER_TABS: AppTabItem[] = [
  { icon: "home-outline", name: "dashboard", title: "Home" },
  { icon: "calendar-outline", name: "calendar", title: "Calendar" },
  { icon: "people-outline", name: "team", title: "Staff" },
  { icon: "settings-outline", name: "more", title: "Settings" },
];

export default function DashboardTabsLayout() {
  return (
    <AppTabLayout tabs={OWNER_TABS}>
      <Tabs.Screen name="quick-sale" options={{ href: null }} />
    </AppTabLayout>
  );
}
