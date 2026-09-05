import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { AppointmentCard } from "@/features/appointments/components/shared/AppointmentCard";
import { AppointmentSnackbar } from "@/features/appointments/components/shared/AppointmentSnackbar";
import { SkeletonList } from "@/features/appointments/components/shared/SkeletonList";
import { StateCard } from "@/features/appointments/components/shared/StateCard";
import { SummaryTile } from "@/features/appointments/components/shared/SummaryTile";
import { useFetchAppointments } from "@/features/appointments/hooks/useAppointmentList";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/features/appointments/utils/appointmentList";
import { getResponsiveHeaderTitleSize, getResponsiveHorizontalPadding, getResponsiveTopPadding } from "@/features/appointments/utils/appointmentScreenHelpers";
import { buildStaffAppointmentRows, isSameDay } from "@/features/appointments/utils/staffAppointmentRows";
import { isAssignedToStaff } from "@/features/appointments/utils/staffAssignment";
import { selectAppointments, selectAppointmentsError, selectAppointmentsIsLoading, selectAppointmentsLoadingMore, selectAppointmentsPagination, selectAppointmentsRefreshing } from "@/store/appointment/appointment.slice";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff, selectCurrentStaffError, selectCurrentStaffLoading } from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { FlatList, RefreshControl, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function StaffMyAppointmentsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { width } = useWindowDimensions();
  const flatListContentStyle = useMemo(
    () => [
      styles.flatListContent,
      {
        paddingHorizontal: getResponsiveHorizontalPadding(width),
        paddingTop: getResponsiveTopPadding(width),
      },
    ],
    [styles.flatListContent, width],
  );
  const headerTitleStyle = useMemo(
    () => ({ fontSize: getResponsiveHeaderTitleSize(width) }),
    [width],
  );
  const appointments = useAppSelector(selectAppointments);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const error = useAppSelector(selectAppointmentsError);
  const loading = useAppSelector(selectAppointmentsIsLoading);
  const loadingMore = useAppSelector(selectAppointmentsLoadingMore);
  const pagination = useAppSelector(selectAppointmentsPagination);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const { fetchAppointments, fetchNext } = useFetchAppointments();
  const today = todayIsoDate();
  const currentStaffId = currentStaff?.id ?? "";

  useEffect(() => {
    if (!currentStaffId) {
      return;
    }

    void fetchAppointments({ reset: true, staffId: currentStaffId });
  }, [currentStaffId, fetchAppointments]);

  const staffAppointments = useMemo(
    () => (currentStaff ? appointments.filter((appointment) => isAssignedToStaff(appointment, currentStaff)) : []),
    [appointments, currentStaff],
  );
  const rows = useMemo(() => buildStaffAppointmentRows(staffAppointments, today), [staffAppointments, today]);
  const counts = useMemo(
    () => ({
      cancelled: staffAppointments.filter((appointment) => appointment.status === "Cancelled").length,
      completed: staffAppointments.filter((appointment) => appointment.status === "Completed").length,
      today: staffAppointments.filter((appointment) => isSameDay(appointment, today)).length,
      upcoming: staffAppointments.filter((appointment) => ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)).length,
    }),
    [staffAppointments, today],
  );
  const blockingError =
    currentStaffError ??
    (!currentStaffId && !currentStaffLoading ? "Staff profile is not available for this session." : null) ??
    error;
  const isInitialLoading = currentStaffLoading || loading;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.headerTitle, headerTitleStyle]}>My Appointments</Text>
              </View>
            </View>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryTileWrap, { width: "48%" }]}>
                <SummaryTile icon="today-outline" label="Today" value={String(counts.today)} />
              </View>
              <View style={[styles.summaryTileWrap, { width: "48%" }]}>
                <SummaryTile icon="arrow-up-circle-outline" label="Upcoming" value={String(counts.upcoming)} />
              </View>
              <View style={[styles.summaryTileWrap, { width: "48%" }]}>
                <SummaryTile icon="checkmark-done-outline" label="Completed" value={String(counts.completed)} />
              </View>
              <View style={[styles.summaryTileWrap, { width: "48%" }]}>
                <SummaryTile icon="close-circle-outline" label="Cancelled" value={String(counts.cancelled)} />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <SkeletonList />
          ) : blockingError ? (
            <StateCard
              actionLabel="Retry"
              icon="cloud-offline-outline"
              message={blockingError}
              onAction={() => currentStaffId && void fetchAppointments({ reset: true, staffId: currentStaffId })}
              title="Unable to load appointments"
              tone="error"
            />
          ) : (
            <StateCard
              icon="calendar-clear-outline"
              message="No appointments are currently assigned to you."
              title="No appointments"
            />
          )
        }
        ListFooterComponent={
          rows.length > 0 ? (
            <PaginationControls
              currentPage={pagination.page}
              hasNextPage={pagination.hasMore}
              hasPreviousPage={false}
              loading={loadingMore}
              onNext={pagination.hasMore ? () => currentStaffId && void fetchNext({ staffId: currentStaffId }) : undefined}
              totalItems={pagination.totalCount}
              totalPages={Math.max(1, pagination.totalPages ?? 1)}
              visibleItems={staffAppointments.length}
            />
          ) : null
        }
        contentContainerStyle={flatListContentStyle}
        data={isInitialLoading || blockingError ? [] : rows}
        keyExtractor={(item) => item.id}
        onEndReached={() => currentStaffId && void fetchNext({ staffId: currentStaffId })}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={() => currentStaffId && void fetchAppointments({ refresh: true, staffId: currentStaffId })}
            refreshing={refreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) =>
          item.type === "section" ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
            </View>
          ) : (
            <AppointmentCard
              appointment={item.appointment}
              detailRoute={(appointmentId) => `/(staff)/appointment-details/${appointmentId}` as Href}
              showPaymentStatus
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />
      <AppointmentSnackbar />
    </SafeAreaView>
  );
}
