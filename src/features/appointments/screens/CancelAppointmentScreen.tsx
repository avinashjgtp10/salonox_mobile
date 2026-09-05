import { TextField } from "@/features/appointments/components/form/TextField";
import { ScreenShell } from "@/features/appointments/components/shared/ScreenShell";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { getRejectedMessage } from "@/features/appointments/utils/appointmentScreenHelpers";
import { useAppToast } from "@/hooks/useAppToast";
import { cancelAppointmentThunk } from "@/middleware/appointment/appointment.thunk";
import { selectAppointmentMutating } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from "react-native";

export function CancelAppointmentScreen() {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const mutating = useAppSelector(selectAppointmentMutating);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const submitCancel = async () => {
    const trimmedReason = reason.trim();

    if (!appointmentId) {
      setError("Appointment ID is missing.");
      return;
    }

    const result = await dispatch(cancelAppointmentThunk({ appointmentId, reason: trimmedReason }));

    if (cancelAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to cancel appointment."));
      return;
    }

    toast.showSuccess("Appointment cancelled successfully.");
    router.replace(`/appointments/${result.payload.appointment.id}` as Href);
  };

  return (
    <ScreenShell title="Cancel Appointment">
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Cancellation reason</Text>
        <TextField
          error={error ?? undefined}
          label="Reason"
          multiline
          onChangeText={(value) => {
            setReason(value);
            setError(null);
          }}
          placeholder="Why is this appointment being cancelled?"
          value={reason}
        />
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={mutating}
          onPress={() => setConfirmVisible(true)}
          style={[styles.dangerButton, mutating && styles.disabledButton]}
        >
          {mutating ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />}
          <Text style={styles.primaryButtonText}>Cancel Appointment</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent visible={confirmVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm cancellation</Text>
            <Text style={styles.modalText}>
              This will update the appointment through the cancel API and mark it cancelled.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setConfirmVisible(false)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Keep Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setConfirmVisible(false);
                  void submitCancel();
                }}
                style={styles.dangerButtonCompact}
              >
                <Text style={styles.primaryButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}
