import { useCallback, useRef, useState } from "react";
import {
  Keyboard,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { LunoxHeaderButton } from "@/components/lunox/LunoxHeaderButton";
import { useAuth } from "@/context/AuthContext";
import { useFooterClearance } from "@/hooks/useFooterClearance";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectSalonById } from "@/store/salon/salon.slice";
import { fetchSalonMeThunk } from "@/middleware/salon/salon.thunk";
import {
  hasCustomPermission,
  hasInventoryPermission,
} from "@/utils/permissions";
import {
  canSettleCommission as isOwnerOrAdmin,
  getUserAddressLine,
  getUserBusinessName,
  getUserFullName,
} from "@/utils/userProfile";
import { useProfilePhotoUrl } from "@/features/profile/utils/ownerProfilePhoto";
import { useAppTheme } from "@/theme/ThemeProvider";
import { appAlert as Alert } from "@/services/appAlert";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import { supportService } from "@/services/support.service";
import { marketingService } from "@/services/marketing.service";
import { AppearanceSheet } from "./AppearanceSheet";
import { NotificationSettingsSheet } from "./NotificationSettingsSheet";
import { ChangePasswordSheet } from "./ChangePasswordSheet";
import { ClientFormRulesSheet } from "./ClientFormRulesSheet";
import { ConnectedBranchesSheet } from "./ConnectedBranchesSheet";
import { SalonSwitchSheet } from "@/components/dashboard/DashboardSheets";
import {
  SettingsButton,
  SettingsHeader,
  SettingsRow,
  useSettingsStyles,
} from "./SettingsUI";

type Overlay =
  | "appearance"
  | "notifications"
  | "password"
  | "client-rules"
  | "help"
  | "report"
  | "branches"
  | "salons"
  | null;
export default function SettingsScreen() {
  const ui = useSettingsStyles();
  const pearl = usePearlPalette();
  const user = useAppSelector(selectCurrentUser);
  const salon = useAppSelector((state) =>
    selectSalonById(state, user?.salonId),
  );
  const dispatch = useAppDispatch();
  const { mode } = useAppTheme();
  const { signOut } = useAuth();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reportErrors, setReportErrors] = useState<{
    subject?: string;
    message?: string;
  }>({});
  const [reportError, setReportError] = useState<string | null>(null);
  const subjectRef = useRef<TextInput>(null),
    messageRef = useRef<TextInput>(null);
  const reportLock = useRef(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const clearance = useFooterClearance();
  const logo = useProfilePhotoUrl(user);
  const closeOverlay = useCallback(() => {
    Keyboard.dismiss();
    setOverlay(null);
  }, []);
  const go = (href: string) => router.push(href as Href);
  const owner = isOwnerOrAdmin(user?.role);
  const can = (key: string) => owner || hasCustomPermission(user, key);
  useFocusEffect(
    useCallback(() => {
      void dispatch(fetchSalonMeThunk());
      let active = true;
      setConnected(null);
      void marketingService
        .isWhatsAppConnected()
        .then((value) => {
          if (active) setConnected(value);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
      // Refresh the salon-scoped resources when the active salon changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, user?.salonId]),
  );
  const verifyEmail = async () => {
    if (busy) return;
    if (!user?.email) {
      Alert.alert(
        "Email not available",
        "We couldn't find an email address on your account.",
      );
      return;
    }
    if (user.isVerified !== false) {
      Alert.alert("Email is verified", user.email);
      return;
    }
    setBusy(true);
    try {
      await authService.sendEmailOtp({ email: user.email });
      router.push({ pathname: "/verify-email", params: { email: user.email } });
    } catch (err) {
      Alert.alert("Unable to send code", getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };
  const submitReport = async () => {
    if (reportLock.current) return;
    const errors = {
      ...(!subject.trim() ? { subject: "Subject is required." } : {}),
      ...(!message.trim() ? { message: "Description is required." } : {}),
    };
    setReportErrors(errors);
    if (Object.keys(errors).length) {
      (errors.subject ? subjectRef : messageRef).current?.focus();
      return;
    }
    reportLock.current = true;
    setReporting(true);
    setReportError(null);
    try {
      await supportService.submitRequest({
        category: "technical",
        message: message.trim(),
        priority: "medium",
        subject: subject.trim(),
      });
      closeOverlay();
      setSubject("");
      setMessage("");
      Alert.alert(
        "Report submitted",
        "Your report has been sent to SalonOX support.",
      );
    } catch (err) {
      setReportError(getApiErrorMessage(err));
    } finally {
      reportLock.current = false;
      setReporting(false);
    }
  };
  const businessName =
    salon?.businessName || salon?.name || getUserBusinessName(user);
  const initials = businessName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
  const role =
    user?.role === "salon_owner"
      ? "Owner"
      : user?.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "";
  return (
    <PearlBackground>
      <SafeAreaView edges={["top"]} style={ui.root}>
        <AppStatusBar />
        <ScrollView
          contentContainerStyle={{ paddingBottom: clearance + 20 }}
          showsVerticalScrollIndicator={false}
        >
          <SettingsHeader
            title="Settings"
            subtitle="Salon, tools & account"
            right={
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <LunoxHeaderButton />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Help"
                  onPress={() => setOverlay("help")}
                  style={[ui.icon, { backgroundColor: pearl.glassStrong }]}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={22}
                    color={pearl.ink}
                  />
                </TouchableOpacity>
              </View>
            }
          />
          <View style={ui.content}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Salon details"
              onPress={() => go("/salon-settings")}
              style={[
                ui.formCard,
                { flexDirection: "row", alignItems: "center", gap: 12 },
              ]}
            >
              <InitialsAvatar
                imageUri={logo}
                initials={initials}
                size={54}
                bg={pearl.accentTint}
                color={pearl.accentDeep}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[ui.title, { fontSize: 17 }]}>{businessName}</Text>
                <Text style={ui.muted}>
                  {getUserFullName(user)}
                  {role ? ` · ${role}` : ""}
                </Text>
                <Text style={ui.muted}>
                  {salon?.address || getUserAddressLine(user)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={pearl.muted} />
            </TouchableOpacity>
            <Text translate style={ui.section}>Salon</Text>
            <View style={ui.card}>
              <SettingsRow
                title="Salon details"
                subtitle="Name, contact, address"
                icon="storefront-outline"
                onPress={() => go("/salon-settings")}
              />
                {(can("manage_payment_methods") || can("view_settings_payment_methods")) && (
                  <SettingsRow title="Payment methods" subtitle="Default & custom payment options" icon="card-outline" onPress={() => go("/payment-methods")} />
                )}
                {can("view_staff") && (
                <SettingsRow
                  title="Staff & permissions"
                  subtitle="Roles, access"
                  icon="people-outline"
                  tone="lilac"
                  onPress={() => go("/team/permissions")}
                />
              )}
              {can("view_commissions") && (
                <SettingsRow
                  title="Commissions"
                  subtitle="Rules & payouts"
                  icon="cash-outline"
                  tone="peach"
                  onPress={() => go("/team/commission-rules")}
                />
              )}
              {can("view_attendance") && (
                <SettingsRow
                  title="Attendance"
                  subtitle="Rules, devices, export"
                  icon="time-outline"
                  onPress={() => go("/team/attendance")}
                />
              )}
              {owner && (
                <SettingsRow
                  title="Client form"
                  subtitle="Required fields"
                  icon="options-outline"
                  tone="lilac"
                  onPress={() => setOverlay("client-rules")}
                />
              )}
            </View>
            <Text translate style={ui.section}>Tools</Text>
            <View style={ui.card}>
              {can("view_marketing_dashboard") && (
                <SettingsRow
                  title="WhatsApp Business"
                  subtitle={
                    connected === false
                      ? "Not connected · tap to set up"
                      : connected === true
                        ? "Connected"
                        : "Connection status unavailable"
                  }
                  icon="logo-whatsapp"
                  onPress={() => go("/marketing")}
                />
              )}
              {hasInventoryPermission(user, "view_product_audit") && (
                <SettingsRow
                  title="Product audit"
                  subtitle="Count and reconcile stock"
                  icon="clipboard-outline"
                  tone="lilac"
                  onPress={() => go("/product-audits")}
                />
              )}
              <SettingsRow
                title="Import contacts"
                subtitle="From your phone"
                icon="person-add-outline"
                tone="peach"
                onPress={() => go("/clients/import-contacts")}
              />
            </View>
            {user?.role === "salon_owner" && <View style={ui.card}><SettingsRow title="Connected branches" subtitle="Connect accounts and manage your branch login" icon="git-branch-outline" onPress={() => setOverlay("branches")} /></View>}
            <Text translate style={ui.section}>Preferences</Text>
            <View style={ui.card}>
              <SettingsRow
                title="Appearance"
                subtitle={
                  mode === "dark"
                    ? "Dim"
                    : mode === "system"
                      ? "System"
                      : "Light"
                }
                icon="contrast-outline"
                onPress={() => setOverlay("appearance")}
              />
              <SettingsRow
                title="Notifications"
                subtitle="Payments, stock, bookings"
                icon="notifications-outline"
                tone="lilac"
                onPress={() => setOverlay("notifications")}
              />
            </View>
            <Text translate style={ui.section}>Security</Text>
            <View style={ui.card}>
              <SettingsRow
                title="Change password"
                icon="lock-closed-outline"
                tone="peach"
                onPress={() => setOverlay("password")}
              />
              <SettingsRow
                title="Email"
                subtitle={`${user?.email || "Email not available"} · ${user?.isVerified === false ? "Not verified" : "Verified"}`}
                icon="mail-outline"
                tone="lilac"
                disabled={busy}
                onPress={() => void verifyEmail()}
              />
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void logout()}
              style={{
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text translate style={{ color: pearl.dangerText, fontWeight: "600" }}>
                {busy ? "Please wait…" : "Sign out"}
              </Text>
            </TouchableOpacity>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                justifyContent: "center",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Text style={ui.muted}>
                SalonOX {Constants.expoConfig?.version || "1.0.0"} ·
              </Text>
              <TouchableOpacity
                accessibilityRole="link"
                onPress={() => go("/privacy-policy")}
              >
                <Text translate style={[ui.muted, { color: pearl.accentDeep }]}>
                  Privacy
                </Text>
              </TouchableOpacity>
              <Text translate style={ui.muted}>·</Text>
              <TouchableOpacity
                accessibilityRole="link"
                onPress={() =>
                  void WebBrowser.openBrowserAsync(
                    "https://www.salonox.com/terms",
                  )
                }
              >
                <Text translate style={[ui.muted, { color: pearl.accentDeep }]}>
                  Terms
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        {overlay === "appearance" && <AppearanceSheet onClose={closeOverlay} />}
        {overlay === "branches" && <ConnectedBranchesSheet onClose={closeOverlay} onOpenPortal={() => setOverlay("salons")} />}
        <SalonSwitchSheet visible={overlay === "salons"} onClose={closeOverlay} />
        {overlay === "notifications" && (
          <NotificationSettingsSheet onClose={closeOverlay} />
        )}
        {overlay === "password" && (
          <ChangePasswordSheet onClose={closeOverlay} />
        )}
        {overlay === "client-rules" && (
          <ClientFormRulesSheet onClose={closeOverlay} />
        )}
        <BottomSheet
          visible={overlay === "help"}
          pearlStyle
          centered={false}
          title="Help & support"
          onClose={closeOverlay}
        >
          <View style={ui.card}>
            <SettingsRow
              title="Contact support"
              subtitle="support@salonox.com"
              icon="mail-outline"
              onPress={() =>
                void Linking.openURL("mailto:support@salonox.com").catch(
                  (err) =>
                    Alert.alert(
                      "Unable to open email",
                      getApiErrorMessage(err),
                    ),
                )
              }
            />
            <SettingsRow
              title="Report a problem"
              subtitle="Send issue details to SalonOX support"
              icon="bug-outline"
              tone="lilac"
              onPress={() => {
                setReportError(null);
                setOverlay("report");
              }}
            />
          </View>
        </BottomSheet>
        <BottomSheet
          visible={overlay === "report"}
          pearlStyle
          centered={false}
          avoidKeyboard
          title="Report a problem"
          onClose={() => {
            if (!reportLock.current) closeOverlay();
          }}
          footer={
            <View style={{ flex: 1 }}>
              <SettingsButton
                label="Submit report"
                onPress={() => void submitReport()}
                loading={reporting}
              />
            </View>
          }
        >
          <View style={{ gap: 12 }}>
            <Text translate style={ui.muted}>Subject *</Text>
            <TextInput
              ref={subjectRef}
              editable={!reporting}
              value={subject}
              onChangeText={(value) => {
                setSubject(value);
                setReportErrors((errors) => ({
                  ...errors,
                  subject: undefined,
                }));
              }}
              placeholder="Subject"
              placeholderTextColor={pearl.placeholder}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => messageRef.current?.focus()}
              style={ui.input}
            />
            {!!reportErrors.subject && (
              <Text style={ui.error}>{reportErrors.subject}</Text>
            )}
            <Text translate style={ui.muted}>Description *</Text>
            <TextInput
              ref={messageRef}
              editable={!reporting}
              value={message}
              onChangeText={(value) => {
                setMessage(value);
                setReportErrors((errors) => ({
                  ...errors,
                  message: undefined,
                }));
              }}
              multiline
              placeholder="Describe the problem"
              placeholderTextColor={pearl.placeholder}
              style={[ui.input, { minHeight: 100, textAlignVertical: "top" }]}
            />
            {!!reportErrors.message && (
              <Text style={ui.error}>{reportErrors.message}</Text>
            )}
            {!!reportError && (
              <Text accessibilityRole="alert" style={ui.error}>
                {reportError}
              </Text>
            )}
          </View>
        </BottomSheet>
      </SafeAreaView>
    </PearlBackground>
  );
}
