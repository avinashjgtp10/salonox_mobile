import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { AppointmentCard } from "@/features/appointments/components/shared/AppointmentCard";
import { AppointmentSnackbar } from "@/features/appointments/components/shared/AppointmentSnackbar";
import { FilterBar } from "@/features/appointments/components/shared/FilterBar";
import { SkeletonList } from "@/features/appointments/components/shared/SkeletonList";
import { StateCard } from "@/features/appointments/components/shared/StateCard";
import { useAppointmentListFilters, useFetchAppointments } from "@/features/appointments/hooks/useAppointmentList";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { matchesAppointment, sortWithActiveFirst } from "@/features/appointments/utils/appointmentList";
import { selectAppointments, selectAppointmentsError, selectAppointmentsIsLoading, selectAppointmentsLoadingMore, selectAppointmentsPagination, selectAppointmentsRefreshing } from "@/store/appointment/appointment.slice";
import { useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AppointmentListScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const appointments = useAppSelector(selectAppointments);
  const error = useAppSelector(selectAppointmentsError);
  const loading = useAppSelector(selectAppointmentsIsLoading);
  const loadingMore = useAppSelector(selectAppointmentsLoadingMore);
  const pagination = useAppSelector(selectAppointmentsPagination);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const { date, search, setDate, setSearch, setStatus, status } = useAppointmentListFilters();
  const { fetchAppointments, fetchNext } = useFetchAppointments();

  useEffect(() => {
    void fetchAppointments({ date, reset: true, search, status });
  }, [date, fetchAppointments, search, status]);

  const filtered = useMemo(
    () =>
      appointments
        .filter((appointment) => matchesAppointment(appointment, search, status))
        .sort(sortWithActiveFirst),
    [appointments, search, status],
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                hitSlop={12}
                onPress={() => router.replace("/bookings" as Href)}
                style={styles.iconButton}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Appointment List</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/bookings/new" as Href)}
                style={styles.iconButton}
              >
                <Ionicons name="add" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <FilterBar
              date={date}
              onDateChange={setDate}
              onSearchChange={setSearch}
              onStatusChange={setStatus}
              search={search}
              status={status}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList />
          ) : error ? (
            <StateCard
              actionLabel="Retry"
              icon="cloud-offline-outline"
              message={error}
              onAction={() => void fetchAppointments({ date, reset: true, search, status })}
              title="Unable to load appointments"
              tone="error"
            />
          ) : (
            <StateCard
              icon="calendar-number-outline"
              message="There are no appointments for the selected filters."
              title="No appointments"
            />
          )
        }
        ListFooterComponent={
          filtered.length > 0 ? (
            <PaginationControls
              currentPage={pagination.page}
              hasNextPage={pagination.hasMore}
              hasPreviousPage={false}
              loading={loadingMore}
              onNext={pagination.hasMore ? () => void fetchNext({ date, search, status }) : undefined}
              totalItems={pagination.totalCount}
              totalPages={Math.max(1, pagination.totalPages ?? 1)}
              visibleItems={filtered.length}
            />
          ) : null
        }
        contentContainerStyle={styles.flatListContent}
        data={loading ? [] : filtered}
        keyExtractor={(item) => item.id}
        onEndReached={() => void fetchNext({ date, search, status })}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={() => void fetchAppointments({ date, refresh: true, search, status })}
            refreshing={refreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => <AppointmentCard appointment={item} />}
        showsVerticalScrollIndicator={false}
      />
      <AppointmentSnackbar />
    </SafeAreaView>
  );
}

export { StaffMyAppointmentsScreen } from "./StaffMyAppointmentsScreen";
