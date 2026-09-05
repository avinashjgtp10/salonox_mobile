import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { getRejectedMessage } from "@/features/appointments/utils/appointmentScreenHelpers";
import { completeAppointmentThunk } from "@/middleware/appointment/appointment.thunk";
import { useAppDispatch } from "@/store/hooks";
import type { AppointmentListItem } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from "react-native";

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

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!completing) {
            setConfirmVisible(false);
          }
        }}
        transparent
        visible={confirmVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete appointment?</Text>
            <Text style={styles.modalText}>
              {"This will mark "}
              {appointment.clientName}
              {"'s appointment as Completed."}
            </Text>
            {error ? (
              <View style={[styles.inlineAlert, styles.modalInlineAlert]}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.inlineAlertText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={completing}
                onPress={() => setConfirmVisible(false)}
                style={[styles.secondaryButton, completing && styles.disabledButton]}
              >
                <Text style={styles.secondaryButtonText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={completing}
                onPress={() => void submitComplete()}
                style={[styles.primaryButtonCompact, completing && styles.disabledButton]}
              >
                {completing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.primaryButtonText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
