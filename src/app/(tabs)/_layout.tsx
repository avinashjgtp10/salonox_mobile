import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { isStaffExperienceUser, STAFF_HOME_ROUTE } from "@/utils/routeResolver";

import { AppTabLayout, type AppTabItem } from "@/components/navigation/AppTabLayout";

export const unstable_settings = {
  initialRouteName: "dashboard",
};

const OWNER_TABS: AppTabItem[] = [
  { icon: "home-outline", name: "dashboard", title: "Home" },
  { icon: "calendar-outline", name: "calendar", title: "Calendar" },
  { icon: "people-outline", name: "team", title: "Staff" },
  { icon: "logo-whatsapp", name: "whatsapp", title: "WhatsApp" },
  { icon: "settings-outline", name: "more", title: "Settings" },
];

export default function DashboardTabsLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;
  if (isStaffExperienceUser(user)) return <Redirect href={STAFF_HOME_ROUTE} />;
  return (
    <AppTabLayout tabs={OWNER_TABS}>
      <Tabs.Screen name="quick-sale" options={{ href: null }} />
    </AppTabLayout>
  );
}
