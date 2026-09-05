import { TextField } from "@/features/appointments/components/form/TextField";
import { ScreenShell } from "@/features/appointments/components/shared/ScreenShell";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { addMinutesToTime, combineDateTime, toInputDate, toInputTime, validateDate, validateTime } from "@/features/appointments/utils/appointmentDateTime";
import { getRejectedMessage } from "@/features/appointments/utils/appointmentScreenHelpers";
import { useAppToast } from "@/hooks/useAppToast";
import { fetchAppointmentByIdThunk, rescheduleAppointmentThunk } from "@/middleware/appointment/appointment.thunk";
import { selectAppointmentById, selectAppointmentMutating } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { RescheduleAppointmentRequest } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export function RescheduleAppointmentScreen() {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const appointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const mutating = useAppSelector(selectAppointmentMutating);
  const [date, setDate] = useState(toInputDate(appointment?.scheduledAt ?? null));
  const [startTime, setStartTime] = useState(toInputTime(appointment?.startTime ?? appointment?.scheduledAt ?? null));
  const [duration, setDuration] = useState(appointment?.durationMinutes ? String(appointment.durationMinutes) : "");
  const [endTime, setEndTime] = useState(toInputTime(appointment?.endTime ?? null));
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointmentId && !appointment) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointment, appointmentId, dispatch]);

  useEffect(() => {
    const durationNumber = Number(duration);

    if (validateDate(date) && validateTime(startTime) && Number.isFinite(durationNumber) && durationNumber > 0) {
      setEndTime(addMinutesToTime(date, startTime, durationNumber));
    }
  }, [date, duration, startTime]);

  const handleSubmit = async () => {
    if (!appointmentId) {
      setError("Appointment ID is missing.");
      return;
    }

    if (!validateDate(date) || !validateTime(startTime) || !validateTime(endTime)) {
      setError("Use a valid date and HH:mm times.");
      return;
    }

    const durationNumber = Number(duration);

    if (!Number.isFinite(durationNumber) || durationNumber <= 0) {
      setError("Duration must be greater than 0.");
      return;
    }

    const payload: RescheduleAppointmentRequest = {
      duration: durationNumber,
      end_time: combineDateTime(date, endTime),
      notes: notes.trim() || undefined,
      scheduled_at: combineDateTime(date, startTime),
      start_time: combineDateTime(date, startTime),
    };
    const result = await dispatch(rescheduleAppointmentThunk({ appointmentId, updates: payload }));

    if (rescheduleAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to reschedule appointment."));
      return;
    }

    toast.showSuccess("Appointment rescheduled successfully.");
    router.replace(`/appointments/${result.payload.appointment.id}` as Href);
  };

  return (
    <ScreenShell title="Reschedule">
      <View style={styles.formCard}>
        <TextField error={error ?? undefined} label="Date" onChangeText={setDate} placeholder="YYYY-MM-DD" value={date} />
        <TextField label="Start Time" onChangeText={setStartTime} placeholder="HH:mm" value={startTime} />
        <TextField keyboardType="numeric" label="Duration" onChangeText={setDuration} placeholder="Minutes" value={duration} />
        <TextField label="End Time" onChangeText={setEndTime} placeholder="HH:mm" value={endTime} />
        <TextField label="Notes" multiline onChangeText={setNotes} placeholder="Reschedule notes" value={notes} />
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={mutating}
          onPress={handleSubmit}
          style={[styles.primaryButton, mutating && styles.disabledButton]}
        >
          {mutating ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
          <Text style={styles.primaryButtonText}>Reschedule Appointment</Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}
