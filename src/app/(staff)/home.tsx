import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Badge } from "@/components/ui/Badge";
import { AppLayout } from "@/constants/layout";
import { DashboardRadius as Radius, type ThemeColors } from "@/constants/theme";
import { findAttendanceRecordForStaff } from "@/features/attendance/utils/attendanceMatching";
import {
  formatAttendanceTime,
  formatHourMinuteAmPm,
  getAttendanceAction,
  getAttendanceBadgeConfig,
  getTodayAttendanceDateKey,
  parseAttendanceDateTime,
} from "@/features/attendance/utils/attendanceStatus";
import { fetchAppointmentsThunk } from "@/middleware/appointment/appointment.thunk";
import {
  checkInThunk,
  checkOutThunk,
  fetchAttendanceOverviewThunk,
} from "@/middleware/attendance/attendance.thunk";
import { fetchNotificationsThunk, fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { resolveCurrentStaffThunk } from "@/middleware/staff/staff.thunk";
import {
  selectAppointments,
  selectAppointmentsError,
  selectAppointmentsIsLoading,
  selectAppointmentsRefreshing,
} from "@/store/appointment/appointment.slice";
import {
  selectAttendanceIsCheckingIn,
  selectAttendanceIsCheckingOut,
  selectAttendanceIsOffline,
  selectAttendanceRecords,
  selectAttendanceRecordsError,
  selectAttendanceRecordsLoading,
  selectAttendanceRecordsRefreshing,
} from "@/store/attendance/attendance.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectNotificationsListRefreshing,
  selectUnreadCount,
} from "@/store/notification/notification.slice";
import {
  selectCurrentStaff,
  selectCurrentStaffError,
  selectCurrentStaffLoading,
} from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem, AppointmentStatus } from "@/types/appointment";
import { getUserFullName, getUserInitials } from "@/utils/userProfile";

const STAFF_HOME_APPOINTMENT_LIMIT = 40;
const MINUTE_MS = 60_000;

const STAFF_ROUTES = {
  appointments: "./appointments",
  attendance: "./attendance",
  calendar: "./calendar",
  notifications: "./notifications",
  profile: "./profile",
  settings: "./more",
} as const satisfies Record<string, Href>;

const DASHBOARD = {
  amber: "#F2A516",
  amberSoft: "rgba(242, 165, 22, 0.2)",
  beige: "#7A6957",
  beigeSoft: "rgba(122, 105, 87, 0.66)",
  black: "#050505",
  card: "#171511",
  cardAlt: "#1D1A15",
  danger: "#E08F86",
  green: "#35D064",
  greenSoft: "rgba(53, 208, 100, 0.2)",
  muted: "#C4B8AA",
  purple: "#8B64D8",
  purpleSoft: "rgba(139, 100, 216, 0.2)",
  text: "#FFFFFF",
};

const getResponsiveHorizontalPadding = (width = 393) => {
  if (width < 360) {
    return 20;
  }

  if (width >= 768) {
    return 56;
  }

  if (width >= 600) {
    return 40;
  }

  return 20;
};

const getDashboardTitleSize = (width = 393) => (width < 360 ? 27 : width >= 600 ? 34 : 29);
const getCardPadding = () => 14;

const formatDateLabel = () =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  })
    .format(new Date())
    .replace(",", "")
    .toUpperCase();

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
};

const getAppointmentTime = (appointment: AppointmentListItem) =>
  new Date(appointment.startTime ?? appointment.scheduledAt ?? "").getTime();

const getDateKey = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
};

const isTodayAppointment = (appointment: AppointmentListItem, todayKey: string) =>
  getDateKey(appointment.scheduledAt ?? appointment.startTime) === todayKey;

const ACTIVE_STATUSES: AppointmentStatus[] = ["Upcoming", "Confirmed", "Waiting", "Checked In", "In Service", "In Progress"];

const getOwnerDashboardAppointmentBadge = (Colors: ThemeColors, status: AppointmentStatus) => {
  switch (status) {
    case "Completed":
      return { bg: Colors.successBg, color: Colors.success, label: "Completed" };
    case "Cancelled":
    case "Deleted":
      return { bg: Colors.errorBg, color: Colors.error, label: "Cancelled" };
    case "Missed":
    case "Partial":
      return { bg: Colors.warningBg, color: Colors.warning, label: "Missed" };
    case "Checked In":
    case "In Progress":
    case "In Service":
      return { bg: Colors.infoBg, color: Colors.info, label: "In Progress" };
    case "Confirmed":
    case "Upcoming":
    case "Waiting":
    case "Unknown":
    default:
      return { bg: Colors.warningBg, color: Colors.warning, label: "Upcoming" };
  }
};

const getAttendanceTone = (label: string) => {
  const normalized = label.toLowerCase();

  if (normalized.includes("absent") || normalized.includes("not checked") || normalized.includes("not started")) {
    return { bg: "rgba(224, 83, 76, 0.24)", color: "#FF7F78" };
  }

  if (normalized.includes("late")) {
    return { bg: DASHBOARD.amberSoft, color: "#FFB84D" };
  }

  if (normalized.includes("leave")) {
    return { bg: "rgba(92, 125, 174, 0.24)", color: "#8FB9FF" };
  }

  if (normalized.includes("present") || normalized.includes("checked")) {
    return { bg: "rgba(53, 208, 100, 0.24)", color: DASHBOARD.green };
  }

  return { bg: "rgba(196, 184, 170, 0.16)", color: DASHBOARD.muted };
};

const getStaffAttendanceStateLabel = (
  record: ReturnType<typeof findAttendanceRecordForStaff> | undefined,
  fallbackLabel: string,
) => {
  if (!record?.checkInTime) {
    return "Not Checked In";
  }

  if (record.checkInTime && record.checkOutTime) {
    return "Completed";
  }

  return fallbackLabel.toLowerCase().includes("late") ? "Late" : "Present";
};

const getStaffAttendanceActionLabel = (kind: ReturnType<typeof getAttendanceAction>["kind"]) => {
  if (kind === "checkIn") {
    return "Check In";
  }

  if (kind === "checkOut") {
    return "Check Out";
  }

  return "Completed";
};

const formatTimeLabel = (value: string | null | undefined) => {
  const parsed = parseAttendanceDateTime(value);

  return parsed ? formatHourMinuteAmPm(parsed) : "--:--";
};

const formatWorkingTime = (checkInTime: string | null | undefined, checkOutTime: string | null | undefined, now: number) => {
  const checkIn = parseAttendanceDateTime(checkInTime);

  if (!checkIn) {
    return "00h 00m";
  }

  const checkOut = parseAttendanceDateTime(checkOutTime);
  const endTime = checkOut?.getTime() ?? now;
  const diff = Math.max(0, endTime - checkIn.getTime());
  const hours = Math.floor(diff / (60 * MINUTE_MS));
  const minutes = Math.floor((diff % (60 * MINUTE_MS)) / MINUTE_MS);

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
};

const getRawString = (appointment: AppointmentListItem | null, keys: string[]) => {
  if (!appointment) {
    return "";
  }

  const raw = appointment.raw as Record<string, unknown>;

  for (const key of keys) {
    const value = raw[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
};

const getAverageRating = (appointments: AppointmentListItem[]) => {
  const ratings = appointments
    .map((appointment) => {
      const value = (appointment.raw as Record<string, unknown>).rating ?? (appointment.raw as Record<string, unknown>).avg_rating;

      return typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    })
    .filter((value) => Number.isFinite(value));

  if (ratings.length === 0) {
    return "--";
  }

  return (ratings.reduce((total, value) => total + value, 0) / ratings.length).toFixed(1);
};

const toDisplayName = (name: string) => name.trim().split(/\s+/)[0]?.toUpperCase() || "STAFF";

export default function StaffHomeRoute() {
  const Colors = useThemeColors();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(Colors, width, insets.bottom), [Colors, insets.bottom, width]);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const appointments = useAppSelector(selectAppointments);
  const appointmentsError = useAppSelector(selectAppointmentsError);
  const appointmentsLoading = useAppSelector(selectAppointmentsIsLoading);
  const appointmentsRefreshing = useAppSelector(selectAppointmentsRefreshing);
  const attendanceRecords = useAppSelector(selectAttendanceRecords);
  const attendanceError = useAppSelector(selectAttendanceRecordsError);
  const attendanceLoading = useAppSelector(selectAttendanceRecordsLoading);
  const attendanceRefreshing = useAppSelector(selectAttendanceRecordsRefreshing);
  const attendanceOffline = useAppSelector(selectAttendanceIsOffline);
  const notificationsRefreshing = useAppSelector(selectNotificationsListRefreshing);
  const unreadCount = useAppSelector(selectUnreadCount);
  const [attendanceActionError, setAttendanceActionError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const todayKey = getTodayAttendanceDateKey();
  const currentStaffId = currentStaff?.id ?? "";
  const staffName = currentStaff?.name ?? getUserFullName(currentUser);
  const initials = currentStaff?.initials ?? getUserInitials(currentUser);
  const selfAttendance = useMemo(
    () => (currentStaff ? findAttendanceRecordForStaff(attendanceRecords, currentStaff) : undefined),
    [attendanceRecords, currentStaff],
  );
  const attendanceAction = getAttendanceAction(selfAttendance);
  const checkingIn = useAppSelector((state) => selectAttendanceIsCheckingIn(state, currentStaffId));
  const checkingOut = useAppSelector((state) => selectAttendanceIsCheckingOut(state, currentStaffId));
  const attendanceBusy = checkingIn || checkingOut;
  const attendanceBadge = getAttendanceBadgeConfig(selfAttendance, Colors);
  const attendanceStateLabel = getStaffAttendanceStateLabel(selfAttendance, attendanceBadge.label);
  const attendanceTone = getAttendanceTone(attendanceStateLabel);

  const todayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => isTodayAppointment(appointment, todayKey))
        .sort((left, right) => getAppointmentTime(left) - getAppointmentTime(right)),
    [appointments, todayKey],
  );
  const completedCount = todayAppointments.filter((appointment) => appointment.status === "Completed").length;
  const remainingCount = todayAppointments.filter((appointment) => ACTIVE_STATUSES.includes(appointment.status)).length;
  const refreshing = appointmentsRefreshing || attendanceRefreshing || notificationsRefreshing;
  const blockingError = currentStaffError ?? appointmentsError ?? attendanceError;

  const loadStaffHome = useCallback(
    (refresh = false) => {
      if (!currentStaffId) {
        return;
      }

      void dispatch(
        fetchAppointmentsThunk({
          date: todayKey,
          limit: STAFF_HOME_APPOINTMENT_LIMIT,
          page: 1,
          refresh,
          reset: !refresh,
          staff_id: currentStaffId,
        }),
      );
      void dispatch(fetchAttendanceOverviewThunk(todayKey));
      void dispatch(fetchUnreadCountThunk());
      void dispatch(fetchNotificationsThunk(refresh ? { refresh: true } : undefined));
    },
    [currentStaffId, dispatch, todayKey],
  );

  useEffect(() => {
    loadStaffHome(false);
  }, [loadStaffHome]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE_MS);

    return () => clearInterval(timer);
  }, []);

  const handleRetry = () => {
    if (!currentStaffId && currentUser?.id) {
      void dispatch(resolveCurrentStaffThunk(currentUser.id));
      return;
    }

    loadStaffHome(false);
  };

  const handleAttendanceAction = async () => {
    if (!currentStaffId || attendanceAction.kind === "edit") {
      return;
    }

    setAttendanceActionError(null);

    try {
      if (attendanceAction.kind === "checkIn") {
        await dispatch(checkInThunk({ date: todayKey, staffId: currentStaffId })).unwrap();
      } else {
        await dispatch(checkOutThunk({ date: todayKey, staffId: currentStaffId })).unwrap();
      }

      await dispatch(fetchAttendanceOverviewThunk(todayKey)).unwrap();
      loadStaffHome(true);
    } catch (error) {
      setAttendanceActionError(error instanceof Error ? error.message : "Unable to update attendance.");
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[DASHBOARD.beige]}
            onRefresh={() => loadStaffHome(true)}
            refreshing={refreshing}
            tintColor={DASHBOARD.beige}
          />
        }
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.dateText}>{formatDateLabel()}</Text>
            <Text style={styles.title}>My Dashboard</Text>
            <Text style={styles.greeting}>
              {getGreeting()}, {toDisplayName(staffName)} 👋
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityLabel="Open notifications"
              activeOpacity={0.72}
              onPress={() => router.push(STAFF_ROUTES.notifications)}
              style={styles.headerIconButton}
            >
              <Ionicons name="notifications-outline" size={26} color={DASHBOARD.text} />
              {unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Open profile"
              activeOpacity={0.8}
              onPress={() => router.push(STAFF_ROUTES.profile)}
              style={styles.avatarButton}
            >
              {currentUser?.avatarUrl ? (
                <Image contentFit="cover" source={{ uri: currentUser.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          </View>
        </View>

        {blockingError ? <ErrorBanner message={blockingError} onRetry={handleRetry} /> : null}
        {attendanceOffline ? <ErrorBanner message="You appear offline. Pull to refresh when connected." /> : null}

        <AttendanceCard
          actionLabel={getStaffAttendanceActionLabel(attendanceAction.kind)}
          badgeLabel={attendanceStateLabel}
          checkInLabel={formatAttendanceTime(selfAttendance?.checkInTime)}
          checkOutLabel={formatAttendanceTime(selfAttendance?.checkOutTime)}
          disabled={attendanceBusy || !currentStaffId || attendanceAction.kind === "edit"}
          error={attendanceActionError}
          icon={attendanceBadge.icon}
          loading={attendanceBusy || attendanceLoading || currentStaffLoading}
          onPress={() => void handleAttendanceAction()}
          statusLabel={attendanceStateLabel}
          tone={attendanceTone}
          workingLabel={formatWorkingTime(selfAttendance?.checkInTime, selfAttendance?.checkOutTime, now)}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={stylesStatic.quickGrid}>
          <View style={stylesStatic.quickRow}>
            <QuickAction
              icon="calendar-number-outline"
              iconBg={DASHBOARD.beigeSoft}
              label="Appointments"
              onPress={() => router.push(STAFF_ROUTES.appointments)}
            />
            <QuickAction
              icon="calendar-outline"
              iconBg={DASHBOARD.beigeSoft}
              label="Calendar"
              onPress={() => router.push(STAFF_ROUTES.calendar)}
            />
          </View>
          <View style={stylesStatic.quickRow}>
            <QuickAction
              icon="time-outline"
              iconBg="rgba(71, 138, 75, 0.55)"
              label="Attendance"
              onPress={() => router.push(STAFF_ROUTES.attendance)}
            />
            <QuickAction
              icon="settings-outline"
              iconBg="rgba(74, 93, 111, 0.55)"
              label="Settings"
              onPress={() => router.push(STAFF_ROUTES.settings)}
            />
          </View>
        </View>

        <TodayAppointmentsCard appointments={todayAppointments} loading={appointmentsLoading} />

        <ProgressCard
          averageRating={getAverageRating(todayAppointments)}
          completed={completedCount}
          remaining={remainingCount}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Pressable disabled={!onRetry} onPress={onRetry} style={stylesStatic.errorBanner}>
      <Ionicons name="alert-circle-outline" size={18} color={DASHBOARD.amber} />
      <Text style={stylesStatic.errorBannerText}>{message}</Text>
    </Pressable>
  );
}

function AttendanceCard({
  actionLabel,
  badgeLabel,
  checkInLabel,
  checkOutLabel,
  disabled,
  error,
  icon,
  loading,
  onPress,
  statusLabel,
  tone,
  workingLabel,
}: {
  actionLabel: string;
  badgeLabel: string;
  checkInLabel: string;
  checkOutLabel: string;
  disabled: boolean;
  error: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  loading: boolean;
  onPress: () => void;
  statusLabel: string;
  tone: { bg: string; color: string };
  workingLabel: string;
}) {
  const checkedOut = checkOutLabel !== "--:--";

  return (
    <View style={stylesStatic.attendanceCard}>
      <View style={stylesStatic.attendanceTop}>
        <View style={[stylesStatic.attendanceIcon, { backgroundColor: tone.bg }]}>
          <Ionicons name={icon} size={24} color={tone.color} />
        </View>
        <View style={stylesStatic.attendanceTitleBlock}>
          <Text style={stylesStatic.cardEyebrow}>{"Today's Attendance"}</Text>
          <Text style={[stylesStatic.attendanceStatus, { color: tone.color }]}>{badgeLabel}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.82}
          disabled={disabled}
          onPress={onPress}
          style={[stylesStatic.checkoutButton, disabled && { backgroundColor: tone.bg }, disabled && stylesStatic.buttonDisabled]}
        >
          {loading ? <ActivityIndicator color={DASHBOARD.text} size="small" /> : null}
          <Text style={[stylesStatic.checkoutText, disabled && { color: tone.color }]}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={stylesStatic.attendanceMetrics}>
        <Metric icon="time" iconColor={tone.color} label="Check In" showDivider={false} value={checkInLabel} />
        {checkedOut ? (
          <Metric
            icon="log-out-outline"
            iconColor={DASHBOARD.amber}
            label="Check Out"
            metricStyle={stylesStatic.metricWide}
            value={checkOutLabel}
          />
        ) : (
          <Metric icon="time-outline" iconColor={DASHBOARD.amber} label="Working Time" value={workingLabel} />
        )}
        {checkedOut ? (
          <Metric icon="timer-outline" iconColor={DASHBOARD.green} label="Working Hours" value={workingLabel} />
        ) : (
          <Metric dotColor={tone.color} label="Status" value={statusLabel} />
        )}
      </View>
      {error ? <Text style={stylesStatic.inlineError}>{error}</Text> : null}
    </View>
  );
}

function Metric({
  dotColor,
  icon,
  iconColor,
  label,
  metricStyle,
  showDivider = true,
  value,
}: {
  dotColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  metricStyle?: object;
  showDivider?: boolean;
  value: string;
}) {
  return (
    <View style={[stylesStatic.metric, showDivider && stylesStatic.metricDivider, metricStyle]}>
      <Text style={stylesStatic.metricLabel}>{label}</Text>
      <View style={stylesStatic.metricValueRow}>
        {icon ? <Ionicons name={icon} size={17} color={iconColor} /> : null}
        {dotColor ? <View style={[stylesStatic.metricDot, { backgroundColor: dotColor }]} /> : null}
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={stylesStatic.metricValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function _NextAppointmentCard({
  appointment,
  countdown,
  error,
  loading,
  onPressDetails,
  onPressStart,
}: {
  appointment: AppointmentListItem | null;
  countdown: string;
  error: string | null;
  loading: boolean;
  onPressDetails: () => void;
  onPressStart: () => void;
}) {
  if (loading) {
    return (
      <View style={stylesStatic.nextCard}>
        <ActivityIndicator color={DASHBOARD.beige} />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={stylesStatic.nextCardEmpty}>
        <View style={stylesStatic.nextEmptyIcon}>
          <Ionicons name="calendar-clear-outline" size={22} color={DASHBOARD.text} />
        </View>
        <View style={stylesStatic.nextCopy}>
          <Text style={stylesStatic.cardTitle}>No upcoming appointment</Text>
          <Text style={stylesStatic.nextClient}>You are clear for the next slot.</Text>
        </View>
      </View>
    );
  }

  const chairLabel = getRawString(appointment, ["chair", "chair_name", "chairName", "resource_name"]) || "Chair —";

  return (
    <View style={stylesStatic.nextCard}>
      <View style={stylesStatic.nextLeftIcon}>
        <Ionicons name="calendar-outline" size={26} color={DASHBOARD.text} />
      </View>
      <Pressable onPress={onPressDetails} style={stylesStatic.nextCopy}>
        <Text style={stylesStatic.cardEyebrow}>Next Appointment</Text>
        <View style={stylesStatic.nextTimeRow}>
          <Text style={stylesStatic.nextTime}>{formatTimeLabel(appointment.startTime ?? appointment.scheduledAt)}</Text>
          {countdown ? <Text style={stylesStatic.countdownPill}>{countdown}</Text> : null}
        </View>
        <Text numberOfLines={1} style={stylesStatic.nextService}>{appointment.serviceName}</Text>
        <Text numberOfLines={1} style={stylesStatic.nextClient}>{appointment.clientName}</Text>
        <View style={stylesStatic.chairRow}>
          <Ionicons name="location-outline" size={18} color={DASHBOARD.muted} />
          <Text numberOfLines={1} style={stylesStatic.chairText}>{chairLabel}</Text>
        </View>
      </Pressable>
      <View style={stylesStatic.nextActions}>
        <TouchableOpacity activeOpacity={0.82} onPress={onPressDetails} style={stylesStatic.chevronButton}>
          <Ionicons name="chevron-forward" size={28} color={DASHBOARD.text} />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.82} onPress={onPressStart} style={stylesStatic.startButton}>
          <Text style={stylesStatic.startButtonText}>Start Appointment</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={stylesStatic.inlineError}>{error}</Text> : null}
    </View>
  );
}

void _NextAppointmentCard;

function QuickAction({
  icon,
  iconBg,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={stylesStatic.quickCard}>
      <View style={[stylesStatic.quickIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={27} color={DASHBOARD.text} />
      </View>
      <Text numberOfLines={1} style={stylesStatic.quickTitle}>{label}</Text>
    </TouchableOpacity>
  );
}

function TodayAppointmentsCard({ appointments, loading }: { appointments: AppointmentListItem[]; loading: boolean }) {
  const visibleAppointments = appointments.slice(0, 3);

  return (
    <View style={stylesStatic.timelineCard}>
      <View style={stylesStatic.timelineHeader}>
        <Text style={stylesStatic.cardTitle}>{"Today's Appointments"}</Text>
        <TouchableOpacity activeOpacity={0.78} onPress={() => router.push(STAFF_ROUTES.appointments)}>
          <View style={stylesStatic.viewAllRow}>
            <Text style={stylesStatic.viewAllText}>View all</Text>
            <Ionicons name="chevron-forward" size={18} color={DASHBOARD.muted} />
          </View>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={DASHBOARD.beige} /> : null}
      {!loading && visibleAppointments.length === 0 ? (
        <Text style={stylesStatic.emptyText}>No appointments assigned for today.</Text>
      ) : null}
      {!loading
        ? visibleAppointments.map((appointment, index) => (
            <TimelineRow
              appointment={appointment}
              isLast={index === visibleAppointments.length - 1}
              key={appointment.id}
            />
          ))
        : null}
    </View>
  );
}

function TimelineRow({ appointment, isLast }: { appointment: AppointmentListItem; isLast: boolean }) {
  const Colors = useThemeColors();
  const badge = getOwnerDashboardAppointmentBadge(Colors, appointment.status);
  const bookingType = getRawString(appointment, ["booking_type", "bookingType", "client_type", "clientType", "type"]) || "Booking";

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => router.push(`/(staff)/appointment-details/${appointment.id}` as Href)}
      style={stylesStatic.timelineRow}
    >
      <Text numberOfLines={1} style={stylesStatic.timelineTime}>{formatTimeLabel(appointment.startTime ?? appointment.scheduledAt)}</Text>
      <View style={[stylesStatic.timelineInfo, !isLast && stylesStatic.timelineInfoBorder]}>
        <View style={stylesStatic.timelineCopy}>
          <Text numberOfLines={1} style={stylesStatic.timelineClient}>{appointment.clientName}</Text>
          <Text numberOfLines={1} style={stylesStatic.timelineService}>{appointment.serviceName}</Text>
          <Text numberOfLines={1} style={stylesStatic.timelineMeta}>{bookingType}</Text>
        </View>
        <Badge bg={badge.bg} color={badge.color} label={badge.label} size="sm" />
        <Ionicons name="chevron-forward" size={20} color={DASHBOARD.text} style={stylesStatic.timelineChevron} />
      </View>
    </TouchableOpacity>
  );
}

function ProgressCard({
  averageRating,
  completed,
  remaining,
}: {
  averageRating: string;
  completed: number;
  remaining: number;
}) {
  return (
    <View style={stylesStatic.progressCard}>
      <Text style={stylesStatic.cardTitleMuted}>{"Today's Progress"}</Text>
      <View style={stylesStatic.progressRow}>
        <ProgressMetric bg="rgba(65, 154, 72, 0.78)" icon="shield-checkmark" label="Completed" value={String(completed)} />
        <ProgressMetric bg="#F0A10C" icon="time-outline" label="Remaining" value={String(remaining)} />
        <ProgressMetric bg="#EEC313" icon="star" label="Avg. Rating" value={averageRating} />
      </View>
    </View>
  );
}

function ProgressMetric({
  bg,
  icon,
  label,
  value,
}: {
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={stylesStatic.progressMetric}>
      <View style={[stylesStatic.progressIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={19} color={DASHBOARD.text} />
      </View>
      <View style={stylesStatic.progressCopy}>
        <Text style={stylesStatic.progressValue}>{value}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={stylesStatic.progressLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (_Colors: ThemeColors, width = 393, bottomInset = 0) =>
  StyleSheet.create({
    avatarButton: {
      height: width < 360 ? 48 : 54,
      width: width < 360 ? 48 : 54,
    },
    avatarFallback: {
      alignItems: "center",
      backgroundColor: "#2C2823",
      borderRadius: Radius.full,
      height: "100%",
      justifyContent: "center",
      width: "100%",
    },
    avatarImage: {
      backgroundColor: "#2C2823",
      borderRadius: Radius.full,
      height: "100%",
      width: "100%",
    },
    avatarInitials: {
      color: DASHBOARD.text,
      fontSize: width < 360 ? 14 : 16,
      fontWeight: "900",
    },
    content: {
      alignItems: "stretch",
      flexGrow: 1,
      paddingBottom: AppLayout.contentBottomPadding + bottomInset + 92,
      paddingHorizontal: getResponsiveHorizontalPadding(width),
      paddingTop: width < 360 ? 14 : 18,
      width: "100%",
    },
    dateText: {
      color: DASHBOARD.muted,
      fontSize: width < 360 ? 11 : 12,
      fontWeight: "900",
      letterSpacing: 1,
    },
    greeting: {
      color: DASHBOARD.muted,
      fontSize: width < 360 ? 14 : 15,
      fontWeight: "800",
      marginTop: 6,
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    headerActions: {
      alignItems: "center",
      flexDirection: "row",
      gap: width < 360 ? 10 : 12,
      paddingTop: width < 360 ? 10 : 12,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      paddingRight: 12,
    },
    headerIconButton: {
      alignItems: "center",
      height: width < 360 ? 42 : 48,
      justifyContent: "center",
      width: width < 360 ? 42 : 48,
    },
    onlineDot: {
      backgroundColor: DASHBOARD.green,
      borderColor: DASHBOARD.black,
      borderRadius: Radius.full,
      borderWidth: 2,
      bottom: 0,
      height: 14,
      position: "absolute",
      right: 0,
      width: 14,
    },
    safeArea: {
      backgroundColor: DASHBOARD.black,
      flex: 1,
      width: "100%",
    },
    scroll: {
      backgroundColor: DASHBOARD.black,
      flex: 1,
      width: "100%",
    },
    sectionHeader: {
      marginBottom: 9,
      marginTop: 16,
    },
    sectionTitle: {
      color: DASHBOARD.text,
      fontSize: width < 360 ? 18 : 20,
      fontWeight: "900",
    },
    title: {
      color: DASHBOARD.text,
      fontSize: getDashboardTitleSize(width),
      fontWeight: "900",
      letterSpacing: -0.8,
      marginTop: 6,
      flexShrink: 0,
    },
    unreadBadge: {
      alignItems: "center",
      backgroundColor: "#F04B2B",
      borderRadius: Radius.full,
      height: 22,
      justifyContent: "center",
      position: "absolute",
      right: 2,
      top: 0,
      width: 22,
    },
    unreadBadgeText: {
      color: DASHBOARD.text,
      fontSize: 12,
      fontWeight: "900",
    },
  });

const cardShadow = {
  elevation: 3,
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.22,
  shadowRadius: 26,
};

const baseCard = {
  backgroundColor: DASHBOARD.card,
  borderColor: "rgba(255, 255, 255, 0.08)",
  borderRadius: 26,
  borderWidth: 1,
  ...cardShadow,
};

const stylesStatic = StyleSheet.create({
  attendanceCard: {
    ...baseCard,
    padding: getCardPadding(),
  },
  attendanceIcon: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  attendanceMetrics: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 16,
  },
  attendanceStatus: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  attendanceTitleBlock: {
    flex: 1,
    marginLeft: 12,
  },
  attendanceTop: {
    alignItems: "center",
    flexDirection: "row",
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  cardEyebrow: {
    color: DASHBOARD.muted,
    fontSize: 15,
    fontWeight: "900",
  },
  cardTitle: {
    color: DASHBOARD.text,
    fontSize: 15,
    fontWeight: "900",
  },
  cardTitleMuted: {
    color: DASHBOARD.muted,
    fontSize: 15,
    fontWeight: "900",
  },
  chairRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  chairText: {
    color: DASHBOARD.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  checkoutButton: {
    alignItems: "center",
    backgroundColor: DASHBOARD.beigeSoft,
    borderRadius: 24,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 96,
    paddingHorizontal: 14,
  },
  checkoutText: {
    color: "#EFE5DC",
    fontSize: 14,
    fontWeight: "800",
  },
  chevronButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  countdownPill: {
    backgroundColor: DASHBOARD.purpleSoft,
    borderRadius: Radius.full,
    color: "#C9B4FF",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 10,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  emptyText: {
    color: DASHBOARD.muted,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 14,
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: "rgba(242, 165, 22, 0.12)",
    borderColor: "rgba(242, 165, 22, 0.24)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    padding: 14,
  },
  errorBannerText: {
    color: DASHBOARD.muted,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  inlineError: {
    color: DASHBOARD.danger,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },
  metric: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
    paddingLeft: 8,
  },
  metricDivider: {
    borderLeftColor: "rgba(255, 255, 255, 0.08)",
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  metricWide: {
    flex: 1.25,
  },
  metricDot: {
    borderRadius: Radius.full,
    height: 10,
    width: 10,
  },
  metricLabel: {
    color: DASHBOARD.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  metricValue: {
    color: DASHBOARD.text,
    flexShrink: 0,
    fontSize: 15,
    fontWeight: "900",
  },
  metricValueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 4,
    minWidth: 0,
  },
  nextActions: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  nextCard: {
    ...baseCard,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    minHeight: 128,
    padding: getCardPadding(),
  },
  nextCardEmpty: {
    ...baseCard,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    minHeight: 76,
    padding: getCardPadding(),
  },
  nextClient: {
    color: DASHBOARD.muted,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 5,
  },
  nextCopy: {
    flex: 1,
    minWidth: 0,
  },
  nextLeftIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(111, 78, 173, 0.82)",
    borderRadius: Radius.full,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  nextService: {
    color: DASHBOARD.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },
  nextTime: {
    color: DASHBOARD.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  nextTimeRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  nextEmptyIcon: {
    alignItems: "center",
    backgroundColor: "rgba(111, 78, 173, 0.32)",
    borderRadius: Radius.full,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  progressCard: {
    ...baseCard,
    marginTop: 16,
    padding: 16,
  },
  progressIcon: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  progressLabel: {
    color: DASHBOARD.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
  },
  progressMetric: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  progressRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  progressValue: {
    color: DASHBOARD.text,
    fontSize: 25,
    fontWeight: "900",
  },
  quickCard: {
    ...baseCard,
    alignItems: "center",
    flex: 1,
    height: 102,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  quickGrid: {
    gap: 14,
  },
  quickRow: {
    flexDirection: "row",
    gap: 14,
  },
  quickIcon: {
    alignItems: "center",
    backgroundColor: "rgba(10, 12, 14, 0.42)",
    borderRadius: 18,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  quickTitle: {
    color: DASHBOARD.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
    textAlign: "center",
  },
  startButton: {
    alignItems: "center",
    backgroundColor: DASHBOARD.beigeSoft,
    borderRadius: 24,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 18,
  },
  startButtonText: {
    color: DASHBOARD.text,
    fontSize: 14,
    fontWeight: "800",
  },
  timelineCard: {
    ...baseCard,
    marginTop: 16,
    padding: 16,
  },
  timelineClient: {
    color: DASHBOARD.text,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 17,
  },
  timelineCopy: {
    flex: 1,
    minWidth: 0,
  },
  timelineHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timelineInfo: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 82,
    paddingVertical: 8,
  },
  timelineInfoBorder: {
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    borderBottomWidth: 1,
  },
  timelineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  timelineService: {
    color: DASHBOARD.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 2,
  },
  timelineMeta: {
    color: DASHBOARD.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 2,
  },
  timelineTime: {
    color: DASHBOARD.text,
    fontSize: 14,
    fontWeight: "900",
    width: 66,
  },
  timelineChevron: {
    flexShrink: 0,
  },
  viewAllRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  viewAllText: {
    color: DASHBOARD.muted,
    fontSize: 14,
    fontWeight: "900",
  },
});
