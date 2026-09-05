import { AppointmentCard } from "@/features/appointments/components/shared/AppointmentCard";
import { ScreenShell } from "@/features/appointments/components/shared/ScreenShell";
import { SkeletonList } from "@/features/appointments/components/shared/SkeletonList";
import { StateCard } from "@/features/appointments/components/shared/StateCard";
import { fetchAppointmentHistoryThunk } from "@/middleware/appointment/appointment.thunk";
import { selectAppointmentById, selectAppointmentHistory, selectAppointmentHistoryError, selectAppointmentHistoryLoading } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export function AppointmentHistoryScreen() {
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const appointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const history = useAppSelector(selectAppointmentHistory);
  const loading = useAppSelector(selectAppointmentHistoryLoading);
  const error = useAppSelector(selectAppointmentHistoryError);

  useEffect(() => {
    void dispatch(fetchAppointmentHistoryThunk(appointment?.clientId));
  }, [appointment?.clientId, dispatch]);

  return (
    <ScreenShell
      onRefresh={() => void dispatch(fetchAppointmentHistoryThunk(appointment?.clientId))}
      refreshing={loading}
      title="Appointment History"
    >
      {loading ? <SkeletonList /> : null}
      {!loading && error ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={error}
          onAction={() => void dispatch(fetchAppointmentHistoryThunk(appointment?.clientId))}
          title="Unable to load history"
          tone="error"
        />
      ) : null}
      {!loading && !error && history.length === 0 ? (
        <StateCard
          icon="time-outline"
          message="No appointment history was returned by the API."
          title="No history"
        />
      ) : null}
      {!loading && !error && history.map((item) => (
        <AppointmentCard appointment={item} key={item.id} />
      ))}
    </ScreenShell>
  );
}
