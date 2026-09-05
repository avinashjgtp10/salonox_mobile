import { CalendarPreview } from "@/features/appointments/components/calendar/CalendarPreview";
import { ReadOnlyBlockedTimesSummary } from "@/features/appointments/components/calendar/ReadOnlyBlockedTimesSummary";
import { StaffAvailabilitySummary } from "@/features/appointments/components/form/StaffAvailabilitySummary";
import { FilterBar } from "@/features/appointments/components/shared/FilterBar";
import { ScreenShell } from "@/features/appointments/components/shared/ScreenShell";
import { SkeletonList } from "@/features/appointments/components/shared/SkeletonList";
import { StateCard } from "@/features/appointments/components/shared/StateCard";
import { useAppointmentListFilters, useFetchAppointments } from "@/features/appointments/hooks/useAppointmentList";
import { getDateKey } from "@/features/appointments/utils/appointmentDateTime";
import { matchesAppointment } from "@/features/appointments/utils/appointmentList";
import { isAssignedToStaff } from "@/features/appointments/utils/staffAssignment";
import { fetchStaffAvailabilityThunk } from "@/middleware/staff/staffAvailability.thunk";
import { selectAppointments, selectAppointmentsError, selectAppointmentsIsLoading, selectAppointmentsRefreshing } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentStaff, selectCurrentStaffError, selectCurrentStaffLoading } from "@/store/staff/staff.slice";
import { selectStaffAvailability, selectStaffAvailabilityError, selectStaffAvailabilityLoading } from "@/store/staff/staffAvailability.slice";
import type { Href } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";

export function StaffCalendarScreen() {
  const appointments = useAppSelector(selectAppointments);
  const appointmentsError = useAppSelector(selectAppointmentsError);
  const appointmentsLoading = useAppSelector(selectAppointmentsIsLoading);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const { date, search, setDate, setSearch, setStatus, status } = useAppointmentListFilters();
  const { fetchAppointments } = useFetchAppointments();
  const dispatch = useAppDispatch();
  const currentStaffId = currentStaff?.id ?? "";
  const availability = useAppSelector((state) => selectStaffAvailability(state, currentStaffId, date));
  const availabilityLoading = useAppSelector((state) =>
    selectStaffAvailabilityLoading(state, currentStaffId, date),
  );
  const availabilityError = useAppSelector((state) =>
    selectStaffAvailabilityError(state, currentStaffId, date),
  );
  const loadCalendar = useCallback(
    (refresh = false) => {
      if (!currentStaffId) {
        return;
      }

      void fetchAppointments({ date, refresh, reset: !refresh, search, staffId: currentStaffId, status });
      void dispatch(fetchStaffAvailabilityThunk({ date, staffId: currentStaffId }));
    },
    [currentStaffId, date, dispatch, fetchAppointments, search, status],
  );

  useEffect(() => {
    loadCalendar(false);
  }, [loadCalendar]);

  const staffAppointments = useMemo(
    () =>
      currentStaff
        ? appointments
          .filter((appointment) => isAssignedToStaff(appointment, currentStaff))
          .filter((appointment) => getDateKey(appointment.scheduledAt) === date)
          .filter((appointment) => matchesAppointment(appointment, search, status))
        : [],
    [appointments, currentStaff, date, search, status],
  );
  const dateBlockedTimes = useMemo(
    () =>
      (availability?.blockedTimes ?? []).filter((blockedTime) =>
        [blockedTime.startAt, blockedTime.endAt].some((value) => value?.startsWith(date)),
      ),
    [availability?.blockedTimes, date],
  );
  const blockingError =
    currentStaffError ??
    (!currentStaffId && !currentStaffLoading ? "Staff profile is not available for this session." : null) ??
    appointmentsError;

  return (
    <ScreenShell
      backFallback={"/(staff)/home" as Href}
      onRefresh={() => loadCalendar(true)}
      refreshing={refreshing || availabilityLoading}
      safeAreaEdges={["top"]}
      showCreateAction={false}
      title="My Calendar"
    >
      <FilterBar
        date={date}
        onDateChange={setDate}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        search={search}
        status={status}
      />

      {currentStaffLoading || appointmentsLoading ? <SkeletonList /> : null}
      {!currentStaffLoading && !appointmentsLoading && blockingError ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={blockingError}
          onAction={() => loadCalendar(false)}
          title="Unable to load calendar"
          tone="error"
        />
      ) : null}
      {!blockingError ? (
        <>
          <StaffAvailabilitySummary
            availabilityLabel={availability?.availabilityLabel ?? currentStaff?.availabilityLabel ?? "-"}
            checkedInLabel={availability?.checkedInLabel ?? "-"}
            checkedOutLabel={availability?.checkedOutLabel ?? "-"}
            currentStatusLabel={availability?.currentStatusLabel ?? currentStaff?.status ?? "-"}
            error={availabilityError}
            hasStaff={Boolean(currentStaffId)}
            holidayLabel={availability?.holidayLabel ?? "-"}
            loading={availabilityLoading}
            onLeaveLabel={availability?.onLeaveLabel ?? "-"}
            shiftEndLabel={availability?.shiftEndLabel ?? "-"}
            shiftStartLabel={availability?.shiftStartLabel ?? "-"}
            workingHoursLabel={availability?.workingHoursLabel ?? currentStaff?.workingHours ?? "-"}
          />
          <ReadOnlyBlockedTimesSummary
            blockedTimes={dateBlockedTimes}
            error={availabilityError}
            loading={availabilityLoading}
            onRetry={() => loadCalendar(false)}
          />
          <CalendarPreview
            appointments={staffAppointments}
            date={date}
          />
        </>
      ) : null}
    </ScreenShell>
  );
}
