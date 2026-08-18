import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

export type DateFieldProps = {
  error?: string;
  label: string;
  maximumDate?: Date;
  minimumDate?: Date;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  value: string;
};

const toIsoDate = (date: Date) =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join(
    "-",
  );

const toDateValue = (isoDate: string) => {
  if (!isoDate) {
    return new Date();
  }

  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
};

const formatDisplayDate = (isoDate: string) => {
  if (!isoDate) {
    return "";
  }

  const date = toDateValue(isoDate);

  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

// General-purpose date picker field — wraps @react-native-community/datetimepicker
// with the platform-appropriate presentation (inline on Android, a modal
// spinner on iOS) so screens don't have to hand-roll this each time.
export function DateField({ error, label, maximumDate, minimumDate, onChange, placeholder, value }: DateFieldProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setIsPickerVisible(false);
    }

    if (event.type === "dismissed" || !selected) {
      return;
    }

    onChange(toIsoDate(selected));
  };

  const handleClear = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onChange("");
  };

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => setIsPickerVisible(true)}
        style={[styles.inputButton, error ? styles.inputButtonError : null]}
      >
        <Ionicons name="calendar-outline" size={16} color={Colors.text2} style={styles.icon} />
        <Text style={[styles.value, !value ? styles.placeholder : null]}>
          {value ? formatDisplayDate(value) : (placeholder ?? "Select date")}
        </Text>
        {value ? (
          <Pressable accessibilityLabel={`Clear ${label}`} hitSlop={10} onPress={handleClear}>
            <Ionicons name="close-circle" size={16} color={Colors.text2} />
          </Pressable>
        ) : null}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isPickerVisible && Platform.OS === "android" ? (
        <DateTimePicker
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          mode="date"
          onChange={handleChange}
          value={toDateValue(value)}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal animationType="fade" onRequestClose={() => setIsPickerVisible(false)} transparent visible={isPickerVisible}>
          <Pressable onPress={() => setIsPickerVisible(false)} style={styles.modalBackdrop}>
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>{label}</Text>
              <DateTimePicker
                display="spinner"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                mode="date"
                onChange={handleChange}
                value={toDateValue(value)}
              />
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setIsPickerVisible(false)}
                style={styles.modalDoneButton}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      marginBottom: Spacing.md,
    },
    label: {
      color: Colors.heading,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 8,
    },
    inputButton: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      flexDirection: "row",
      height: 48,
      paddingHorizontal: 14,
    },
    inputButtonError: {
      borderColor: Colors.error,
    },
    icon: {
      marginRight: 8,
    },
    value: {
      color: Colors.heading,
      flex: 1,
      fontSize: 14,
      fontWeight: "500",
    },
    placeholder: {
      color: Colors.placeholder,
    },
    errorText: {
      color: Colors.error,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 6,
    },
    modalBackdrop: {
      alignItems: "center",
      backgroundColor: "rgba(15, 23, 32, 0.45)",
      flex: 1,
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: Colors.card,
      borderRadius: Radius.lg,
      paddingBottom: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.lg,
      width: "88%",
    },
    modalTitle: {
      color: Colors.heading,
      fontSize: 14,
      fontWeight: "800",
      marginBottom: Spacing.sm,
      textAlign: "center",
    },
    modalDoneButton: {
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: Radius.md,
      marginTop: Spacing.sm,
      paddingVertical: 12,
    },
    modalDoneText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
  });
