import { useState } from "react";
import { router, type Href } from "expo-router";
import { PearlNavigationBar, type AppTabItem } from "@/components/navigation/AppTabLayout";
import { LunoxSheet } from "@/components/lunox/LunoxSheet";
import { useAppSelector } from "@/store/hooks";

export function PearlBottomNav() {
  const [lunoxOpen, setLunoxOpen] = useState(false);
  const unread = useAppSelector((state) => state.inbox.conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0));
  const tabs: AppTabItem[] = [
    { name: "dashboard", title: "Home", icon: "home" },
    { name: "calendar", title: "Calendar", icon: "calendar" },
    { name: "lunox", title: "Lunox AI", icon: "star", raised: "lunox", onPress: () => setLunoxOpen(true) },
    { name: "quick-sale", title: "Quick Sale", icon: "bolt", actionHref: "/quick-sale" },
    { name: "whatsapp", title: "WhatsApp", icon: "chat", badge: unread || undefined },
  ];
  return <><PearlNavigationBar tabs={tabs} activeName="dashboard" onNavigate={(name) => router.push(("/(tabs)/" + name) as Href)} /><LunoxSheet visible={lunoxOpen} onClose={() => setLunoxOpen(false)} /></>;
}
