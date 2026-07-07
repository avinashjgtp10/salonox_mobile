import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { AppLayout, AppRadius } from "@/constants/layout";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import {
  getUserAddressLine,
  getUserBusinessName,
  getUserFullName,
  getUserInitials,
  getUserRoleLabel,
} from "@/utils/userProfile";
import { useState } from "react";

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
    description: "Keep your front desk calm with quick access to stock and operational shortcuts.",
    icon: "layers-outline" as const,
    route: "/stock" as Href,
    title: "Operations",
  },
];

export default function MoreScreen() {
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

    Alert.alert(
      "Delete account",
      "This permanently deletes your account and cannot be undone. Continue?",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await deleteAccount();
            } catch (error) {
              Alert.alert("Unable to delete account", getApiErrorMessage(error));
            } finally {
              setIsDeletingAccount(false);
            }
          },
          style: "destructive",
          text: "Delete",
        },
      ],
    );
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>
          Extra SalonOX tools, shortcuts, and front-desk utilities live here.
        </Text>

        <View style={styles.heroCard}>
          <View style={styles.profileRow}>
            {currentUser?.avatarUrl ? (
              <Image contentFit="cover" source={{ uri: currentUser.avatarUrl }} style={styles.profileAvatarImage} />
            ) : (
              <View style={styles.heroIcon}>
                <Text style={styles.profileAvatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.profileCopy}>
              <Text style={styles.heroTitle}>{fullName}</Text>
              <Text style={styles.heroText}>{businessName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: AppLayout.headerMarginBottom,
    paddingHorizontal: AppLayout.cardPadding + Spacing.sm,
    paddingVertical: AppLayout.cardPadding + Spacing.sm,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  profileRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  profileAvatarImage: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 56,
    width: 56,
  },
  profileCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  profileAvatarText: {
    color: Colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
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
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleBadgeText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
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
    borderRadius: Radius.md,
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
    letterSpacing: 0.6,
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
