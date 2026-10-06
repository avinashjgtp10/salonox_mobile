import { Text } from "@/components/ui/AppTypography";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
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
import { ActivityIndicator, TouchableOpacity, View } from "react-native";

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

      <ConfirmationModal
        visible={confirmVisible}
        title="Confirm cancellation"
        description="This will mark the appointment as cancelled."
        cancelLabel="Keep Appointment"
        confirmLabel="Confirm"
        busy={mutating}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={async () => { setConfirmVisible(false); await submitCancel(); }}
      />
    </ScreenShell>
  );
}
