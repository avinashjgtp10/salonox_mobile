import { Text } from "@/components/ui/AppTypography";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { getRejectedMessage } from "@/features/appointments/utils/appointmentScreenHelpers";
import { startAppointmentThunk } from "@/middleware/appointment/appointment.thunk";
import { useAppDispatch } from "@/store/hooks";
import type { AppointmentListItem } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";

export function StartAppointmentAction({ appointment }: { appointment: AppointmentListItem }) {
  const { Colors, styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const submitStart = async () => {
    if (appointment.status !== "Confirmed") {
      setError("Only confirmed appointments can be started.");
      return;
    }

    setError(null);
    setStarting(true);
    const result = await dispatch(startAppointmentThunk(appointment.id));
    setStarting(false);

    if (startAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to start appointment."));
      return;
    }

    setConfirmVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.84}
        disabled={starting}
        onPress={() => {
          setError(null);
          setConfirmVisible(true);
        }}
        style={[styles.actionButton, starting && styles.disabledButton]}
      >
        {starting ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Ionicons name="play-circle-outline" size={18} color={Colors.primary} />
        )}
        <Text style={styles.actionButtonText}>Start</Text>
      </TouchableOpacity>

      <ConfirmationModal
        visible={confirmVisible}
        title="Start appointment?"
        description={`This will mark ${appointment.clientName}'s appointment as In Progress.`}
        cancelLabel="Not Yet"
        confirmLabel="Start"
        confirmVariant="default"
        busy={starting}
        error={error}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={submitStart}
      />
    </>
  );
}
