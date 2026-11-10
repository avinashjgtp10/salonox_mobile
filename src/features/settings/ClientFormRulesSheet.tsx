import { useState } from "react";
import { Switch, View } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import {
  useClientRequiredFields,
  type ClientRequiredFields,
} from "@/services/clientRequiredFields";
import { getApiErrorMessage } from "@/services/api";
import { useSettingsStyles } from "./SettingsUI";

export function ClientFormRulesSheet({ onClose }: { onClose: () => void }) {
  const ui = useSettingsStyles();
  const pearl = usePearlPalette();
  const { config, toggle } = useClientRequiredFields();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const change = async (field: keyof ClientRequiredFields) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await toggle(field);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <BottomSheet
      visible
      pearlStyle
      centered={false}
      title="Client form rules"
      onClose={onClose}
    >
      <View style={{ gap: 14 }}>
        <Text translate style={ui.body}>
          Choose which fields are required when adding a client in Quick Sale,
          Calendar or Add client.
        </Text>
        <View style={ui.card}>
          {(
            [
              ["require_dob", "Date of birth"],
              ["require_doa", "Anniversary"],
            ] as const
          ).map(([field, label]) => (
            <View key={field} style={ui.row}>
              <View style={{ flex: 1 }}>
                <Text translate style={ui.title}>{label}</Text>
                <Text translate style={ui.muted}>
                  {config[field] ? "Required" : "Optional"}
                </Text>
              </View>
              <Switch
                accessibilityLabel={`${label} required`}
                value={config[field]}
                disabled={saving}
                onValueChange={() => void change(field)}
                thumbColor="#FFFFFF"
                trackColor={{ false: pearl.divider, true: pearl.accent }}
              />
            </View>
          ))}
        </View>
        <Text translate style={ui.muted}>
          Mobile number is always required so bills and reminders can be sent.
        </Text>
        {!!error && (
          <Text translate accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
        )}
      </View>
    </BottomSheet>
  );
}
