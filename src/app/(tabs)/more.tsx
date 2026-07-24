import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeleteAccountModal } from "@/components/account/DeleteAccountModal";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Badge } from "@/components/ui/Badge";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { AppLayout, AppRadius } from "@/constants/layout";
import { useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { selectCurrentUser } from "@/store/user/user.slice";
import {
  getUserAddressLine,
  getUserBusinessName,
  getUserFullName,
  getUserInitials,
  getUserRoleLabel,
} from "@/utils/userProfile";
import { useMemo, useState } from "react";

const MENU_ITEMS = [
  {
    description: "Search, segment, and manage salon clients with visit history and memberships.",
    icon: "people-outline" as const,
    route: "/clients" as Href,
    title: "Clients",
  },
  {
    description: "Browse, search, and filter your salon's service menu.",
    icon: "pricetags-outline" as const,
    route: "/services" as Href,
    title: "Services",
  },
  {
    description: "Create premium plans, benefits, validity, and online redemption rules.",
    icon: "diamond-outline" as const,
    route: "/memberships" as Href,
    title: "Memberships",
  },
  {
    description: "View and search every user across your organisation.",
    icon: "person-circle-outline" as const,
    route: "/users" as Href,
    title: "User Management",
  },
  {
    description: "Search, filter, and export completed and draft sales.",
    icon: "receipt-outline" as const,
    route: "/sales" as Href,
    title: "Sales History",
  },
  {
    description: "Track, mark paid, and bulk-configure staff commissions across your salon.",
    icon: "cash-outline" as const,
    route: "/team/commissions" as Href,
    title: "Commissions",
  },
  {
    description: "Update your salon's business details, contact info, and address.",
    icon: "storefront-outline" as const,
    route: "/salon-settings" as Href,
    title: "Salon Settings",
  },
  {
    description: "Manage products, brands, pricing, and stock levels.",
    icon: "layers-outline" as const,
    route: "/stock" as Href,
    title: "Products",
  },
];

export default function MoreScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { deleteAccount, signOut, signOutAll } = useAuth();
  const currentUser = useAppSelector(selectCurrentUser);
  const fullName = getUserFullName(currentUser);
  const businessName = getUserBusinessName(currentUser);
  const roleLabel = getUserRoleLabel(currentUser);
  const initials = getUserInitials(currentUser);
  const addressLine = getUserAddressLine(currentUser);
  const isEmailVerified = currentUser?.isVerified !== false;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const isBusy = isLoggingOut || isLoggingOutAll || isSendingOtp || isDeletingAccount;

  const handleLogout = async () => {
    if (isBusy) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (isBusy) {
      return;
    }

    const email = currentUser?.email;

    if (!email) {
      Alert.alert("Email not available", "We couldn't find an email address on your account.");
      return;
    }

    setIsSendingOtp(true);

    try {
      await authService.sendEmailOtp({ email });
      router.push({ pathname: "/verify-email", params: { email } });
    } catch (error) {
      Alert.alert("Unable to send code", getApiErrorMessage(error));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleLogoutAll = () => {
    if (isBusy) {
      return;
    }

    Alert.alert(
      "Log out of all devices",
      "You'll be signed out of SalonOX on every device. Continue?",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsLoggingOutAll(true);
            try {
              await signOutAll();
            } finally {
              setIsLoggingOutAll(false);
            }
          },
          style: "destructive",
          text: "Log out all",
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    if (isBusy) {
      return;
    }

    setDeleteAccountError(null);
    setIsDeleteModalVisible(true);
  };

  const handleCancelDeleteAccount = () => {
    if (isDeletingAccount) {
      return;
    }

    setIsDeleteModalVisible(false);
    setDeleteAccountError(null);
  };

  const handleConfirmDeleteAccount = async () => {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);
    setDeleteAccountError(null);

    try {
      await deleteAccount();

      setIsDeleteModalVisible(false);
      Alert.alert("Account deleted", "Your account has been permanently deleted.");
    } catch (error) {
      setDeleteAccountError(getApiErrorMessage(error));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const accountActions = [
    ...(!isEmailVerified
      ? [
          {
            danger: false,
            description: "Confirm your email address to secure your account.",
            icon: "mail-unread-outline" as const,
            key: "verify-email",
            loading: isSendingOtp,
            onPress: handleVerifyEmail,
            title: "Verify Email",
          },
        ]
      : []),
    {
      danger: false,
      description: "Update your account password.",
      icon: "lock-closed-outline" as const,
      key: "change-password",
      loading: false,
      onPress: () => router.push("/change-password" as Href),
      title: "Change Password",
    },
    {
      danger: false,
      description: "Sign out of SalonOX on every device you're logged in.",
      icon: "log-out-outline" as const,
      key: "logout-all",
      loading: isLoggingOutAll,
      onPress: handleLogoutAll,
      title: "Log out of all devices",
    },
    {
      danger: false,
      description: "How we collect, use, and protect your data.",
      icon: "shield-checkmark-outline" as const,
      key: "privacy-policy",
      loading: false,
      onPress: () => router.push("/privacy-policy" as Href),
      title: "Privacy Policy",
    },
    {
      danger: true,
      description: "Permanently remove your account and all associated data.",
      icon: "trash-outline" as const,
      key: "delete-account",
      loading: isDeletingAccount,
      onPress: handleDeleteAccount,
      title: "Delete Account",
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>
          Extra SalonOX tools, shortcuts, and front-desk utilities live here.
        </Text>

        <View style={styles.heroCard}>
          <View style={styles.profileRow}>
            <InitialsAvatar imageUri={currentUser?.avatarUrl} initials={initials} size={56} />
            <View style={styles.profileCopy}>
              <Text style={styles.heroTitle}>{fullName}</Text>
              <Text style={styles.heroText}>{businessName}</Text>
              <View style={styles.roleBadgeWrap}>
                <Badge bg={Colors.bg2} color={Colors.primaryDark} label={roleLabel} size="sm" />
              </View>
            </View>
          </View>
          <View style={styles.contactBlock}>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={14} color={Colors.primary} />
              <Text numberOfLines={1} style={styles.contactText}>
                {currentUser?.email ?? "Email not available"}
              </Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color={Colors.primary} />
              <Text numberOfLines={1} style={styles.contactText}>
                {currentUser?.phone ?? "Phone not available"}
              </Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={14} color={Colors.primary} />
              <Text numberOfLines={2} style={styles.contactText}>
                {addressLine}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              activeOpacity={0.84}
              onPress={() => router.push(item.route)}
              style={[styles.menuCard, index > 0 && styles.menuCardSpaced]}
            >
              <View style={styles.menuCardLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon} size={20} color={Colors.primary} />
                </View>
                <View style={styles.menuCopy}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          {accountActions.map((action, index) => (
            <TouchableOpacity
              key={action.key}
              activeOpacity={0.84}
              disabled={isBusy}
              onPress={action.onPress}
              style={[
                styles.menuCard,
                index > 0 && styles.menuCardSpaced,
                isBusy && styles.menuCardDisabled,
              ]}
            >
              <View style={styles.menuCardLeft}>
                <View style={[styles.menuIcon, action.danger && styles.menuIconDanger]}>
                  <Ionicons
                    name={action.icon}
                    size={20}
                    color={action.danger ? Colors.error : Colors.primary}
                  />
                </View>
                <View style={styles.menuCopy}>
                  <Text style={[styles.menuTitle, action.danger && styles.menuTitleDanger]}>
                    {action.title}
                  </Text>
                  <Text style={styles.menuDescription}>{action.description}</Text>
                </View>
              </View>
              {action.loading ? (
                <ActivityIndicator
                  color={action.danger ? Colors.error : Colors.primary}
                  size="small"
                />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          disabled={isBusy}
          onPress={handleLogout}
          style={[styles.logoutButton, (isLoggingOut || isBusy) && styles.logoutButtonDisabled]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.logoutButtonText}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <DeleteAccountModal
        errorMessage={deleteAccountError}
        isDeleting={isDeletingAccount}
        onCancel={handleCancelDeleteAccount}
        onConfirm={() => void handleConfirmDeleteAccount()}
        visible={isDeleteModalVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  title: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  subtitle: {
    color: Colors.text2,
    fontSize: AppLayout.headerSubtitleFontSize,
    lineHeight: 20,
    marginTop: AppLayout.headerSubtitleMarginTop,
  },
  heroCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    marginTop: AppLayout.headerMarginBottom,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xxxl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  profileCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  heroTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  heroText: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  roleBadgeWrap: {
    alignSelf: "flex-start",
    marginTop: Spacing.sm,
  },
  contactBlock: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    gap: 10,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  contactRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  contactText: {
    color: Colors.text2,
    flex: 1,
    fontSize: 12,
    marginLeft: 10,
  },
  section: {
    marginTop: AppLayout.headerMarginBottom,
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: AppLayout.headerMarginBottom,
    minHeight: 52,
    paddingHorizontal: AppLayout.cardPadding,
  },
  logoutButtonDisabled: {
    opacity: 0.72,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 10,
  },
  menuCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: AppLayout.cardPadding,
  },
  menuCardSpaced: {
    marginTop: AppLayout.sectionGap,
  },
  menuCardLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    marginRight: Spacing.md,
  },
  menuIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  menuCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
  },
  menuDescription: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  menuCardDisabled: {
    opacity: 0.6,
  },
  menuIconDanger: {
    backgroundColor: Colors.errorBg,
  },
  menuTitleDanger: {
    color: Colors.error,
  },
});
