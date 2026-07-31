import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Badge } from "@/components/ui/Badge";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { api, getApiErrorMessage } from "@/services/api";
import { selectActiveBranch } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import {
  getUserFullName,
  getUserInitials,
  getUserRoleLabel,
} from "@/utils/userProfile";

const WEB_APP_URL = "https://www.salonox.com";
const SUPPORT_EMAIL = "support@salonox.com";
const SUPPORT_PHONE = "+919503302647";

type SettingsItem = {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  key: string;
  loading?: boolean;
  onPress: () => void;
  title: string;
};

function SettingsSection({ flushTop = false, items, title }: { flushTop?: boolean; items: SettingsItem[]; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={[styles.section, flushTop && styles.sectionFlush]}>
      {title ? <Text style={styles.sectionLabel}>{title}</Text> : null}
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.key}
          activeOpacity={0.84}
          disabled={item.loading}
          onPress={item.onPress}
          style={[styles.menuCard, index > 0 && styles.menuCardSpaced, item.loading && styles.menuCardDisabled]}
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
          {item.loading ? <ActivityIndicator color={Colors.primary} size="small" /> : <Ionicons name="chevron-forward" size={18} color={Colors.text2} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const getResponsiveHorizontalPadding = (width = 393) => {
  if (width < 360) {
    return 16;
  }

  if (width >= 768) {
    return 40;
  }

  if (width >= 600) {
    return 32;
  }

  return AppLayout.contentHorizontalPadding;
};

const getResponsiveTitleSize = (width = 393) =>
  width < 360 ? AppLayout.headerTitleFontSize - 2 : AppLayout.headerTitleFontSize;

export function StaffSettingsScreen() {
  const Colors = useThemeColors();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(Colors, width), [Colors, width]);
  const { signOut } = useAuth();
  const currentUser = useAppSelector(selectCurrentUser);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const activeBranch = useAppSelector(selectActiveBranch);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubject, setReportSubject] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const fullName = currentStaff?.name ?? getUserFullName(currentUser);
  const roleLabel = currentStaff?.role ?? getUserRoleLabel(currentUser);
  const initials = currentStaff?.initials ?? getUserInitials(currentUser);
  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    "Unavailable";
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    "Unavailable";

  const showUnavailable = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const openWebAppPage = async (path: string) => {
    await WebBrowser.openBrowserAsync(`${WEB_APP_URL}${path}`);
  };

  const handleEmailSupport = () => {
    const subject = encodeURIComponent("SalonOX Support Request");
    return Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
  };

  const handlePhoneSupport = () => {
    return Linking.openURL(`tel:${SUPPORT_PHONE}`);
  };

  const handleWhatsAppSupport = async () => {
    const whatsappNumber = SUPPORT_PHONE.slice(1);
    const nativeUrl = `whatsapp://send?phone=${whatsappNumber}`;
    const webUrl = `https://wa.me/${whatsappNumber}`;

    try {
      if (await Linking.canOpenURL(nativeUrl)) {
        await Linking.openURL(nativeUrl);
        return;
      }
    } catch {
      // Fall through to WhatsApp Web when the native handler is unavailable.
    }

    await Linking.openURL(webUrl);
  };

  const handleSubmitReport = async () => {
    const subject = reportSubject.trim();
    const message = reportMessage.trim();

    if (!subject || !message) {
      Alert.alert("Details required", "Add a subject and description before submitting.");
      return;
    }

    setIsSubmittingReport(true);

    try {
      await api.post("/support", {
        category: "technical",
        message,
        priority: "medium",
        subject,
      });
      setIsReportModalVisible(false);
      setReportSubject("");
      setReportMessage("");
      Alert.alert("Report submitted", "Your report has been sent to SalonOX support.");
    } catch (error) {
      Alert.alert("Unable to submit report", getApiErrorMessage(error));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await signOut();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const accountItems: SettingsItem[] = [
    {
      description: "View your staff profile, contact information, addresses, and emergency contacts.",
      icon: "person-circle-outline",
      key: "profile",
      onPress: () => router.push("/(staff)/profile" as Href),
      title: "My Profile",
    },
  ];
  const preferenceItems: SettingsItem[] = [
    {
      description: "Language, date format, and time format preferences are not integrated in this mobile layer.",
      icon: "language-outline",
      key: "locale",
      onPress: () =>
        showUnavailable(
          "Preferences unavailable",
          "Language, date format, and time format settings are not currently exposed by the mobile app.",
        ),
      title: "Language & Formats",
    },
  ];
  const securityItems: SettingsItem[] = [
    {
      description: "Update your account password using the existing security flow.",
      icon: "lock-closed-outline",
      key: "change-password",
      onPress: () => router.push("/change-password" as Href),
      title: "Change Password",
    },
  ];
  const aboutItems: SettingsItem[] = [
    {
      description: "How SalonOX collects, uses, and protects your data.",
      icon: "shield-checkmark-outline",
      key: "privacy",
      onPress: () => router.push("/privacy-policy" as Href),
      title: "Privacy Policy",
    },
    {
      description: "Read the SalonOX Terms & Conditions.",
      icon: "reader-outline",
      key: "terms",
      onPress: () => openWebAppPage("/terms"),
      title: "Terms & Conditions",
    },
    {
      description: "Coming Soon",
      icon: "code-slash-outline",
      key: "licenses",
      onPress: () => showUnavailable("Coming Soon", "Open source licenses will be available soon."),
      title: "Open Source Licenses",
    },
  ];
  const supportItems: SettingsItem[] = [
    {
      description: SUPPORT_EMAIL,
      icon: "mail-outline",
      key: "email-support",
      onPress: handleEmailSupport,
      title: "Email Support",
    },
    {
      description: "+91 9503302647",
      icon: "call-outline",
      key: "phone-support",
      onPress: handlePhoneSupport,
      title: "Phone Support",
    },
    {
      description: "Chat with SalonOX support on WhatsApp.",
      icon: "logo-whatsapp",
      key: "whatsapp-support",
      onPress: handleWhatsAppSupport,
      title: "WhatsApp Support",
    },
    {
      description: "Send issue details directly to SalonOX support.",
      icon: "bug-outline",
      key: "report-problem",
      onPress: () => setIsReportModalVisible(true),
      title: "Report a Problem",
    },
    {
      description: "Coming Soon",
      icon: "help-circle-outline",
      key: "faq",
      onPress: () => showUnavailable("Coming Soon", "FAQ will be available soon."),
      title: "FAQ",
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your staff account, preferences, security, and app info.</Text>

        <View style={styles.heroCard}>
          <View style={styles.profileRow}>
            <InitialsAvatar imageUri={currentUser?.avatarUrl} initials={initials} size={56} />
            <View style={styles.profileCopy}>
              <Text style={styles.heroTitle}>{fullName}</Text>
              <Text style={styles.heroText}>{activeBranch?.name ?? "SalonOX"}</Text>
              <View style={styles.roleBadgeWrap}>
                <Badge bg={Colors.bg2} color={Colors.primaryDark} label={roleLabel} size="sm" />
              </View>
            </View>
          </View>
          <View style={styles.contactBlock}>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={14} color={Colors.primary} />
              <Text numberOfLines={1} style={styles.contactText}>
                {currentStaff?.email ?? currentUser?.email ?? "Email not available"}
              </Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color={Colors.primary} />
              <Text numberOfLines={1} style={styles.contactText}>
                {currentStaff?.phone ?? currentUser?.phone ?? "Phone not available"}
              </Text>
            </View>
          </View>
        </View>

        <SettingsSection items={accountItems} title="Account" />
        <SettingsSection items={preferenceItems} title="Preferences" />
        <SettingsSection items={securityItems} title="Security" />

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
          <SettingsSection flushTop items={aboutItems} title="" />
        </View>

        <SettingsSection items={supportItems} title="Help & Support" />

        <TouchableOpacity
          activeOpacity={0.84}
          disabled={isLoggingOut}
          onPress={handleLogout}
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.logoutButtonText}>{isLoggingOut ? "Logging out..." : "Logout"}</Text>
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
              editable={!isSubmittingReport}
              onChangeText={setReportSubject}
              placeholder="Subject"
              placeholderTextColor={Colors.text2}
              style={styles.reportInput}
              value={reportSubject}
            />
            <TextInput
              editable={!isSubmittingReport}
              multiline
              onChangeText={setReportMessage}
              placeholder="Describe the problem"
              placeholderTextColor={Colors.text2}
              style={[styles.reportInput, styles.reportMessageInput]}
              textAlignVertical="top"
              value={reportMessage}
            />
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

const createStyles = (Colors: ThemeColors, width = 393) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: getResponsiveHorizontalPadding(width),
    paddingTop: width < 360 ? Spacing.sm : Spacing.md,
  },
  title: {
    color: Colors.heading,
    fontSize: getResponsiveTitleSize(width),
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
  sectionFlush: {
    marginTop: 0,
  },
  sectionLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
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
  menuCardDisabled: {
    opacity: 0.6,
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
  versionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
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
});
