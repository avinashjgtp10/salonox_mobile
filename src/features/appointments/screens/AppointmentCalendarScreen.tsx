import { CalendarPreview } from "@/features/appointments/components/calendar/CalendarPreview";
import { ScreenShell } from "@/features/appointments/components/shared/ScreenShell";
import { CALENDAR_STATUS_FILTERS } from "@/features/appointments/constants/appointmentConstants";
import { useAllStaffMembers } from "@/features/appointments/hooks/useAllStaffMembers";
import { useAppointmentListFilters, useFetchAppointments } from "@/features/appointments/hooks/useAppointmentList";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { buildCalendarStaffOptions, buildCanonicalStaffIdByAlias, buildFallbackStaffIdByName, resolveAppointmentStaffId, SYNTHETIC_STAFF_ID_PREFIX } from "@/features/appointments/utils/calendarStaff";
import { appointmentStatusMatchesFilter } from "@/services/appointment.service";
import { selectAppointments, selectAppointmentsRefreshing } from "@/store/appointment/appointment.slice";
import { useAppSelector } from "@/store/hooks";
import { selectStaffMembers } from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem } from "@/types/appointment";
import { formatAppDate } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

export function AppointmentCalendarScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const appointments = useAppSelector(selectAppointments);
  const staffMembers = useAppSelector(selectStaffMembers);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const { date, search, setDate, setSearch, setStatus, status } = useAppointmentListFilters();
  const { fetchAppointments } = useFetchAppointments();
  useAllStaffMembers();
  // Selection is by staff id, so two staff sharing a name stay independently
  // selectable.
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarSearchOpen, setCalendarSearchOpen] = useState(false);
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
  const visibleAppointments = useMemo(
    () => appointments.filter((item) => {
      const matchesStaff = selectedStaffIds.length === 0 || selectedStaffIds.includes(resolveStaffId(item));
      const matchesStatus = status === "All"
        ? item.status !== "Unknown"
        : status === "Deleted"
          ? item.status === "Deleted"
          : appointmentStatusMatchesFilter(item.status, status);

      return matchesStaff && matchesStatus;
    }),
    [appointments, resolveStaffId, selectedStaffIds, status],
  );
  const selectedStaffLabel = selectedStaffIds.length === 0
    ? "All Staff"
    : selectedStaffIds.length === 1
      ? staffOptions.find((option) => option.id === selectedStaffIds[0])?.label ?? "1 Staff"
      : `${selectedStaffIds.length} Staff`;
  const rangeEnd = useMemo(() => { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + (viewMode === "week" ? 6 : 0)); return value; }, [date, viewMode]);
  const rangeEndKey = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, "0")}-${String(rangeEnd.getDate()).padStart(2, "0")}`;
  // Server-side staff filter — only a real staff id can be sent, never a
  // synthetic name-derived one.
  const selectedStaffId = selectedStaffIds.length === 1 && !selectedStaffIds[0].startsWith(SYNTHETIC_STAFF_ID_PREFIX)
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

  useEffect(() => {
    void fetchAppointments(viewMode === "week"
      ? { fromDate: date, limit: 200, reset: true, search, staffId: selectedStaffId, status, toDate: rangeEndKey }
      : { date, limit: 200, reset: true, search, staffId: selectedStaffId, status });
  }, [date, fetchAppointments, rangeEndKey, search, selectedStaffId, status, viewMode]);

  return (
    <ScreenShell
      footer={
        <ScrollView
          contentContainerStyle={styles.dinggLegendContent}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.dinggLegend}
        >
          {CALENDAR_STATUS_FILTERS.map((filter) => {
            const selected = status === filter.status;

            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected }}
                activeOpacity={0.8}
                key={filter.label}
                onPress={() => setStatus(filter.status)}
                style={[styles.dinggLegendPill, selected && styles.dinggLegendActive]}
              >
                {filter.status !== "All" ? <View style={[styles.dinggLegendDot, { backgroundColor: selected ? "#FFFFFF" : filter.color }]} /> : null}
                <Text style={[styles.dinggLegendText, selected && styles.dinggLegendTextActive]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      }
      onRefresh={() => void fetchAppointments(viewMode === "week" ? { fromDate: date, limit: 200, refresh: true, search, staffId: selectedStaffId, status, toDate: rangeEndKey } : { date, limit: 200, refresh: true, search, staffId: selectedStaffId, status })}
      refreshing={refreshing}
      hideHeader
      contentBottomPadding={0}
      safeAreaEdges={['top']}
      scrollable={viewMode === "list"}
      title="Calendar"
    >
      <View style={styles.dinggToolbar}>
        <View style={styles.dinggToolbarActions}>
          <TouchableOpacity onPress={() => setDate(todayIsoDate())} style={styles.dinggTodayButton}><Text style={styles.dinggTodayText}>Today</Text></TouchableOpacity>
          <View style={styles.dinggRangeControls}>
            <TouchableOpacity hitSlop={8} onPress={() => changeDate(viewMode === "week" ? -7 : -1)}><Ionicons name="chevron-back" size={17} color={Colors.appointmentAccent} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMenuVisible(true)} style={styles.dinggRangeButton}><Text style={styles.dinggRangeText}>{formatAppDate(`${date}T00:00:00`)}{viewMode === "week" ? ` -\n${formatAppDate(rangeEnd)}` : ""}</Text><Ionicons name="chevron-down" size={16} color={Colors.appointmentText} /></TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={() => changeDate(viewMode === "week" ? 7 : 1)}><Ionicons name="chevron-forward" size={17} color={Colors.appointmentAccent} /></TouchableOpacity>
          </View>
          <View style={styles.dinggToolbarIcons}>
            <TouchableOpacity accessibilityLabel="Search appointments" onPress={() => setCalendarSearchOpen((open) => !open)} style={styles.dinggToolbarIcon}><Ionicons name="search-outline" size={19} color={Colors.appointmentText} /></TouchableOpacity>
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
        <TouchableOpacity onPress={() => setStaffFilterVisible(true)} style={styles.dinggStylistSummary}><Text style={styles.dinggStylistLabel}>Staff:</Text><Text numberOfLines={1} style={styles.dinggStylistValue}>{selectedStaffLabel}</Text><Ionicons name="chevron-down" size={15} color={Colors.appointmentTextSecondary} /></TouchableOpacity>
      </View>
      <CalendarPreview
        appointments={visibleAppointments}
        date={date}
        onRefresh={() => void fetchAppointments(viewMode === "week" ? { fromDate: date, limit: 200, refresh: true, search, staffId: selectedStaffId, status, toDate: rangeEndKey } : { date, limit: 200, refresh: true, search, staffId: selectedStaffId, status })}
        refreshing={refreshing}
        resolveStaffId={resolveStaffId}
        staffColumns={selectedStaffIds.length
          ? staffOptions.filter((option) => selectedStaffIds.includes(option.id))
          : staffOptions}
        viewMode={viewMode}
      />
      <Modal animationType="fade" onRequestClose={() => setViewMenuVisible(false)} transparent visible={viewMenuVisible}><Pressable onPress={() => setViewMenuVisible(false)} style={styles.calendarMenuBackdrop}><Pressable style={styles.calendarMenuCard}>{([['week', 'calendar-outline', 'Week view'], ['day', 'today-outline', 'Day view'], ['list', 'list-outline', 'List view']] as const).map(([value, icon, label]) => <TouchableOpacity key={value} onPress={() => { setViewMode(value); setViewMenuVisible(false); }} style={[styles.calendarMenuOption, viewMode === value && styles.calendarMenuOptionActive]}><Ionicons name={icon} size={18} color={Colors.appointmentText} /><Text style={styles.calendarMenuText}>{label}</Text>{viewMode === value ? <Ionicons name="radio-button-on" size={16} color={Colors.appointmentAccent} /> : null}</TouchableOpacity>)}</Pressable></Pressable></Modal>
      <Modal animationType="fade" onRequestClose={() => setStaffFilterVisible(false)} transparent visible={staffFilterVisible}><Pressable onPress={() => setStaffFilterVisible(false)} style={styles.calendarMenuBackdrop}><Pressable style={styles.staffFilterCard}><Text style={styles.staffFilterTitle}>By Staff</Text><ScrollView>{[{ id: "", name: "All Staff", label: "All Staff" }, ...staffOptions].map((option) => { const selected = option.id === "" ? selectedStaffIds.length === 0 : selectedStaffIds.includes(option.id); return <TouchableOpacity key={option.id || "all-staff"} onPress={() => toggleStaffFilter(option.id)} style={styles.staffFilterOption}><Ionicons name={selected ? "checkbox" : "square-outline"} size={20} color={selected ? Colors.appointmentAccent : Colors.appointmentMuted} /><Text style={styles.staffFilterText}>{option.label}</Text></TouchableOpacity>; })}</ScrollView><View style={styles.staffFilterActions}><TouchableOpacity onPress={() => setSelectedStaffIds([])}><Text style={styles.staffFilterClear}>Clear</Text></TouchableOpacity><TouchableOpacity onPress={() => setStaffFilterVisible(false)} style={styles.staffFilterApply}><Text style={styles.staffFilterApplyText}>Apply</Text></TouchableOpacity></View></Pressable></Pressable></Modal>
    </ScreenShell>
  );
}
