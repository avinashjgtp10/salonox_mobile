import { Text } from "@/components/ui/AppTypography";
import { AppointmentPreviewSheet } from "@/features/appointments/components/calendar/AppointmentPreviewSheet";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { appointmentsOverlap, getAppointmentRange, getCalendarAppointmentTitle, getCalendarTokenLabel, getWebCalendarGradient, hasCalendarInteractionFlag, isReadonlyCalendarAppointment } from "@/features/appointments/utils/appointmentCalendar";
import { formatTimeLabel, getDateKey, parseAppointmentDateTime, todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { sortBySchedule } from "@/features/appointments/utils/appointmentList";
import { maskPhone } from "@/features/appointments/utils/appointmentScreenHelpers";
import type { CalendarStaffOption } from "@/features/appointments/utils/calendarStaff";
import type { QuickSaleSlot } from "@/features/quickSale/screens/QuickSaleScreen";
import QuickSaleScreen from "@/features/quickSale/screens/QuickSaleScreen";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem } from "@/types/appointment";
import { formatAppTime } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, View, type GestureResponderEvent } from "react-native";

type CalendarStyles = ReturnType<typeof createStyles>;

type CalendarColumn = {
  key: string;
  label: string;
  staffId: string;
  staffName: string;
};

const STAFF_COLORS = ["#6366F1", "#8B5CF6", "#EC4899", "#D97706", "#059669", "#2563EB"];
const staffColor = (id: string) => STAFF_COLORS[Array.from(id).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % STAFF_COLORS.length];
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const pad2 = (value: number) => String(value).padStart(2, "0");

const START_HOUR = 0;
const HOUR_HEIGHT = 160;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = HOUR_HEIGHT * (SLOT_MINUTES / 60);
const TIME_COLUMN_WIDTH = 54;
const HOURS = Array.from({ length: 24 }, (_, index) => START_HOUR + index);
const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;

const HOUR_LABEL_FORMAT = new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: true });
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short" });
const TIME_SLOTS = Array.from({ length: HOURS.length * (60 / SLOT_MINUTES) }, (_, index) => {
  const totalMinutes = START_HOUR * 60 + index * SLOT_MINUTES;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return {
    hour,
    label: minute === 0
      ? HOUR_LABEL_FORMAT.format(new Date(2020, 0, 1, hour))
      : `${pad2(hour % 12 || 12)}:${pad2(minute)}`,
    minute,
  };
});

export function CalendarPreview({
  appointments,
  date,
  onRefresh,
  refreshing = false,
  showEmptyState = true,
  resolveStaffId,
  staffColumns = [],
  viewMode = "week",
  readOnly = false,
}: {
  appointments: AppointmentListItem[];
  date: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  showEmptyState?: boolean;
  resolveStaffId?: (appointment: AppointmentListItem) => string;
  staffColumns?: CalendarStaffOption[];
  title?: string;
  viewMode?: "week" | "day" | "list";
  readOnly?: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [previewAppointment, setPreviewAppointment] = useState<AppointmentListItem | null>(null);
  const [quickSaleSlot, setQuickSaleSlot] = useState<QuickSaleSlot | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const value = new Date(`${date}T00:00:00`);
    value.setDate(value.getDate() + index);
    return {
      key: `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`,
      label: DAY_LABEL_FORMAT.format(value),
    };
  }), [date]);
  const columns = useMemo<CalendarColumn[]>(() => viewMode === "day"
    ? (staffColumns.length
      ? staffColumns.map((option) => ({ key: date, label: option.label, staffId: option.id, staffName: option.name }))
      : [{ key: date, label: "All Staff", staffId: "", staffName: "" }])
    : days.map((day) => ({ ...day, staffId: "", staffName: "" })), [date, days, staffColumns, viewMode]);
  const columnWidth = viewMode === "day" ? 156 : 118;
  const calendarContentWidth = TIME_COLUMN_WIDTH + columns.length * columnWidth;
  const appointmentsByColumn = useMemo(() => {
    const keyed = appointments.map((appointment) => ({ appointment, dateKey: getDateKey(appointment.scheduledAt) }));
    return columns.map((column) => keyed
      .filter(({ appointment, dateKey }) => dateKey === column.key && (!column.staffId || (resolveStaffId ? resolveStaffId(appointment) : appointment.staffId) === column.staffId))
      .map(({ appointment }) => appointment));
  }, [appointments, columns, resolveStaffId]);
  const now = new Date();
  const currentMinuteOffset = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
  const showCurrentTime = viewMode === "day" && date === todayIsoDate() && currentMinuteOffset >= 0 && currentMinuteOffset < HOURS.length * 60;
  const verticalScrollRef = useRef<ScrollView>(null);
  const previewId = previewAppointment?.id ?? null;

  const openQuickSaleAt = useCallback((column: CalendarColumn, locationY: number) => {
    if (readOnly) return;
    const slotIndex = Math.min(TIME_SLOTS.length - 1, Math.max(0, Math.floor(locationY / SLOT_HEIGHT)));
    const { hour, minute } = TIME_SLOTS[slotIndex];
    setQuickSaleSlot({
      date: column.key,
      staffName: column.staffName || undefined,
      time: `${pad2(hour)}:${pad2(minute)}`,
    });
  }, [readOnly]);

  useEffect(() => {
    if (viewMode === "list") return;
    const clampedOffset = Math.min(Math.max(currentMinuteOffset, 0), HOURS.length * 60);
    const targetY = Math.max(0, (clampedOffset / 60) * HOUR_HEIGHT - HOUR_HEIGHT);
    const frame = requestAnimationFrame(() => {
      verticalScrollRef.current?.scrollTo({ y: targetY, animated: false });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, viewMode]);

  if (viewMode === "list") {
    return (
      <>
        <View style={styles.dinggListView}>
          {appointments.length ? [...appointments].sort(sortBySchedule).map((appointment) => (
            <View key={appointment.id} style={styles.dinggListTimelineRow}>
              <View style={styles.dinggListTimeRail}><Text style={styles.dinggListHour}>{formatTimeLabel(appointment.scheduledAt)}</Text><View style={styles.dinggListRailLine} /></View>
              <Pressable onPress={() => setPreviewAppointment(appointment)} style={[styles.dinggListAppointment, appointment.status === "Completed" && styles.dinggListCompleted, appointment.status === "Confirmed" && styles.dinggListConfirmed]}>
                <View style={styles.dinggListClientRow}><View style={styles.dinggListAvatar}><Ionicons name="person-outline" size={24} color={Colors.appointmentTextSecondary} /></View><View style={styles.dinggListClientCopy}><Text numberOfLines={1} style={styles.dinggListClientName}>{appointment.clientName}</Text><Text style={styles.dinggListPhone}>{maskPhone(appointment.phone)}</Text></View><Ionicons name="male-outline" size={22} color={Colors.appointmentText} /><Ionicons name="gift-outline" size={22} color={Colors.appointmentText} /></View>
                <View style={styles.dinggListCopy}><Text numberOfLines={1} style={styles.dinggAppointmentName}>{appointment.serviceName}</Text><Text numberOfLines={1} style={styles.dinggAppointmentClient}>{appointment.clientName} · {appointment.staffName}</Text></View>
                <View style={styles.dinggListDetailRow}><Ionicons name="cut-outline" size={19} color={Colors.appointmentAccent} /><Text numberOfLines={2} style={styles.dinggListService}>{appointment.serviceName}</Text></View>
                <View style={styles.dinggListDetailRow}><Ionicons name="time-outline" size={19} color={Colors.appointmentAccent} /><Text style={styles.dinggListTimeRange}>{formatTimeLabel(appointment.scheduledAt)} - {formatTimeLabel(appointment.endTime)}</Text><View style={styles.dinggListStaffWrap}><Text style={styles.dinggListWith}>with</Text><Text numberOfLines={1} style={styles.dinggListStaff}>{appointment.staffName || "-"}</Text></View></View>
                <View style={styles.dinggListStatusRow}><View style={[styles.dinggListStatusDot, appointment.status === "Completed" && styles.dinggStatusCompleted, appointment.status === "Confirmed" && styles.dinggStatusConfirmed]} /><Text style={styles.dinggListStatus}>{appointment.status}</Text></View>
              </Pressable>
            </View>
          )) : <Text style={styles.calendarEmpty}>No appointments found.</Text>}
        </View>
        <AppointmentPreviewSheet appointment={previewAppointment} onClose={() => setPreviewAppointment(null)} readOnly={readOnly} />
      </>
    );
  }

  return (
    <View style={styles.dinggCalendar}>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator style={styles.dinggHorizontalScroller}
        removeClippedSubviews={false}
      >
        <View style={{ height: "100%", width: calendarContentWidth }}>
          <View style={styles.dinggCalendarHeader}>
            <View style={styles.dinggTimeHeader}>{viewMode === "day" ? <Text style={styles.dinggStaffHeader}>Staff</Text> : null}</View>
            {columns.map((column, index) => (
              <View key={`${column.key}-${column.label}-${index}`} style={[styles.dinggDayHeader, { width: columnWidth }]}>
                {viewMode === "day" ? (
                  <View style={[styles.calendarStaffAvatar, { backgroundColor: staffColor(column.staffId || column.label) }]}>
                    <Text style={styles.calendarStaffInitials}>{initials(column.staffName || column.label)}</Text>
                  </View>
                ) : null}
                <Text numberOfLines={2} style={styles.dinggDayHeaderText}>{column.label}</Text>
              </View>
            ))}
          </View>
          <ScrollView
            nestedScrollEnabled
            ref={verticalScrollRef}
            removeClippedSubviews={false}
            refreshControl={onRefresh ? <RefreshControl colors={[Colors.primary]} onRefresh={onRefresh} refreshing={refreshing} tintColor={Colors.primary} /> : undefined}
            showsVerticalScrollIndicator
            style={styles.dinggVerticalScroller}
          >
            <View style={[styles.dinggGridBody, { height: GRID_HEIGHT }]}>
              <CalendarTimeColumn styles={styles} />
              <CalendarGridLines
                filled={viewMode === "day"}
                styles={styles}
                width={columns.length * columnWidth}
              />
              {columns.map((column, columnIndex) => {
                const columnAppointments = appointmentsByColumn[columnIndex];
                return (
                  <CalendarDayColumn
                    appointments={columnAppointments}
                    column={column}
                    highlightedId={previewId && columnAppointments.some((item) => item.id === previewId) ? previewId : null}
                    key={`${column.key}-${column.staffId || columnIndex}`}
                    onAppointmentPress={setPreviewAppointment}
                    onSlotPress={openQuickSaleAt}
                    readOnly={readOnly}
                    styles={styles}
                    width={columnWidth}
                  />
                );
              })}
              {showCurrentTime ? <View pointerEvents="none" style={[styles.dinggCurrentTime, { top: (currentMinuteOffset / 60) * HOUR_HEIGHT }]}><Text style={styles.dinggCurrentTimeLabel}>{formatAppTime(now)}</Text><View style={styles.dinggCurrentTimeDot} /><View style={styles.dinggCurrentTimeLine} /></View> : null}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
      {showEmptyState && !refreshing && appointmentsByColumn.every((items) => items.length === 0) ? (
        <View pointerEvents="none" style={styles.calendarEmptyOverlay}>
          <View style={styles.calendarEmptyIcon}><Ionicons name="calendar-outline" size={30} color={Colors.appointmentAccent} /></View>
          <Text style={styles.calendarEmptyTitle}>
            {viewMode === "week" ? "No appointments this week" : date === todayIsoDate() ? "No appointments today" : "No appointments on this day"}
          </Text>
          {!readOnly && <Text style={styles.calendarEmptyHint}>Tap a time slot to add one</Text>}
        </View>
      ) : null}
      <AppointmentPreviewSheet
        appointment={previewAppointment}
        onClose={() => setPreviewAppointment(null)}
        readOnly={readOnly}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setQuickSaleSlot(null)}
        statusBarTranslucent
        transparent
        visible={Boolean(quickSaleSlot)}
      >
        <View style={styles.quickSaleModalBackdrop}>
          <View style={styles.quickSaleModalSurface}>
            {quickSaleSlot ? (
              <QuickSaleScreen
                embedded
                initialSlot={quickSaleSlot}
                onRequestClose={() => setQuickSaleSlot(null)}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CalendarTimeColumn = memo(function CalendarTimeColumn({ styles }: { styles: CalendarStyles }) {
  return (
    <View style={styles.dinggTimeColumn}>
      {TIME_SLOTS.map(({ hour, label, minute }) => (
        <View key={`${hour}-${minute}`} style={[styles.dinggTimeCell, { position: "absolute", left: 0, right: 0, top: (hour + minute / 60) * HOUR_HEIGHT, height: SLOT_HEIGHT }]}>
          <Text style={[styles.dinggTimeText, minute === 0 && styles.dinggHourText]}>{label}</Text>
        </View>
      ))}
    </View>
  );
});

const CalendarGridLines = memo(function CalendarGridLines({
  filled,
  styles,
  width,
}: {
  filled: boolean;
  styles: CalendarStyles;
  width: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[styles.dinggGridLines, filled && styles.dinggColumnAvailable, { left: TIME_COLUMN_WIDTH, width }]}
    >
      {HOURS.map((hour) => (
        <View key={hour} style={[styles.dinggHourCell, { position: "absolute", left: 0, right: 0, top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }]}>
          <View style={[styles.dinggQuarterLine, { top: "25%" }]} />
          <View style={[styles.dinggQuarterLine, { top: "50%" }]} />
          <View style={[styles.dinggQuarterLine, { top: "75%" }]} />
        </View>
      ))}
    </View>
  );
});

const CalendarDayColumn = memo(function CalendarDayColumn({
  appointments,
  column,
  highlightedId,
  onAppointmentPress,
  onSlotPress,
  readOnly,
  styles,
  width,
}: {
  appointments: AppointmentListItem[];
  column: CalendarColumn;
  highlightedId: string | null;
  onAppointmentPress: (appointment: AppointmentListItem) => void;
  onSlotPress: (column: CalendarColumn, locationY: number) => void;
  readOnly: boolean;
  styles: CalendarStyles;
  width: number;
}) {
  const handleSlotPress = useCallback(
    (event: GestureResponderEvent) => onSlotPress(column, event.nativeEvent.locationY),
    [column, onSlotPress],
  );

  return (
    <View style={[styles.dinggDayColumn, { width }]}>
      {!readOnly && <Pressable
        accessibilityHint="Opens Quick Sale at the tapped time"
        accessibilityLabel={`Quick Sale, ${column.label}`}
        accessibilityRole="button"
        onPress={handleSlotPress}
        style={styles.dinggQuickSaleLayer}
      />}
      {appointments.map((appointment) => {
        const scheduled = parseAppointmentDateTime(appointment.scheduledAt);
        if (!scheduled) return null;
        const offsetMinutes = scheduled.getHours() * 60 + scheduled.getMinutes() - START_HOUR * 60;
        if (offsetMinutes < 0 || offsetMinutes >= HOURS.length * 60) return null;
        const appointmentRange = getAppointmentRange(appointment);
        const calendarDurationMinutes = appointmentRange
          ? Math.max((appointmentRange.end - appointmentRange.start) / 60_000, 1)
          : appointment.durationMinutes ?? 30;
        const height = Math.max((calendarDurationMinutes / 60) * HOUR_HEIGHT, 36);
        const top = (offsetMinutes / 60) * HOUR_HEIGHT;
        const appointmentTitle = getCalendarAppointmentTitle(appointment);
        const tokenLabel = getCalendarTokenLabel(appointment);
        const endTimeLabel = appointment.endTime
          ? formatTimeLabel(appointment.endTime)
          : appointmentRange
            ? formatAppTime(new Date(appointmentRange.end), "--:--")
            : "--:--";
        const appointmentSummary = [
          appointment.clientName || "Walk-In",
          tokenLabel,
          `${formatTimeLabel(appointment.scheduledAt)}-${endTimeLabel}`,
          appointmentTitle,
        ].filter(Boolean).join(", ");
        const summaryLineCount = Math.max(1, Math.floor((height - (height >= 54 ? 28 : 10)) / 14));
        const isReadonly = isReadonlyCalendarAppointment(appointment);
        const isOverlapping = appointments.some((candidate) => candidate.id !== appointment.id && appointmentsOverlap(appointment, candidate));
        const isHighlighted = highlightedId === appointment.id || hasCalendarInteractionFlag(appointment, "isHighlighted", "is_highlighted");
        const isDragging = hasCalendarInteractionFlag(appointment, "isDragging", "is_dragging");
        const isResizing = hasCalendarInteractionFlag(appointment, "isResizing", "is_resizing");
        return (
          <Pressable
            disabled={isReadonly}
            key={appointment.id}
            onPress={() => !isReadonly && onAppointmentPress(appointment)}
            style={[styles.dinggAppointmentCard, isOverlapping && styles.dinggAppointmentOverlapping, isHighlighted && styles.dinggAppointmentHighlighted, isDragging && styles.dinggAppointmentDragging, isResizing && styles.dinggAppointmentResizing, appointment.status === "Deleted" && styles.dinggAppointmentDeleted, { height, top }]}
          >
            <LinearGradient colors={getWebCalendarGradient(appointment)} end={{ x: 0, y: 1 }} start={{ x: 1, y: 0 }} style={styles.dinggAppointmentGradient}>
              {height >= 54 ? <View style={styles.dinggAppointmentIcons}><Ionicons name="male-outline" size={13} color="#ffffff" /><Ionicons name="gift-outline" size={13} color="#ffffff" /></View> : null}
              <Text numberOfLines={summaryLineCount} style={styles.dinggAppointmentSummary}>{appointmentSummary}</Text>
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
});
