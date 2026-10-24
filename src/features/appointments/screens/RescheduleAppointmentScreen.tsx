import { RescheduleAppointmentForm } from "@/features/appointments/components/shared/RescheduleAppointmentForm";
import { ScreenShell } from "@/features/appointments/components/shared/ScreenShell";
import { SkeletonList } from "@/features/appointments/components/shared/SkeletonList";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { fetchAppointmentByIdThunk } from "@/middleware/appointment/appointment.thunk";
import { selectAppointmentById } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { Href } from "expo-router";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

// Deep-link fallback; Appointment Details opens the same form as a popup.
export function RescheduleAppointmentScreen() {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const appointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));

  useEffect(() => {
    if (appointmentId && !appointment) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointment, appointmentId, dispatch]);

  return (
    <ScreenShell showCreateAction={false} title="Reschedule">
      {appointment ? (
        <View style={styles.formCard}>
          <RescheduleAppointmentForm
            appointment={appointment}
            onRescheduled={(id) => router.replace(`/appointments/${id}` as Href)}
          />
        </View>
      ) : (
        <SkeletonList />
      )}
    </ScreenShell>
  );
}
