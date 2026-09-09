import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { todayIsoDate, validateDate } from "@/features/appointments/utils/appointmentDateTime";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatAppDate } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, Text, TouchableOpacity, View } from "react-native";

export function AppointmentDateField({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [visible, setVisible] = useState(false);
  const minimumDate = useMemo(() => new Date(`${todayIsoDate()}T00:00:00`), []);
  const dateValue = useMemo(() => {
    const parsed = new Date(`${value || todayIsoDate()}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);
  const displayDate = useMemo(() => {
    if (!validateDate(value)) {
      return value || "Select date";
    }

    return formatAppDate(`${value}T00:00:00`);
  }, [value]);

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed" || !selected) {
      setVisible(false);
      return;
    }

    const year = selected.getFullYear();
    const month = String(selected.getMonth() + 1).padStart(2, "0");
    const day = String(selected.getDate()).padStart(2, "0");

    onChange(`${year}-${month}-${day}`);
    setVisible(false);
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Date</Text>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => setVisible(true)}
        style={[styles.dateButton, error && styles.inputError]}
      >
        <Text numberOfLines={1} style={styles.dateButtonText}>{displayDate}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.text2} />
      </TouchableOpacity>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      {visible && Platform.OS === "android" ? (
        <DateTimePicker minimumDate={minimumDate} mode="date" onChange={handleDateChange} value={dateValue} />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
          <Pressable onPress={() => setVisible(false)} style={styles.modalBackdrop}>
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <DateTimePicker display="inline" minimumDate={minimumDate} mode="date" onChange={handleDateChange} value={dateValue} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
