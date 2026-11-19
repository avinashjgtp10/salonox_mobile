import { useState } from "react";
import { Switch, View } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import {
  useClientRequiredFields,
  type ClientRequiredFields,
} from "@/services/clientRequiredFields";
import {
  useRedemptionOtpConfig,
  type RedemptionOtpConfig,
} from "@/services/redemptionOtpSettings";
import { getApiErrorMessage } from "@/services/api";
import { useSettingsStyles } from "./SettingsUI";

// Salon-wide switches for Quick Sale and Calendar, gathered on one screen like
// the web's Settings > Extras. Each toggle is its own salon_settings row.
export function ExtrasSheet({ onClose }: { onClose: () => void }) {
  const ui = useSettingsStyles();
  const pearl = usePearlPalette();
  const { config: requiredFields, toggle: toggleRequired } = useClientRequiredFields();
  const { config: otpConfig, toggle: toggleOtp } = useRedemptionOtpConfig();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const row = (
    label: string,
    hint: string,
    value: boolean,
    onToggle: () => void,
  ) => (
    <View key={label} style={ui.row}>
      <View style={{ flex: 1 }}>
        <Text translate style={ui.title}>{label}</Text>
        <Text translate style={ui.muted}>{hint}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={saving}
        onValueChange={onToggle}
        thumbColor="#FFFFFF"
        trackColor={{ false: pearl.divider, true: pearl.accent }}
      />
    </View>
  );

  return (
    <BottomSheet visible pearlStyle centered={false} title="Extras" onClose={onClose}>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 10 }}>
          <Text translate style={ui.body}>
            Required fields when adding a client in Quick Sale, Calendar or Add client.
          </Text>
          <View style={ui.card}>
            {(
              [
                ["require_dob", "Date of birth"],
                ["require_doa", "Anniversary"],
              ] as const satisfies readonly (readonly [keyof ClientRequiredFields, string])[]
            ).map(([field, label]) =>
              row(label, requiredFields[field] ? "Required" : "Optional", requiredFields[field], () => void run(() => toggleRequired(field))),
            )}
          </View>
          <Text translate style={ui.muted}>
            Mobile number is always required so bills and reminders can be sent.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text translate style={ui.body}>
            Require a WhatsApp OTP from the client before redeeming at checkout.
          </Text>
          <View style={ui.card}>
            {(
              [
                ["package", "Package OTP"],
                ["membership", "Membership OTP"],
              ] as const satisfies readonly (readonly [keyof RedemptionOtpConfig, string])[]
            ).map(([field, label]) =>
              row(label, otpConfig[field] ? "OTP required" : "No OTP", otpConfig[field], () => void run(() => toggleOtp(field))),
            )}
          </View>
          <Text translate style={ui.muted}>
            When on, the client confirms a code sent to their registered WhatsApp number before a package session or membership benefit is used.
          </Text>
        </View>

        {!!error && (
          <Text translate accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
        )}
      </View>
    </BottomSheet>
  );
}
