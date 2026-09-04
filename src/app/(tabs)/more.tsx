import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router, type Href } from "expo-router";
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Badge } from "@/components/ui/Badge";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import { supportService } from "@/services/support.service";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { AppLayout, AppRadius } from "@/constants/layout";
import { useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { selectCurrentUser } from "@/store/user/user.slice";
import { canViewConsumableInventory } from "@/utils/permissions";
import {
  canSettleCommission,
  getUserAddressLine,
  getUserBusinessName,
  getUserFullName,
  getUserInitials,
  getUserRoleLabel,
} from "@/utils/userProfile";
import { useMemo, useRef, useState } from "react";

const WEB_APP_URL = "https://www.salonox.com";
const SUPPORT_EMAIL = "support@salonox.com";

const MENU_ITEMS = [
  {
    description: "Search, segment, and manage salon clients with visit history and memberships.",
    icon: "people-outline" as const,
    route: "/clients" as Href,
    title: "Clients",
  },
  {
    description: "Sync your phone contacts and import them as clients.",
    icon: "person-add-outline" as const,
    route: "/clients/import-contacts" as Href,
    title: "Import Contacts",
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
    description: "Search, filter, and export completed and draft sales.",
    icon: "receipt-outline" as const,
    route: "/sales" as Href,
    title: "Sales Summary",
  },
  {
    description: "Track staff commissions and settle payments across your salon.",
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
    description: "Switch between Light, Dark, or System Default theme.",
    icon: "contrast-outline" as const,
    route: "/appearance" as Href,
    title: "Appearance",
  },
  {
    description: "Manage products, brands, pricing, and stock levels.",
    icon: "layers-outline" as const,
    route: "/stock" as Href,
    title: "Products",
  },
  {
    description: "Track consumable stock, usage history, and service assignments.",
    icon: "flask-outline" as const,
    route: "/consumables" as Href,
    title: "Consumables",
  },
];

export default function MoreScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { signOut, signOutAll } = useAuth();
  const currentUser = useAppSelector(selectCurrentUser);
  const fullName = getUserFullName(currentUser);
  const businessName = getUserBusinessName(currentUser);
  const roleLabel = getUserRoleLabel(currentUser);
  const initials = getUserInitials(currentUser);
  const addressLine = getUserAddressLine(currentUser);
  const isEmailVerified = currentUser?.isVerified !== false;
  const visibleMenuItems = useMemo(
    () =>
      MENU_ITEMS.filter((item) => {
        if (item.title === "Commissions") {
          return canSettleCommission(currentUser?.role);
        }

        return item.title !== "Consumables" || canViewConsumableInventory(currentUser);
      }),
    [currentUser],
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubject, setReportSubject] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reportErrors, setReportErrors] = useState<{ message?: string; subject?: string }>({});
  const reportSubjectRef = useRef<TextInput>(null);
  const reportMessageRef = useRef<TextInput>(null);
  const isBusy = isLoggingOut || isLoggingOutAll || isSendingOtp || isSubmittingReport;
  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    "Unavailable";
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    "Unavailable";

  const openWebAppPage = async (path: string) => {
    await WebBrowser.openBrowserAsync(`${WEB_APP_URL}${path}`);
  };

  const handleContactSupport = async () => {
    await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  const handleSubmitReport = async () => {
    const subject = reportSubject.trim();
    const message = reportMessage.trim();

    const nextErrors = {
      ...(!message ? { message: "Description is required." } : {}),
      ...(!subject ? { subject: "Subject is required." } : {}),
    };
    setReportErrors(nextErrors);
    if (!subject || !message) {
      (subject ? reportMessageRef : reportSubjectRef).current?.focus();
      return;
    }

    setIsSubmittingReport(true);

    try {
      await supportService.submitRequest({
        category: "technical",
        message,
        priority: "medium",
        subject,
      });
      setIsReportModalVisible(false);
      setReportSubject("");
      setReportMessage("");
      setReportErrors({});
      Alert.alert("Report submitted", "Your report has been sent to SalonOX support.");
    } catch (error) {
      Alert.alert("Unable to submit report", getApiErrorMessage(error));
    } finally {
      setIsSubmittingReport(false);
    }
  };

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
  ];
  const aboutActions = [
    {
      description: "How SalonOX collects, uses, and protects your data.",
      icon: "shield-checkmark-outline" as const,
      key: "privacy",
      onPress: () => router.push("/privacy-policy" as Href),
      title: "Privacy Policy",
    },
    {
      description: "Read the SalonOX Terms & Conditions.",
      icon: "reader-outline" as const,
      key: "terms",
      onPress: () => openWebAppPage("/terms"),
      title: "Terms & Conditions",
    },
  ];
  const supportActions = [
    {
      description: "Contact SalonOX support at support@salonox.com.",
      icon: "mail-outline" as const,
      key: "support",
      onPress: handleContactSupport,
      title: "Contact Support",
    },
    {
      description: "Send issue details directly to SalonOX support.",
      icon: "bug-outline" as const,
      key: "report-problem",
      onPress: () => setIsReportModalVisible(true),
      title: "Report a Problem",
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          SalonOX · Manage your workspace
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
          <Text style={styles.sectionLabel}>Tools</Text>
          {visibleMenuItems.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              activeOpacity={0.84}
              onPress={() => router.push(item.route)}
              style={[
                styles.menuCard,
                index === 0 && styles.menuCardFirst,
                index === visibleMenuItems.length - 1 && styles.menuCardLast,
                index > 0 && styles.menuCardSpaced,
              ]}
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
                index === 0 && styles.menuCardFirst,
                index === accountActions.length - 1 && styles.menuCardLast,
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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => openWebAppPage("/about")}
            style={styles.versionCard}
          >
            <Text style={styles.versionTitle}>SalonOX Mobile</Text>
            <Text style={styles.versionText}>Version {appVersion}</Text>
            <Text style={styles.versionText}>Build {buildNumber}</Text>
          </TouchableOpacity>
          {aboutActions.map((action, index) => (
            <TouchableOpacity
              key={action.key}
              activeOpacity={0.84}
              onPress={action.onPress}
              style={[
                styles.menuCard,
                index === 0 && styles.menuCardFirst,
                index === aboutActions.length - 1 && styles.menuCardLast,
                index > 0 && styles.menuCardSpaced,
              ]}
            >
              <View style={styles.menuCardLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={action.icon} size={20} color={Colors.primary} />
                </View>
                <View style={styles.menuCopy}>
                  <Text style={styles.menuTitle}>{action.title}</Text>
                  <Text style={styles.menuDescription}>{action.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Help & Support</Text>
          {supportActions.map((action, index) => (
            <TouchableOpacity
              key={action.key}
              activeOpacity={0.84}
              onPress={action.onPress}
              style={[
                styles.menuCard,
                index === 0 && styles.menuCardFirst,
                index === supportActions.length - 1 && styles.menuCardLast,
                index > 0 && styles.menuCardSpaced,
              ]}
            >
              <View style={styles.menuCardLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={action.icon} size={20} color={Colors.primary} />
                </View>
                <View style={styles.menuCopy}>
                  <Text style={styles.menuTitle}>{action.title}</Text>
                  <Text style={styles.menuDescription}>{action.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.text2} />
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
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          )}
          <Text style={styles.logoutButtonText}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        animationType="slide"
        onRequestClose={() => setIsReportModalVisible(false)}
        transparent
        visible={isReportModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.reportModal}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>Report a Problem</Text>
              <TouchableOpacity
                accessibilityLabel="Close report form"
                disabled={isSubmittingReport}
                onPress={() => setIsReportModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={Colors.text2} />
              </TouchableOpacity>
            </View>
            <TextInput
              ref={reportSubjectRef}
              editable={!isSubmittingReport}
              onChangeText={(value) => { setReportSubject(value); setReportErrors((current) => ({ ...current, subject: undefined })); }}
              placeholder="Subject"
              placeholderTextColor={Colors.text2}
              style={[styles.reportInput, reportErrors.subject && styles.reportInputError]}
              value={reportSubject}
            />
            {reportErrors.subject ? <Text style={styles.reportFieldError}>{reportErrors.subject}</Text> : null}
            <TextInput
              ref={reportMessageRef}
              editable={!isSubmittingReport}
              multiline
              onChangeText={(value) => { setReportMessage(value); setReportErrors((current) => ({ ...current, message: undefined })); }}
              placeholder="Describe the problem"
              placeholderTextColor={Colors.text2}
              style={[styles.reportInput, styles.reportMessageInput, reportErrors.message && styles.reportInputError]}
              textAlignVertical="top"
              value={reportMessage}
            />
            {reportErrors.message ? <Text style={styles.reportFieldError}>{reportErrors.message}</Text> : null}
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={isSubmittingReport}
              onPress={handleSubmitReport}
              style={[styles.reportSubmitButton, isSubmittingReport && styles.logoutButtonDisabled]}
            >
              {isSubmittingReport ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.reportSubmitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
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
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
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
    gap: 9,
    marginTop: 16,
    paddingTop: 14,
  },
  contactRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  contactText: {
    color: Colors.text2,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    marginLeft: 10,
  },
  section: {
    marginTop: 8,
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  logoutButtonDisabled: {
    opacity: 0.72,
  },
  logoutButtonText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 10,
  },
  menuCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    borderRadius: 0,
    borderWidth: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuCardSpaced: {
    marginTop: 0,
  },
  menuCardFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  menuCardLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 0,
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
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  menuCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  menuDescription: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  sectionLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.88,
    marginBottom: 8,
    paddingHorizontal: 4,
    textTransform: "uppercase",
  },
  versionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    padding: 16,
  },
  versionTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "900",
  },
  versionText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    flex: 1,
    justifyContent: "flex-end",
  },
  reportModal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: AppLayout.cardPadding,
    paddingBottom: AppLayout.contentBottomPadding,
  },
  reportModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  reportModalTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  reportInput: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 14,
    marginBottom: AppLayout.sectionGap,
    minHeight: 50,
    padding: AppLayout.cardPadding,
  },
  reportInputError: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  reportFieldError: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: -4,
  },
  reportMessageInput: {
    minHeight: 140,
  },
  reportSubmitButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 52,
  },
  reportSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
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
