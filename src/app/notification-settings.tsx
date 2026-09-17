import { salonNotificationPreferences } from "@/services/salonNotificationPreferences";
import { getApiErrorMessage } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
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
  const [saving, setSaving] = useState(false);
  const preferencesRef = useRef(preferences);
  const confirmedRef = useRef(preferences);
  const pendingRef = useRef<NotificationPreferences | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    salonNotificationPreferences.get().then((stored) => {
      if (!cancelled) {
        setPreferences(stored);
        preferencesRef.current = stored;
        confirmedRef.current = stored;
        setIsHydrated(true);
      }
    }).catch((error) => {
      Alert.alert("Unable to load notification settings", getApiErrorMessage(error), [{ text: "Go Back", onPress: () => router.back() }]);
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

  const updatePreferences = async (patch: Partial<NotificationPreferences>) => {
    const next = { ...preferencesRef.current, ...patch };
    preferencesRef.current = next;
    setPreferences(next);
    pendingRef.current = next;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      while (pendingRef.current) {
        const snapshot = pendingRef.current;
        pendingRef.current = null;
        try {
          await salonNotificationPreferences.save(snapshot);
          confirmedRef.current = snapshot;
        } catch (error) {
          // A newer tap will be saved next; never overwrite it with an old result.
          if (!pendingRef.current) {
            preferencesRef.current = confirmedRef.current;
            setPreferences(confirmedRef.current);
            Alert.alert("Unable to save notification settings", getApiErrorMessage(error));
          }
          continue;
        }
        try {
          await notificationPreferencesStorage.setPreferences(snapshot);
        } catch {
          // The server has saved the change; foreground sync refreshes the cache.
        }
      }
    } finally { savingRef.current = false; setSaving(false); }
  };

  const handleToggleAll = (value: boolean) => {
    updatePreferences({
      allNotifications: value,
      appointments: value,
      otherUpdates: value,
      paymentComplete: value,
      productAudit: value,
    });
  };

  const handleToggleAppointments = (value: boolean) => {
    updatePreferences({
      appointments: value,
    });
  };

  const handleToggleOtherUpdates = (value: boolean) => {
    updatePreferences({
      otherUpdates: value,
    });
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

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHint}>
          Choose push notifications for the whole salon. Changes apply to all salon devices.
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.sectionHint}>{saving ? "Saving changes..." : " "}</Text>

        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={20} color={Colors.text2} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>All Notifications</Text>
            <Text style={styles.rowDescription}>
              Turn all push notifications on or off for the whole salon.
            </Text>
          </View>
          <Switch
            onValueChange={handleToggleAll}
            thumbColor="#FFFFFF"
            trackColor={{ false: Colors.border, true: Colors.primary }}
            value={preferences.allNotifications}
          />
        </View>

        <View style={styles.row}>
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
            onValueChange={handleToggleAppointments}
            disabled={!preferences.allNotifications}
            thumbColor="#FFFFFF"
            trackColor={{ false: Colors.border, true: Colors.primary }}
            value={preferences.appointments}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles-outline" size={20} color={Colors.text2} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Other Updates</Text>
            <Text style={styles.rowDescription}>
              Clients and other SalonOX updates.
            </Text>
          </View>
          <Switch
            onValueChange={handleToggleOtherUpdates}
            disabled={!preferences.allNotifications}
            thumbColor="#FFFFFF"
            trackColor={{ false: Colors.border, true: Colors.primary }}
            value={preferences.otherUpdates}
          />
        </View>
        {([
          { key: "paymentComplete", title: "Payment Complete", description: "Notifications when payments are completed.", icon: "card-outline" },
          { key: "productAudit", title: "Product Audit", description: "Product inventory audit notifications.", icon: "clipboard-outline" },
        ] as const).map((item) => (
          <View key={item.key} style={styles.row}>
            <View style={styles.iconWrap}><Ionicons name={item.icon} size={20} color={Colors.text2} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowDescription}>{item.description}</Text>
            </View>
            <Switch accessibilityLabel={item.title} disabled={!preferences.allNotifications} value={preferences[item.key]} onValueChange={(value) => updatePreferences({ [item.key]: value })} thumbColor="#FFFFFF" trackColor={{ false: Colors.border, true: Colors.primary }} />
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
