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
  onOpenQuickActions?: () => void;
};

export default function DashboardHero({ onOpenQuickActions }: DashboardHeroProps) {
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
      <View style={styles.row}>
        <View style={styles.leftGroup}>
          {onOpenQuickActions ? (
            <TouchableOpacity
              accessibilityLabel="Open quick actions"
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={onOpenQuickActions}
              style={styles.menuButton}
            >
              <Ionicons name="menu-outline" size={24} color={Colors.heading} />
            </TouchableOpacity>
          ) : (
            <View style={styles.menuButtonPlaceholder} />
          )}

          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.eyebrow}>{greeting}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.name}>
              Hi, {firstName} 👋
            </Text>
            <Text numberOfLines={1} style={styles.ownerName}>{brandName}</Text>
            {shouldShowBranchSelector ? (
              <TouchableOpacity
                accessibilityLabel="Switch branch"
                activeOpacity={0.8}
                onPress={() => setIsBranchSheetOpen(true)}
                style={styles.branchChip}
              >
                <Ionicons color={Colors.text2} name="location-sharp" size={18} />
                <Text numberOfLines={1} style={styles.branchChipText}>{branchName}</Text>
                <Ionicons color={Colors.text2} name="chevron-down" size={18} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.right}>
          <TouchableOpacity
            accessibilityLabel="Open notifications"
            activeOpacity={0.7}
            onPress={() => router.push("/notifications" as Href)}
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={20} color={Colors.text2} />
            <NotificationBadge count={unreadNotificationCount} style={{ right: -4, top: -4, borderColor: Colors.card }} />
          </TouchableOpacity>
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
              <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={Colors.text2} />
            </TouchableOpacity>
          </View>
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
    backgroundColor: Colors.bg,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  leftGroup: {
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    gap: 14,
    minWidth: 0,
    paddingRight: 12,
  },
  copy: {
    flex: 1,
    marginTop: 8,
    minWidth: 0,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: Typography.fontWeights.regular,
    letterSpacing: 0,
    lineHeight: 18,
    marginBottom: 2,
  },
  name: {
    color: Colors.heading,
    fontFamily: Typography.fontFamilies.display,
    fontSize: 24,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0,
    lineHeight: 30,
  },
  ownerName: {
    color: Colors.text2,
    fontSize: 14,
    fontWeight: Typography.fontWeights.medium,
    lineHeight: 19,
    marginTop: 4,
  },
  branchChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    maxWidth: "100%",
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    elevation: 1,
  },
  branchChipText: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  right: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  bell: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    width: 40,
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    marginTop: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    width: 38,
  },
  menuButtonPlaceholder: {
    height: 38,
    marginTop: 4,
    width: 38,
  },
  avatarColumn: {
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.purple,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarImage: {
    backgroundColor: Colors.backgroundElement,
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  avatarText: {
    color: Colors.onPrimary,
    fontFamily: Typography.fontFamilies.display,
    fontSize: 13,
    fontWeight: Typography.fontWeights.bold,
  },
  themeToggle: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    width: 40,
  },
});
