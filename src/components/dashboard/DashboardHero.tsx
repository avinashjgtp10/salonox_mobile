import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BranchSelectorSheet } from "@/components/dashboard/BranchSelectorSheet";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import {
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import { selectActiveBranch, selectShouldShowBranchSelector } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import { selectUnreadCount } from "@/store/notification/notification.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useAppTheme } from "@/theme/ThemeProvider";
import {
  DEFAULT_BUSINESS_NAME,
  getUserFullName,
  getUserInitials,
} from "@/utils/userProfile";

const getTimeGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
};

const getFirstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || "Owner";

type DashboardHeroProps = {
  onOpenNotifications?: () => void;
  onOpenQuickActions?: () => void;
};

export default function DashboardHero({ onOpenNotifications, onOpenQuickActions }: DashboardHeroProps) {
  const { colors: Colors, scheme, setMode } = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isDark = scheme === "dark";
  const toggleTheme = () => setMode(isDark ? "light" : "dark");
  const currentUser = useAppSelector(selectCurrentUser);
  const unreadNotificationCount = useAppSelector(selectUnreadCount);
  const activeBranch = useAppSelector(selectActiveBranch);
  const shouldShowBranchSelector = useAppSelector(selectShouldShowBranchSelector);
  const fullName = getUserFullName(currentUser);
  const firstName = getFirstName(fullName);
  const initials = getUserInitials(currentUser);
  const brandName = DEFAULT_BUSINESS_NAME;
  const branchName = activeBranch?.name ?? "Current Branch";
  const greeting = useMemo(getTimeGreeting, []);
  const [isBranchSheetOpen, setIsBranchSheetOpen] = useState(false);

  useEffect(() => {
    if (!shouldShowBranchSelector && isBranchSheetOpen) {
      setIsBranchSheetOpen(false);
    }
  }, [isBranchSheetOpen, shouldShowBranchSelector]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityLabel="Open quick actions"
          accessibilityRole="button"
          activeOpacity={0.7}
          onPress={onOpenQuickActions}
          style={styles.headerIconButton}
        >
          <Ionicons name="menu-outline" size={24} color={Colors.onPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={shouldShowBranchSelector ? "Switch branch" : "Current branch"}
          activeOpacity={shouldShowBranchSelector ? 0.8 : 1}
          onPress={() => shouldShowBranchSelector && setIsBranchSheetOpen(true)}
          style={styles.locationPill}
        >
          <Ionicons color={Colors.onPrimary} name="location-sharp" size={16} />
          <View style={styles.locationCopy}>
            <Text numberOfLines={1} style={styles.locationLabel}>{brandName}</Text>
            <Text numberOfLines={1} style={styles.locationName}>{branchName}</Text>
          </View>
          {shouldShowBranchSelector ? (
            <Ionicons color={Colors.dashboardTopBarMuted} name="chevron-down" size={16} />
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Open notifications"
          activeOpacity={0.7}
          onPress={onOpenNotifications ?? (() => router.push("/notifications" as Href))}
          style={styles.headerIconButton}
        >
          <Ionicons name="notifications-outline" size={20} color={Colors.onPrimary} />
          <NotificationBadge
            count={unreadNotificationCount}
            style={{ right: -4, top: -4, borderColor: Colors.dashboardTopBar }}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.eyebrow}>{greeting}</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={styles.name}
          >
            Hi, {firstName}
          </Text>
          <Text numberOfLines={1} style={styles.ownerName}>
            Salon status for today
          </Text>
        </View>

        <View style={styles.avatarColumn}>
          <TouchableOpacity
            accessibilityLabel="Open profile"
            activeOpacity={0.8}
            onPress={() => router.push("/profile" as Href)}
          >
            {currentUser?.avatarUrl ? (
              <Image contentFit="cover" source={{ uri: currentUser.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
            activeOpacity={0.7}
            onPress={toggleTheme}
            style={styles.themeToggle}
          >
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={Colors.heading} />
          </TouchableOpacity>
        </View>
      </View>
      {shouldShowBranchSelector ? (
        <BranchSelectorSheet onClose={() => setIsBranchSheetOpen(false)} visible={isBranchSheetOpen} />
      ) : null}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.dashboardSurface,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: Colors.dashboardTopBar,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: Colors.dashboardTopBarSubtle,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  locationPill: {
    alignItems: "center",
    backgroundColor: Colors.dashboardTopBarSubtle,
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationLabel: {
    color: Colors.dashboardTopBarMuted,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
    textTransform: "uppercase",
  },
  locationName: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
  },
  row: {
    alignItems: "center",
    backgroundColor: Colors.dashboardSurface,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 14,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 0,
    lineHeight: 18,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  name: {
    color: Colors.heading,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 34,
  },
  ownerName: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: Typography.fontWeights.semibold,
    lineHeight: 19,
    marginTop: 4,
  },
  avatarColumn: {
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.dashboardAppointmentAccent,
    borderColor: Colors.dashboardTopBarSubtle,
    borderRadius: 24,
    borderWidth: 2,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarImage: {
    backgroundColor: Colors.backgroundElement,
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  avatarText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: Typography.fontWeights.bold,
  },
  themeToggle: {
    alignItems: "center",
    backgroundColor: Colors.dashboardCardMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});
