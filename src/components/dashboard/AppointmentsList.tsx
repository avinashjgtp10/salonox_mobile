import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useFocusEffect, type Href } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { appointmentService } from "@/services/appointment.service";
import { useAppSelector } from "@/store/hooks";
import { selectAppointments } from "@/store/appointment/appointment.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem, AppointmentStatus as CalendarAppointmentStatus } from "@/types/appointment";
import { formatAppTime } from "@/utils/dateTime";
import { formatDashboardRevenue } from "@/utils/dashboard";

type AppointmentStatus = "completed" | "in-progress" | "upcoming" | "cancelled";

const getBadgeStyles = (
  Colors: ThemeColors,
): Record<AppointmentStatus, { bg: string; color: string; label: string }> => ({
  cancelled: { bg: Colors.errorBg, color: Colors.error, label: "Cancelled" },
  completed: { bg: Colors.successBg, color: Colors.success, label: "Completed" },
  "in-progress": { bg: Colors.infoBg, color: Colors.info, label: "In Progress" },
  upcoming: { bg: Colors.warningBg, color: Colors.warning, label: "Upcoming" },
});

function Badge({ status }: { status: AppointmentStatus }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const badgeStyle = useMemo(() => getBadgeStyles(Colors)[status], [Colors, status]);

  return (
    <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
      <Text style={[styles.badgeText, { color: badgeStyle.color }]}>{badgeStyle.label}</Text>
    </View>
  );
}

function StaffChip({ initials }: { initials: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{initials}</Text>
    </View>
  );
}

type DashboardAppointmentCard = {
  amount: number;
  clientName: string;
  id: string;
  service: string;
  staffInitials: string;
  staffName: string;
  status: AppointmentStatus;
  time: string;
};

const getStaffInitials = (staffName: string) =>
  staffName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "NA";

const ACTIVE_APPOINTMENT_STATUSES = new Set<CalendarAppointmentStatus>([
  "Checked In",
  "Confirmed",
  "In Progress",
  "In Service",
  "Upcoming",
]);

// The backend sends appointment timestamps in several shapes (Postgres-style
// "YYYY-MM-DD HH:MM:SS+00" with a space instead of "T", a bare 2-digit UTC
// offset instead of "+00:00", or no offset at all). These aren't all spec
// -compliant ISO 8601, and React Native's JS engine (Hermes) can fail to
// parse them where a browser engine might succeed leniently — which is how a
// raw string like "2026-07-09 14:30:00+00" could leak straight to the UI.
// Normalizing to strict ISO 8601 first makes every timestamp parse reliably
// on-device.
const toStrictIsoDateTime = (value: string) => {
  let normalized = value.trim();

  if (normalized.includes(" ") && !normalized.includes("T")) {
    normalized = normalized.replace(" ", "T");
  }

  normalized = normalized.replace(/(T\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2})$/, "$1$2:00");

  if (normalized.includes("T") && !/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized += "Z";
  }

  return normalized;
};

const parseApiDateTime = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(toStrictIsoDateTime(value));

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getAppointmentStartMs = (appointment: AppointmentListItem) => {
  const rawStart = appointment.startTime ?? appointment.scheduledAt;

  return parseApiDateTime(rawStart)?.getTime() ?? null;
};

// For the Completed section: prefer the actual completion timestamp: falls
// back to end time, then scheduled start time, when completedAt isn't
// available. `raw` is the unnormalized API payload already carried on every
// AppointmentListItem, so this reads completed_at without needing any change
// to the appointment service/types.
const getAppointmentCompletionMs = (appointment: AppointmentListItem) => {
  const completedAtMs = parseApiDateTime(appointment.raw.completed_at)?.getTime();

  if (completedAtMs !== undefined) {
    return completedAtMs;
  }

  const endTimeMs = parseApiDateTime(appointment.endTime)?.getTime();

  if (endTimeMs !== undefined) {
    return endTimeMs;
  }

  return getAppointmentStartMs(appointment);
};

const formatLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getAppointmentDateKey = (appointment: AppointmentListItem) => {
  const rawStart = appointment.startTime ?? appointment.scheduledAt;
  const parsedDate = parseApiDateTime(rawStart);

  if (!parsedDate) {
    return rawStart ? rawStart.slice(0, 10) : "";
  }

  return formatLocalDateKey(parsedDate);
};

const formatAppointmentTime = (appointment: AppointmentListItem) => {
  const rawStart = appointment.startTime ?? appointment.scheduledAt;
  const parsedDate = parseApiDateTime(rawStart);

  return parsedDate ? formatAppTime(parsedDate, "--:--") : "--:--";
};

// "completed" is included (not excluded) so Completed appointments still
// render — the ordering below is what pushes them below Upcoming/Active ones.
// Cancelled/Missed remain excluded from this widget, matching its existing
// scope (no badge style exists for them here, and the card was never meant
// to be a full appointment log).
const toDashboardAppointmentStatus = (
  appointment: AppointmentListItem,
): AppointmentStatus | null => {
  if (ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)) {
    return ["Checked In", "In Progress", "In Service"].includes(appointment.status)
      ? "in-progress"
      : "upcoming";
  }

  if (appointment.status === "Completed") {
    return "completed";
  }

  return null;
};

const toCardModel = (
  appointment: AppointmentListItem,
  status: AppointmentStatus,
): DashboardAppointmentCard => ({
  amount: appointment.total || appointment.amount,
  clientName: appointment.clientName,
  id: appointment.id,
  service: appointment.serviceName,
  staffInitials: getStaffInitials(appointment.staffName),
  staffName: appointment.staffName,
  status,
  time: formatAppointmentTime(appointment),
});

const getTimeParts = (time: string) => {
  const match = time.trim().match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/i);

  if (match) {
    return {
      ampm: match[2].toUpperCase(),
      time: match[1],
    };
  }

  return {
    ampm: "",
    time,
  };
};

function AppointmentCard({ appt, isLast }: { appt: DashboardAppointmentCard; isLast?: boolean }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const timeParts = getTimeParts(appt.time);
  const isLaterToday = timeParts.ampm === "PM";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => router.push(`/appointments/${appt.id}` as Href)}
      style={[styles.card, isLast && styles.cardLast]}
    >
      <View style={[styles.timePill, isLaterToday && styles.timePillMuted]}>
        <Text style={[styles.timeText, isLaterToday && styles.timeTextMuted]}>
          {timeParts.time}
        </Text>
        {timeParts.ampm ? (
          <Text style={[styles.ampmText, isLaterToday && styles.ampmTextMuted]}>
            {timeParts.ampm}
          </Text>
        ) : null}
      </View>
      <View style={styles.divider} />
      <View style={styles.info}>
        <Text style={styles.name}>{appt.clientName}</Text>
        <Text style={styles.service}>{appt.service}</Text>
        <View style={styles.chips}>
          <StaffChip initials={appt.staffInitials} />
        </View>
        <Text style={styles.meta}>
          {appt.staffName} - {formatDashboardRevenue(appt.amount)}
        </Text>
      </View>
      <Badge status={appt.status} />
    </TouchableOpacity>
  );
}

export default function AppointmentsList() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const appointments = useAppSelector(selectAppointments);
  const currentUser = useAppSelector(selectCurrentUser);
  const [completedRawAppointments, setCompletedRawAppointments] = useState<AppointmentListItem[]>([]);
  const didHandleInitialFocusRef = useRef(false);

  // Completed Appointments must come from a separate request: fetched here
  // with status=paid and no date param (the backend's `date` filter
  // would exclude anything not scheduled today, and completed appointments
  // are usually from earlier days) — confirmed against both the backend
  // (appointments.repository.ts: date applies DATE(a.scheduled_at)=$date)
  // and the web frontend source directly, not guessed.
  // /appointments/history does not exist on this backend. The "today only"
  // restriction is then applied client-side below, via the same date-key
  // logic Upcoming uses, so the request stays broad while the displayed
  // result is scoped identically to Upcoming.
  //
  // This can't be dispatched through fetchAppointmentsThunk: that thunk
  // replaces the shared `appointment.appointments` Redux array wholesale on
  // every call and single-flights by requestId, so a second, differently
  // -filtered fetch through it would intermittently wipe out Upcoming's data.
  // Calling the same appointmentService.getAppointments used by that thunk
  // directly reuses the identical request/normalization logic without that
  // collision.
  const fetchCompletedAppointments = useCallback(() => {
    let isCancelled = false;

    appointmentService
      .getAppointments(
        {
          limit: 100,
          page: 1,
          search: "",
          sort_by: "scheduled_at",
          sort_order: "DESC",
          status: "paid",
        },
        currentUser?.salonId,
      )
      .then((response) => {
        if (!isCancelled) {
          setCompletedRawAppointments(response.appointments);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCompletedRawAppointments([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.salonId]);

  useEffect(() => fetchCompletedAppointments(), [fetchCompletedAppointments]);
  useFocusEffect(
    useCallback(() => {
      if (!didHandleInitialFocusRef.current) {
        didHandleInitialFocusRef.current = true;
        return;
      }

      return fetchCompletedAppointments();
    }, [fetchCompletedAppointments]),
  );

  // Upcoming Appointments: unchanged from before — active/upcoming statuses
  // only, still ahead of now, today, soonest first.
  const upcomingAppointments = useMemo(() => {
    const nowMs = Date.now();
    const todayKey = formatLocalDateKey();
    const upcoming = appointments
      .filter((appointment) => getAppointmentDateKey(appointment) === todayKey)
      .map((appointment) => ({
        appointment,
        scheduledAtMs: getAppointmentStartMs(appointment),
        status: toDashboardAppointmentStatus(appointment),
      }))
      .filter(({ scheduledAtMs, status }) => {
        if (!status || status === "completed") {
          return false;
        }

        return status === "in-progress" || scheduledAtMs === null || scheduledAtMs > nowMs;
      })
      .sort((left, right) => (left.scheduledAtMs ?? Infinity) - (right.scheduledAtMs ?? Infinity));

    return upcoming
      .slice(0, 3)
      .map(({ appointment, status }) => toCardModel(appointment, status ?? "upcoming"));
  }, [appointments]);

  // Completed Appointments: fed by the dedicated status=paid fetch above
  // (not the shared today-scoped `appointments`), then restricted to today
  // using the exact same local-date-key logic as Upcoming
  // (getAppointmentDateKey / formatLocalDateKey), so both sections apply
  // identical timezone handling for "today". Latest completed first.
  const completedAppointments = useMemo(() => {
    const todayKey = formatLocalDateKey();
    const completed = completedRawAppointments
      .filter((appointment) => appointment.status === "Completed")
      .filter((appointment) => getAppointmentDateKey(appointment) === todayKey)
      .map((appointment) => ({
        appointment,
        completedAtMs: getAppointmentCompletionMs(appointment),
      }))
      .sort((left, right) => (right.completedAtMs ?? -Infinity) - (left.completedAtMs ?? -Infinity));

    return completed.slice(0, 3).map(({ appointment }) => toCardModel(appointment, "completed"));
  }, [completedRawAppointments]);

  // Pure display merge — upcoming shown before completed, capped at 5. Both
  // source arrays/fetches above are untouched; this only changes how they're
  // grouped on screen (one "Recent appointments" list instead of two titled
  // sections).
  const recentAppointments = useMemo(
    () => [...upcomingAppointments, ...completedAppointments].slice(0, 5),
    [completedAppointments, upcomingAppointments],
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Today</Text>
          <Text style={styles.sectionTitle}>Recent appointments</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/bookings")}>
          <Text style={styles.link}>View all</Text>
        </TouchableOpacity>
      </View>
      {recentAppointments.length > 0 ? (
        recentAppointments.map((appt, index) => (
          <AppointmentCard
            key={appt.id}
            appt={appt}
            isLast={index === recentAppointments.length - 1}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No appointments yet today.</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  link: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: Colors.dashboardCard,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 92,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyStateText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    alignItems: "center",
    backgroundColor: Colors.dashboardCard,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: 8,
    padding: Spacing.md,
  },
  cardLast: {
    marginBottom: 0,
  },
  timePill: {
    alignItems: "center",
    backgroundColor: Colors.dashboardAppointmentAccent,
    borderRadius: Radius.sm,
    minWidth: 46,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  timePillMuted: {
    backgroundColor: Colors.dashboardCardMuted,
  },
  timeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  timeTextMuted: {
    color: Colors.text2,
  },
  ampmText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 8,
    marginTop: 1,
  },
  ampmTextMuted: {
    color: Colors.placeholder,
  },
  divider: {
    backgroundColor: Colors.border,
    height: 36,
    width: 1,
  },
  info: {
    flex: 1,
  },
  name: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "600",
  },
  service: {
    color: Colors.text2,
    fontSize: 10,
    letterSpacing: 0,
    marginTop: 2,
    textTransform: "uppercase",
  },
  chips: {
    flexDirection: "row",
    gap: 3,
    marginTop: 4,
  },
  chip: {
    alignItems: "center",
    backgroundColor: Colors.dashboardClientBg,
    borderColor: Colors.dashboardCard,
    borderRadius: 10,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  chipText: {
    color: Colors.primaryDark,
    fontSize: 8,
    fontWeight: "700",
  },
  meta: {
    color: Colors.placeholder,
    fontSize: 10,
    marginTop: 3,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
