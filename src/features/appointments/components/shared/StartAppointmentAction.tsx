import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { getRejectedMessage } from "@/features/appointments/utils/appointmentScreenHelpers";
import { startAppointmentThunk } from "@/middleware/appointment/appointment.thunk";
import { useAppDispatch } from "@/store/hooks";
import type { AppointmentListItem } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from "react-native";

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

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!starting) {
            setConfirmVisible(false);
          }
        }}
        transparent
        visible={confirmVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start appointment?</Text>
            <Text style={styles.modalText}>
              {"This will mark "}
              {appointment.clientName}
              {"'s appointment as In Progress."}
            </Text>
            {error ? (
              <View style={[styles.inlineAlert, styles.modalInlineAlert]}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.inlineAlertText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={starting}
                onPress={() => setConfirmVisible(false)}
                style={[styles.secondaryButton, starting && styles.disabledButton]}
              >
                <Text style={styles.secondaryButtonText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={starting}
                onPress={() => void submitStart()}
                style={[styles.primaryButtonCompact, starting && styles.disabledButton]}
              >
                {starting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="play" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.primaryButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
