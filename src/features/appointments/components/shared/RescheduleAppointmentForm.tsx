import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { AppointmentDateField } from "@/features/appointments/components/form/AppointmentDateField";
import { TextField } from "@/features/appointments/components/form/TextField";
import { TimeSlotSelector } from "@/features/appointments/components/form/TimeSlotSelector";
import { DetailRow } from "@/features/appointments/components/shared/DetailRow";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { addMinutesToTime, combineDateTime, getDefaultTimeSlots, minutesToDisplayTime, parseClockToMinutes, toInputDate, toInputTime, validateDate, validateTime } from "@/features/appointments/utils/appointmentDateTime";
import { formatBusinessDate, formatBusinessTime, getRejectedMessage } from "@/features/appointments/utils/appointmentScreenHelpers";
import { useAppToast } from "@/hooks/useAppToast";
import { rescheduleAppointmentThunk } from "@/middleware/appointment/appointment.thunk";
import { selectAppointmentMutating } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { AppointmentListItem, RescheduleAppointmentRequest } from "@/types/appointment";
import type { StaffAvailabilitySlot } from "@/types/staffAvailability";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TouchableOpacity, View } from "react-native";

/** New date/time picker for an existing booking — same date field and slots as the booking form. */
export function RescheduleAppointmentForm({
  appointment,
  onRescheduled,
}: {
  appointment: AppointmentListItem;
  onRescheduled: (appointmentId: string) => void;
}) {
  const { Colors, styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const mutating = useAppSelector(selectAppointmentMutating);

  const originalDate = toInputDate(appointment.scheduledAt);
  const originalStart = toInputTime(appointment.scheduledAt ?? appointment.startTime);
  const duration = appointment.durationMinutes && appointment.durationMinutes > 0 ? appointment.durationMinutes : 30;

  const [date, setDate] = useState(originalDate);
  const [startTime, setStartTime] = useState(originalStart);
  const [notes, setNotes] = useState(appointment.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  // The current time stays selectable on its own day even if off the default grid.
  const slots = useMemo<StaffAvailabilitySlot[]>(() => {
    const defaults = getDefaultTimeSlots(date);
    if (date !== originalDate || !validateTime(originalStart) || defaults.some((slot) => slot.value === originalStart)) {
      return defaults;
    }

    return [
      ...defaults,
      {
        display: minutesToDisplayTime(parseClockToMinutes(originalStart) ?? 0),
        endTime: addMinutesToTime(originalDate, originalStart, duration),
        value: originalStart,
      },
    ].sort((left, right) => left.value.localeCompare(right.value));
  }, [date, duration, originalDate, originalStart]);

  const endTime = validateDate(date) && validateTime(startTime) ? addMinutesToTime(date, startTime, duration) : "";

  const handleDateChange = (value: string) => {
    if (value !== date) setStartTime("");
    setDate(value);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateDate(date)) {
      setError("Select a new date.");
      return;
    }

    if (!validateTime(startTime) || !endTime) {
      setError("Select a new start time.");
      return;
    }

    if (date === originalDate && startTime === originalStart) {
      setError("Pick a different date or time to reschedule.");
      return;
    }

    const payload: RescheduleAppointmentRequest = {
      duration,
      end_time: combineDateTime(date, endTime),
      notes: notes.trim() || undefined,
      scheduled_at: combineDateTime(date, startTime),
      start_time: combineDateTime(date, startTime),
    };
    const result = await dispatch(rescheduleAppointmentThunk({ appointmentId: appointment.id, updates: payload }));

    if (rescheduleAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to reschedule appointment."));
      return;
    }

    toast.showSuccess("Appointment rescheduled successfully.");
    onRescheduled(result.payload.appointment.id);
  };

  return (
    <View style={styles.rescheduleForm}>
      <View style={styles.rescheduleCurrent}>
        <Ionicons name="time-outline" size={18} color={Colors.appointmentTextSecondary} />
        <Text style={styles.rescheduleCurrentText}>
          Currently {formatBusinessDate(appointment.scheduledAt)} at {formatBusinessTime(appointment.scheduledAt ?? appointment.startTime)}
        </Text>
      </View>

      <View style={styles.appointmentCoreRow}>
        <View style={styles.appointmentCoreField}>
          <AppointmentDateField onChange={handleDateChange} value={date} />
        </View>
        <View style={styles.appointmentCoreField}>
          <TimeSlotSelector
            disabledReason={validateDate(date) ? null : "Select a date to view times."}
            loading={false}
            onSelect={(value) => {
              setStartTime(value);
              setError(null);
            }}
            selectedTime={startTime}
            slots={slots}
          />
        </View>
      </View>

      <DetailRow label="Duration" value={`${duration} min`} />
      <DetailRow label="Ends at" value={endTime ? minutesToDisplayTime(parseClockToMinutes(endTime) ?? 0) : null} />

      <TextField label="Notes" multiline onChangeText={setNotes} placeholder="Reason for rescheduling (optional)" value={notes} />

      {error ? (
        <View style={styles.inlineAlert}>
          <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
          <Text style={styles.inlineAlertText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.88}
        disabled={mutating}
        onPress={handleSubmit}
        style={[styles.primaryButton, mutating && styles.disabledButton]}
      >
        {mutating ? <ActivityIndicator color={Colors.onPrimary} /> : <Ionicons name="calendar-outline" size={18} color={Colors.onPrimary} />}
        <Text style={styles.primaryButtonText}>Reschedule Appointment</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Reschedule as a popup over the Appointment Details screen. */
export function RescheduleAppointmentModal({
  appointment,
  onClose,
  visible,
}: {
  appointment: AppointmentListItem;
  onClose: () => void;
  visible: boolean;
}) {
  const { Colors, styles } = useAppointmentStyles();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.stylistModalBackdrop}>
        <Pressable accessibilityLabel="Close reschedule" onPress={onClose} style={styles.rescheduleBackdropTap} />
        <View style={[styles.stylistModalCard, styles.rescheduleModalCard]}>
          <View style={styles.stylistModalHeader}>
            <Text style={styles.stylistModalTitle}>Reschedule</Text>
            <TouchableOpacity accessibilityLabel="Close" onPress={onClose}>
              <Ionicons name="close" size={26} color={Colors.appointmentMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Remount per open so the form starts from the booking's current slot. */}
            {visible ? <RescheduleAppointmentForm appointment={appointment} onRescheduled={onClose} /> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
