import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

const LAST_UPDATED = "24 July 2026";

type Section = {
  title: string;
  body: string;
};

const SECTIONS: Section[] = [
  {
    title: "1. Who we are",
    body:
      "SalonOX is developed and operated by Salonox Tech (\"Salonox Tech\", \"we\", \"us\", or \"our\"). " +
      "This policy explains what information the SalonOX mobile app collects from salon owners, staff, " +
      "and the clients they manage, how we use it, and the choices you have.",
  },
  {
    title: "2. Information we collect",
    body:
      "Account information: name, email address, phone number, password (stored as a secure hash), " +
      "business/salon name, and business address, provided when you register or update your profile.\n\n" +
      "Client and staff records: names, contact details, appointment history, membership details, " +
      "attendance, and payroll/commission data that you or your team enter into the app to run your salon. " +
      "This data belongs to your business; we process it on your behalf to provide the service.\n\n" +
      "Location: with your permission, we use precise or approximate device location during onboarding to " +
      "help detect and confirm your salon's address. We do not track your location in the background.\n\n" +
      "Photos and camera: with your permission, we access your photo library or camera so you can set a " +
      "profile picture for yourself or your salon.\n\n" +
      "Push notifications: we generate a device push token (via Expo/Firebase Cloud Messaging) so we can " +
      "send you booking, staff, and account alerts.\n\n" +
      "Usage and device data: app version, device model, and OS version, used for crash diagnostics and " +
      "compatibility.",
  },
  {
    title: "3. How we use your information",
    body:
      "We use the information above to: create and secure your account; operate core features such as " +
      "bookings, client management, staff scheduling, attendance, sales, and payroll; send you service, " +
      "security, and appointment-related notifications; detect and prevent fraud or abuse; and improve app " +
      "reliability and performance. We do not sell your personal information.",
  },
  {
    title: "4. How we share information",
    body:
      "We share information only where necessary to run the app: with infrastructure and service providers " +
      "(such as Google Firebase for push notifications and Google Maps for location/mapping features) who " +
      "process data on our behalf under contract; within your salon's own account, since staff and client " +
      "records are visible to authorised users of that business account; and where required by law, " +
      "regulation, or a valid legal request.",
  },
  {
    title: "5. Data retention",
    body:
      "We retain account and business data for as long as your account is active. If you delete your " +
      "account from the More > Delete Account screen in the app, we permanently remove your personal " +
      "account data and associated business records, except where we are legally required to retain " +
      "certain records (for example, financial or tax records) for a limited period.",
  },
  {
    title: "6. Your choices and rights",
    body:
      "You can review and update your profile information at any time from within the app. You can revoke " +
      "location, camera/photo, or notification permissions at any time from your device settings; some " +
      "features may not work correctly without them. You can request access to, correction of, or deletion " +
      "of your personal data by contacting us at the email below, or by using the in-app Delete Account " +
      "option.",
  },
  {
    title: "7. Security",
    body:
      "We use industry-standard safeguards, including encrypted network connections (HTTPS) and hashed " +
      "credential storage, to protect your information. No method of transmission or storage is 100% " +
      "secure, and we cannot guarantee absolute security.",
  },
  {
    title: "8. Children's privacy",
    body:
      "SalonOX is a business tool intended for salon owners and staff. It is not directed at children, and " +
      "we do not knowingly collect personal information from anyone under the age of 18.",
  },
  {
    title: "9. Changes to this policy",
    body:
      "We may update this policy from time to time. If we make material changes, we will notify you " +
      "in-app or by email before the changes take effect. The \"Last updated\" date above reflects the " +
      "most recent revision.",
  },
  {
    title: "10. Contact us",
    body:
      "If you have questions about this policy or how your data is handled, contact us at " +
      "support@salonox.com.",
  },
];

export default function PrivacyPolicyScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/more" as Href);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />

      <View style={styles.headerRow}>
        <TouchableOpacity activeOpacity={0.84} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Last updated: {LAST_UPDATED}</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      backgroundColor: Colors.bg,
      flex: 1,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: Spacing.sm,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
    },
    backButton: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.control,
      borderWidth: 1,
      height: AppLayout.headerActionSize,
      justifyContent: "center",
      width: AppLayout.headerActionSize,
    },
    backButtonPlaceholder: {
      width: AppLayout.headerActionSize,
    },
    headerTitle: {
      color: Colors.heading,
      fontSize: AppLayout.headerTitleFontSize,
      fontWeight: AppLayout.screenTitleFontWeight,
    },
    content: {
      paddingBottom: AppLayout.contentBottomPadding,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingTop: AppLayout.headerMarginBottom,
    },
    subtitle: {
      color: Colors.text2,
      fontSize: 12,
      marginBottom: Spacing.lg,
    },
    card: {
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      marginBottom: Spacing.md,
      padding: AppLayout.cardPadding,
    },
    sectionTitle: {
      color: Colors.heading,
      fontSize: 15,
      fontWeight: "800",
      marginBottom: Spacing.sm,
    },
    sectionBody: {
      color: Colors.text2,
      fontSize: 13,
      lineHeight: 20,
    },
  });
