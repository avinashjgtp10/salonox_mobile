import { useFooterClearance } from "@/hooks/useFooterClearance";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { TourButton, TourView, withScreenTour } from "@/features/userGuide/DashboardTour";
import { screenTours } from "@/features/userGuide/screenTours";
import { CalendarPreview } from "@/features/appointments/components/calendar/CalendarPreview";
import { CalendarStaffGate } from "@/features/appointments/components/calendar/CalendarStaffGate";
import { CalendarStatusFilter } from "@/features/appointments/components/calendar/CalendarStatusFilter";
import { ScreenShell } from "@/features/appointments/components/shared/ScreenShell";
import { useAllStaffMembers } from "@/features/appointments/hooks/useAllStaffMembers";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { useAppointmentListFilters, useFetchAppointments } from "@/features/appointments/hooks/useAppointmentList";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { getDateKey, todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { buildCalendarStaffOptions, buildCanonicalStaffIdByAlias, buildFallbackStaffIdByName, resolveAppointmentStaffId, SYNTHETIC_STAFF_ID_PREFIX } from "@/features/appointments/utils/calendarStaff";
import { matchesCalendarStatuses } from "@/features/appointments/utils/calendarStatusFilters";
import { useStaffPresence } from "@/features/attendance/hooks/useStaffPresence";
import { calendarColumnStaff, staffIdsWithBookingsOn } from "@/features/attendance/utils/staffPresence";
import { selectAppointments, selectAppointmentsRefreshing, selectAppointmentsIsLoading, selectAppointmentsError } from "@/store/appointment/appointment.slice";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff, selectCurrentStaffError, selectStaffMembers } from "@/store/staff/staff.slice";
import { isAssignedToStaff } from "@/features/appointments/utils/staffAssignment";
import { StateCard } from "@/features/appointments/components/shared/StateCard";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem, AppointmentStatus } from "@/types/appointment";
import { formatAppDate } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from "react-native";

function AppointmentCalendarScreenContent() {
  return <CalendarStaffGate><AppointmentCalendarContent /></CalendarStaffGate>;
}

export function AppointmentCalendarContent({ staffMode = false, staffQuickSale = false }: {
  staffMode?: boolean;
  // Staff only: owner's Calendar & Quick Sale switch — lets an empty slot open Quick Sale.
  staffQuickSale?: boolean;
}) {
  const Colors = useThemeColors();
  const footerClearance = useFooterClearance();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const allAppointments = useAppSelector(selectAppointments);
  const allStaffMembers = useAppSelector(selectStaffMembers);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  // Staff without the owner's Calendar & Quick Sale switch see only their own
  // column; with it they see the whole salon, like the owner.
  const ownOnly = staffMode && !staffQuickSale;
  const appointments = useMemo(() => ownOnly
    ? allAppointments.filter(item => Boolean(currentStaff && isAssignedToStaff(item, currentStaff)))
    : allAppointments, [allAppointments, currentStaff, ownOnly]);
  const staffMembers = useMemo(() => ownOnly ? (currentStaff ? [currentStaff] : []) : allStaffMembers,
    [allStaffMembers, currentStaff, ownOnly]);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const loading = useAppSelector(selectAppointmentsIsLoading);
  const error = useAppSelector(selectAppointmentsError);
  const { date, search, setDate, setSearch } = useAppointmentListFilters();
  const debouncedSearch = useDebouncedValue(search, 350);
  const [selectedStatuses, setSelectedStatuses] = useState<AppointmentStatus[]>([]);
  const status = "All" as const;
  const { fetchAppointments } = useFetchAppointments();
  useAllStaffMembers(!ownOnly);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarSearchOpen, setCalendarSearchOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"week" | "day" | "list">("day");
  const [viewMenuVisible, setViewMenuVisible] = useState(false);
  const [staffFilterVisible, setStaffFilterVisible] = useState(false);
  const canonicalStaffIdByAlias = useMemo(
    () => buildCanonicalStaffIdByAlias(staffMembers, appointments),
    [appointments, staffMembers],
  );
  const staffOptions = useMemo(
    () => buildCalendarStaffOptions(staffMembers, appointments, canonicalStaffIdByAlias),
    [appointments, canonicalStaffIdByAlias, staffMembers],
  );
  const fallbackStaffIdByName = useMemo(
    () => buildFallbackStaffIdByName(staffOptions),
    [staffOptions],
  );
  const resolveStaffId = useCallback(
    (appointment: AppointmentListItem) => resolveAppointmentStaffId(
      appointment,
      fallbackStaffIdByName,
      canonicalStaffIdByAlias,
    ),
    [canonicalStaffIdByAlias, fallbackStaffIdByName],
  );
  // Attendance "show only checked-in staff" (as on the web): today, staff who
  // haven't checked in drop out of the columns and the Staff filter, unless
  // they have a booking that day. A staff member's own calendar is never filtered.
  const { presence: staffPresence, refresh: refreshStaffPresence } = useStaffPresence(!ownOnly);
  const presentStaffOptions = useMemo(
    () => calendarColumnStaff(
      staffOptions,
      staffPresence,
      date,
      staffIdsWithBookingsOn(appointments, date, resolveStaffId, canonicalStaffIdByAlias),
    ),
    [appointments, canonicalStaffIdByAlias, date, resolveStaffId, staffOptions, staffPresence],
  );
  // The appointments API ignores `search`, so the calendar filters the day or
  // week it already loaded: client, phone (digits match any formatting),
  // service, staff and title. While searching, Day view shows only the staff
  // columns that have a match (see staffColumns below).
  const searchTerm = debouncedSearch.trim().toLowerCase();
  const searchDigits = searchTerm.replace(/\D/g, "");
  const visibleAppointments = useMemo(
    () => appointments.filter((item) => {
      const matchesStaff = selectedStaffIds.length === 0 || selectedStaffIds.includes(resolveStaffId(item));
      const matchesStatus = matchesCalendarStatuses(item.status, selectedStatuses);
      const matchesSearch = !searchTerm
        || [item.clientName, item.serviceName, item.staffName, item.title, item.phone]
          .some((value) => (value ?? "").toLowerCase().includes(searchTerm))
        || (searchDigits.length >= 3 && (item.phone ?? "").replace(/\D/g, "").includes(searchDigits));

      return matchesStaff && matchesStatus && matchesSearch;
    }),
    [appointments, resolveStaffId, searchDigits, searchTerm, selectedStaffIds, selectedStatuses],
  );
  const selectedStaffLabel = selectedStaffIds.length === 0
    ? "All Staff"
    : selectedStaffIds.length === 1
      ? staffOptions.find((option) => option.id === selectedStaffIds[0])?.label ?? "1 Staff"
      : `${selectedStaffIds.length} Staff`;
  const rangeEnd = useMemo(() => { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + (viewMode === "week" ? 6 : 0)); return value; }, [date, viewMode]);
  const rangeEndKey = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, "0")}-${String(rangeEnd.getDate()).padStart(2, "0")}`;
  const selectedStaffId = ownOnly ? currentStaff?.id : selectedStaffIds.length === 1 && !selectedStaffIds[0].startsWith(SYNTHETIC_STAFF_ID_PREFIX)
    ? selectedStaffIds[0]
    : undefined;
  const changeDate = (amount: number) => { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + amount); setDate(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`); };
  const toggleStaffFilter = (staffId: string) => {
    if (!staffId) {
      setSelectedStaffIds([]);
      return;
    }

    setSelectedStaffIds((current) =>
      current.includes(staffId) ? current.filter((value) => value !== staffId) : [...current, staffId],
    );
  };

  const salonWide = staffMode && staffQuickSale;

  useEffect(() => {
    if (ownOnly && !currentStaff?.id) return;
    void fetchAppointments(viewMode === "week"
      ? { fromDate: date, limit: 200, reset: true, salonWide, search: "", staffId: selectedStaffId, status, toDate: rangeEndKey }
      : { date, limit: 200, reset: true, salonWide, search: "", staffId: selectedStaffId, status });
  }, [date, fetchAppointments, rangeEndKey, selectedStaffId, status, viewMode, ownOnly, salonWide, currentStaff?.id]);

  const refreshAppointments = useCallback(() => {
    void refreshStaffPresence(true);
    if (ownOnly && !currentStaff?.id) return;
    void fetchAppointments(viewMode === "week"
      ? { fromDate: date, limit: 200, refresh: true, salonWide, search: "", staffId: selectedStaffId, status, toDate: rangeEndKey }
      : { date, limit: 200, refresh: true, salonWide, search: "", staffId: selectedStaffId, status });
  }, [date, fetchAppointments, rangeEndKey, selectedStaffId, status, viewMode, ownOnly, salonWide, currentStaff?.id, refreshStaffPresence]);
  // The staff Calendar tab stays mounted while Quick Sale and its receipt
  // screens are open, so reload when staff come back to it: a bill saved as
  // pending (or just paid) then shows its current state.
  const refreshAppointmentsRef = useRef(refreshAppointments);
  refreshAppointmentsRef.current = refreshAppointments;
  const hasFocusedRef = useRef(false);
  useFocusEffect(useCallback(() => {
    if (staffMode && hasFocusedRef.current) refreshAppointmentsRef.current();
    hasFocusedRef.current = true;
  }, [staffMode]));
  const dayMatches = useMemo(
    () => visibleAppointments.filter((item) => getDateKey(item.scheduledAt) === date),
    [date, visibleAppointments],
  );
  const staffColumns = useMemo(() => {
    const columns = selectedStaffIds.length ? presentStaffOptions.filter((option) => selectedStaffIds.includes(option.id)) : presentStaffOptions;
    if (!searchTerm || viewMode !== "day") return columns;
    // A match in a far-right column was off screen, so the search looked like
    // it did nothing; keep just the columns with a match on the day shown (the
    // store can also hold other days' appointments, e.g. ones refetched by id).
    const matchedStaffIds = new Set(dayMatches.map(resolveStaffId));
    return columns.filter((option) => matchedStaffIds.has(option.id));
  }, [dayMatches, presentStaffOptions, resolveStaffId, searchTerm, selectedStaffIds, viewMode]);
  const emptyTitle = searchTerm && (viewMode === "day" ? dayMatches : visibleAppointments).length === 0
    ? `No appointments match "${debouncedSearch.trim()}"`
    : undefined;

  return (
    <ScreenShell
      onRefresh={refreshAppointments}
      refreshing={refreshing}
      hideHeader
      contentBottomPadding={viewMode === "list" ? footerClearance : 0}
      safeAreaEdges={['top']}
      scrollable={viewMode === "list"}
      title="Calendar"
      topSurfaceColor={Colors.appointmentSurface}
    >
      <View style={styles.dinggToolbar}>
        <View style={styles.calendarHeadingRow}>
          <Text accessibilityRole="header" style={styles.calendarHeading}>Calendar</Text>
          <TourButton tourId="view" accessibilityLabel="Change calendar view" onPress={() => setViewMenuVisible(true)} style={styles.calendarViewButton}>
            <Text style={styles.dinggTodayText}>{viewMode === "day" ? "Day" : viewMode === "week" ? "Week" : "List"}</Text>
            <Ionicons name="chevron-down" size={14} color={Colors.appointmentTextSecondary} />
          </TourButton>
        </View>
        <View style={styles.dinggToolbarActions}>
          <TouchableOpacity onPress={() => setDate(todayIsoDate())} style={styles.dinggTodayButton}><Text style={styles.dinggTodayText}>Today</Text></TouchableOpacity>
          <TourView tourId="date" style={styles.dinggRangeControls}>
            <TouchableOpacity hitSlop={8} onPress={() => changeDate(viewMode === "week" ? -7 : -1)}><Ionicons name="chevron-back" size={17} color={Colors.primaryText} /></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Select date" onPress={() => setDatePickerVisible(true)} style={styles.dinggRangeButton}><Text style={styles.dinggRangeText}>{formatAppDate(`${date}T00:00:00`)}{viewMode === "week" ? ` -\n${formatAppDate(rangeEnd)}` : ""}</Text><Ionicons name="chevron-down" size={16} color={Colors.appointmentText} /></TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={() => changeDate(viewMode === "week" ? 7 : 1)}><Ionicons name="chevron-forward" size={17} color={Colors.primaryText} /></TouchableOpacity>
          </TourView>
          <View style={styles.dinggToolbarIcons}>
            <TourButton tourId="search" accessibilityLabel="Search appointments" onPress={() => setCalendarSearchOpen((open) => !open)} style={styles.dinggToolbarIcon}><Ionicons name="search-outline" size={19} color={Colors.appointmentText} /></TourButton>
            <TouchableOpacity accessibilityLabel="Select date" onPress={() => setDatePickerVisible(true)} style={styles.dinggToolbarIcon}><Ionicons name="calendar-outline" size={21} color={Colors.appointmentText} /></TouchableOpacity>
          </View>
        </View>
        {calendarSearchOpen ? (
          <View style={styles.dinggSearchField}>
            <Ionicons name="search-outline" size={17} color={Colors.appointmentMuted} />
            <TextInput onChangeText={setSearch} placeholder="Search appointments" placeholderTextColor={Colors.appointmentPlaceholder} style={styles.dinggSearchInput} value={search} />
            {search ? <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color={Colors.appointmentMuted} /></TouchableOpacity> : null}
          </View>
        ) : null}
        {datePickerVisible ? <DateTimePicker mode="date" onChange={(event, selected) => { setDatePickerVisible(false); if (event.type !== "dismissed" && selected) setDate(`${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`); }} value={new Date(`${date}T00:00:00`)} /> : null}
        <TourView tourId="filters" style={styles.calendarFilterRow}>
          <TouchableOpacity disabled={ownOnly} onPress={() => setStaffFilterVisible(true)} style={[styles.dinggStylistSummary, styles.calendarStaffFilter]}><Text style={styles.dinggStylistLabel}>Staff:</Text><Text numberOfLines={1} style={styles.dinggStylistValue}>{ownOnly ? currentStaff?.name ?? "My calendar" : selectedStaffLabel}</Text>{!ownOnly ? <Ionicons name="chevron-down" size={15} color={Colors.appointmentTextSecondary} /> : null}</TouchableOpacity>
          <CalendarStatusFilter statuses={selectedStatuses} onChange={setSelectedStatuses} />
        </TourView>
      </View>
      {staffMode && (currentStaffError || error) ? <StateCard icon="cloud-offline-outline" title="Unable to load calendar" message={currentStaffError ?? error ?? "Please try again."} tone="error" actionLabel="Retry" onAction={refreshAppointments} /> : null}
      <CalendarPreview
        readOnly={staffMode}
        quickSaleEnabled={!staffMode || staffQuickSale}
        expandSingleColumn={ownOnly}
        showEmptyState={!loading && !error}
        emptyTitle={emptyTitle}
        appointments={visibleAppointments}
        date={date}
        onRefresh={refreshAppointments}
        refreshing={refreshing}
        resolveStaffId={resolveStaffId}
        staffColumns={staffColumns}
        viewMode={viewMode}
      />
      <Modal animationType="fade" onRequestClose={() => setViewMenuVisible(false)} transparent visible={viewMenuVisible}><Pressable onPress={() => setViewMenuVisible(false)} style={styles.calendarMenuBackdrop}><Pressable style={styles.calendarMenuCard}>{([['week', 'calendar-outline', 'Week view'], ['day', 'today-outline', 'Day view'], ['list', 'list-outline', 'List view']] as const).map(([value, icon, label]) => <TouchableOpacity key={value} onPress={() => { setViewMode(value); setViewMenuVisible(false); }} style={[styles.calendarMenuOption, viewMode === value && styles.calendarMenuOptionActive]}><Ionicons name={icon} size={18} color={Colors.appointmentText} /><Text style={styles.calendarMenuText}>{label}</Text>{viewMode === value ? <Ionicons name="radio-button-on" size={16} color={Colors.primaryText} /> : null}</TouchableOpacity>)}</Pressable></Pressable></Modal>
      <Modal animationType="fade" onRequestClose={() => setStaffFilterVisible(false)} transparent visible={staffFilterVisible}><Pressable onPress={() => setStaffFilterVisible(false)} style={styles.calendarMenuBackdrop}><Pressable style={styles.staffFilterCard}><Text style={styles.staffFilterTitle}>By Staff</Text><ScrollView>{[{ id: "", name: "All Staff", label: "All Staff" }, ...presentStaffOptions].map((option) => { const selected = option.id === "" ? selectedStaffIds.length === 0 : selectedStaffIds.includes(option.id); return <TouchableOpacity key={option.id || "all-staff"} onPress={() => toggleStaffFilter(option.id)} style={styles.staffFilterOption}><Ionicons name={selected ? "checkbox" : "square-outline"} size={20} color={selected ? Colors.primaryText : Colors.appointmentMuted} /><Text style={styles.staffFilterText}>{option.label}</Text></TouchableOpacity>; })}</ScrollView><View style={styles.staffFilterActions}><TouchableOpacity onPress={() => setSelectedStaffIds([])}><Text style={styles.staffFilterClear}>Clear</Text></TouchableOpacity><TouchableOpacity onPress={() => setStaffFilterVisible(false)} style={styles.staffFilterApply}><Text style={styles.staffFilterApplyText}>Apply</Text></TouchableOpacity></View></Pressable></Pressable></Modal>
    </ScreenShell>
  );
}

export const AppointmentCalendarScreen = withScreenTour(AppointmentCalendarScreenContent, screenTours.calendar);
