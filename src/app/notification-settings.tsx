import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPreferencesStorage,
  type NotificationPreferences,
} from "@/services/notificationPreferencesStorage";
import { useThemeColors } from "@/theme/ThemeProvider";

export default function NotificationSettingsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    notificationPreferencesStorage.getPreferences().then((stored) => {
      if (!cancelled) {
        setPreferences(stored);
        setIsHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/more" as Href);
  };

  const updatePreferences = (next: NotificationPreferences) => {
    setPreferences(next);
    void notificationPreferencesStorage.setPreferences(next);
  };

  const handleToggleAll = (value: boolean) => {
    updatePreferences({ ...preferences, allNotifications: value });
  };

  const handleToggleAppointments = (value: boolean) => {
    updatePreferences({ ...preferences, appointments: value });
  };

  const handleToggleOtherUpdates = (value: boolean) => {
    updatePreferences({ ...preferences, otherUpdates: value });
  };

  if (!isHydrated) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <AppStatusBar />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />

      <View style={styles.headerRow}>
        <TouchableOpacity
          activeOpacity={0.84}
          hitSlop={AppLayout.headerActionHitSlop}
          onPress={handleBack}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionHint}>
          Choose which push notifications SalonOX can send to this device.
        </Text>

        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={20} color={Colors.text2} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>All Notifications</Text>
            <Text style={styles.rowDescription}>
              Receive every notification, including appointments and other updates.
            </Text>
          </View>
          <Switch
            onValueChange={handleToggleAll}
            thumbColor="#FFFFFF"
            trackColor={{ false: Colors.border, true: Colors.primary }}
            value={preferences.allNotifications}
          />
        </View>

        <View style={[styles.row, preferences.allNotifications && styles.rowDisabled]}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar-outline" size={20} color={Colors.text2} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Appointments</Text>
            <Text style={styles.rowDescription}>
              Bookings, reschedules, and cancellations.
            </Text>
          </View>
          <Switch
            disabled={preferences.allNotifications}
            onValueChange={handleToggleAppointments}
            thumbColor="#FFFFFF"
            trackColor={{ false: Colors.border, true: Colors.primary }}
            value={preferences.allNotifications || preferences.appointments}
          />
        </View>

        <View style={[styles.row, preferences.allNotifications && styles.rowDisabled]}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles-outline" size={20} color={Colors.text2} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Other Updates</Text>
            <Text style={styles.rowDescription}>
              Clients, payments, and new SalonOX features.
            </Text>
          </View>
          <Switch
            disabled={preferences.allNotifications}
            onValueChange={handleToggleOtherUpdates}
            thumbColor="#FFFFFF"
            trackColor={{ false: Colors.border, true: Colors.primary }}
            value={preferences.allNotifications || preferences.otherUpdates}
          />
        </View>
      </View>
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
    sectionHint: {
      color: Colors.text2,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: Spacing.lg,
    },
    row: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: Spacing.md,
      marginBottom: Spacing.sm,
      padding: AppLayout.cardPadding,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    iconWrap: {
      alignItems: "center",
      backgroundColor: Colors.backgroundElement,
      borderRadius: Radius.full,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    rowCopy: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      color: Colors.heading,
      fontSize: 15,
      fontWeight: "800",
    },
    rowDescription: {
      color: Colors.text2,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
  });
