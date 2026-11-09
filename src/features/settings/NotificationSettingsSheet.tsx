import { useEffect, useRef, useState } from "react";
import { Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { useAuth } from "@/context/AuthContext";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { appAlert as Alert } from "@/services/appAlert";
import { salonNotificationPreferences } from "@/services/salonNotificationPreferences";
import { getApiErrorMessage } from "@/services/api";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPreferencesStorage,
  type NotificationKey,
  type NotificationPreferences,
} from "@/services/notificationPreferencesStorage";
import { useSettingsStyles } from "./SettingsUI";
const NOTIF_ROWS: {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  key: NotificationKey;
  title: string;
}[] = [
  {
    description: "When a new booking is confirmed",
    icon: "calendar-outline",
    key: "newAppointment",
    title: "New Appointment",
  },
  {
    description: "24h and 1h before appointment",
    icon: "alarm-outline",
    key: "appointmentReminder",
    title: "Appointment Reminder",
  },
  {
    description: "When a client cancels a booking",
    icon: "close-circle-outline",
    key: "appointmentCancelled",
    title: "Appointment Cancelled",
  },
  {
    description: "After a service is marked done",
    icon: "checkmark-circle-outline",
    key: "appointmentCompleted",
    title: "Appointment Completed",
  },
  {
    description: "When a payment is received",
    icon: "card-outline",
    key: "newPayment",
    title: "New Payment",
  },
  {
    description: "When a payment attempt fails",
    icon: "alert-circle-outline",
    key: "paymentFailed",
    title: "Payment Failed",
  },
  {
    description: "When a new client registers",
    icon: "person-add-outline",
    key: "newClient",
    title: "New Client",
  },
  {
    description: "When a client leaves a review",
    icon: "star-outline",
    key: "clientReview",
    title: "Client Review",
  },
  {
    description: "When you receive a client message",
    icon: "chatbubble-ellipses-outline",
    key: "newMessage",
    title: "New Message",
  },
  {
    description: "When a product stock runs low",
    icon: "cube-outline",
    key: "lowInventory",
    title: "Low Inventory",
  },
  {
    description: "When a staff member signs in",
    icon: "log-in-outline",
    key: "staffLogin",
    title: "Staff Login",
  },
  {
    description: "When a campaign starts or finishes",
    icon: "megaphone-outline",
    key: "marketingCampaign",
    title: "Campaign Updates",
  },
];

export function NotificationSettingsSheet({
  onClose,
  renderInline = false,
}: {
  onClose: () => void;
  renderInline?: boolean;
}) {
  const ui = useSettingsStyles();
  const pearl = usePearlPalette();
  const { user } = useAuth();
  const readOnly = isStaffExperienceUser(user);
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
    if (readOnly) return;
    let cancelled = false;

    salonNotificationPreferences
      .get()
      .then((stored) => {
        if (!cancelled) {
          setPreferences(stored);
          preferencesRef.current = stored;
          confirmedRef.current = stored;
          setIsHydrated(true);
        }
      })
      .catch((error) => {
        Alert.alert(
          "Unable to load notification settings",
          getApiErrorMessage(error),
          [{ text: "Close", onPress: onClose }],
        );
      });

    return () => {
      cancelled = true;
    };
  }, [readOnly, onClose]);

  const updatePreferences = async (patch: Partial<NotificationPreferences>) => {
    if (readOnly) return;
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
          if (!pendingRef.current) {
            preferencesRef.current = confirmedRef.current;
            setPreferences(confirmedRef.current);
            Alert.alert(
              "Unable to save notification settings",
              getApiErrorMessage(error),
            );
          }
          continue;
        }
        try {
          await notificationPreferencesStorage.setPreferences(snapshot);
        } catch {}
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleToggleAll = (value: boolean) => {
    updatePreferences({
      allNotifications: value,
      ...Object.fromEntries(NOTIF_ROWS.map((row) => [row.key, value])),
    });
  };

  if (readOnly) return <Redirect href="/(staff)/notifications" />;
  const prototypeRows = ["newPayment", "lowInventory", "newAppointment"];
  const rows = [
    ...prototypeRows.map((key) => NOTIF_ROWS.find((row) => row.key === key)!),
    ...NOTIF_ROWS.filter((row) => !prototypeRows.includes(row.key)),
  ];
  return (
    <BottomSheet
      renderInline={renderInline}
      visible
      pearlStyle
      centered={false}
      title="Notify me about"
      onClose={onClose}
    >
      {!isHydrated ? (
        <ActivityIndicator color={pearl.accent} />
      ) : (
        <View style={{ gap: 12 }}>
          <Text translate style={ui.muted}>
            Choose push notifications for the whole salon. Changes save
            automatically.
          </Text>
          <View style={ui.card}>
            <View style={ui.row}>
              <View style={{ flex: 1 }}>
                <Text translate style={ui.title}>All notifications</Text>
                <Text translate style={ui.muted}>
                  Turn all push notifications on or off
                </Text>
              </View>
              <Switch
                accessibilityLabel="All notifications"
                onValueChange={handleToggleAll}
                value={preferences.allNotifications}
                trackColor={{ false: pearl.divider, true: pearl.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
          <View style={ui.card}>
            {rows.map((item) => (
              <View key={item.key} style={ui.row}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text translate style={ui.title}>
                    {item.key === "newPayment"
                      ? "Payments"
                      : item.key === "lowInventory"
                        ? "Low stock"
                        : item.key === "newAppointment"
                          ? "New bookings"
                          : item.title}
                  </Text>
                  <Text style={ui.muted}>
                    {item.key === "newPayment"
                      ? "Every payment received"
                      : item.key === "lowInventory"
                        ? "When a product hits its alert level"
                        : item.key === "newAppointment"
                          ? "Online and WhatsApp bookings"
                          : item.description}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={item.title}
                  disabled={!preferences.allNotifications}
                  value={preferences[item.key]}
                  onValueChange={(value) => {
                    void updatePreferences({ [item.key]: value });
                  }}
                  trackColor={{ false: pearl.divider, true: pearl.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </View>
          <Text translate accessibilityLiveRegion="polite" style={ui.muted}>
            {saving ? "Saving changes..." : "Changes saved"}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}
