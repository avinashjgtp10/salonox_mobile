import { useRegionalPreferences } from "@/localization/preferences";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlGradients, pearlType } from "@/components/auth/pearl/tokens";
import { Icon } from "@/components/pearl/Icon";
import { IconButton, StatTile } from "@/components/pearl/ui";
import { LinearGradient } from "expo-linear-gradient";
import { formatAppDate } from "@/utils/dateTime";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { Text } from "@/components/ui/AppTypography";
import { TourView, TourFlatList, withScreenTour } from "@/features/userGuide/DashboardTour";
import { screenTours } from "@/features/userGuide/screenTours";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { BookingListRow } from "@/features/appointments/components/shared/BookingListRow";
import { BookingDetailsSheet } from "@/features/appointments/components/shared/BookingDetailsSheet";
import { AppointmentSnackbar } from "@/features/appointments/components/shared/AppointmentSnackbar";
import { SkeletonList } from "@/features/appointments/components/shared/SkeletonList";
import { StateCard } from "@/features/appointments/components/shared/StateCard";
import { useAppointmentListFilters, useFetchAppointments } from "@/features/appointments/hooks/useAppointmentList";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { getDateKey } from "@/features/appointments/utils/appointmentDateTime";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { matchesAppointment, sortWithActiveFirst } from "@/features/appointments/utils/appointmentList";
import { selectAppointments, selectAppointmentsError, selectAppointmentsIsLoading, selectAppointmentsLoadingMore, selectAppointmentsPagination, selectAppointmentsRefreshing } from "@/store/appointment/appointment.slice";
import { useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentStatus } from "@/types/appointment";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, RefreshControl, TouchableOpacity, ScrollView, StyleSheet, View } from "react-native";
import { LunoxSheet } from "@/components/lunox/LunoxSheet";
import { SafeAreaView } from "react-native-safe-area-context";

function AppointmentDashboardScreenContent() {
  "use no memo";
  useRegionalPreferences();
  const Colors = useThemeColors();
  const [lunoxOpen, setLunoxOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const appointments = useAppSelector(selectAppointments);
  const error = useAppSelector(selectAppointmentsError);
  const loading = useAppSelector(selectAppointmentsIsLoading);
  const loadingMore = useAppSelector(selectAppointmentsLoadingMore);
  const pagination = useAppSelector(selectAppointmentsPagination);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const { date, search, setStatus, status } = useAppointmentListFilters();
  const { fetchAppointments, fetchNext } = useFetchAppointments();

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

  const summaryAppointments = useMemo(() => appointments.filter(item => getDateKey(item.scheduledAt) === date), [appointments, date]);
  const counts = useMemo(
    () => ({
      cancelled: summaryAppointments.filter((appointment) => appointment.status === "Cancelled").length,
      completed: summaryAppointments.filter((appointment) => appointment.status === "Completed").length,
      missed: summaryAppointments.filter((appointment) => appointment.status === "No Show").length,
      // Money actually received, like the dashboard's revenue cards — not the
      // bill total, which also counted cancelled, missed and unpaid bookings.
      revenue: summaryAppointments
        .filter((appointment) => !["Cancelled", "No Show", "Deleted"].includes(appointment.status))
        .reduce((total, appointment) => total + Math.max(0, appointment.paidAmount), 0),
      today: summaryAppointments.length,
      upcoming: summaryAppointments.filter((appointment) =>
        ["Upcoming", "Confirmed", "Waiting", "Checked In", "In Service", "In Progress"].includes(
          appointment.status,
        ),
      ).length,
    }),
    [summaryAppointments],
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
      <View style={ui.header}>
        <IconButton icon="chevronLeft" label="Back" onPress={handleBack} />
        <View style={{ flex: 1 }}><Text translate style={pearlType.h2}>Appointments</Text><Text style={pearlType.small}>{formatAppDate(`${date}T00:00:00`)}</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Lunox AI" onPress={() => setLunoxOpen(true)}>
          <LinearGradient colors={["#CFCBE8", "#C9B5EC", "#BCD6E8", "#A7A2D0"]} style={{ width: 36, height: 36, borderRadius: 18, padding: 3 }}>
            <View style={{ flex: 1, borderRadius: 15, backgroundColor: "#FAF9FC", alignItems: "center", justifyContent: "center" }}><Image source={require("../../../../assets/images/brand/lunox-mark.png")} style={{ width: 23, height: 23 }} resizeMode="contain" /></View>
          </LinearGradient>
        </TouchableOpacity>
        <IconButton icon="calendar" label="Day view" onPress={() => router.push("/(tabs)/calendar")} />
      </View>
      <TourView tourId="summary" style={ui.stats}>
        <StatTile icon="calendar" tone="rose" label="Today" value={String(counts.today)} style={ui.stat} />
        <StatTile icon="clock" tone="lilac" label="Upcoming" value={String(counts.upcoming)} style={ui.stat} />
        <StatTile icon="check" tone="peach" label="Done" value={String(counts.completed)} style={ui.stat} />
      </TourView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ui.tabs} contentContainerStyle={{ padding: 4, gap: 4 }}>
        {([
          ["All", "Today", counts.today], ["Upcoming", "Upcoming", counts.upcoming],
          ["Completed", "Done", counts.completed], ["Cancelled", "Cancelled", counts.cancelled], ["No Show", "No-show", counts.missed],
        ] as const).map(([value, label, count]) => <TouchableOpacity key={value} onPress={() => setStatus(value as "All" | AppointmentStatus)} accessibilityRole="tab" accessibilityState={{ selected: status === value }} style={[ui.tab, status === value && ui.tabOn]}><Text style={[ui.tabText, status === value && { color: pearl.accentDeep }]}>{label} {count}</Text></TouchableOpacity>)}
      </ScrollView>
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
          message={status !== "All" || search.trim()
            ? "Try a different search or filter."
            : "Tap New booking to schedule an appointment."}
          title={status !== "All" || search.trim() ? "No matching appointments" : "No appointments yet"}
        />
      ) : null}
    </View>
  );

  return (
    <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
      <AppStatusBar />
      <RefreshViewport><TourFlatList
        contentContainerStyle={ui.content}
        data={loading || error ? [] : filtered}
        keyExtractor={(item) => item.id}
        ListFooterComponent={
          <View>
            <TouchableOpacity style={ui.revenue} onPress={() => router.push("/today-revenue" as Href)}><Text style={ui.revenueText}>Revenue today {formatCurrency(counts.revenue)}</Text></TouchableOpacity>
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
        renderItem={({ item, index }) => <BookingListRow appointment={item} first={index === 0} last={index === filtered.length - 1} onPress={() => setPreviewId(item.id)} />}
        showsVerticalScrollIndicator={false}
      /></RefreshViewport>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/bookings/new" as Href)} style={ui.fab}><LinearGradient colors={pearlGradients.primary} style={ui.fabInner}><Icon name="plus" size={20} color="#fff" /><Text translate style={ui.fabText}>New booking</Text></LinearGradient></TouchableOpacity>
      <AppointmentSnackbar />
      <BookingDetailsSheet appointment={appointments.find(item => item.id === previewId) ?? null} onClose={() => setPreviewId(null)} />
      <LunoxSheet visible={lunoxOpen} onClose={() => setLunoxOpen(false)} />
    </SafeAreaView></PearlBackground>
  );
}

export const AppointmentDashboardScreen = withScreenTour(AppointmentDashboardScreenContent, screenTours.bookings);

const ui = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  stats: { flexDirection: "row", gap: 10, marginVertical: 14 }, stat: { flex: 1 },
  tabs: { borderRadius: 16, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, marginBottom: 14 },
  tab: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12 }, tabOn: { backgroundColor: "rgba(255,255,255,0.85)" },
  tabText: { fontSize: 13, fontWeight: "600", color: pearl.muted },
  revenue: { marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, alignItems: "center" },
  revenueText: { fontSize: 14, fontWeight: "700", color: pearl.ink },
  fab: { position: "absolute", right: 18, bottom: 42, borderRadius: 18, overflow: "hidden" },
  fabInner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, minHeight: 50 }, fabText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
