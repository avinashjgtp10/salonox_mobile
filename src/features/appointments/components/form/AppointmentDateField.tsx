import { pearlBookingFields } from "@/features/appointments/styles/pearlBookingFields";
import { Text } from "@/components/ui/AppTypography";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { todayIsoDate, validateDate } from "@/features/appointments/utils/appointmentDateTime";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatAppDate } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import { AppDatePickerModal } from "@/components/ui/AppDatePickerModal";
import { useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";

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
  const styles = useMemo(() => pearlBookingFields(createStyles(Colors)), [Colors]);
  const [visible, setVisible] = useState(false);
  // No minimumDate: any past or future date can be booked, so the picker must
  // not grey out earlier days (walk-ins and missed bookings get entered late).
  const displayDate = useMemo(() => {
    if (!validateDate(value)) {
      return value || "Select date";
    }

    return formatAppDate(`${value}T00:00:00`);
  }, [value]);

  return (
    <View style={styles.inputGroup}>
      <Text translate style={styles.inputLabel}>Date</Text>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => setVisible(true)}
        style={[styles.dateButton, error && styles.inputError]}
      >
        <Text numberOfLines={1} style={styles.dateButtonText}>{displayDate}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.text2} />
      </TouchableOpacity>
      {error ? <Text translate style={styles.fieldError}>{error}</Text> : null}

      <AppDatePickerModal
        subtitle="Tap the day for this appointment."
        visible={visible}
        value={validateDate(value) ? value : todayIsoDate()}
        onChange={onChange}
        onClose={() => setVisible(false)}
      />
    </View>
  );
}
