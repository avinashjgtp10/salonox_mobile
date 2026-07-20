import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BranchSelectorSheet } from "@/components/dashboard/BranchSelectorSheet";
import {
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import { selectActiveBranch, selectShouldShowBranchSelector } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import { selectUnreadCount } from "@/store/notification/notification.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
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

export default function DashboardHero() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
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
        <View style={styles.right}>
          <TouchableOpacity
            accessibilityLabel="Open notifications"
            activeOpacity={0.7}
            onPress={() => router.push("/notifications" as Href)}
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={28} color={Colors.heading} />
            {unreadNotificationCount > 0 ? <View style={styles.bellDot} /> : null}
          </TouchableOpacity>
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
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 14,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 16,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 0,
    lineHeight: 22,
    marginBottom: 6,
  },
  name: {
    color: Colors.heading,
    fontFamily: Typography.fontFamilies.display,
    fontSize: 38,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 0,
    lineHeight: 46,
  },
  ownerName: {
    color: Colors.text2,
    fontSize: 16,
    fontWeight: Typography.fontWeights.bold,
    lineHeight: 22,
    marginTop: 8,
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
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    paddingTop: 10,
  },
  bell: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    width: 64,
  },
  bellDot: {
    backgroundColor: Colors.heading,
    borderColor: Colors.card,
    borderRadius: 5,
    borderWidth: 1.5,
    height: 10,
    position: "absolute",
    right: 17,
    top: 17,
    width: 10,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.backgroundElement,
    borderColor: Colors.border,
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  avatarImage: {
    backgroundColor: Colors.backgroundElement,
    borderRadius: 32,
    height: 64,
    width: 64,
  },
  avatarText: {
    color: Colors.heading,
    fontFamily: Typography.fontFamilies.display,
    fontSize: 20,
    fontWeight: Typography.fontWeights.bold,
  },
});
