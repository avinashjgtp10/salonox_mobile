import { FORM_STATUS_OPTIONS } from "@/features/appointments/constants/appointmentConstants";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentStatus } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

export function AppointmentStatusDropdown({
  error,
  onSelect,
  value,
}: {
  error?: string;
  onSelect: (value: AppointmentStatus) => void;
  value: AppointmentStatus;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Status</Text>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => setVisible(true)}
        style={[styles.compactSelectButton, error && styles.inputError]}
      >
        <Text numberOfLines={1} style={styles.compactSelectText}>{value}</Text>
        <Ionicons name="chevron-down" size={15} color={Colors.text2} />
      </TouchableOpacity>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
        <Pressable onPress={() => setVisible(false)} style={styles.modalBackdrop}>
          <Pressable style={styles.statusModalCard}>
            <Text style={styles.modalTitle}>Status</Text>
            {FORM_STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={`appointment-status-${option}`}
                activeOpacity={0.82}
                onPress={() => {
                  onSelect(option);
                  setVisible(false);
                }}
                style={styles.statusOptionRow}
              >
                <Text style={[styles.statusOptionText, option === value && styles.statusOptionTextActive]}>{option}</Text>
                {option === value ? <Ionicons name="checkmark" size={18} color={Colors.appointmentAccent} /> : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
