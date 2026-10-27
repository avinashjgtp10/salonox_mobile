import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { BranchSelectorSheet } from "@/components/dashboard/BranchSelectorSheet";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { TourButton, useDashboardTour } from "@/features/userGuide/DashboardTour";
import {
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import { selectActiveBranch, selectShouldShowBranchSelector } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import { selectUnreadCount } from "@/store/notification/notification.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useAppTheme } from "@/theme/ThemeProvider";
import { useProfilePhotoUrl } from "@/features/profile/utils/ownerProfilePhoto";
import { getUserInitials } from "@/utils/userProfile";

const LOGO_SOURCE = require("../../../assets/images/logo.png");

const getFormattedDate = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
};

type DashboardHeroProps = {
  onOpenNotifications?: () => void;
  onOpenQuickActions?: () => void;
};

export default function DashboardHero({ onOpenNotifications, onOpenQuickActions }: DashboardHeroProps) {
  const tour = useDashboardTour();
  const { colors: Colors } = useAppTheme();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const currentUser = useAppSelector(selectCurrentUser);
  const photoUrl = useProfilePhotoUrl(currentUser);
  const unreadNotificationCount = useAppSelector(selectUnreadCount);
  const activeBranch = useAppSelector(selectActiveBranch);
  const shouldShowBranchSelector = useAppSelector(selectShouldShowBranchSelector);
  const initials = getUserInitials(currentUser);
  const salonName = activeBranch?.name?.trim() || currentUser?.businessName?.trim() || "Salon";
  const today = useMemo(getFormattedDate, []);
  const [isBranchSheetOpen, setIsBranchSheetOpen] = useState(false);

  useEffect(() => {
    if (!shouldShowBranchSelector && isBranchSheetOpen) {
      setIsBranchSheetOpen(false);
    }
  }, [isBranchSheetOpen, shouldShowBranchSelector]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.topBar}>
        <View style={styles.leadingBrand}>
          <TourButton tourId="menu"
            accessibilityLabel="Open quick actions"
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={onOpenQuickActions}
            style={styles.headerIconButton}
          >
            <Ionicons name="menu-outline" size={24} color={Colors.dashboardTopBarText} />
          </TourButton>
          <View style={styles.brandLogoFrame}>
            <Image contentFit="contain" source={LOGO_SOURCE} style={styles.brandLogo} />
          </View>
        </View>

        <TouchableOpacity
          accessibilityLabel={shouldShowBranchSelector ? `${salonName}, switch branch` : salonName}
          activeOpacity={shouldShowBranchSelector ? 0.8 : 1}
          onPress={() => shouldShowBranchSelector && setIsBranchSheetOpen(true)}
          style={styles.locationPill}
        >
          <Ionicons color={Colors.dashboardTopBarText} name="location-sharp" size={16} />
          <View style={styles.locationCopy}>
            <Text numberOfLines={1} style={styles.locationName}>{salonName}</Text>
          </View>
          {shouldShowBranchSelector ? (
            <Ionicons color={Colors.dashboardTopBarMuted} name="chevron-down" size={16} />
          ) : null}
        </TouchableOpacity>

        <TourButton tourId="notifications"
          accessibilityLabel="Open notifications"
          activeOpacity={0.7}
          onPress={onOpenNotifications ?? (() => router.push("/notifications" as Href))}
          style={styles.headerIconButton}
        >
          <Ionicons name="notifications-outline" size={20} color={Colors.dashboardTopBarText} />
          <NotificationBadge
            count={unreadNotificationCount}
            style={{ right: -4, top: -4, borderColor: Colors.dashboardTopBar }}
          />
        </TourButton>
      </View>

      <View style={styles.row}>
        <View style={styles.copy}>
          <Text numberOfLines={2} style={styles.ownerName}>
            {today} · Here&apos;s what&apos;s happening today
          </Text>
          {tour?.offerTour ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Start dashboard tour" onPress={tour.start} style={{ alignSelf: "flex-start", paddingVertical: 10 }}>
              <Text style={{ color: Colors.primaryText, fontWeight: "700", fontSize: 13 }}>Take a dashboard tour →</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.avatarColumn}>
          <TouchableOpacity
            accessibilityLabel="Open profile"
            activeOpacity={0.8}
            onPress={() => router.push("/profile" as Href)}
          >
            {photoUrl ? (
              <Image contentFit="cover" source={{ uri: photoUrl }} style={styles.avatarImage} />
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
    backgroundColor: Colors.dashboardSurface,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: Colors.dashboardTopBar,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dashboardTopBarSubtle,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  leadingBrand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  brandLogoFrame: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: Colors.dashboardTopBarSubtle,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
    width: 44,
  },
  brandLogo: {
    height: 34,
    width: 34,
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
  locationName: {
    color: Colors.dashboardTopBarText,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
  },
  row: {
    alignItems: "flex-start",
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
  ownerName: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: Typography.fontWeights.semibold,
    lineHeight: 19,
  },
  avatarColumn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.backgroundSelected,
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
    color: Colors.heading,
    fontSize: 14,
    fontWeight: Typography.fontWeights.bold,
  },
});
