import { Text } from "@/components/ui/AppTypography";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { getRejectedMessage } from "@/features/appointments/utils/appointmentScreenHelpers";
import { completeAppointmentThunk } from "@/middleware/appointment/appointment.thunk";
import { useAppDispatch } from "@/store/hooks";
import type { AppointmentListItem } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";

export function CompleteAppointmentAction({ appointment }: { appointment: AppointmentListItem }) {
  const { Colors, styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitComplete = async () => {
    if (appointment.status !== "In Progress") {
      setError("Only in-progress appointments can be completed.");
      return;
    }

    setError(null);
    setCompleting(true);
    const result = await dispatch(completeAppointmentThunk(appointment.id));
    setCompleting(false);

    if (completeAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to complete appointment."));
      return;
    }

    setConfirmVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.84}
        disabled={completing}
        onPress={() => {
          setError(null);
          setConfirmVisible(true);
        }}
        style={[styles.actionButton, completing && styles.disabledButton]}
      >
        {completing ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Ionicons name="checkmark-done-circle-outline" size={18} color={Colors.primary} />
        )}
        <Text style={styles.actionButtonText}>Complete</Text>
      </TouchableOpacity>

      <ConfirmationModal
        visible={confirmVisible}
        title="Complete appointment?"
        description={`This will mark ${appointment.clientName}'s appointment as Completed.`}
        cancelLabel="Not Yet"
        confirmLabel="Complete"
        confirmVariant="default"
        busy={completing}
        error={error}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={submitComplete}
      />
    </>
  );
}
