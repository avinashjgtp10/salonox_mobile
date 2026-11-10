import { canAccessLunox, hasBusinessDashboard } from "@/utils/staffExperience";
import { Redirect, Tabs, useSegments } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { isStaffBusinessTabAllowed, isStaffExperienceUser, STAFF_HOME_ROUTE } from "@/utils/routeResolver";

import { LunoxContext, type LunoxOpener } from "@/components/lunox/LunoxContext";
import { LunoxSheet } from "@/components/lunox/LunoxSheet";
import { AppTabLayout, type AppTabItem } from "@/components/navigation/AppTabLayout";

export const unstable_settings = {
  initialRouteName: "dashboard",
};

const selectWhatsAppUnread = (state: RootState) =>
  state.inbox.conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0);

export default function DashboardTabsLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const whatsappUnread = useAppSelector(selectWhatsAppUnread);
  const branchId = useAppSelector(selectActiveBranchId);
  const [lunoxOpen, setLunoxOpen] = useState(false);
  const [lunoxSeed, setLunoxSeed] = useState<string | null>(null);
  const openLunox = useCallback<LunoxOpener>((options) => { setLunoxSeed(options?.seed ?? null); setLunoxOpen(true); }, []);

  const aiAllowed = canAccessLunox(user);
  // Prototype order: Home · Calendar · Lunox AI · Quick Sale · WhatsApp. Settings lives in the side menu.
  const tabs = useMemo<AppTabItem[]>(() => ([
    { icon: "home", name: "dashboard", title: "Home" },
    { icon: "calendar", name: "calendar", title: "Calendar" },
    // Lunox opens over the current tab; it never becomes the active tab.
    ...(aiAllowed ? [{ icon: "star" as const, name: "lunox", title: "Lunox AI", raised: "lunox" as const, onPress: () => openLunox() }] : []),
    { icon: "bolt", name: "quick-sale-action", title: "Quick Sale", actionHref: "/quick-sale" },
    { icon: "chat", name: "whatsapp", title: "WhatsApp", badge: whatsappUnread || undefined },
  ] satisfies AppTabItem[]).filter(tab => tab.name === "lunox" || !isStaffExperienceUser(user) || isStaffBusinessTabAllowed(tab.name, user)), [aiAllowed, openLunox, whatsappUnread, user]);

  if (isLoading) return null;
  if (!user) return <Redirect href="/login" />;
  if (isStaffExperienceUser(user) && !hasBusinessDashboard(user)) return <Redirect href={STAFF_HOME_ROUTE} />;
  if (isStaffExperienceUser(user) && !isStaffBusinessTabAllowed(String(segments[1] ?? "dashboard"), user)) return <Redirect href="/dashboard" />;
  return (
    <LunoxContext.Provider value={openLunox}>
      <AppTabLayout tabs={tabs}>
        <Tabs.Screen name="team" options={{ href: null }} />
        <Tabs.Screen name="more" options={{ href: null }} />
      </AppTabLayout>
      {/* A fresh conversation per salon branch. */}
      <LunoxSheet key={branchId ?? "salon"} visible={lunoxOpen} seed={lunoxSeed} onClose={() => setLunoxOpen(false)} />
    </LunoxContext.Provider>
  );
}
