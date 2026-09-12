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
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

export function CalendarPreview({
  appointments,
  date,
  onRefresh,
  refreshing = false,
  resolveStaffId,
  staffColumns = [],
  viewMode = "week",
}: {
  appointments: AppointmentListItem[];
  date: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Maps an appointment to the staff option id owning it. */
  resolveStaffId?: (appointment: AppointmentListItem) => string;
  staffColumns?: CalendarStaffOption[];
  title?: string;
  viewMode?: "week" | "day" | "list";
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [previewAppointment, setPreviewAppointment] = useState<AppointmentListItem | null>(null);
  const [quickSaleSlot, setQuickSaleSlot] = useState<QuickSaleSlot | null>(null);
  const startHour = 0;
  const hourHeight = 160;
  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => startHour + index), []);
  const timeSlots = useMemo(() => Array.from({ length: hours.length * 4 }, (_, index) => {
    const totalMinutes = startHour * 60 + index * 15;
    return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 };
  }), [hours.length]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const value = new Date(`${date}T00:00:00`);
    value.setDate(value.getDate() + index);
    return {
      key: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short" }).format(value),
    };
  }), [date]);
  // One column per staff *id* — same-named staff each get their own column
  // instead of being merged into one.
  const columns = useMemo(() => viewMode === "day"
    ? (staffColumns.length
      ? staffColumns.map((option) => ({ key: date, label: option.label, staffId: option.id, staffName: option.name }))
      : [{ key: date, label: "All Staff", staffId: "", staffName: "" }])
    : days.map((day) => ({ ...day, staffId: "", staffName: "" })), [date, days, staffColumns, viewMode]);
  const columnWidth = viewMode === "day" ? 132 : 118;
  const calendarContentWidth = 54 + columns.length * columnWidth;
  // Keep the full grid mounted: native scrolling can outrun JS-driven render windows,
  // exposing blank rows/columns during flings or programmatic scrolls.
  const appointmentsByColumn = useMemo(() => columns.map((column) => appointments.filter((appointment) => getDateKey(appointment.scheduledAt) === column.key && (!column.staffId || (resolveStaffId ? resolveStaffId(appointment) : appointment.staffId) === column.staffId))), [appointments, columns, resolveStaffId]);
  const now = new Date();
  const currentMinuteOffset = now.getHours() * 60 + now.getMinutes() - startHour * 60;
  const showCurrentTime = viewMode === "day" && date === todayIsoDate() && currentMinuteOffset >= 0 && currentMinuteOffset < hours.length * 60;
  const verticalScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (viewMode === "list") return;
    const clampedOffset = Math.min(Math.max(currentMinuteOffset, 0), hours.length * 60);
    const targetY = Math.max(0, (clampedOffset / 60) * hourHeight - hourHeight);
    const frame = requestAnimationFrame(() => {
      verticalScrollRef.current?.scrollTo({ y: targetY, animated: false });
    });
    return () => cancelAnimationFrame(frame);
    // currentMinuteOffset intentionally excluded: it changes every render via `new Date()`,
    // and this should only re-scroll when the viewed day/mode changes, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, viewMode, hours.length, hourHeight]);

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
        <AppointmentPreviewSheet appointment={previewAppointment} onClose={() => setPreviewAppointment(null)} />
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
            {columns.map((column, index) => <View key={`${column.key}-${column.label}-${index}`} style={[styles.dinggDayHeader, { width: columnWidth }]}>{viewMode === "day" ? <Ionicons name="person-outline" size={12} color={Colors.appointmentAccent} /> : null}<Text numberOfLines={1} style={styles.dinggDayHeaderText}>{column.label}</Text></View>)}
          </View>
          <ScrollView
            nestedScrollEnabled
            ref={verticalScrollRef}
            removeClippedSubviews={false}
            refreshControl={onRefresh ? <RefreshControl colors={[Colors.primary]} onRefresh={onRefresh} refreshing={refreshing} tintColor={Colors.primary} /> : undefined}
            showsVerticalScrollIndicator
            style={styles.dinggVerticalScroller}
          >
            <View style={[styles.dinggGridBody, { height: hours.length * hourHeight }]}>
              <View style={styles.dinggTimeColumn}>
                {timeSlots.map(({ hour, minute }) => (
                  <View key={`${hour}-${minute}`} style={[styles.dinggTimeCell, { position: 'absolute', left: 0, right: 0, top: (hour + minute / 60) * hourHeight, height: hourHeight / 4 }]}>
                    <Text style={[styles.dinggTimeText, minute === 0 && styles.dinggHourText]}>{minute === 0 ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: true }).format(new Date(2020, 0, 1, hour)) : `${String(hour % 12 || 12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}</Text>
                  </View>
                ))}
              </View>
              {columns.map((column, columnIndex) => {
                const columnAppointments = appointmentsByColumn[columnIndex];
                return (
                  <View key={`${column.key}-${column.staffId || columnIndex}`} style={[styles.dinggDayColumn, viewMode === "day" && (columnIndex % 2 === 0 ? styles.dinggColumnAvailable : styles.dinggColumnUnavailable), { width: columnWidth }]}>
                    {timeSlots.map(({ hour, minute }) => (
                      <Pressable
                        accessibilityHint="Opens Quick Sale for this calendar slot"
                        accessibilityLabel={`Quick Sale, ${column.label}, ${String(hour % 12 || 12)}:${String(minute).padStart(2, "0")}`}
                        accessibilityRole="button"
                        key={`quick-sale-slot-${column.key}-${columnIndex}-${hour}-${minute}`}
                        onPress={() => setQuickSaleSlot({
                          date: column.key,
                          staffName: column.staffName || undefined,
                          time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
                        })}
                        style={[styles.dinggQuickSaleSlot, { height: hourHeight / 4, top: (hour + minute / 60) * hourHeight }]}
                      />
                    ))}
                    {hours.map((hour) => (
                      <View key={`${column.key}-${hour}`} style={[styles.dinggHourCell, { position: 'absolute', left: 0, right: 0, top: hour * hourHeight, height: hourHeight }]}>
                        <View style={[styles.dinggQuarterLine, { top: "25%" }]} />
                        <View style={[styles.dinggQuarterLine, { top: "50%" }]} />
                        <View style={[styles.dinggQuarterLine, { top: "75%" }]} />
                      </View>
                    ))}
                    {columnAppointments.map((appointment) => {
                      const scheduled = parseAppointmentDateTime(appointment.scheduledAt);
                      if (!scheduled) return null;
                      const offsetMinutes = scheduled.getHours() * 60 + scheduled.getMinutes() - startHour * 60;
                      if (offsetMinutes < 0 || offsetMinutes >= hours.length * 60) return null;
                      const appointmentRange = getAppointmentRange(appointment);
                      const calendarDurationMinutes = appointmentRange
                        ? Math.max((appointmentRange.end - appointmentRange.start) / 60_000, 1)
                        : appointment.durationMinutes ?? 30;
                      const height = Math.max((calendarDurationMinutes / 60) * hourHeight, 36);
                      const top = (offsetMinutes / 60) * hourHeight;
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
                      const isOverlapping = columnAppointments.some((candidate) => candidate.id !== appointment.id && appointmentsOverlap(appointment, candidate));
                      const isHighlighted = previewAppointment?.id === appointment.id || hasCalendarInteractionFlag(appointment, "isHighlighted", "is_highlighted");
                      const isDragging = hasCalendarInteractionFlag(appointment, "isDragging", "is_dragging");
                      const isResizing = hasCalendarInteractionFlag(appointment, "isResizing", "is_resizing");
                      return (
                        <Pressable
                          disabled={isReadonly}
                          key={appointment.id}
                          onPress={() => !isReadonly && setPreviewAppointment(appointment)}
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
              })}
              {showCurrentTime ? <View pointerEvents="none" style={[styles.dinggCurrentTime, { top: (currentMinuteOffset / 60) * hourHeight }]}><Text style={styles.dinggCurrentTimeLabel}>{formatAppTime(now)}</Text><View style={styles.dinggCurrentTimeDot} /><View style={styles.dinggCurrentTimeLine} /></View> : null}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
      <AppointmentPreviewSheet
        appointment={previewAppointment}
        onClose={() => setPreviewAppointment(null)}
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
