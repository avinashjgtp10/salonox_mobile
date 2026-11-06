import { Redirect, Tabs } from "expo-router";
import { useMemo } from "react";

import { useAuth } from "@/context/AuthContext";
import { useAppToast } from "@/hooks/useAppToast";
import { useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store";
import { isStaffExperienceUser, STAFF_HOME_ROUTE } from "@/utils/routeResolver";

import { AppTabLayout, type AppTabItem } from "@/components/navigation/AppTabLayout";

export const unstable_settings = {
  initialRouteName: "dashboard",
};

const selectWhatsAppUnread = (state: RootState) =>
  state.inbox.conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0);

export default function DashboardTabsLayout() {
  const { user, isLoading } = useAuth();
  const toast = useAppToast();
  const whatsappUnread = useAppSelector(selectWhatsAppUnread);

  // Prototype order: Home · Calendar · Lunox AI · Quick Sale · WhatsApp. Settings lives in the side menu.
  const tabs = useMemo<AppTabItem[]>(() => [
    { icon: "home", name: "dashboard", title: "Home" },
    { icon: "calendar", name: "calendar", title: "Calendar" },
    // TODO(lunox-ai): open the Lunox assistant over the current tab once it exists.
    { icon: "star", name: "lunox", title: "Lunox AI", raised: "lunox", onPress: () => toast.showInfo("Lunox AI is coming soon.") },
    { icon: "bolt", name: "quick-sale-action", title: "Quick Sale", actionHref: "/quick-sale" },
    { icon: "chat", name: "whatsapp", title: "WhatsApp", badge: whatsappUnread || undefined },
  ], [toast, whatsappUnread]);

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;
  if (isStaffExperienceUser(user)) return <Redirect href={STAFF_HOME_ROUTE} />;
  return (
    <AppTabLayout tabs={tabs}>
      <Tabs.Screen name="team" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </AppTabLayout>
  );
}
