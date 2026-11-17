import { useState } from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { pearl } from "@/components/auth/pearl/tokens";
import { StaffButton, staffUi } from "./StaffPearl";

export function StaffTimeField({ label, value, onChange, error, disabled }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const [hour, minute] = value.split(":");
  const displayValue = value
    ? `${String(Number(hour) % 12 || 12).padStart(2, "0")}:${minute} ${Number(hour) >= 12 ? "PM" : "AM"}`
    : "Select time";
  const commit = (date: Date) => onChange(
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  );
  return (
    <View style={{ gap: 6 }}>
      <Text translate style={staffUi.label}>{label}</Text>
      <TouchableOpacity
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => {
          const date = new Date();
          const [hour, minute] = (value || "09:00").split(":").map(Number);
          date.setHours(hour, minute, 0, 0);
          setDraft(date);
          setOpen(true);
        }}
        style={[staffUi.input, { flexDirection: "row", alignItems: "center", gap: 8 }, error ? { borderColor: pearl.danger } : null]}
      >
        <Ionicons name="time-outline" size={18} color={pearl.accentDeep} />
        <Text style={{ color: value ? pearl.ink : pearl.placeholder }}>{displayValue}</Text>
      </TouchableOpacity>
      {error ? <Text translate style={staffUi.error}>{error}</Text> : null}
      {open && !disabled ? (
        <>
          <DateTimePicker
            mode="time"
            value={draft}
            is24Hour={false}
            locale="en-US"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            textColor={pearl.ink}
            onChange={(event, selected) => {
              if (Platform.OS === "android") setOpen(false);
              if (event.type === "dismissed" || !selected) return;
              setDraft(selected);
              if (Platform.OS !== "ios") commit(selected);
            }}
          />
          {Platform.OS === "ios" ? (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <StaffButton secondary label="Cancel" onPress={() => setOpen(false)} />
              <StaffButton label="Done" onPress={() => { commit(draft); setOpen(false); }} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
