import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { AppointmentCard } from "@/features/appointments/components/shared/AppointmentCard";
import { AppointmentSnackbar } from "@/features/appointments/components/shared/AppointmentSnackbar";
import { FilterBar } from "@/features/appointments/components/shared/FilterBar";
import { SkeletonList } from "@/features/appointments/components/shared/SkeletonList";
import { StateCard } from "@/features/appointments/components/shared/StateCard";
import { SummaryTile } from "@/features/appointments/components/shared/SummaryTile";
import { useAppointmentListFilters, useFetchAppointments } from "@/features/appointments/hooks/useAppointmentList";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { getDateKey } from "@/features/appointments/utils/appointmentDateTime";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { matchesAppointment, sortWithActiveFirst } from "@/features/appointments/utils/appointmentList";
import { selectAppointments, selectAppointmentsError, selectAppointmentsIsLoading, selectAppointmentsLoadingMore, selectAppointmentsPagination, selectAppointmentsRefreshing } from "@/store/appointment/appointment.slice";
import { useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AppointmentDashboardScreen() {
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
  const { width } = useWindowDimensions();
  const tileWidth = width >= 720 ? "31%" : "48%";

  // Fetch the whole day once, unfiltered by status or search. Search and
  // status only ever narrow the already-loaded data client-side below (see
  // `filtered`) — the backend doesn't support text search at all (the
  // `search` query param is accepted but never read server-side), and
  // filtering by status server-side would mean re-fetching on every chip tap
  // (a visible reload) and would make it impossible to compute the summary
  // stats for every status at once. `limit: 200` matches the backend's own
  // max page size, so a single day's appointments are captured in one call.
  useEffect(() => {
    void fetchAppointments({ date, limit: 200, reset: true });
  }, [date, fetchAppointments]);

  const filtered = useMemo(
    () =>
      appointments
        .filter((appointment) => getDateKey(appointment.scheduledAt) === date)
        .filter((appointment) => matchesAppointment(appointment, search, status))
        .sort(sortWithActiveFirst),
    [appointments, date, search, status],
  );

  const counts = useMemo(
    () => ({
      cancelled: filtered.filter((appointment) => appointment.status === "Cancelled").length,
      completed: filtered.filter((appointment) => appointment.status === "Completed").length,
      missed: filtered.filter((appointment) => appointment.status === "Missed").length,
      revenue: filtered.reduce((total, appointment) => total + (appointment.total || appointment.amount), 0),
      today: filtered.length,
      upcoming: filtered.filter((appointment) =>
        ["Upcoming", "Confirmed", "Waiting", "Checked In", "In Service", "In Progress"].includes(
          appointment.status,
        ),
      ).length,
    }),
    [filtered],
  );

  // Top matches for the search dropdown — reuses the same client+status
  // -filtered `filtered` list (no separate request), capped for a compact
  // suggestion panel.
  const searchDropdownResults = useMemo(() => filtered.slice(0, 8), [filtered]);

  const handleSelectSearchResult = useCallback(
    (appointment: AppointmentListItem) => {
      setSearch("");
      router.push(`/appointments/${appointment.id}` as Href);
    },
    [setSearch],
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/dashboard" as Href);
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.headerRow}>
        <TouchableOpacity activeOpacity={0.8} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.iconButton} />
      </View>

      <FilterBar
        date={date}
        onDateChange={setDate}
        onSearchChange={setSearch}
        onSelectSearchResult={handleSelectSearchResult}
        onStatusChange={setStatus}
        search={search}
        searchResults={searchDropdownResults}
        status={status}
      />

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryTileWrap, { width: tileWidth }]}>
          <SummaryTile icon="today-outline" label="Today" value={String(counts.today)} />
        </View>
        <View style={[styles.summaryTileWrap, { width: tileWidth }]}>
          <SummaryTile icon="arrow-up-circle-outline" label="Upcoming" value={String(counts.upcoming)} />
        </View>
        <View style={[styles.summaryTileWrap, { width: tileWidth }]}>
          <SummaryTile icon="checkmark-done-outline" label="Completed" value={String(counts.completed)} />
        </View>
        <View style={[styles.summaryTileWrap, { width: tileWidth }]}>
          <SummaryTile icon="close-circle-outline" label="Cancelled" value={String(counts.cancelled)} />
        </View>
        <View style={[styles.summaryTileWrap, { width: tileWidth }]}>
          <SummaryTile icon="alert-circle-outline" label="Missed" value={String(counts.missed)} />
        </View>
        <View style={[styles.summaryTileWrap, { width: tileWidth }]}>
          <SummaryTile icon="cash-outline" label="Revenue" value={formatCurrency(counts.revenue)} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today&apos;s appointments</Text>
        <TouchableOpacity onPress={() => router.push("/bookings/list" as Href)}>
          <Text style={styles.linkText}>View all</Text>
        </TouchableOpacity>
      </View>

      {loading ? <SkeletonList /> : null}
      {!loading && error ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={error}
          onAction={() => void fetchAppointments({ date, limit: 200, reset: true })}
          title="Unable to load appointments"
          tone="error"
        />
      ) : null}
      {!loading && !error && filtered.length === 0 ? (
        <StateCard
          icon="calendar-clear-outline"
          message="No appointments match this date, search, or filter."
          title="No appointments found"
        />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={styles.flatListContent}
        data={loading || error ? [] : filtered}
        keyExtractor={(item) => item.id}
        ListFooterComponent={
          <View>
            {loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : null}
            {filtered.length > 0 ? (
              <PaginationControls
                currentPage={pagination.page}
                hasNextPage={pagination.hasMore}
                hasPreviousPage={false}
                loading={loadingMore}
                onNext={pagination.hasMore ? () => void fetchNext({ date }) : undefined}
                totalItems={pagination.totalCount}
                totalPages={Math.max(1, pagination.totalPages ?? 1)}
                visibleItems={filtered.length}
              />
            ) : null}
          </View>
        }
        ListHeaderComponent={listHeader}
        onEndReached={() => void fetchNext({ date })}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={() => void fetchAppointments({ date, limit: 200, refresh: true })}
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
