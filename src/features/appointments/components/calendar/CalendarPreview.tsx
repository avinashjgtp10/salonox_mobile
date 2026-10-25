import { useFooterClearance } from "@/hooks/useFooterClearance";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { Text } from "@/components/ui/AppTypography";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { getAppointmentBillLabel } from "@/utils/clientPrivacy";
import { AppointmentPreviewSheet } from "@/features/appointments/components/calendar/AppointmentPreviewSheet";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { getAppointmentItemSegments, getAppointmentRange, getCalendarAppointmentTitle, getWebCalendarChipStyle, hasCalendarInteractionFlag, isReadonlyCalendarAppointment } from "@/features/appointments/utils/appointmentCalendar";
import { formatTimeLabel, getDateKey, minutesToDisplayTime, parseAppointmentDateTime, todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { sortBySchedule } from "@/features/appointments/utils/appointmentList";
import { maskPhone } from "@/features/appointments/utils/appointmentScreenHelpers";
import type { CalendarStaffOption } from "@/features/appointments/utils/calendarStaff";
import type { QuickSaleSlot } from "@/features/quickSale/screens/QuickSaleScreen";
import QuickSaleScreen from "@/features/quickSale/screens/QuickSaleScreen";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem } from "@/types/appointment";
import { formatAppDate, formatAppTime } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import { AppointmentFormScreen } from "@/features/appointments/screens/AppointmentFormScreen";
import type { AppointmentFormSlot } from "@/features/appointments/hooks/useAppointmentForm";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps } from "react";
import { consumeQuickSaleLaunch, getQuickSaleLaunch, subscribeQuickSaleLaunch } from "@/features/quickSale/utils/quickSaleLaunch";
import { Animated, Modal, Pressable, RefreshControl, ScrollView, View, type GestureResponderEvent } from "react-native";

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

// One card per staff column, spanning only that staff member's items (web DayView).
type CalendarChip = {
  appointment: AppointmentListItem;
  col: number;
  endMin: number;
  key: string;
  startMin: number;
  title: string;
  totalCols: number;
};

// Overlapping cards in a column sit side by side (web computeOverlapLayout).
const layoutChips = (chips: Omit<CalendarChip, "col" | "totalCols">[]): CalendarChip[] => {
  const sorted = [...chips].sort((left, right) => left.startMin - right.startMin || right.endMin - left.endMin);
  const result: CalendarChip[] = [];
  let cluster: Omit<CalendarChip, "totalCols">[] = [];
  let lanes: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    cluster.forEach((chip) => result.push({ ...chip, totalCols: lanes.length }));
    cluster = [];
    lanes = [];
    clusterEnd = -1;
  };
  sorted.forEach((chip) => {
    if (cluster.length && chip.startMin >= clusterEnd) flush();
    let col = lanes.findIndex((laneEnd) => laneEnd <= chip.startMin);
    if (col === -1) {
      col = lanes.length;
      lanes.push(chip.endMin);
    } else {
      lanes[col] = chip.endMin;
    }
    cluster.push({ ...chip, col });
    clusterEnd = Math.max(clusterEnd, chip.endMin);
  });
  flush();
  return result;
};

const START_HOUR = 0;
const HOUR_HEIGHT = 160;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = HOUR_HEIGHT * (SLOT_MINUTES / 60);
const TIME_COLUMN_WIDTH = 54;
const HOURS = Array.from({ length: 24 }, (_, index) => START_HOUR + index);
const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT;

const HOUR_LABEL_FORMAT = new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: true });
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
  emptyTitle,
  resolveStaffId,
  canonicalStaffId,
  staffColumns = [],
  viewMode = "week",
  readOnly = false,
  quickSaleEnabled = !readOnly,
  expandSingleColumn = false,
}: {
  appointments: AppointmentListItem[];
  date: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  showEmptyState?: boolean;
  // Replaces the "No appointments today" copy, e.g. for a search with no match.
  emptyTitle?: string;
  resolveStaffId?: (appointment: AppointmentListItem) => string;
  // Maps an item's staff id (which may be an alias) to its column id.
  canonicalStaffId?: (staffId: string) => string;
  staffColumns?: CalendarStaffOption[];
  title?: string;
  viewMode?: "week" | "day" | "list";
  readOnly?: boolean;
  // Tapping an empty slot books an appointment (owners) or opens Quick Sale
  // (read-only staff). Defaults to !readOnly; staff get it
  // from the owner's Calendar & Quick Sale switch while the rest stays read-only.
  quickSaleEnabled?: boolean;
  expandSingleColumn?: boolean;
}) {
  const { staffMode, clientName } = useClientPrivacy();
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [previewAppointment, setPreviewAppointment] = useState<AppointmentListItem | null>(null);
  const [quickSaleSlot, setQuickSaleSlot] = useState<QuickSaleSlot | null>(null);
  const [appointmentSlot, setAppointmentSlot] = useState<AppointmentFormSlot | null>(null);
  const closeAppointmentForm = useCallback(() => setAppointmentSlot(null), []);
  // A pending bill reopened in the same embedded Quick Sale (no full-screen
  // Quick Sale route exists any more).
  const [quickSaleDraft, setQuickSaleDraft] = useState<{ appointmentId?: string; draftId?: string; openPayment: boolean } | null>(null);
  const closeQuickSale = useCallback(() => {
    setQuickSaleSlot(null);
    setQuickSaleDraft(null);
  }, []);
  const continueToPayment = useCallback((appointment: AppointmentListItem) => {
    // A Quick Sale booking reopens its pending bill; any other booking is
    // billed directly (web parity: save → pay → checkout the appointment).
    setQuickSaleDraft(appointment.pendingSaleId
      ? { draftId: appointment.pendingSaleId, openPayment: true }
      : { appointmentId: appointment.id, openPayment: true });
  }, []);
  const [viewportWidth, setViewportWidth] = useState(0);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const value = new Date(`${date}T00:00:00`);
    value.setDate(value.getDate() + index);
    return {
      key: `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`,
      label: formatAppDate(value),
    };
  }), [date]);
  const columns = useMemo<CalendarColumn[]>(() => viewMode === "day"
    ? (staffColumns.length
      ? staffColumns.map((option) => ({ key: date, label: option.label, staffId: option.id, staffName: option.name }))
      : [{ key: date, label: "All Staff", staffId: "", staffName: "" }])
    : days.map((day) => ({ ...day, staffId: "", staffName: "" })), [date, days, staffColumns, viewMode]);
  const columnWidth = viewMode === "day"
    ? expandSingleColumn && columns.length === 1 && viewportWidth > 0
      ? Math.max(0, viewportWidth - TIME_COLUMN_WIDTH)
      : 156
    : 118;
  const calendarContentWidth = TIME_COLUMN_WIDTH + columns.length * columnWidth;
  const chipsByColumn = useMemo(() => {
    const columnStaffIds = new Set(columns.map((column) => column.staffId).filter(Boolean));
    const entries = appointments.flatMap((appointment) => {
      const scheduled = parseAppointmentDateTime(appointment.scheduledAt);
      const range = getAppointmentRange(appointment);
      if (!scheduled || !range) return [];
      const startMin = scheduled.getHours() * 60 + scheduled.getMinutes();
      let segments = getAppointmentItemSegments(appointment)
        .map((segment) => ({ ...segment, staffId: canonicalStaffId?.(segment.staffId) ?? segment.staffId }));
      // Item staff we can't place in any column: fall back to the lead staff's column.
      if (segments.length && !segments.some((segment) => columnStaffIds.has(segment.staffId))) segments = [];
      return [{
        appointment,
        dateKey: getDateKey(appointment.scheduledAt),
        endMin: Math.min(startMin + Math.max((range.end - range.start) / 60_000, 1), 24 * 60 - 1),
        leadStaffId: resolveStaffId ? resolveStaffId(appointment) : appointment.staffId,
        segments,
        startMin,
      }];
    });
    return columns.map((column) => layoutChips(entries.flatMap(({ appointment, dateKey, endMin, leadStaffId, segments, startMin }) => {
      if (dateKey !== column.key) return [];
      const whole = { appointment, endMin, key: appointment.id, startMin, title: getCalendarAppointmentTitle(appointment) };
      if (!column.staffId) return [whole];
      const own = segments.filter((segment) => segment.staffId === column.staffId);
      if (own.length) {
        return [{
          appointment,
          endMin: Math.max(...own.map((segment) => segment.endMin)),
          key: `${appointment.id}-${column.staffId}`,
          startMin: Math.min(...own.map((segment) => segment.startMin)),
          title: own.map((segment) => segment.name).filter(Boolean).join(", ") || whole.title,
        }];
      }
      return !segments.length && leadStaffId === column.staffId ? [whole] : [];
    })));
  }, [appointments, canonicalStaffId, columns, resolveStaffId]);
  const now = new Date();
  const currentMinuteOffset = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
  const showCurrentTime = viewMode === "day" && date === todayIsoDate() && currentMinuteOffset >= 0 && currentMinuteOffset < HOURS.length * 60;
  const verticalScrollRef = useRef<ScrollView>(null);
  const footerClearance = useFooterClearance();
  // Horizontal scroll offset. The time column, its header cell and the
  // current-time marker are shifted back by it so they stay pinned on the left
  // while the staff/day columns scroll underneath (native driver, no re-render).
  const scrollX = useRef(new Animated.Value(0)).current;
  const pinnedLeft = useMemo(() => ({ transform: [{ translateX: scrollX }], zIndex: 10, elevation: 2 }), [scrollX]);
  const onHorizontalScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true }),
    [scrollX],
  );
  const previewId = previewAppointment?.id ?? null;

  // Staff with Calendar & Quick Sale access (read-only calendar that can still
  // bill) reopen a bill they saved as pending here to take payment.
  const openAppointment = useCallback((appointment: AppointmentListItem) => {
    if (readOnly && quickSaleEnabled && appointment.pendingSaleId) {
      setQuickSaleDraft({ draftId: appointment.pendingSaleId, openPayment: false });
      return;
    }
    setPreviewAppointment(appointment);
  }, [quickSaleEnabled, readOnly]);

  const openQuickSaleAt = useCallback((column: CalendarColumn, locationY: number) => {
    if (!quickSaleEnabled) return;
    const slotIndex = Math.min(TIME_SLOTS.length - 1, Math.max(0, Math.floor(locationY / SLOT_HEIGHT)));
    const { hour, minute } = TIME_SLOTS[slotIndex];
    // Owners book an appointment for the tapped slot; staff (who can't open
    // the booking form) keep billing it in Quick Sale.
    if (!readOnly) {
      setAppointmentSlot({ date: column.key, staffId: column.staffId || undefined, time: `${pad2(hour)}:${pad2(minute)}` });
      return;
    }
    setQuickSaleSlot({
      date: column.key,
      staffName: column.staffName || undefined,
      time: `${pad2(hour)}:${pad2(minute)}`,
    });
  }, [quickSaleEnabled, readOnly]);

  // Dashboard "Quick Sale": open it now, as if today's current slot were
  // tapped, with a Staff dropdown since no column chose the staff.
  const quickSaleLaunch = useSyncExternalStore(subscribeQuickSaleLaunch, getQuickSaleLaunch);
  useEffect(() => {
    if (!quickSaleLaunch || !quickSaleEnabled) return;
    consumeQuickSaleLaunch();
    const now = new Date();
    const minutes = Math.floor(now.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES;
    setQuickSaleDraft(null);
    setQuickSaleSlot({
      date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
      pickStaff: true,
      time: `${pad2(now.getHours())}:${pad2(minutes)}`,
    });
  }, [quickSaleEnabled, quickSaleLaunch]);

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
              <Pressable onPress={() => openAppointment(appointment)} style={[styles.dinggListAppointment, appointment.status === "Completed" && styles.dinggListCompleted, appointment.status === "Confirmed" && styles.dinggListConfirmed]}>
                <View style={styles.dinggListClientRow}><View style={styles.dinggListAvatar}><Ionicons name="person-outline" size={24} color={Colors.appointmentTextSecondary} /></View><View style={styles.dinggListClientCopy}><Text numberOfLines={1} style={styles.dinggListClientName}>{staffMode ? getAppointmentBillLabel(appointment) : appointment.clientName}</Text><Text style={styles.dinggListPhone}>{maskPhone(appointment.phone)}</Text></View><Ionicons name="male-outline" size={22} color={Colors.appointmentText} /><Ionicons name="gift-outline" size={22} color={Colors.appointmentText} /></View>
                <View style={styles.dinggListCopy}><Text numberOfLines={1} style={styles.dinggAppointmentName}>{appointment.serviceName}</Text><Text numberOfLines={1} style={styles.dinggAppointmentClient}>{clientName(appointment.clientName)} · {appointment.staffName}</Text></View>
                <View style={styles.dinggListDetailRow}><Ionicons name="cut-outline" size={19} color={Colors.primaryText} /><Text numberOfLines={2} style={styles.dinggListService}>{appointment.serviceName}</Text></View>
                <View style={styles.dinggListDetailRow}><Ionicons name="time-outline" size={19} color={Colors.primaryText} /><Text style={styles.dinggListTimeRange}>{formatTimeLabel(appointment.scheduledAt)} - {formatTimeLabel(appointment.endTime)}</Text><View style={styles.dinggListStaffWrap}><Text style={styles.dinggListWith}>with</Text><Text numberOfLines={1} style={styles.dinggListStaff}>{appointment.staffName || "-"}</Text></View></View>
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
    <View style={styles.dinggCalendar} onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}>
      <Animated.ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator style={styles.dinggHorizontalScroller}
        removeClippedSubviews={false}
        onScroll={onHorizontalScroll}
        scrollEventThrottle={16}
      >
        <View style={{ height: "100%", width: calendarContentWidth }}>
          <View style={styles.dinggCalendarHeader}>
            <Animated.View style={[styles.dinggTimeHeader, styles.dinggCalendarHeaderPinned, pinnedLeft]}>{viewMode === "day" ? <Text style={styles.dinggStaffHeader}>Staff</Text> : null}</Animated.View>
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
          <RefreshViewport><ScrollView
            nestedScrollEnabled
            ref={verticalScrollRef}
            contentContainerStyle={{ paddingBottom: footerClearance }}
            removeClippedSubviews={false}
            refreshControl={onRefresh ? <RefreshControl colors={[Colors.primary]} onRefresh={onRefresh} refreshing={refreshing} tintColor={Colors.primary} /> : undefined}
            showsVerticalScrollIndicator
            style={styles.dinggVerticalScroller}
          >
            <View style={[styles.dinggGridBody, { height: GRID_HEIGHT }]}>
              <CalendarTimeColumn pinnedStyle={pinnedLeft} styles={styles} />
              <CalendarGridLines
                filled={viewMode === "day"}
                styles={styles}
                width={columns.length * columnWidth}
              />
              {columns.map((column, columnIndex) => {
                const columnChips = chipsByColumn[columnIndex];
                return (
                  <CalendarDayColumn
                    chips={columnChips}
                    column={column}
                    highlightedId={previewId && columnChips.some((chip) => chip.appointment.id === previewId) ? previewId : null}
                    key={`${column.key}-${column.staffId || columnIndex}`}
                    onAppointmentPress={openAppointment}
                    onSlotPress={openQuickSaleAt}
                    readOnly={!quickSaleEnabled}
                    styles={styles}
                    width={columnWidth}
                  />
                );
              })}
              {showCurrentTime ? <Animated.View pointerEvents="none" style={[styles.dinggCurrentTime, { top: (currentMinuteOffset / 60) * HOUR_HEIGHT, transform: [{ translateX: scrollX }] }]}><Text style={styles.dinggCurrentTimeLabel}>{formatAppTime(now)}</Text><View style={styles.dinggCurrentTimeDot} /><View style={styles.dinggCurrentTimeLine} /></Animated.View> : null}
            </View>
          </ScrollView></RefreshViewport>
        </View>
      </Animated.ScrollView>
      {showEmptyState && !refreshing && chipsByColumn.every((chips) => chips.length === 0) ? (
        <View pointerEvents="none" style={styles.calendarEmptyOverlay}>
          <View style={styles.calendarEmptyIcon}><Ionicons name="calendar-outline" size={30} color={Colors.primaryText} /></View>
          <Text style={styles.calendarEmptyTitle}>
            {emptyTitle ?? (viewMode === "week" ? "No appointments this week" : date === todayIsoDate() ? "No appointments today" : "No appointments on this day")}
          </Text>
          {quickSaleEnabled && !emptyTitle && <Text style={styles.calendarEmptyHint}>Tap a time slot to add one</Text>}
        </View>
      ) : null}
      <AppointmentPreviewSheet
        appointment={previewAppointment}
        onClose={() => setPreviewAppointment(null)}
        onContinueToPayment={quickSaleEnabled ? continueToPayment : undefined}
        readOnly={readOnly}
      />
      <Modal
        animationType="fade"
        onRequestClose={closeQuickSale}
        statusBarTranslucent
        transparent
        visible={Boolean(quickSaleSlot || quickSaleDraft)}
      >
        <View style={styles.quickSaleModalBackdrop}>
          <View style={styles.quickSaleModalSurface}>
            {quickSaleDraft ? (
              <QuickSaleScreen
                appointmentId={quickSaleDraft.appointmentId}
                draftId={quickSaleDraft.draftId}
                embedded
                key={quickSaleDraft.draftId ?? quickSaleDraft.appointmentId}
                onRequestClose={closeQuickSale}
                openPayment={quickSaleDraft.openPayment}
              />
            ) : quickSaleSlot ? (
              <QuickSaleScreen
                embedded
                initialSlot={quickSaleSlot}
                onRequestClose={closeQuickSale}
              />
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        onRequestClose={closeAppointmentForm}
        statusBarTranslucent
        transparent
        visible={Boolean(appointmentSlot)}
      >
        <View style={styles.quickSaleModalBackdrop}>
          <View style={styles.quickSaleModalSurface}>
            {appointmentSlot ? (
              <AppointmentFormScreen initialSlot={appointmentSlot} mode="create" onRequestClose={closeAppointmentForm} />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CalendarTimeColumn = memo(function CalendarTimeColumn({
  pinnedStyle,
  styles,
}: {
  pinnedStyle: ComponentProps<typeof Animated.View>["style"];
  styles: CalendarStyles;
}) {
  return (
    <Animated.View style={[styles.dinggTimeColumn, pinnedStyle]}>
      {TIME_SLOTS.map(({ hour, label, minute }) => (
        <View key={`${hour}-${minute}`} style={[styles.dinggTimeCell, { position: "absolute", left: 0, right: 0, top: (hour + minute / 60) * HOUR_HEIGHT, height: SLOT_HEIGHT }]}>
          <Text style={[styles.dinggTimeText, minute === 0 && styles.dinggHourText]}>{label}</Text>
        </View>
      ))}
    </Animated.View>
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
  chips,
  column,
  highlightedId,
  onAppointmentPress,
  onSlotPress,
  readOnly,
  styles,
  width,
}: {
  chips: CalendarChip[];
  column: CalendarColumn;
  highlightedId: string | null;
  onAppointmentPress: (appointment: AppointmentListItem) => void;
  onSlotPress: (column: CalendarColumn, locationY: number) => void;
  readOnly: boolean;
  styles: CalendarStyles;
  width: number;
}) {
  const { staffMode } = useClientPrivacy();
  const handleSlotPress = useCallback(
    (event: GestureResponderEvent) => onSlotPress(column, event.nativeEvent.locationY),
    [column, onSlotPress],
  );
  const now = Date.now();
  const innerWidth = Math.max(width - 6, 0);

  return (
    <View style={[styles.dinggDayColumn, { width }]}>
      {!readOnly && <Pressable
        accessibilityHint="Books an appointment at the tapped time"
        accessibilityLabel={`New appointment, ${column.label}`}
        accessibilityRole="button"
        onPress={handleSlotPress}
        style={styles.dinggQuickSaleLayer}
      />}
      {chips.map((chip) => {
        const { appointment } = chip;
        const offsetMinutes = chip.startMin - START_HOUR * 60;
        if (offsetMinutes < 0 || offsetMinutes >= HOURS.length * 60) return null;
        const height = Math.max(((chip.endMin - chip.startMin) / 60) * HOUR_HEIGHT, 30);
        const top = (offsetMinutes / 60) * HOUR_HEIGHT;
        const laneWidth = innerWidth / chip.totalCols;
        const chipStyle = getWebCalendarChipStyle(appointment, now);
        const compact = height < SLOT_HEIGHT * 1.5;
        const client = staffMode ? getAppointmentBillLabel(appointment) : appointment.clientName || "Walk-In";
        const isReadonly = isReadonlyCalendarAppointment(appointment);
        const isHighlighted = highlightedId === appointment.id || hasCalendarInteractionFlag(appointment, "isHighlighted", "is_highlighted");
        return (
          <Pressable
            accessibilityLabel={`${chip.title}, ${client}`}
            disabled={isReadonly}
            key={chip.key}
            onPress={() => !isReadonly && onAppointmentPress(appointment)}
            style={[
              styles.webChip,
              { borderLeftColor: chipStyle.accent, height, left: 3 + chip.col * laneWidth, top, width: Math.max(laneWidth - (chip.totalCols > 1 ? 2 : 0), 0) },
              isHighlighted && styles.webChipHighlighted,
              appointment.status === "Deleted" && styles.dinggAppointmentDeleted,
            ]}
          >
            <LinearGradient colors={chipStyle.colors} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.webChipBody}>
              <Text numberOfLines={1} style={styles.webChipTime}>
                {minutesToDisplayTime(chip.startMin)} – {minutesToDisplayTime(chip.endMin)}{compact ? `  ${client}` : ""}
              </Text>
              <Text numberOfLines={compact ? 1 : Math.max(1, Math.floor((height - 34) / 14))} style={styles.webChipService}>{chip.title}</Text>
              {!compact ? (
                <View style={styles.webChipClientRow}>
                  <Ionicons name="person" size={10} color="#1f2937" />
                  <Text numberOfLines={1} style={styles.webChipClient}>{client}</Text>
                </View>
              ) : null}
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
});
