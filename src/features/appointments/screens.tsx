import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { Badge } from "@/components/ui/Badge";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { getApiErrorMessage } from "@/services/api";
import {
  appointmentStatusMatchesFilter,
  appointmentStatusToApiValue,
  appointmentStatusToListApiValue,
} from "@/services/appointment.service";
import { clientService } from "@/services/client.service";
import { serviceService } from "@/services/service.service";
import { fetchClientByIdThunk, fetchClientsThunk } from "@/middleware/client/client.thunk";
import {
  cancelAppointmentThunk,
  completeAppointmentThunk,
  confirmAppointmentThunk,
  createAppointmentThunk,
  fetchAppointmentByIdThunk,
  fetchAppointmentHistoryThunk,
  fetchAppointmentsThunk,
  rescheduleAppointmentThunk,
  startAppointmentThunk,
  updateAppointmentThunk,
} from "@/middleware/appointment/appointment.thunk";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchStaffAvailabilityThunk } from "@/middleware/staff/staffAvailability.thunk";
import {
  clearAppointmentToast,
  selectAppointmentById,
  selectAppointmentDetailsState,
  selectAppointmentHistory,
  selectAppointmentHistoryError,
  selectAppointmentHistoryLoading,
  selectAppointmentMutationError,
  selectAppointmentMutating,
  selectAppointments,
  selectAppointmentsError,
  selectAppointmentsIsLoading,
  selectAppointmentsLoadingMore,
  selectAppointmentsPagination,
  selectAppointmentsQuery,
  selectAppointmentsRefreshing,
  selectAppointmentToast,
} from "@/store/appointment/appointment.slice";
import { selectClients } from "@/store/client/client.slice";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffAvailability,
  selectStaffAvailabilityError,
  selectStaffAvailabilityLoading,
} from "@/store/staff/staffAvailability.slice";
import { selectStaffMembers } from "@/store/staff/staff.slice";
import type {
  AppointmentCalendarView,
  AppointmentListItem,
  AppointmentPaymentMethod,
  AppointmentStatus,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from "@/types/appointment";
import type { ClientListItem } from "@/types/client";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceListItem } from "@/types/service";
import type { StaffAvailabilitySlot } from "@/types/staffAvailability";
import type { StaffMember } from "@/data/teamData";
import { useAppForeground } from "@/hooks/useAppForeground";
import { addRealtimeEntityChangedListener } from "@/services/realtimeEvents";
import { isValidIsoDate } from "@/utils/validation";

const STATUS_FILTERS: ("All" | AppointmentStatus)[] = [
  "All",
  "Upcoming",
  "Confirmed",
  "Waiting",
  "Checked In",
  "In Service",
  "In Progress",
  "Partial",
  "Completed",
  "Cancelled",
  "Missed",
];

const STAFF_AVAILABILITY_REALTIME_ENTITIES = new Set([
  "appointments",
  "staff",
  "staffAvailability",
]);

const toComparableId = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") {
    const id = String(value).trim();
    return id.length > 0 ? id : null;
  }

  return null;
};

const collectPayloadStaffIds = (payload: unknown): string[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const nestedRecords = [record.data, record.record, record.staff, record.employee].filter(
    (value): value is Record<string, unknown> => Boolean(value) && typeof value === "object",
  );
  const candidates = [
    record.staffId,
    record.staff_id,
    record.employeeId,
    record.employee_id,
    record.staffRefId,
    record.staff_ref_id,
    record.userId,
    record.user_id,
    ...nestedRecords.flatMap((nested) => [
      nested.id,
      nested._id,
      nested.staffId,
      nested.staff_id,
      nested.employeeId,
      nested.employee_id,
      nested.userId,
      nested.user_id,
    ]),
  ];

  return candidates.map(toComparableId).filter((id): id is string => Boolean(id));
};

const realtimePayloadMatchesStaff = (payload: unknown, staffId: string) => {
  const payloadStaffIds = collectPayloadStaffIds(payload);

  return payloadStaffIds.length === 0 || payloadStaffIds.includes(staffId);
};

const FORM_STATUS_OPTIONS: AppointmentStatus[] = [
  "Upcoming",
  "Confirmed",
  "Waiting",
  "Checked In",
  "In Service",
  "In Progress",
  "Partial",
  "Completed",
  "Cancelled",
  "Missed",
];

const PAYMENT_METHODS: AppointmentPaymentMethod[] = [
  "Cash",
  "Card",
  "UPI",
  "Wallet",
  "Bank Transfer",
  "Other",
];

const SERVICE_SEARCH_PLACEHOLDER =
  "Type at least 3 letters or enter a price to search services.";
const SERVICE_SEARCH_MIN_LETTERS = 3;
const CLIENT_SEARCH_MIN_LETTERS = 3;
const CLIENT_SEARCH_RESULT_LIMIT = 8;
const AUTOCOMPLETE_DROPDOWN_GAP = 14;
const SERVICE_SEARCH_DEBOUNCE_MS = 240;
const CLIENT_SEARCH_DEBOUNCE_MS = 240;
const SERVICE_SEARCH_NAME_RESULT_LIMIT = 25;
const SERVICE_CATALOG_MAX_PAGES = 50;
const SERVICE_CATALOG_PAGE_SIZE = 100;

const getStatusStyles = (Colors: ThemeColors): Record<AppointmentStatus, { bg: string; color: string }> => ({
  Cancelled: { bg: Colors.errorBg, color: Colors.error },
  "Checked In": { bg: Colors.successBg, color: Colors.primaryDark },
  Completed: { bg: Colors.successBg, color: Colors.success },
  Confirmed: { bg: Colors.successBg, color: Colors.primaryDark },
  Deleted: { bg: Colors.bg2, color: Colors.text2 },
  "In Progress": { bg: Colors.infoBg, color: Colors.info },
  "In Service": { bg: Colors.bg2, color: Colors.primaryDark },
  Missed: { bg: Colors.errorBg, color: Colors.error },
  Partial: { bg: Colors.warningBg, color: Colors.warning },
  Unknown: { bg: Colors.bg2, color: Colors.text2 },
  Upcoming: { bg: Colors.warningBg, color: Colors.goldDark },
  Waiting: { bg: Colors.warningBg, color: Colors.goldDark },
});

type AppointmentFormState = {
  clientId: string;
  date: string;
  discount: string;
  duration: string;
  endTime: string;
  notes: string;
  paymentMethod: string;
  price: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  startTime: string;
  status: AppointmentStatus;
};

type ClientBookingMode = "existing" | "walkIn";

type FormErrors = Partial<Record<keyof AppointmentFormState, string>>;

type ServiceSearchQuery =
  | { kind: "invalid"; raw: string }
  | { kind: "name"; raw: string; text: string }
  | { digits: string; kind: "price"; price: number; raw: string };

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const getRejectedMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

const useAppointmentStyles = () => {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return { Colors, styles };
};

const formatCurrency = (amount: number) =>
  `Rs. ${Math.max(0, amount).toLocaleString("en-IN")}`;

const getServiceDiscount = (service: ServiceListItem) => {
  const baseDiscount = Math.max(service.discountAmount ?? 0, 0);
  const percentDiscount = Math.max(service.discountPercent ?? 0, 0);

  if (percentDiscount > 0) {
    return Math.min(service.price, (service.price * percentDiscount) / 100);
  }

  return Math.min(service.price, baseDiscount);
};

const getServiceTax = (service: ServiceListItem, taxableAmount: number) => {
  const fixedTax = Math.max(service.taxAmount ?? 0, 0);
  const taxRate = Math.max(service.taxRate ?? 0, 0);

  if (taxRate > 0) {
    return (taxableAmount * taxRate) / 100;
  }

  return fixedTax;
};

const getServicePricingTotals = (services: ServiceListItem[]) => {
  const subtotal = services.reduce((total, service) => total + Math.max(service.price, 0), 0);
  const discount = services.reduce((total, service) => total + getServiceDiscount(service), 0);
  const tax = services.reduce((total, service) => {
    const taxableAmount = Math.max(0, service.price - getServiceDiscount(service));
    return total + getServiceTax(service, taxableAmount);
  }, 0);

  return {
    discount,
    grandTotal: Math.max(0, subtotal - discount + tax),
    subtotal,
    tax,
  };
};

const formatDurationLabel = (durationMinutes: number | null) =>
  durationMinutes && durationMinutes > 0 ? `${durationMinutes} min` : "Duration pending";

const getServiceSearchQuery = (value: string): ServiceSearchQuery => {
  const raw = value.trim();

  if (!raw) {
    return { kind: "invalid", raw };
  }

  if (/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    const price = Number(raw);

    if (Number.isFinite(price) && price >= 0) {
      const normalizedPrice = Number.isInteger(price)
        ? String(price)
        : String(price).replace(/0+$/, "").replace(/\.$/, "");
      const digits = normalizedPrice.replace(/\D/g, "");

      return { digits, kind: "price", price, raw };
    }
  }

  const alphabeticCount = (raw.match(/[A-Za-z]/g) ?? []).length;

  if (alphabeticCount >= SERVICE_SEARCH_MIN_LETTERS) {
    return { kind: "name", raw, text: raw.toLowerCase() };
  }

  return { kind: "invalid", raw };
};

const getServiceSearchKey = (query: ServiceSearchQuery, salonId?: string | null) => {
  if (query.kind === "invalid") {
    return "";
  }

  return `${salonId ?? "default"}:${query.kind}:${query.kind === "price" ? query.digits : query.text}`;
};

const getPriceDigits = (price: number) => {
  const normalizedPrice = Number.isInteger(price) ? String(price) : String(price).replace(/0+$/, "");

  return normalizedPrice.replace(/\D/g, "");
};

const servicePriceMatches = (servicePrice: number, query: Extract<ServiceSearchQuery, { kind: "price" }>) =>
  getPriceDigits(servicePrice).includes(query.digits);

const serviceCatalogCache = new Map<string, Promise<ServiceListItem[]> | ServiceListItem[]>();

const getServiceCatalogCacheKey = (salonId?: string | null) => salonId ?? "default";

const addUniqueServices = (
  target: ServiceListItem[],
  services: ServiceListItem[],
  seenServiceIds: Set<string>,
) => {
  let addedCount = 0;

  services.forEach((service) => {
    if (seenServiceIds.has(service.id)) {
      return;
    }

    seenServiceIds.add(service.id);
    target.push(service);
    addedCount += 1;
  });

  return addedCount;
};

const fetchServiceCatalog = async (salonId?: string | null) => {
  const cacheKey = getServiceCatalogCacheKey(salonId);
  const cachedServices = serviceCatalogCache.get(cacheKey);

  if (cachedServices) {
    return cachedServices instanceof Promise ? await cachedServices : cachedServices;
  }

  const catalogRequest = (async () => {
    const services: ServiceListItem[] = [];
    const seenServiceIds = new Set<string>();

    for (let page = 1; page <= SERVICE_CATALOG_MAX_PAGES; page += 1) {
      const response = await serviceService.getServices(
        {
          limit: SERVICE_CATALOG_PAGE_SIZE,
          offset: (page - 1) * SERVICE_CATALOG_PAGE_SIZE,
          search: "",
          sort_by: "created_at",
          sort_order: "desc",
        },
        salonId,
      );
      const addedCount = addUniqueServices(services, response.services, seenServiceIds);

      if (response.services.length < SERVICE_CATALOG_PAGE_SIZE || addedCount === 0) {
        break;
      }
    }

    return services;
  })();

  serviceCatalogCache.set(cacheKey, catalogRequest);

  try {
    const services = await catalogRequest;

    serviceCatalogCache.set(cacheKey, services);
    return services;
  } catch (error) {
    serviceCatalogCache.delete(cacheKey);
    throw error;
  }
};

const filterServicesByQuery = (services: ServiceListItem[], query: ServiceSearchQuery) => {
  if (query.kind === "name") {
    return services.filter((service) => service.name.toLowerCase().includes(query.text));
  }

  if (query.kind === "price") {
    return services.filter((service) => servicePriceMatches(service.price, query));
  }

  return [];
};

const searchServicesByName = async (
  query: Extract<ServiceSearchQuery, { kind: "name" }>,
  salonId?: string | null,
) => {
  const response = await serviceService.getServices(
    {
      limit: SERVICE_SEARCH_NAME_RESULT_LIMIT,
      offset: 0,
      search: query.text,
      sort_by: "name",
      sort_order: "asc",
    },
    salonId,
  );

  // The API's `search` semantics aren't documented, so re-apply the exact
  // case-insensitive contains rule client-side as a correctness backstop.
  return response.services.filter((service) => service.name.toLowerCase().includes(query.text));
};

// The backend sends appointment timestamps in a variety of shapes
// (Postgres-style "YYYY-MM-DD HH:MM:SS+00" with a space instead of "T", a
// bare 2-digit UTC offset instead of "+00:00", or no offset at all). Some of
// these are not spec-compliant ISO 8601, and React Native's JS engine
// (Hermes) fails to parse them where a browser's V8 engine might leniently
// succeed — which is why raw strings like "2026-07-09 14:30:00+00" could
// leak straight to the UI. This normalizes to a strict ISO 8601 string
// before parsing so every appointment timestamp parses reliably on-device.
const toStrictIsoDateTime = (value: string) => {
  let normalized = value.trim();

  if (normalized.includes(" ") && !normalized.includes("T")) {
    normalized = normalized.replace(" ", "T");
  }

  // A bare 2-digit offset ("+00", "-05") right after the time component
  // isn't valid ISO 8601 — pad it to "+00:00" form.
  normalized = normalized.replace(/(T\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2})$/, "$1$2:00");

  // No "Z" and no explicit offset at all: this backend's naive timestamps
  // represent UTC, so make that explicit rather than letting the engine
  // assume local time.
  if (normalized.includes("T") && !/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized += "Z";
  }

  return normalized;
};

const parseAppointmentDateTime = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(toStrictIsoDateTime(value));

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

// Deterministic 12-hour "H:MM AM/PM" formatting (e.g. "9:00 AM", "2:30 PM").
// Built manually rather than via Intl.DateTimeFormat, whose AM/PM casing
// isn't guaranteed consistent across the ICU data bundled with different JS
// engines (Hermes on-device vs. the tooling this was verified with).
const formatHourMinuteAmPm = (date: Date) => {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${minutes} ${ampm}`;
};

const formatTimeLabel = (value: string | null) => {
  const parsedDate = parseAppointmentDateTime(value);

  if (!parsedDate) {
    return "--:--";
  }

  return formatHourMinuteAmPm(parsedDate);
};

const getDateKey = (value: string | null) => {
  const parsedDate = parseAppointmentDateTime(value);

  if (!parsedDate) {
    return value ? value.slice(0, 10) : "";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toInputDate = (value: string | null) => getDateKey(value) || todayIsoDate();

const toInputTime = (value: string | null) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value.slice(0, 5);
  }

  return `${String(parsedDate.getHours()).padStart(2, "0")}:${String(
    parsedDate.getMinutes(),
  ).padStart(2, "0")}`;
};

const combineDateTime = (date: string, time: string) => {
  if (!date || !time) {
    return "";
  }

  return new Date(`${date}T${time}:00`).toISOString();
};

const addMinutesToTime = (date: string, startTime: string, minutes: number) => {
  if (!date || !startTime || !Number.isFinite(minutes)) {
    return "";
  }

  const parsedDate = new Date(`${date}T${startTime}:00`);
  parsedDate.setMinutes(parsedDate.getMinutes() + minutes);

  return `${String(parsedDate.getHours()).padStart(2, "0")}:${String(
    parsedDate.getMinutes(),
  ).padStart(2, "0")}`;
};

const parseClockToMinutes = (value?: string | null) => {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (twelveHour) {
    let hours = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2]);
    const ampm = twelveHour[3].toUpperCase();

    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 1 || hours > 12 || minutes > 59) {
      return null;
    }

    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  const twentyFourHour = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

  if (twentyFourHour) {
    return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
  }

  return null;
};

const minutesToDisplayTime = (minutes: number) => {
  const hours24 = Math.floor(minutes / 60);
  const minuteLabel = String(minutes % 60).padStart(2, "0");
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${minuteLabel} ${suffix}`;
};

const staffIdMatches = (staffMember: StaffMember, staffId?: string | null) =>
  Boolean(staffId && (staffMember.id === staffId || staffMember.staffIdAliases?.includes(staffId)));

const matchesAppointment = (
  appointment: AppointmentListItem,
  search: string,
  status: "All" | AppointmentStatus,
) => {
  const query = search.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  const statusMatches = appointmentStatusMatchesFilter(appointment.status, status);

  if (!statusMatches) {
    return false;
  }

  if (!query) {
    return true;
  }

  return (
    appointment.clientName.toLowerCase().includes(query) ||
    appointment.serviceName.toLowerCase().includes(query) ||
    appointment.staffName.toLowerCase().includes(query) ||
    appointment.title.toLowerCase().includes(query) ||
    (digits.length > 0 && appointment.phone.includes(digits))
  );
};

const sortBySchedule = (left: AppointmentListItem, right: AppointmentListItem) => {
  const leftTime = parseAppointmentDateTime(left.scheduledAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightTime = parseAppointmentDateTime(right.scheduledAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;

  return leftTime - rightTime;
};

// Statuses that represent an active/confirmed booking still to come.
// Completed, Partial, Cancelled, Missed, Deleted, and Unknown appointments are
// not "upcoming" and must sort after all of these, regardless of schedule time.
const ACTIVE_APPOINTMENT_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "Upcoming",
  "Confirmed",
  "Waiting",
  "Checked In",
  "In Service",
  "In Progress",
]);

const sortWithActiveFirst = (left: AppointmentListItem, right: AppointmentListItem) => {
  const leftIsActive = ACTIVE_APPOINTMENT_STATUSES.has(left.status);
  const rightIsActive = ACTIVE_APPOINTMENT_STATUSES.has(right.status);

  if (leftIsActive !== rightIsActive) {
    return leftIsActive ? -1 : 1;
  }

  return sortBySchedule(left, right);
};

const validateTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const validateDate = (value: string) => isValidIsoDate(value);

const isPastDate = (value: string) => validateDate(value) && value < todayIsoDate();

const validateForm = (form: AppointmentFormState, options?: { requireClient?: boolean }): FormErrors => {
  const errors: FormErrors = {};
  const trimmedDiscount = form.discount.trim();
  const discount = trimmedDiscount === "" ? 0 : Number(trimmedDiscount);
  const price = Number(form.price.trim() || 0);

  if (options?.requireClient !== false && !form.clientId) {
    errors.clientId = "Select a client.";
  }

  if (!form.serviceId.trim()) {
    errors.serviceName = "Select a service.";
  }

  if (!form.staffId) {
    errors.staffId = "Select a staff member.";
  }

  if (!validateDate(form.date)) {
    errors.date = "Use YYYY-MM-DD.";
  } else if (isPastDate(form.date)) {
    errors.date = "Past dates cannot be booked.";
  }

  if (!validateTime(form.startTime)) {
    errors.startTime = "Use HH:mm.";
  }

  if (trimmedDiscount && (!Number.isFinite(discount) || discount < 0)) {
    errors.discount = "Discount cannot be negative.";
  } else if (price > 0 && discount > price) {
    errors.discount = "Discount cannot be greater than the price.";
  }

  return errors;
};

const appointmentToForm = (appointment?: AppointmentListItem): AppointmentFormState => ({
  clientId: appointment?.clientId ?? "",
  date: toInputDate(appointment?.scheduledAt ?? null),
  discount: appointment?.discount ? String(appointment.discount) : "0",
  duration: appointment?.durationMinutes ? String(appointment.durationMinutes) : "",
  endTime: toInputTime(appointment?.endTime ?? null),
  notes: appointment?.notes ?? "",
  paymentMethod: appointment?.paymentMethod && appointment.paymentMethod !== "-" ? appointment.paymentMethod : "Cash",
  price: appointment?.amount ? String(appointment.amount) : "",
  serviceId: appointment?.serviceId ?? "",
  serviceName: appointment?.serviceName ?? "",
  staffId: appointment?.staffId ?? "",
  startTime: toInputTime(appointment?.startTime ?? appointment?.scheduledAt ?? null),
  status: appointment?.status ?? "Confirmed",
});

function ScreenShell({
  children,
  onRefresh,
  refreshing,
  showCreateAction = true,
  title,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  showCreateAction?: boolean;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/dashboard" as Href);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              colors={[Colors.primary]}
              onRefresh={onRefresh}
              refreshing={Boolean(refreshing)}
              tintColor={Colors.primary}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          {showCreateAction ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/bookings/new" as Href)}
              style={styles.iconButton}
            >
              <Ionicons name="add" size={20} color={Colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconButtonGhost} />
          )}
        </View>
        {children}
      </ScrollView>
      <AppointmentSnackbar />
    </SafeAreaView>
  );
}

function AppointmentSnackbar() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useAppSelector(selectAppointmentToast);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      dispatch(clearAppointmentToast());
    }, 3200);

    return () => clearTimeout(timer);
  }, [dispatch, toast]);

  if (!toast) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
      style={[styles.snackbar, { bottom: Math.max(insets.bottom, 16) }, toast.tone === "error" && styles.snackbarError]}
    >
      <Ionicons
        name={toast.tone === "error" ? "alert-circle-outline" : "checkmark-circle-outline"}
        size={18}
        color="#FFFFFF"
      />
      <Text style={styles.snackbarText}>{toast.message}</Text>
      <TouchableOpacity onPress={() => dispatch(clearAppointmentToast())}>
        <Ionicons name="close" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function StateCard({
  actionLabel,
  icon,
  message,
  onAction,
  title,
  tone = "default",
}: {
  actionLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  onAction?: () => void;
  title: string;
  tone?: "default" | "error";
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={24} color={tone === "error" ? Colors.error : Colors.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onAction} style={styles.primaryButtonSmall}>
          <Text style={styles.primaryButtonSmallText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

function SkeletonList() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.stack}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={`appointment-loading-${index}`} style={styles.card}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
      ))}
    </View>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const Colors = useThemeColors();
  const statusStyle = useMemo(() => getStatusStyles(Colors)[status], [Colors, status]);

  return <Badge bg={statusStyle.bg} color={statusStyle.color} label={status} size="sm" />;
}

function ClientAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CL";

  return <InitialsAvatar initials={initials} size={46} />;
}

function AppointmentCard({ appointment }: { appointment: AppointmentListItem }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View layout={Layout.springify().damping(18).stiffness(160)}>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => router.push(`/appointments/${appointment.id}` as Href)}
        style={styles.card}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.clientBlock}>
            <ClientAvatar name={appointment.clientName} />
            <View style={styles.clientCopy}>
              <Text numberOfLines={1} style={styles.cardTitle}>
                {appointment.clientName}
              </Text>
              <Text numberOfLines={1} style={styles.cardSubtitle}>
                {appointment.serviceName}
              </Text>
            </View>
          </View>
          <StatusBadge status={appointment.status} />
        </View>

        <View style={styles.metaGrid}>
          <MetaPill icon="person-outline" label={appointment.staffName} />
          <MetaPill icon="time-outline" label={formatTimeLabel(appointment.scheduledAt)} />
          <MetaPill icon="timer-outline" label={appointment.durationLabel} />
          <MetaPill icon="card-outline" label={appointment.paymentMethod} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amountText}>{formatCurrency(appointment.total || appointment.amount)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={14} color={Colors.text2} />
      <Text numberOfLines={1} style={styles.metaPillText}>
        {label || "-"}
      </Text>
    </View>
  );
}

function FilterBar({
  date,
  onDateChange,
  onSearchChange,
  onSelectSearchResult,
  onStatusChange,
  search,
  searchResults,
  status,
}: {
  date: string;
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSelectSearchResult?: (appointment: AppointmentListItem) => void;
  onStatusChange: (value: "All" | AppointmentStatus) => void;
  search: string;
  searchResults?: AppointmentListItem[];
  status: "All" | AppointmentStatus;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  // Additive UI-only toggle for the status chip row below — default visible
  // so nothing changes for anyone who doesn't touch this control. The chip
  // row itself, onStatusChange, and `status` are untouched.
  const [isStatusRowVisible, setIsStatusRowVisible] = useState(true);
  const showDropdown =
    isSearchFocused && search.trim().length > 0 && searchResults !== undefined;

  const dateValue = useMemo(() => {
    const parsed = new Date(`${date || todayIsoDate()}T00:00:00`);

    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [date]);

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setIsDatePickerVisible(false);
    }

    if (event.type === "dismissed" || !selected) {
      return;
    }

    const year = selected.getFullYear();
    const month = String(selected.getMonth() + 1).padStart(2, "0");
    const day = String(selected.getDate()).padStart(2, "0");

    onDateChange(`${year}-${month}-${day}`);
  };

  return (
    <View style={styles.filterPanel}>
      <WeekDayStrip date={date} onSelect={onDateChange} />

      <View style={styles.appointmentSearchRow}>
        <View style={[styles.appointmentSearchGroup, styles.appointmentSearchGroupFlex]}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={Colors.text2} />
            <TextInput
              onBlur={() => setIsSearchFocused(false)}
              onChangeText={onSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search client, service, staff or phone"
              placeholderTextColor={Colors.placeholder}
              style={styles.searchInput}
              value={search}
            />
            {search ? (
              <TouchableOpacity onPress={() => onSearchChange("")}>
                <Ionicons name="close-circle" size={18} color={Colors.text2} />
              </TouchableOpacity>
            ) : null}
          </View>

          {showDropdown ? (
            <View style={styles.appointmentSearchDropdown}>
              {searchResults.length === 0 ? (
                <View style={styles.appointmentSearchEmpty}>
                  <Text style={styles.appointmentSearchEmptyText}>
                    No matching appointments.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={styles.appointmentSearchDropdownScroll}
                >
                  {searchResults.map((appointment) => (
                    <TouchableOpacity
                      key={appointment.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setIsSearchFocused(false);
                        onSelectSearchResult?.(appointment);
                      }}
                      style={styles.appointmentSearchItem}
                    >
                      <Text numberOfLines={1} style={styles.appointmentSearchItemTitle}>
                        {appointment.clientName}
                      </Text>
                      <Text numberOfLines={1} style={styles.appointmentSearchItemMeta}>
                        {[
                          formatTimeLabel(appointment.scheduledAt),
                          appointment.serviceName,
                          appointment.staffName,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          accessibilityLabel={isStatusRowVisible ? "Hide status filters" : "Show status filters"}
          activeOpacity={0.82}
          onPress={() => setIsStatusRowVisible((current) => !current)}
          style={[styles.filterToggleButton, isStatusRowVisible && styles.filterToggleButtonActive]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={isStatusRowVisible ? "#FFFFFF" : Colors.text2}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => setIsDatePickerVisible(true)}
        style={styles.dateInputRow}
      >
        <Ionicons name="calendar-outline" size={18} color={Colors.text2} />
        <Text style={styles.dateInput}>{date || "YYYY-MM-DD"}</Text>
      </TouchableOpacity>

      {isDatePickerVisible && Platform.OS === "android" ? (
        <DateTimePicker mode="date" onChange={handleDateChange} value={dateValue} />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setIsDatePickerVisible(false)}
          transparent
          visible={isDatePickerVisible}
        >
          <Pressable onPress={() => setIsDatePickerVisible(false)} style={styles.modalBackdrop}>
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <DateTimePicker
                display="spinner"
                mode="date"
                onChange={handleDateChange}
                value={dateValue}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setIsDatePickerVisible(false)}
                  style={styles.primaryButtonCompact}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {isStatusRowVisible ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {STATUS_FILTERS.map((filter) => {
              const isActive = filter === status;

              return (
                <TouchableOpacity
                  key={filter}
                  activeOpacity={0.82}
                  onPress={() => onStatusChange(filter)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function WeekDayStrip({ date, onSelect }: { date: string; onSelect: (value: string) => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const days = useMemo(() => {
    const anchor = new Date(`${date || todayIsoDate()}T00:00:00`);

    if (Number.isNaN(anchor.getTime())) {
      anchor.setTime(Date.now());
    }

    // Monday-start week containing `anchor`.
    const dayOfWeek = anchor.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - diffToMonday);

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);

      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, "0");
      const dayOfMonth = String(day.getDate()).padStart(2, "0");

      return {
        dayNumber: day.getDate(),
        key: `${year}-${month}-${dayOfMonth}`,
        label: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(day),
      };
    });
  }, [date]);

  return (
    <ScrollView contentContainerStyle={styles.weekStripRow} horizontal showsHorizontalScrollIndicator={false}>
      {days.map((day) => {
        const isActive = day.key === date;

        return (
          <TouchableOpacity
            key={day.key}
            activeOpacity={0.82}
            onPress={() => onSelect(day.key)}
            style={[styles.weekDayPill, isActive && styles.weekDayPillActive]}
          >
            <Text style={[styles.weekDayLabel, isActive && styles.weekDayLabelActive]}>{day.label}</Text>
            <Text style={[styles.weekDayNumber, isActive && styles.weekDayNumberActive]}>{day.dayNumber}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.summaryTile}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function useAppointmentListFilters() {
  const queryState = useAppSelector(selectAppointmentsQuery);
  const [date, setDate] = useState(queryState.date ?? todayIsoDate());
  const [search, setSearch] = useState(queryState.search);
  const [status, setStatus] = useState<"All" | AppointmentStatus>("All");

  return {
    date,
    search,
    setDate,
    setSearch,
    setStatus,
    status,
  };
}

function useFetchAppointments() {
  const dispatch = useAppDispatch();
  const pagination = useAppSelector(selectAppointmentsPagination);
  const query = useAppSelector(selectAppointmentsQuery);

  const fetchAppointments = useCallback(
    async ({
      date,
      limit,
      page = 1,
      refresh = false,
      reset = false,
      search = "",
      status = "All",
    }: {
      date?: string;
      limit?: number;
      page?: number;
      refresh?: boolean;
      reset?: boolean;
      search?: string;
      status?: "All" | AppointmentStatus;
    } = {}) => {
      await dispatch(
        fetchAppointmentsThunk({
          date: date || undefined,
          limit: limit ?? query.limit,
          page,
          refresh,
          reset,
          search,
          sort_by: query.sort_by,
          sort_order: query.sort_order,
          status: status && status !== "All" ? appointmentStatusToListApiValue(status) : undefined,
        }),
      );
    },
    [dispatch, query.limit, query.sort_by, query.sort_order],
  );

  const fetchNext = useCallback(
    async (params: { date?: string; search?: string; status?: "All" | AppointmentStatus }) => {
      if (!pagination.hasMore) {
        return;
      }

      await fetchAppointments({
        ...params,
        page: pagination.nextPage,
      });
    },
    [fetchAppointments, pagination.hasMore, pagination.nextPage],
  );

  return { fetchAppointments, fetchNext };
}

export function AppointmentDashboardScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const appointments = useAppSelector(selectAppointments);
  const error = useAppSelector(selectAppointmentsError);
  const loading = useAppSelector(selectAppointmentsIsLoading);
  const loadingMore = useAppSelector(selectAppointmentsLoadingMore);
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
        <TouchableOpacity activeOpacity={0.8} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
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
            {!loading && !error ? <CalendarPreview appointments={filtered} date={date} /> : null}
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

export function AppointmentListScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const appointments = useAppSelector(selectAppointments);
  const error = useAppSelector(selectAppointmentsError);
  const loading = useAppSelector(selectAppointmentsIsLoading);
  const loadingMore = useAppSelector(selectAppointmentsLoadingMore);
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
                onPress={() => router.replace("/bookings" as Href)}
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={18} color={Colors.primary} />
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
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={Colors.primary} />
            </View>
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

function CalendarPreview({
  appointments,
  date,
}: {
  appointments: AppointmentListItem[];
  date: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [view, setView] = useState<AppointmentCalendarView>("day");
  const grouped = useMemo(() => {
    const map = new Map<string, AppointmentListItem[]>();

    appointments.forEach((appointment) => {
      const key = getDateKey(appointment.scheduledAt) || date;
      map.set(key, [...(map.get(key) ?? []), appointment]);
    });

    return Array.from(map.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [appointments, date]);

  return (
    <View style={styles.calendarCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Calendar View</Text>
        <View style={styles.segmented}>
          {(["day", "week", "month"] as AppointmentCalendarView[]).map((option) => (
            <TouchableOpacity
              key={option}
              activeOpacity={0.84}
              onPress={() => setView(option)}
              style={[styles.segment, view === option && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, view === option && styles.segmentTextActive]}>
                {option[0].toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {grouped.length === 0 ? (
        <Text style={styles.calendarEmpty}>No appointments to plot.</Text>
      ) : (
        grouped.slice(0, view === "day" ? 1 : view === "week" ? 7 : 31).map(([day, items]) => (
          <View key={day} style={styles.calendarRow}>
            <View style={styles.calendarDate}>
              <Text style={styles.calendarDay}>{new Date(`${day}T00:00:00`).getDate()}</Text>
              <Text style={styles.calendarMonth}>
                {new Intl.DateTimeFormat("en-IN", { month: "short" }).format(
                  new Date(`${day}T00:00:00`),
                )}
              </Text>
            </View>
            <View style={styles.calendarEvents}>
              {items.sort(sortBySchedule).map((appointment) => (
                <Pressable
                  key={appointment.id}
                  onPress={() => router.push(`/appointments/${appointment.id}` as Href)}
                  style={styles.calendarEvent}
                >
                  <Text numberOfLines={1} style={styles.calendarEventTitle}>
                    {formatTimeLabel(appointment.scheduledAt)}  {appointment.clientName}
                  </Text>
                  <Text numberOfLines={1} style={styles.calendarEventMeta}>
                    {appointment.serviceName} with {appointment.staffName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function SelectField({
  error,
  label,
  options,
  value,
  onSelect,
}: {
  error?: string;
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onSelect: (value: string) => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <TouchableOpacity
                key={`${label}-${option.value}`}
                activeOpacity={0.82}
                onPress={() => onSelect(option.value)}
                style={[styles.optionChip, selected && styles.optionChipActive]}
              >
                <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function SearchableClientField({
  bookingMode,
  dropdownOpen,
  error,
  onDismiss,
  onNewClient,
  onSearchChange,
  onSelectClient,
  onSelectExisting,
  onSelectWalkIn,
  results,
  resultsError,
  resultsLoading,
  search,
  selectedClient,
  selectedClientId,
}: {
  bookingMode: ClientBookingMode;
  dropdownOpen: boolean;
  error?: string;
  onDismiss: () => void;
  onNewClient: () => void;
  onSearchChange: (value: string) => void;
  onSelectClient: (client: ClientListItem) => void;
  onSelectExisting: () => void;
  onSelectWalkIn: () => void;
  results: ClientListItem[];
  resultsError: string | null;
  resultsLoading: boolean;
  search: string;
  selectedClient: ClientListItem | undefined;
  selectedClientId: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const query = search.trim().toLowerCase();
  const showDropdown =
    dropdownOpen && bookingMode === "existing" && query.length >= CLIENT_SEARCH_MIN_LETTERS;
  const showMinimumHint =
    dropdownOpen && bookingMode === "existing" && query.length > 0 && query.length < CLIENT_SEARCH_MIN_LETTERS;

  return (
    <View style={[styles.inputGroup, styles.clientSearchGroup]}>
      <View style={styles.clientSectionHeader}>
        <Text style={styles.inputLabel}>Client</Text>
        {bookingMode === "walkIn" ? (
          <Text style={styles.clientModeHint}>Walk-in booking</Text>
        ) : selectedClient ? (
          <Text numberOfLines={1} style={styles.clientModeHint}>
            {selectedClient.fullName}
          </Text>
        ) : null}
      </View>

      <View style={styles.clientQuickActions}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onSelectExisting}
          style={[styles.clientActionChip, bookingMode === "existing" && styles.clientActionChipActive]}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color={bookingMode === "existing" ? "#FFFFFF" : Colors.text2}
          />
          <Text style={[styles.clientActionText, bookingMode === "existing" && styles.clientActionTextActive]}>
            Existing Client
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={onSelectWalkIn}
          style={[styles.clientActionChip, bookingMode === "walkIn" && styles.clientActionChipActive]}
        >
          <Ionicons
            name="walk-outline"
            size={16}
            color={bookingMode === "walkIn" ? "#FFFFFF" : Colors.text2}
          />
          <Text style={[styles.clientActionText, bookingMode === "walkIn" && styles.clientActionTextActive]}>
            Walk-in Client
          </Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.84} onPress={onNewClient} style={styles.clientActionChip}>
          <Ionicons name="person-add-outline" size={16} color={Colors.text2} />
          <Text style={styles.clientActionText}>New Client</Text>
        </TouchableOpacity>
      </View>

      {bookingMode === "existing" ? (
        <>
          <View style={styles.autocompleteAnchor}>
            <View style={[styles.searchWrap, error && styles.inputError]}>
              <Ionicons name="search-outline" size={18} color={Colors.text2} />
              <TextInput
                onChangeText={onSearchChange}
                onFocus={onSelectExisting}
                placeholder="Type at least 3 letters to search clients"
                placeholderTextColor={Colors.placeholder}
                style={styles.searchInput}
                value={search}
              />
              {search ? (
                <TouchableOpacity
                  accessibilityLabel="Clear client search"
                  activeOpacity={0.8}
                  onPress={() => {
                    onSearchChange("");
                    onDismiss();
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={Colors.text2} />
                </TouchableOpacity>
              ) : null}
            </View>

            {showDropdown ? (
              <Animated.View
                entering={FadeIn.duration(120)}
                exiting={FadeOut.duration(90)}
                style={styles.stickySearchDropdown}
              >
                {resultsError ? (
                  <View style={styles.serviceDropdownState}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                    <Text style={styles.fieldHintError}>{resultsError}</Text>
                  </View>
                ) : resultsLoading ? (
                  <View style={styles.serviceDropdownState}>
                    <ActivityIndicator color={Colors.primary} size="small" />
                    <Text style={styles.fieldHint}>Searching clients...</Text>
                  </View>
                ) : results.length === 0 ? (
                  <View style={styles.serviceDropdownState}>
                    <Ionicons name="search-outline" size={16} color={Colors.text2} />
                    <Text style={styles.fieldHint}>No clients found.</Text>
                  </View>
                ) : (
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={results.length > 4}
                    style={styles.serviceDropdownScroll}
                  >
                    {results.map((client) => {
                      const selected = client.id === selectedClientId;

                      return (
                        <TouchableOpacity
                          key={`client-${client.id}`}
                          activeOpacity={0.84}
                          onPress={() => onSelectClient(client)}
                          style={[styles.clientOptionRow, selected && styles.serviceOptionRowActive]}
                        >
                          <View style={styles.serviceOptionCopy}>
                            <Text style={[styles.serviceOptionName, selected && styles.serviceOptionNameActive]}>
                              {client.fullName}
                            </Text>
                            <Text style={[styles.serviceOptionMeta, selected && styles.serviceOptionMetaActive]}>
                              {[client.phone, client.email].filter(Boolean).join(" | ")}
                            </Text>
                          </View>
                          {selected ? <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </Animated.View>
            ) : null}
          </View>

          {!search.trim() ? (
            <Text style={styles.fieldHint}>Start typing to find an existing client.</Text>
          ) : null}
          {showMinimumHint ? (
            <Text style={styles.fieldHint}>Type at least 3 letters to search clients.</Text>
          ) : null}
        </>
      ) : null}

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function AppointmentDateField({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [visible, setVisible] = useState(false);
  const minimumDate = useMemo(() => new Date(`${todayIsoDate()}T00:00:00`), []);
  const dateValue = useMemo(() => {
    const parsed = new Date(`${value || todayIsoDate()}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);
  const displayDate = useMemo(() => {
    if (!validateDate(value)) {
      return value || "Select date";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  }, [value]);

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed" || !selected) {
      setVisible(false);
      return;
    }

    const year = selected.getFullYear();
    const month = String(selected.getMonth() + 1).padStart(2, "0");
    const day = String(selected.getDate()).padStart(2, "0");

    onChange(`${year}-${month}-${day}`);
    setVisible(false);
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Date</Text>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => setVisible(true)}
        style={[styles.dateButton, error && styles.inputError]}
      >
        <Ionicons name="calendar-outline" size={18} color={Colors.text2} />
        <Text style={styles.dateButtonText}>{displayDate}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.text2} />
      </TouchableOpacity>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      {visible && Platform.OS === "android" ? (
        <DateTimePicker minimumDate={minimumDate} mode="date" onChange={handleDateChange} value={dateValue} />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
          <Pressable onPress={() => setVisible(false)} style={styles.modalBackdrop}>
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <DateTimePicker display="inline" minimumDate={minimumDate} mode="date" onChange={handleDateChange} value={dateValue} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

function StaffAvailabilitySummary({
  availabilityLabel,
  checkedInLabel,
  checkedOutLabel,
  currentStatusLabel,
  error,
  hasStaff,
  holidayLabel,
  loading,
  onLeaveLabel,
  shiftEndLabel,
  shiftStartLabel,
  workingHoursLabel,
}: {
  availabilityLabel: string;
  checkedInLabel: string;
  checkedOutLabel: string;
  currentStatusLabel: string;
  error?: string | null;
  hasStaff: boolean;
  holidayLabel: string;
  loading: boolean;
  onLeaveLabel: string;
  shiftEndLabel: string;
  shiftStartLabel: string;
  workingHoursLabel: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const availabilityRows = [
    ["Working Hours", workingHoursLabel],
    ["Shift Start", shiftStartLabel],
    ["Shift End", shiftEndLabel],
    ["Current Status", currentStatusLabel],
    ["Available / Busy", availabilityLabel],
    ["Checked In", checkedInLabel],
    ["Checked Out", checkedOutLabel],
    ["On Leave", onLeaveLabel],
    ["Holiday", holidayLabel],
  ];

  return (
    <View style={styles.availabilityCard}>
      <View style={styles.availabilityHeader}>
        <Text style={styles.availabilityTitle}>Staff availability</Text>
        {loading ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
      </View>
      {loading ? (
        <View style={styles.availabilityRows}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={`availability-skeleton-${index}`} style={styles.availabilityRow}>
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLine} />
            </View>
          ))}
        </View>
      ) : !hasStaff ? (
        <Text style={styles.fieldHint}>Select a staff member to view availability.</Text>
      ) : (
        <View style={styles.availabilityRows}>
          {availabilityRows.map(([label, value]) => (
            <View key={label} style={styles.availabilityRow}>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowLabel}>
                {label}
              </Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowValue}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      )}
      {error ? <Text style={styles.fieldHintError}>{error}</Text> : null}
    </View>
  );
}

function AppointmentReviewSummary({
  clientLabel,
  date,
  pricingTotals,
  selectedStaff,
  services,
  startTime,
  totalDuration,
}: {
  clientLabel: string;
  date: string;
  pricingTotals: ReturnType<typeof getServicePricingTotals>;
  selectedStaff: StaffMember | undefined;
  services: ServiceListItem[];
  startTime: string;
  totalDuration: number;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const serviceLabel = services.length > 0 ? services.map((service) => service.name).join(", ") : "-";
  const dateLabel = validateDate(date)
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`))
    : "-";
  const timeLabel = validateTime(startTime) ? minutesToDisplayTime(parseClockToMinutes(startTime) ?? 0) : "-";
  const reviewRows = [
    ["Client", clientLabel],
    ["Services", serviceLabel],
    ["Assigned Staff", selectedStaff?.name ?? "-"],
    ["Date", dateLabel],
    ["Time", timeLabel],
    ["Duration", totalDuration > 0 ? `${totalDuration} min` : "-"],
    ["Subtotal", formatCurrency(pricingTotals.subtotal)],
    ["Discount", formatCurrency(pricingTotals.discount)],
    ["Tax", formatCurrency(pricingTotals.tax)],
    ["Grand Total", formatCurrency(pricingTotals.grandTotal)],
  ];

  return (
    <View style={styles.serviceBreakdownCard}>
      {reviewRows.map(([label, value]) => (
        <View key={label} style={styles.availabilityRow}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowLabel}>{label}</Text>
          <Text ellipsizeMode="tail" numberOfLines={2} style={styles.availabilityRowValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function TimeSlotSelector({
  disabledReason,
  error,
  loading,
  onSelect,
  selectedTime,
  slots,
}: {
  disabledReason?: string | null;
  error?: string;
  loading: boolean;
  onSelect: (time: string) => void;
  selectedTime: string;
  slots: { display: string; value: string }[];
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>Start Time</Text>
        {loading ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
      </View>
      {disabledReason ? <Text style={styles.fieldHint}>{disabledReason}</Text> : null}
      {!disabledReason && slots.length === 0 ? (
        <Text style={styles.fieldHint}>No available slots for this staff member and date.</Text>
      ) : null}
      {slots.length > 0 ? (
        <View style={styles.slotGrid}>
          {slots.map((slot) => {
            const selected = slot.value === selectedTime;

            return (
              <TouchableOpacity
                key={slot.value}
                activeOpacity={0.84}
                onPress={() => onSelect(slot.value)}
                style={[styles.slotChip, selected && styles.slotChipActive]}
              >
                <Text style={[styles.slotChipText, selected && styles.slotChipTextActive]}>
                  {slot.display}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function SelectedServicesPanel({
  onRemove,
  pricingTotals,
  services,
  totalDuration,
  totalPrice,
}: {
  onRemove: (serviceId: string) => void;
  pricingTotals: ReturnType<typeof getServicePricingTotals>;
  services: ServiceListItem[];
  totalDuration: number;
  totalPrice: number;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  if (services.length === 0) {
    return (
      <View style={styles.emptyInlineState}>
        <Ionicons name="sparkles-outline" size={18} color={Colors.text2} />
        <Text style={styles.fieldHint}>Search and add at least one service.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.selectedServiceRow}>
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              activeOpacity={0.84}
              onPress={() => onRemove(service.id)}
              style={[styles.selectedServiceCard, styles.selectedServiceCardActive]}
            >
              <View style={styles.selectedServiceIcon}>
                <Ionicons name="cut-outline" size={18} color={Colors.primaryDark} />
              </View>
            <View style={styles.selectedServiceCopy}>
              <Text numberOfLines={1} style={styles.selectedServiceName}>{service.name}</Text>
                <Text style={styles.selectedServiceMeta}>
                  {[service.itemType, formatDurationLabel(service.durationMinutes)].filter(Boolean).join(" | ")}
                </Text>
                <Text style={styles.selectedServicePrice}>{formatCurrency(service.price)}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel={`Remove ${service.name}`}
                activeOpacity={0.8}
                onPress={() => onRemove(service.id)}
                style={styles.removeServiceButton}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.serviceTotalsCard}>
        <View style={styles.serviceTotalItem}>
          <Ionicons name="time-outline" size={20} color={Colors.heading} />
          <View>
            <Text style={styles.availabilityLabel}>Duration</Text>
            <Text style={styles.availabilityValue}>{totalDuration} min</Text>
          </View>
        </View>
        <View style={styles.serviceTotalDivider} />
        <View style={styles.serviceTotalItem}>
          <Ionicons name="cash-outline" size={20} color={Colors.heading} />
          <View>
            <Text style={styles.availabilityLabel}>Grand Total</Text>
            <Text style={styles.availabilityValue}>{formatCurrency(totalPrice)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.serviceBreakdownCard}>
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityRowLabel}>Subtotal</Text>
          <Text style={styles.availabilityRowValue}>{formatCurrency(pricingTotals.subtotal)}</Text>
        </View>
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityRowLabel}>Discount</Text>
          <Text style={styles.availabilityRowValue}>{formatCurrency(pricingTotals.discount)}</Text>
        </View>
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityRowLabel}>Tax</Text>
          <Text style={styles.availabilityRowValue}>{formatCurrency(pricingTotals.tax)}</Text>
        </View>
      </View>
    </>
  );
}

function StaffCardSelector({
  error,
  onSelect,
  selectedStaffId,
  staffMembers,
}: {
  error?: string;
  onSelect: (staffId: string) => void;
  selectedStaffId: string;
  staffMembers: StaffMember[];
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [staffSearch, setStaffSearch] = useState("");
  const filteredStaffMembers = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();

    if (!query) {
      return staffMembers;
    }

    return staffMembers.filter((staff) =>
      [staff.name, staff.role, staff.availabilityLabel, staff.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [staffMembers, staffSearch]);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.text2} />
        <TextInput
          onChangeText={setStaffSearch}
          placeholder="Search staff"
          placeholderTextColor={Colors.placeholder}
          style={styles.searchInput}
          value={staffSearch}
        />
        {staffSearch ? (
          <TouchableOpacity
            accessibilityLabel="Clear staff search"
            activeOpacity={0.8}
            onPress={() => setStaffSearch("")}
          >
            <Ionicons name="close-circle" size={18} color={Colors.text2} />
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.staffCardRow}>
          {filteredStaffMembers.map((staff) => {
            const selected = staffIdMatches(staff, selectedStaffId);

            return (
              <TouchableOpacity
                key={staff.id}
                activeOpacity={0.84}
                onPress={() => onSelect(staff.id)}
                style={[styles.staffSelectCard, selected && styles.staffSelectCardActive]}
              >
                <InitialsAvatar initials={staff.initials} size={42} />
                <View style={styles.staffSelectCopy}>
                  <Text numberOfLines={1} style={styles.staffSelectName}>{staff.name}</Text>
                  <Text numberOfLines={1} style={styles.staffSelectRole}>{staff.role}</Text>
                </View>
                {selected ? (
                  <View style={styles.staffSelectedBadge}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      {filteredStaffMembers.length === 0 ? <Text style={styles.fieldHint}>No staff found.</Text> : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function BookingStepHeader() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const steps = ["Client", "Services", "Staff", "Date", "Time", "Review"];

  return (
    <View style={styles.bookingSteps}>
      {steps.map((step, index) => (
        <View key={step} style={styles.bookingStepItem}>
          <View style={[styles.bookingStepDot, index === 0 && styles.bookingStepDotActive]}>
            <Text style={[styles.bookingStepNumber, index === 0 && styles.bookingStepNumberActive]}>{index + 1}</Text>
          </View>
          <Text style={styles.bookingStepLabel}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

function BookingSection({
  action,
  children,
  stackIndex = 1,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  stackIndex?: number;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View entering={FadeIn.duration(180)} style={[styles.bookingSection, { zIndex: stackIndex }]}>
      <View style={styles.bookingSectionHeader}>
        <Text style={styles.bookingSectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </Animated.View>
  );
}

function SearchableServiceField({
  dropdownOpen,
  error,
  loading,
  onDismiss,
  onFocus,
  onSearchChange,
  onSelect,
  search,
  selectedServiceIds,
  services,
  serviceError,
}: {
  dropdownOpen: boolean;
  error?: string;
  loading: boolean;
  onDismiss: () => void;
  onFocus: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (service: ServiceListItem) => void;
  search: string;
  selectedServiceIds: string[];
  services: ServiceListItem[];
  serviceError: string | null;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const serviceQuery = getServiceSearchQuery(search);
  const hasValidQuery = serviceQuery.kind !== "invalid";
  const showDropdown = dropdownOpen && hasValidQuery;
  const showMinimumHint = dropdownOpen && serviceQuery.raw.length > 0 && !hasValidQuery;

  return (
    <View style={[styles.inputGroup, styles.serviceSearchGroup]}>
      <Text style={styles.inputLabel}>Service</Text>
      <View style={styles.autocompleteAnchor}>
        <View style={[styles.searchWrap, error && styles.inputError]}>
          <Ionicons name="search-outline" size={18} color={Colors.text2} />
          <TextInput
            onFocus={onFocus}
            onChangeText={onSearchChange}
            placeholder={SERVICE_SEARCH_PLACEHOLDER}
            placeholderTextColor={Colors.placeholder}
            style={styles.searchInput}
            value={search}
          />
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : search ? (
            <TouchableOpacity
              accessibilityLabel="Clear service search"
              activeOpacity={0.8}
              onPress={() => {
                onSearchChange("");
                onDismiss();
              }}
            >
              <Ionicons name="close-circle" size={18} color={Colors.text2} />
            </TouchableOpacity>
          ) : null}
        </View>

        {showDropdown ? (
          <Animated.View
            entering={FadeIn.duration(120)}
            exiting={FadeOut.duration(90)}
            style={styles.stickySearchDropdown}
          >
            {serviceError ? (
              <View style={styles.serviceDropdownState}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.fieldHintError}>{serviceError}</Text>
              </View>
            ) : loading ? (
              <View style={styles.serviceDropdownState}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.fieldHint}>Searching services...</Text>
              </View>
            ) : services.length === 0 ? (
              <View style={styles.serviceDropdownState}>
                <Ionicons name="search-outline" size={16} color={Colors.text2} />
                <Text style={styles.fieldHint}>No services found.</Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={services.length > 4}
                style={styles.serviceDropdownScroll}
              >
                {services.map((service) => {
                  const selected = selectedServiceIds.includes(service.id);

                  return (
                    <TouchableOpacity
                      key={`service-${service.id}`}
                      activeOpacity={0.84}
                      onPress={() => onSelect(service)}
                      style={[styles.serviceOptionRow, selected && styles.serviceOptionRowActive]}
                    >
                      <View style={styles.serviceOptionCopy}>
                        <HighlightedServiceName query={serviceQuery} selected={selected} value={service.name} />
                        <Text style={[styles.serviceOptionMeta, selected && styles.serviceOptionMetaActive]}>
                          {formatDurationLabel(service.durationMinutes)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.serviceOptionPrice,
                          selected && styles.serviceOptionPriceActive,
                          serviceQuery.kind === "price" &&
                            servicePriceMatches(service.price, serviceQuery) &&
                            styles.serviceOptionPriceMatch,
                        ]}
                      >
                        {formatCurrency(service.price)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        ) : null}
      </View>
      {showMinimumHint ? (
        <Text style={styles.fieldHint}>Type at least 3 letters to search services.</Text>
      ) : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function HighlightedServiceName({
  query,
  selected,
  value,
}: {
  query: ServiceSearchQuery;
  selected: boolean;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  if (query.kind !== "name") {
    return (
      <Text style={[styles.serviceOptionName, selected && styles.serviceOptionNameActive]}>
        {value}
      </Text>
    );
  }

  const matchIndex = value.toLowerCase().indexOf(query.text);

  if (matchIndex < 0) {
    return (
      <Text style={[styles.serviceOptionName, selected && styles.serviceOptionNameActive]}>
        {value}
      </Text>
    );
  }

  const before = value.slice(0, matchIndex);
  const match = value.slice(matchIndex, matchIndex + query.text.length);
  const after = value.slice(matchIndex + query.text.length);

  return (
    <Text style={[styles.serviceOptionName, selected && styles.serviceOptionNameActive]}>
      {before}
      <Text style={styles.serviceOptionNameMatch}>{match}</Text>
      {after}
    </Text>
  );
}

function TextField({
  actionLabel,
  editable = true,
  error,
  keyboardType,
  label,
  multiline,
  onActionPress,
  onChangeText,
  placeholder,
  value,
}: {
  actionLabel?: string;
  editable?: boolean;
  error?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  label: string;
  multiline?: boolean;
  onActionPress?: () => void;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {actionLabel && onActionPress ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onActionPress}>
            <Text style={styles.inputActionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TextInput
        editable={editable}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        style={[
          styles.textInput,
          !editable && styles.readOnlyInput,
          multiline && styles.textArea,
          error && styles.inputError,
        ]}
        value={value}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function AppointmentFormScreen({ mode }: { mode: "create" | "edit" }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ clientId?: string; id?: string }>();
  const appointmentId = params.id;
  const returnedClientId = typeof params.clientId === "string" ? params.clientId : "";
  const existingAppointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const mutating = useAppSelector(selectAppointmentMutating);
  const mutationError = useAppSelector(selectAppointmentMutationError);
  const clients = useAppSelector(selectClients);
  const staffMembers = useAppSelector(selectStaffMembers);
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const [errors, setErrors] = useState<FormErrors>({});
  // Form-level submission errors (e.g. missing auth context) that aren't tied
  // to any single field — kept separate from `errors` (per-field) and the
  // Redux-driven `mutationError` (thunk-rejection message) so neither one
  // gets overloaded to show a message that isn't really its own.
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<AppointmentFormState>(() => appointmentToForm(existingAppointment));
  const [clientBookingMode, setClientBookingMode] = useState<ClientBookingMode>("existing");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<ClientListItem[]>([]);
  const [clientResultsError, setClientResultsError] = useState<string | null>(null);
  const [clientResultsLoading, setClientResultsLoading] = useState(false);
  const clientCacheRef = useRef(new Map<string, ClientListItem[] | Promise<ClientListItem[]>>());
  const clientRequestIdRef = useRef(0);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState(form.serviceName);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<ServiceListItem[]>([]);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const serviceCacheRef = useRef(new Map<string, ServiceListItem[] | Promise<ServiceListItem[]>>());
  const serviceRequestIdRef = useRef(0);
  const submittingRef = useRef(false);
  // The client picked from the live search dropdown may not be one of the
  // first 50 clients loaded into Redux on mount, so it can't always be
  // resolved by id from `clients` — `handleSelectClient` stashes the full
  // record here instead. Falls back to the Redux lookup (unchanged
  // behavior) for the "new client" and "edit appointment" flows, which only
  // ever have a client id to work with.
  const [selectedClientRecord, setSelectedClientRecord] = useState<ClientListItem | undefined>(
    undefined,
  );
  const selectedClient = useMemo(
    () => selectedClientRecord ?? clients.find((client) => client.id === form.clientId),
    [clients, form.clientId, selectedClientRecord],
  );
  const selectedStaff = useMemo(
    () => staffMembers.find((staffMember) => staffIdMatches(staffMember, form.staffId)),
    [form.staffId, staffMembers],
  );
  const staffAvailability = useAppSelector((state) => selectStaffAvailability(state, form.staffId, form.date));
  const staffAvailabilityLoading = useAppSelector((state) =>
    selectStaffAvailabilityLoading(state, form.staffId, form.date),
  );
  const staffAvailabilityError = useAppSelector((state) =>
    selectStaffAvailabilityError(state, form.staffId, form.date),
  );
  const allowsWalkInClient = mode === "create" && clientBookingMode === "walkIn";
  const totalServiceDuration = useMemo(
    () => selectedServices.reduce((total, service) => total + Math.max(service.durationMinutes ?? 0, 0), 0),
    [selectedServices],
  );
  const servicePricingTotals = useMemo(
    () => getServicePricingTotals(selectedServices),
    [selectedServices],
  );
  const totalServicePrice = servicePricingTotals.grandTotal;
  const availableSlots = useMemo<StaffAvailabilitySlot[]>(
    () => (form.staffId && validateDate(form.date) ? staffAvailability?.availableSlots ?? [] : []),
    [form.date, form.staffId, staffAvailability?.availableSlots],
  );
  const staffInactiveReason = !selectedStaff
    ? null
    : selectedStaff.status === "Inactive" || selectedStaff.availability === "Offline"
      ? "This staff member is inactive."
      : selectedStaff.status === "On Leave" || selectedStaff.availability === "On Leave"
        ? "This staff member is on leave."
        : null;
  const availabilityBlockReason =
    staffAvailability?.isOnLeave
      ? "This staff member is on leave for the selected date."
      : staffAvailability?.isHoliday
        ? "This staff member is off on the selected date."
        : staffInactiveReason;
  const schedulerLoading = staffAvailabilityLoading;
  const schedulerError = staffAvailabilityError;
  const workingHoursLabel = staffAvailability?.workingHoursLabel ?? selectedStaff?.workingHours ?? "-";
  const shiftStartLabel = staffAvailability?.shiftStartLabel ?? "-";
  const shiftEndLabel = staffAvailability?.shiftEndLabel ?? "-";
  const checkedInLabel = staffAvailability?.checkedInLabel ?? "-";
  const checkedOutLabel = staffAvailability?.checkedOutLabel ?? "-";
  const onLeaveLabel = staffAvailability?.onLeaveLabel ?? (staffAvailability?.isOnLeave ? "Yes" : "-");
  const holidayLabel = staffAvailability?.holidayLabel ?? (staffAvailability?.isHoliday ? "Holiday" : "-");
  const availabilityLabel =
    schedulerLoading
      ? "Checking"
      : staffAvailability?.availabilityLabel
        ? staffAvailability.availabilityLabel
        : form.staffId && !availabilityBlockReason && availableSlots.length > 0
          ? "Available"
          : form.staffId
            ? "Busy"
            : "-";
  const staffAvailabilityStatus = staffAvailability?.currentStatusLabel
    ? staffAvailability.currentStatusLabel
    : staffInactiveReason
      ? "Inactive"
      : schedulerLoading
        ? "Checking"
        : availableSlots.length > 0
          ? "Available"
          : form.staffId
            ? "Busy"
            : "Select staff";
  const slotDisabledReason = !form.staffId
    ? "Select a staff member to view slots."
    : selectedServices.length === 0
      ? "Select a service to calculate available slots."
      : totalServiceDuration <= 0
        ? "Selected service has no duration configured."
        : availabilityBlockReason
          ? availabilityBlockReason
          : !staffAvailability && !schedulerLoading
            ? "Availability is not loaded for this staff member."
            : null;
  useEffect(() => {
    if (!__DEV__ || !form.staffId) {
      return;
    }

    console.log("[StaffAvailability UI] Render props", {
      availabilityBlockReason,
      availableSlotsCount: availableSlots.length,
      formDate: form.date,
      selectedStaff,
      staffAvailability,
      uiProps: {
        availabilityLabel,
        checkedInLabel,
        checkedOutLabel,
        currentStatusLabel: staffAvailabilityStatus,
        error: schedulerError,
        holidayLabel,
        loading: schedulerLoading,
        onLeaveLabel,
        shiftEndLabel,
        shiftStartLabel,
        slotDisabledReason,
        workingHoursLabel,
      },
    });
  }, [
    availabilityBlockReason,
    availabilityLabel,
    availableSlots.length,
    checkedInLabel,
    checkedOutLabel,
    form.date,
    form.staffId,
    holidayLabel,
    onLeaveLabel,
    schedulerError,
    schedulerLoading,
    selectedStaff,
    staffAvailability,
    shiftEndLabel,
    shiftStartLabel,
    slotDisabledReason,
    staffAvailabilityStatus,
    workingHoursLabel,
  ]);
  const formIsValid = useMemo(
    () => Object.keys(validateForm(form, { requireClient: !allowsWalkInClient })).length === 0,
    [allowsWalkInClient, form],
  );
  const selectedSlotIsAvailable = availableSlots.some((slot) => slot.value === form.startTime);
  const bookingReady = formIsValid && selectedSlotIsAvailable && !schedulerLoading;
  const refreshStaffAvailability = useCallback(() => {
    setAvailabilityRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    void dispatch(fetchClientsThunk({ limit: 50, offset: 0, reset: true }));
    void dispatch(fetchStaffThunk({ limit: 50, page: 1, reset: true }));
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      refreshStaffAvailability();
    }, [refreshStaffAvailability]),
  );

  useAppForeground(refreshStaffAvailability);

  useEffect(
    () =>
      addRealtimeEntityChangedListener(({ entity, payload }) => {
        if (
          form.staffId &&
          STAFF_AVAILABILITY_REALTIME_ENTITIES.has(entity) &&
          realtimePayloadMatchesStaff(payload, form.staffId)
        ) {
          refreshStaffAvailability();
        }
      }),
    [form.staffId, refreshStaffAvailability],
  );

  useEffect(() => {
    if (!form.staffId || !validateDate(form.date)) {
      return;
    }

    void dispatch(fetchStaffAvailabilityThunk({ date: form.date, staffId: form.staffId }));
  }, [activeBranchId, availabilityRefreshKey, dispatch, form.date, form.staffId]);

  useEffect(() => {
    setForm((current) => {
      if (!current.startTime && !current.endTime) {
        return current;
      }

      return {
        ...current,
        endTime: "",
        startTime: "",
      };
    });
    setErrors((current) => ({ ...current, startTime: undefined }));
  }, [form.date, form.staffId]);

  useEffect(() => {
    if (!form.startTime) {
      return;
    }

    const selectedSlot = availableSlots.some((slot) => slot.value === form.startTime);

    if (!selectedSlot) {
      setForm((current) => ({
        ...current,
        endTime: "",
        startTime: "",
      }));
    }
  }, [availableSlots, form.startTime]);

  useEffect(() => {
    if (
      form.startTime ||
      schedulerLoading ||
      availableSlots.length === 0 ||
      selectedServices.length === 0 ||
      !form.staffId
    ) {
      return;
    }

    const firstSlot = availableSlots[0];

    setForm((current) => ({
      ...current,
      endTime: firstSlot.endTime ?? "",
      startTime: firstSlot.value,
    }));
    setErrors((current) => ({ ...current, endTime: undefined, startTime: undefined }));
  }, [
    availableSlots,
    form.date,
    form.staffId,
    form.startTime,
    schedulerLoading,
    selectedServices.length,
  ]);

  useEffect(() => {
    const query = getServiceSearchQuery(serviceSearch);

    if (!serviceDropdownOpen || query.kind === "invalid") {
      serviceRequestIdRef.current += 1;
      setServiceLoading(false);
      setServiceError(null);
      setServices([]);
      return;
    }

    const queryKey = getServiceSearchKey(query, activeBranchId);
    const cached = serviceCacheRef.current.get(queryKey);

    const applyServices = (requestId: number, matchingServices: ServiceListItem[]) => {
      if (serviceRequestIdRef.current !== requestId) {
        return;
      }

      setServices(matchingServices);
      setServiceError(null);
      setServiceLoading(false);
    };

    const applyFailure = (requestId: number, error: unknown) => {
      if (serviceRequestIdRef.current !== requestId) {
        return;
      }

      setServiceError(getApiErrorMessage(error));
      setServices([]);
      setServiceLoading(false);
    };

    if (cached) {
      // Already resolved, or already in flight from a previous focus/blur cycle for
      // the same query — reuse it instead of firing a duplicate network request.
      const requestId = serviceRequestIdRef.current + 1;
      serviceRequestIdRef.current = requestId;
      setServiceError(null);

      if (Array.isArray(cached)) {
        setServiceLoading(false);
        setServices(cached);
      } else {
        setServiceLoading(true);
        cached.then(
          (matchingServices) => applyServices(requestId, matchingServices),
          (error) => applyFailure(requestId, error),
        );
      }

      return;
    }

    const requestId = serviceRequestIdRef.current + 1;
    serviceRequestIdRef.current = requestId;
    setServiceLoading(true);
    setServiceError(null);

    const timeout = setTimeout(() => {
      const searchPromise =
        query.kind === "name"
          ? searchServicesByName(query, activeBranchId)
          : fetchServiceCatalog(activeBranchId).then((catalog) =>
              filterServicesByQuery(catalog, query),
            );

      serviceCacheRef.current.set(queryKey, searchPromise);

      searchPromise.then(
        (matchingServices) => {
          serviceCacheRef.current.set(queryKey, matchingServices);
          applyServices(requestId, matchingServices);
        },
        (error) => {
          serviceCacheRef.current.delete(queryKey);
          applyFailure(requestId, error);
        },
      );
    }, SERVICE_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [activeBranchId, serviceDropdownOpen, serviceSearch]);

  // Client search must hit the backend rather than filtering only the first
  // page of clients loaded into Redux (`fetchClientsThunk({ limit: 50 })` on
  // mount) — otherwise any client beyond that first batch is unfindable here.
  // Mirrors the service-search caching/debounce pattern above.
  useEffect(() => {
    const trimmedSearch = clientSearch.trim();

    if (
      !clientDropdownOpen ||
      clientBookingMode !== "existing" ||
      trimmedSearch.length < CLIENT_SEARCH_MIN_LETTERS
    ) {
      clientRequestIdRef.current += 1;
      setClientResultsLoading(false);
      setClientResultsError(null);
      setClientResults([]);
      return;
    }

    const queryKey = `${activeBranchId ?? "default"}:${trimmedSearch.toLowerCase()}`;
    const cached = clientCacheRef.current.get(queryKey);

    const applyResults = (requestId: number, matchingClients: ClientListItem[]) => {
      if (clientRequestIdRef.current !== requestId) {
        return;
      }

      setClientResults(matchingClients);
      setClientResultsError(null);
      setClientResultsLoading(false);
    };

    const applyFailure = (requestId: number, error: unknown) => {
      if (clientRequestIdRef.current !== requestId) {
        return;
      }

      setClientResultsError(getApiErrorMessage(error));
      setClientResults([]);
      setClientResultsLoading(false);
    };

    if (cached) {
      const requestId = clientRequestIdRef.current + 1;
      clientRequestIdRef.current = requestId;
      setClientResultsError(null);

      if (Array.isArray(cached)) {
        setClientResultsLoading(false);
        setClientResults(cached);
      } else {
        setClientResultsLoading(true);
        cached.then(
          (matchingClients) => applyResults(requestId, matchingClients),
          (error) => applyFailure(requestId, error),
        );
      }

      return;
    }

    const requestId = clientRequestIdRef.current + 1;
    clientRequestIdRef.current = requestId;
    setClientResultsLoading(true);
    setClientResultsError(null);

    const timeout = setTimeout(() => {
      const searchPromise = clientService
        .searchClients(
          {
            inactive: false,
            limit: CLIENT_SEARCH_RESULT_LIMIT,
            offset: 0,
            search: trimmedSearch,
            sort_by: "full_name",
            sort_order: "asc",
          },
          activeBranchId,
        )
        .then((response) => response.clients);

      clientCacheRef.current.set(queryKey, searchPromise);

      searchPromise.then(
        (matchingClients) => {
          clientCacheRef.current.set(queryKey, matchingClients);
          applyResults(requestId, matchingClients);
        },
        (error) => {
          clientCacheRef.current.delete(queryKey);
          applyFailure(requestId, error);
        },
      );
    }, CLIENT_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [activeBranchId, clientBookingMode, clientDropdownOpen, clientSearch]);

  useEffect(() => {
    if (mode === "edit" && appointmentId && !existingAppointment) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointmentId, dispatch, existingAppointment, mode]);

  useEffect(() => {
    if (existingAppointment) {
      setForm(appointmentToForm(existingAppointment));
      setSelectedServices([
        {
          category: null,
          categoryId: null,
          createdAt: null,
          durationMinutes: existingAppointment.durationMinutes,
          id: existingAppointment.serviceId || "existing-service",
          isActive: true,
          name: existingAppointment.serviceName,
          price: existingAppointment.amount,
        },
      ]);
      setClientBookingMode("existing");
      setClientSearch(existingAppointment.clientName);
      setClientDropdownOpen(false);
      setServiceSearch(existingAppointment.serviceName);
      setServiceDropdownOpen(false);
    }
  }, [existingAppointment]);

  useEffect(() => {
    if (!returnedClientId || mode !== "create") {
      return;
    }

    let cancelled = false;
    setClientBookingMode("existing");
    setClientDropdownOpen(false);
    setForm((current) => ({
      ...current,
      clientId: returnedClientId,
    }));
    setErrors((current) => ({ ...current, clientId: undefined }));

    const existingClient = clients.find((client) => client.id === returnedClientId);

    if (existingClient) {
      setSelectedClientRecord(existingClient);
      setClientSearch(existingClient.fullName);
      return;
    }

    void dispatch(fetchClientByIdThunk(returnedClientId)).then((result) => {
      if (!cancelled && fetchClientByIdThunk.fulfilled.match(result)) {
        setSelectedClientRecord(result.payload);
        setClientSearch(result.payload.fullName);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clients, dispatch, mode, returnedClientId]);

  useEffect(() => {
    if (!selectedClient || clientBookingMode !== "existing") {
      return;
    }

    setClientSearch(selectedClient.fullName);
  }, [clientBookingMode, selectedClient]);

  useEffect(() => {
    const firstService = selectedServices[0];
    const nextDuration = selectedServices.reduce(
      (total, service) => total + Math.max(service.durationMinutes ?? 0, 0),
      0,
    );
    const nextPrice = getServicePricingTotals(selectedServices).grandTotal;

    setForm((current) => {
      const next = {
        ...current,
        duration: nextDuration > 0 ? String(nextDuration) : "",
        price: String(nextPrice),
        serviceId: firstService?.id ?? "",
        serviceName: selectedServices.map((service) => service.name).join(", "),
      };

      if (selectedServices.length === 0) {
        next.endTime = "";
        next.startTime = "";
      }

      return next;
    });
  }, [selectedServices]);

  const updateForm = (key: keyof AppointmentFormState, value: string) => {
    setForm((current) => {
      return { ...current, [key]: value };
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleServiceSearchChange = (value: string) => {
    setServiceSearch(value);
    setServiceDropdownOpen(Boolean(value.trim()));
    if (selectedServices.length === 0) {
      setForm((current) => ({
        ...current,
        serviceId: "",
        serviceName: value,
      }));
    }
    setErrors((current) => ({ ...current, serviceName: undefined }));
  };

  const dismissServiceDropdown = () => {
    setServiceDropdownOpen(false);
  };

  const dismissClientDropdown = () => {
    setClientDropdownOpen(false);
  };

  const handleSelectWalkInClient = () => {
    if (mode !== "create") {
      return;
    }

    setClientBookingMode("walkIn");
    setClientDropdownOpen(false);
    setClientSearch("Walk-in Client");
    setSelectedClientRecord(undefined);
    setForm((current) => ({
      ...current,
      clientId: "",
    }));
    setErrors((current) => ({ ...current, clientId: undefined }));
    setFormSubmitError(null);
  };

  const handleSelectExistingClientMode = () => {
    setClientBookingMode("existing");
    setClientDropdownOpen(true);
    if (clientSearch === "Walk-in Client") {
      setClientSearch("");
    }
  };

  const handleClientSearchChange = (value: string) => {
    setClientBookingMode("existing");
    setClientSearch(value);
    setClientDropdownOpen(Boolean(value.trim()));
    setSelectedClientRecord(undefined);
    setForm((current) => ({
      ...current,
      clientId: "",
    }));
    setErrors((current) => ({ ...current, clientId: undefined }));
  };

  const handleSelectClient = (client: ClientListItem) => {
    setClientBookingMode("existing");
    setClientSearch(client.fullName);
    setClientDropdownOpen(false);
    setSelectedClientRecord(client);
    setForm((current) => ({
      ...current,
      clientId: client.id,
    }));
    setErrors((current) => ({ ...current, clientId: undefined }));
    setFormSubmitError(null);
  };

  const handleNewClient = () => {
    router.push({ pathname: "/clients/new", params: { returnTo: "booking" } } as Href);
  };

  const handleSelectService = (service: ServiceListItem) => {
    setSelectedServices((current) => {
      if (current.some((selectedService) => selectedService.id === service.id)) {
        return current.filter((selectedService) => selectedService.id !== service.id);
      }

      return [...current, service];
    });
    setServiceDropdownOpen(false);
    setErrors((current) => ({
      ...current,
      duration: undefined,
      price: undefined,
      serviceName: undefined,
    }));
  };

  const handleRemoveSelectedService = (serviceId: string) => {
    setSelectedServices((current) => current.filter((service) => service.id !== serviceId));
  };

  const handleSelectStaff = (staffId: string) => {
    setForm((current) => ({
      ...current,
      endTime: "",
      staffId: current.staffId === staffId ? "" : staffId,
      startTime: "",
    }));
    setErrors((current) => ({ ...current, staffId: undefined, startTime: undefined }));
  };

  const handleSelectSlot = (startTime: string) => {
    const selectedSlot = availableSlots.find((slot) => slot.value === startTime);

    setForm((current) => ({
      ...current,
      endTime: selectedSlot?.endTime ?? "",
      startTime,
    }));
    setErrors((current) => ({
      ...current,
      endTime: undefined,
      startTime: undefined,
    }));
  };

  const handleSubmit = async () => {
    if (submittingRef.current || mutating) {
      return;
    }

    const clientId = form.clientId;
    const isWalkInClient = mode === "create" && clientBookingMode === "walkIn";
    const nextErrors = validateForm(form, { requireClient: !isWalkInClient });

    setErrors(nextErrors);
    setFormSubmitError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!clientId && !isWalkInClient) {
      setFormSubmitError("Select a client or choose Walk-in Client before creating the appointment.");
      return;
    }

    const selectedSlot = availableSlots.find((slot) => slot.value === form.startTime);

    if (!selectedSlot) {
      setErrors((current) => ({
        ...current,
        startTime: "Select an available time slot.",
      }));
      return;
    }

    if (schedulerLoading) {
      setFormSubmitError("Availability is still loading. Please wait a moment.");
      return;
    }

    const selectedServicesDuration = selectedServices.reduce(
      (total, service) => total + Math.max(Math.trunc(service.durationMinutes ?? 0), 0),
      0,
    );
    const formDurationNumber = Number(form.duration);
    const durationMinutes =
      selectedServicesDuration > 0
        ? selectedServicesDuration
        : Number.isInteger(formDurationNumber) && formDurationNumber > 0
          ? formDurationNumber
          : 0;

    if (durationMinutes <= 0) {
      setErrors((current) => ({
        ...current,
        duration: "Selected service duration is required.",
      }));
      setFormSubmitError("Selected service duration is required before booking.");
      return;
    }

    const priceNumber = Number(form.price || 0);
    const calculatedPrice = Number.isFinite(priceNumber) && priceNumber >= 0 ? priceNumber : 0;
    const calculatedDiscount = Math.max(
      Number.isFinite(Number(form.discount || 0)) ? Number(form.discount || 0) : 0,
      servicePricingTotals.discount,
    );
    const calculatedEndTime = selectedSlot.endTime ?? form.endTime;

    const payload: Omit<CreateAppointmentRequest, "salon_id"> = {
      duration_minutes: durationMinutes,
      end_time: combineDateTime(form.date, calculatedEndTime || selectedSlot.value),
      ...(calculatedDiscount > 0 ? { discount: calculatedDiscount } : {}),
      notes: form.notes.trim() || undefined,
      price: calculatedPrice,
      scheduled_at: combineDateTime(form.date, selectedSlot.value),
      service_id: form.serviceId.trim() || undefined,
      service_name: form.serviceName.trim() || undefined,
      staff_id: form.staffId,
      start_time: combineDateTime(form.date, selectedSlot.value),
      status: appointmentStatusToApiValue(form.status),
    };

    if (!isWalkInClient) {
      payload.client_id = clientId;
    }

    if (mode === "edit") {
      payload.discount = calculatedDiscount;
      payload.payment_method = form.paymentMethod;
    }

    submittingRef.current = true;

    const result =
      mode === "create"
        ? await dispatch(createAppointmentThunk(payload))
        : appointmentId
          ? await dispatch(
              updateAppointmentThunk({
                appointmentId,
                updates: payload as Omit<UpdateAppointmentRequest, "salon_id">,
              }),
            )
          : null;

    submittingRef.current = false;

    if (!result) {
      return;
    }

    if (createAppointmentThunk.rejected.match(result) || updateAppointmentThunk.rejected.match(result)) {
      // The Redux slice already stores this same message as `mutationError`
      // (rendered below), so nothing further to set here.
      return;
    }

    const savedId = result.payload.appointment.id;
    if (mode === "create") {
      void dispatch(fetchAppointmentsThunk({ refresh: true }));
      void dispatch(fetchDashboardThunk());
    }
    refreshStaffAvailability();
    router.replace(`/appointments/${savedId}` as Href);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.content, styles.bookingContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/bookings" as Href))}
              style={styles.iconButton}
            >
              <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{mode === "create" ? "Create Appointment" : "Edit Appointment"}</Text>
            <View style={styles.iconButtonGhost} />
          </View>
          <BookingStepHeader />

          <View style={styles.bookingFlow}>
            {clientDropdownOpen || serviceDropdownOpen ? (
              <Pressable
                accessibilityLabel="Close open picker"
                onPress={() => {
                  dismissClientDropdown();
                  dismissServiceDropdown();
                }}
                style={styles.formDismissOverlay}
              />
            ) : null}

            <BookingSection stackIndex={clientDropdownOpen ? 40 : 5} title="1. Select Client">
              <SearchableClientField
                bookingMode={clientBookingMode}
                dropdownOpen={clientDropdownOpen}
                error={errors.clientId}
                onDismiss={dismissClientDropdown}
                onNewClient={handleNewClient}
                onSearchChange={handleClientSearchChange}
                onSelectClient={handleSelectClient}
                onSelectExisting={handleSelectExistingClientMode}
                onSelectWalkIn={handleSelectWalkInClient}
                results={clientResults}
                resultsError={clientResultsError}
                resultsLoading={clientResultsLoading}
                search={clientSearch}
                selectedClient={selectedClient}
                selectedClientId={form.clientId}
              />
            </BookingSection>

            <BookingSection
              action={<Text style={styles.bookingSectionAction}>+ Add Service</Text>}
              stackIndex={serviceDropdownOpen ? 40 : 4}
              title="2. Select Services"
            >
              <SearchableServiceField
                dropdownOpen={serviceDropdownOpen}
                error={errors.serviceName}
                loading={serviceLoading}
                onDismiss={dismissServiceDropdown}
                onFocus={() => setServiceDropdownOpen(Boolean(serviceSearch.trim()))}
                onSearchChange={handleServiceSearchChange}
                onSelect={handleSelectService}
                search={serviceSearch}
                selectedServiceIds={selectedServices.map((service) => service.id)}
                serviceError={serviceError}
                services={services}
              />
              <SelectedServicesPanel
                onRemove={handleRemoveSelectedService}
                pricingTotals={servicePricingTotals}
                services={selectedServices}
                totalDuration={totalServiceDuration}
                totalPrice={totalServicePrice}
              />
            </BookingSection>

            <BookingSection title="3. Select Staff">
              <StaffCardSelector
                error={errors.staffId}
                onSelect={handleSelectStaff}
                selectedStaffId={form.staffId}
                staffMembers={staffMembers}
              />
              {form.staffId ? (
                <StaffAvailabilitySummary
                  availabilityLabel={availabilityLabel}
                  checkedInLabel={checkedInLabel}
                  checkedOutLabel={checkedOutLabel}
                  currentStatusLabel={staffAvailabilityStatus}
                  error={schedulerError}
                  hasStaff={Boolean(form.staffId)}
                  holidayLabel={holidayLabel}
                  loading={schedulerLoading}
                  onLeaveLabel={onLeaveLabel}
                  shiftEndLabel={shiftEndLabel}
                  shiftStartLabel={shiftStartLabel}
                  workingHoursLabel={workingHoursLabel}
                />
              ) : null}
            </BookingSection>

            <View style={styles.bookingTwoColumnSection}>
              <BookingSection title="4. Select Date">
                <AppointmentDateField
                  error={errors.date}
                  onChange={(value) => updateForm("date", value)}
                  value={form.date}
                />
              </BookingSection>
              <BookingSection title="5. Select Time Slot">
                <TimeSlotSelector
                  disabledReason={slotDisabledReason}
                  error={errors.startTime}
                  loading={schedulerLoading}
                  onSelect={handleSelectSlot}
                  selectedTime={form.startTime}
                  slots={availableSlots}
                />
              </BookingSection>
            </View>

            {mode === "edit" ? (
              <>
                <TextField
                  error={errors.discount}
                  keyboardType="decimal-pad"
                  label="Discount"
                  onChangeText={(value) => updateForm("discount", value)}
                  placeholder="0"
                  value={form.discount}
                />
                <SelectField
                  error={errors.paymentMethod}
                  label="Payment Method"
                  onSelect={(value) => updateForm("paymentMethod", value)}
                  options={PAYMENT_METHODS.map((method) => ({ label: method, value: method }))}
                  value={form.paymentMethod}
                />
                <SelectField
                  error={errors.status}
                  label="Status"
                  onSelect={(value) => updateForm("status", value as AppointmentStatus)}
                  options={FORM_STATUS_OPTIONS.map((option) => ({ label: option, value: option }))}
                  value={form.status}
                />
              </>
            ) : null}

            <BookingSection title="6. Review">
              <AppointmentReviewSummary
                clientLabel={
                  clientBookingMode === "walkIn"
                    ? "Walk-in Client"
                    : selectedClient?.fullName ?? "No client selected"
                }
                date={form.date}
                pricingTotals={servicePricingTotals}
                selectedStaff={selectedStaff}
                services={selectedServices}
                startTime={form.startTime}
                totalDuration={totalServiceDuration}
              />
            </BookingSection>

            <TextField
              error={errors.notes}
              label="Notes"
              multiline
              onChangeText={(value) => updateForm("notes", value)}
              placeholder="Appointment notes"
              value={form.notes}
            />

            {formSubmitError || mutationError ? (
              <View style={styles.inlineAlert}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.inlineAlertText}>{formSubmitError ?? mutationError}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.bookingBottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={mutating || !bookingReady}
          onPress={handleSubmit}
          style={[styles.bookingPrimaryButton, (mutating || !bookingReady) && styles.disabledButton]}
        >
          {mutating ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />}
          <Text style={styles.bookingPrimaryButtonText}>
            {mutating ? "Booking..." : mode === "create" ? "Book Appointment" : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>
      <AppointmentSnackbar />
    </SafeAreaView>
  );
}

const formatBusinessDate = (value: string | null) => {
  const parsedDate = parseAppointmentDateTime(value);
  if (!parsedDate) return value;

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[parsedDate.getMonth()];
  const year = parsedDate.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatBusinessTime = (value: string | null) => {
  const parsedDate = parseAppointmentDateTime(value);
  if (!parsedDate) return value;

  return formatHourMinuteAmPm(parsedDate);
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const { styles } = useAppointmentStyles();

  if (value === undefined || value === null) {
    return null;
  }
  const strValue = String(value).trim();
  if (strValue === "" || strValue === "-" || strValue.toLowerCase() === "null") {
    return null;
  }
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{strValue}</Text>
    </View>
  );
}

export function AppointmentDetailsScreen() {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const appointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const detailsState = useAppSelector((state) => selectAppointmentDetailsState(state, appointmentId));

  useEffect(() => {
    if (appointmentId) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointmentId, dispatch]);

  const displayName = appointment?.clientName?.trim() ? appointment.clientName.trim() : "Walk-in Client";

  return (
    <ScreenShell
      onRefresh={() => {
        if (appointmentId) {
          void dispatch(fetchAppointmentByIdThunk(appointmentId));
        }
      }}
      refreshing={detailsState?.loading}
      title="Appointment Details"
    >
      {detailsState?.loading && !appointment ? <SkeletonList /> : null}
      {detailsState?.error && !appointment ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={detailsState.error}
          onAction={() => appointmentId && void dispatch(fetchAppointmentByIdThunk(appointmentId))}
          title="Unable to load appointment"
          tone="error"
        />
      ) : null}
      {!detailsState?.loading && !appointment ? (
        <StateCard
          icon="calendar-clear-outline"
          message="This appointment could not be found in the API response."
          title="Appointment not found"
        />
      ) : null}
      {appointment ? (
        <>
          <View style={styles.detailHero}>
            <ClientAvatar name={displayName} />
            <View style={styles.detailHeroCopy}>
              <Text style={styles.detailHeroTitle}>{displayName}</Text>
              <Text style={styles.detailHeroMeta}>{appointment.serviceName}</Text>
            </View>
            <StatusBadge status={appointment.status} />
          </View>

          <View style={styles.actionGrid}>
            {appointment.status === "Upcoming" || appointment.status === "Waiting" ? (
              <ConfirmAppointmentAction appointment={appointment} />
            ) : null}
            {appointment.status === "Confirmed" ? (
              <StartAppointmentAction appointment={appointment} />
            ) : null}
            {appointment.status === "In Progress" ? (
              <CompleteAppointmentAction appointment={appointment} />
            ) : null}
            <ActionButton icon="create-outline" label="Edit" route={`/appointments/${appointment.id}/edit`} />
            <ActionButton icon="calendar-outline" label="Reschedule" route={`/appointments/${appointment.id}/reschedule`} />
            <ActionButton icon="close-circle-outline" label="Cancel" route={`/appointments/${appointment.id}/cancel`} danger />
            <ActionButton icon="time-outline" label="History" route={`/appointments/${appointment.id}/history`} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Appointment Details</Text>
            <DetailRow label="Client Name" value={displayName} />
            <DetailRow label="Client Phone" value={appointment.phone} />
            <DetailRow label="Service Name" value={appointment.serviceName} />
            <DetailRow label="Staff Name" value={appointment.staffName} />
            <DetailRow label="Appointment Date" value={formatBusinessDate(appointment.scheduledAt)} />
            <DetailRow label="Start Time" value={formatBusinessTime(appointment.startTime || appointment.scheduledAt)} />
            <DetailRow label="End Time" value={formatBusinessTime(appointment.endTime)} />
            <DetailRow label="Duration" value={appointment.durationLabel || (appointment.durationMinutes ? `${appointment.durationMinutes} mins` : null)} />
            <DetailRow label="Appointment Status" value={appointment.status} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Payment & Billing</Text>
            <DetailRow label="Payment Status" value={appointment.paymentStatus} />
            <DetailRow label="Payment Method" value={appointment.paymentMethod} />
            <DetailRow label="Total Amount" value={formatCurrency(appointment.total || appointment.amount)} />
          </View>

          {appointment.notes && appointment.notes.trim() ? (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </ScreenShell>
  );
}

function ConfirmAppointmentAction({ appointment }: { appointment: AppointmentListItem }) {
  const { Colors, styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitConfirm = async () => {
    if (appointment.status !== "Upcoming" && appointment.status !== "Waiting") {
      setError("Only upcoming or waiting appointments can be confirmed.");
      return;
    }

    setError(null);
    setConfirming(true);
    const result = await dispatch(confirmAppointmentThunk(appointment.id));
    setConfirming(false);

    if (confirmAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to confirm appointment."));
      return;
    }

    setConfirmVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.84}
        disabled={confirming}
        onPress={() => {
          setError(null);
          setConfirmVisible(true);
        }}
        style={[styles.actionButton, confirming && styles.disabledButton]}
      >
        {confirming ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} />
        )}
        <Text style={styles.actionButtonText}>Confirm</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!confirming) {
            setConfirmVisible(false);
          }
        }}
        transparent
        visible={confirmVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm appointment?</Text>
            <Text style={styles.modalText}>
              {"This will mark "}
              {appointment.clientName}
              {"'s appointment as Confirmed."}
            </Text>
            {error ? (
              <View style={[styles.inlineAlert, styles.modalInlineAlert]}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.inlineAlertText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={confirming}
                onPress={() => setConfirmVisible(false)}
                style={[styles.secondaryButton, confirming && styles.disabledButton]}
              >
                <Text style={styles.secondaryButtonText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={confirming}
                onPress={() => void submitConfirm()}
                style={[styles.primaryButtonCompact, confirming && styles.disabledButton]}
              >
                {confirming ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.primaryButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function StartAppointmentAction({ appointment }: { appointment: AppointmentListItem }) {
  const { Colors, styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const submitStart = async () => {
    if (appointment.status !== "Confirmed") {
      setError("Only confirmed appointments can be started.");
      return;
    }

    setError(null);
    setStarting(true);
    const result = await dispatch(startAppointmentThunk(appointment.id));
    setStarting(false);

    if (startAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to start appointment."));
      return;
    }

    setConfirmVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.84}
        disabled={starting}
        onPress={() => {
          setError(null);
          setConfirmVisible(true);
        }}
        style={[styles.actionButton, starting && styles.disabledButton]}
      >
        {starting ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Ionicons name="play-circle-outline" size={18} color={Colors.primary} />
        )}
        <Text style={styles.actionButtonText}>Start</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!starting) {
            setConfirmVisible(false);
          }
        }}
        transparent
        visible={confirmVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start appointment?</Text>
            <Text style={styles.modalText}>
              {"This will mark "}
              {appointment.clientName}
              {"'s appointment as In Progress."}
            </Text>
            {error ? (
              <View style={[styles.inlineAlert, styles.modalInlineAlert]}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.inlineAlertText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={starting}
                onPress={() => setConfirmVisible(false)}
                style={[styles.secondaryButton, starting && styles.disabledButton]}
              >
                <Text style={styles.secondaryButtonText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={starting}
                onPress={() => void submitStart()}
                style={[styles.primaryButtonCompact, starting && styles.disabledButton]}
              >
                {starting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="play" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.primaryButtonText}>Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function CompleteAppointmentAction({ appointment }: { appointment: AppointmentListItem }) {
  const { Colors, styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitComplete = async () => {
    if (appointment.status !== "In Progress") {
      setError("Only in-progress appointments can be completed.");
      return;
    }

    setError(null);
    setCompleting(true);
    const result = await dispatch(completeAppointmentThunk(appointment.id));
    setCompleting(false);

    if (completeAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to complete appointment."));
      return;
    }

    setConfirmVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.84}
        disabled={completing}
        onPress={() => {
          setError(null);
          setConfirmVisible(true);
        }}
        style={[styles.actionButton, completing && styles.disabledButton]}
      >
        {completing ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <Ionicons name="checkmark-done-circle-outline" size={18} color={Colors.primary} />
        )}
        <Text style={styles.actionButtonText}>Complete</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!completing) {
            setConfirmVisible(false);
          }
        }}
        transparent
        visible={confirmVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete appointment?</Text>
            <Text style={styles.modalText}>
              {"This will mark "}
              {appointment.clientName}
              {"'s appointment as Completed."}
            </Text>
            {error ? (
              <View style={[styles.inlineAlert, styles.modalInlineAlert]}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.inlineAlertText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={completing}
                onPress={() => setConfirmVisible(false)}
                style={[styles.secondaryButton, completing && styles.disabledButton]}
              >
                <Text style={styles.secondaryButtonText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={completing}
                onPress={() => void submitComplete()}
                style={[styles.primaryButtonCompact, completing && styles.disabledButton]}
              >
                {completing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.primaryButtonText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function ActionButton({
  danger,
  icon,
  label,
  route,
}: {
  danger?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}) {
  const { Colors, styles } = useAppointmentStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => router.push(route as Href)}
      style={[styles.actionButton, danger && styles.actionButtonDanger]}
    >
      <Ionicons name={icon} size={18} color={danger ? Colors.error : Colors.primary} />
      <Text style={[styles.actionButtonText, danger && styles.actionButtonTextDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function CancelAppointmentScreen() {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const mutating = useAppSelector(selectAppointmentMutating);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const submitCancel = async () => {
    const trimmedReason = reason.trim();

    if (!appointmentId) {
      setError("Appointment ID is missing.");
      return;
    }

    const result = await dispatch(cancelAppointmentThunk({ appointmentId, reason: trimmedReason }));

    if (cancelAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to cancel appointment."));
      return;
    }

    router.replace(`/appointments/${result.payload.appointment.id}` as Href);
  };

  return (
    <ScreenShell title="Cancel Appointment">
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Cancellation reason</Text>
        <TextField
          error={error ?? undefined}
          label="Reason"
          multiline
          onChangeText={(value) => {
            setReason(value);
            setError(null);
          }}
          placeholder="Why is this appointment being cancelled?"
          value={reason}
        />
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={mutating}
          onPress={() => setConfirmVisible(true)}
          style={[styles.dangerButton, mutating && styles.disabledButton]}
        >
          {mutating ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />}
          <Text style={styles.primaryButtonText}>Cancel Appointment</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent visible={confirmVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm cancellation</Text>
            <Text style={styles.modalText}>
              This will update the appointment through the cancel API and mark it cancelled.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setConfirmVisible(false)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Keep Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setConfirmVisible(false);
                  void submitCancel();
                }}
                style={styles.dangerButtonCompact}
              >
                <Text style={styles.primaryButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

export function RescheduleAppointmentScreen() {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const appointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const mutating = useAppSelector(selectAppointmentMutating);
  const [date, setDate] = useState(toInputDate(appointment?.scheduledAt ?? null));
  const [startTime, setStartTime] = useState(toInputTime(appointment?.startTime ?? appointment?.scheduledAt ?? null));
  const [duration, setDuration] = useState(appointment?.durationMinutes ? String(appointment.durationMinutes) : "");
  const [endTime, setEndTime] = useState(toInputTime(appointment?.endTime ?? null));
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointmentId && !appointment) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointment, appointmentId, dispatch]);

  useEffect(() => {
    const durationNumber = Number(duration);

    if (validateDate(date) && validateTime(startTime) && Number.isFinite(durationNumber) && durationNumber > 0) {
      setEndTime(addMinutesToTime(date, startTime, durationNumber));
    }
  }, [date, duration, startTime]);

  const handleSubmit = async () => {
    if (!appointmentId) {
      setError("Appointment ID is missing.");
      return;
    }

    if (!validateDate(date) || !validateTime(startTime) || !validateTime(endTime)) {
      setError("Use a valid date and HH:mm times.");
      return;
    }

    const durationNumber = Number(duration);

    if (!Number.isFinite(durationNumber) || durationNumber <= 0) {
      setError("Duration must be greater than 0.");
      return;
    }

    const payload: RescheduleAppointmentRequest = {
      duration: durationNumber,
      end_time: combineDateTime(date, endTime),
      notes: notes.trim() || undefined,
      scheduled_at: combineDateTime(date, startTime),
      start_time: combineDateTime(date, startTime),
    };
    const result = await dispatch(rescheduleAppointmentThunk({ appointmentId, updates: payload }));

    if (rescheduleAppointmentThunk.rejected.match(result)) {
      setError(getRejectedMessage(result.payload, "Unable to reschedule appointment."));
      return;
    }

    router.replace(`/appointments/${result.payload.appointment.id}` as Href);
  };

  return (
    <ScreenShell title="Reschedule">
      <View style={styles.formCard}>
        <TextField error={error ?? undefined} label="Date" onChangeText={setDate} placeholder="YYYY-MM-DD" value={date} />
        <TextField label="Start Time" onChangeText={setStartTime} placeholder="HH:mm" value={startTime} />
        <TextField keyboardType="numeric" label="Duration" onChangeText={setDuration} placeholder="Minutes" value={duration} />
        <TextField label="End Time" onChangeText={setEndTime} placeholder="HH:mm" value={endTime} />
        <TextField label="Notes" multiline onChangeText={setNotes} placeholder="Reschedule notes" value={notes} />
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={mutating}
          onPress={handleSubmit}
          style={[styles.primaryButton, mutating && styles.disabledButton]}
        >
          {mutating ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
          <Text style={styles.primaryButtonText}>Reschedule Appointment</Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}

export function AppointmentHistoryScreen() {
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const appointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const history = useAppSelector(selectAppointmentHistory);
  const loading = useAppSelector(selectAppointmentHistoryLoading);
  const error = useAppSelector(selectAppointmentHistoryError);

  useEffect(() => {
    void dispatch(fetchAppointmentHistoryThunk(appointment?.clientId));
  }, [appointment?.clientId, dispatch]);

  return (
    <ScreenShell
      onRefresh={() => void dispatch(fetchAppointmentHistoryThunk(appointment?.clientId))}
      refreshing={loading}
      title="Appointment History"
    >
      {loading ? <SkeletonList /> : null}
      {!loading && error ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={error}
          onAction={() => void dispatch(fetchAppointmentHistoryThunk(appointment?.clientId))}
          title="Unable to load history"
          tone="error"
        />
      ) : null}
      {!loading && !error && history.length === 0 ? (
        <StateCard
          icon="time-outline"
          message="No appointment history was returned by the API."
          title="No history"
        />
      ) : null}
      {!loading && !error && history.map((item) => (
        <AppointmentCard appointment={item} key={item.id} />
      ))}
    </ScreenShell>
  );
}

export function AppointmentCalendarScreen() {
  const appointments = useAppSelector(selectAppointments);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const { date, search, setDate, setSearch, setStatus, status } = useAppointmentListFilters();
  const { fetchAppointments } = useFetchAppointments();

  useEffect(() => {
    void fetchAppointments({ date, reset: true, search, status });
  }, [date, fetchAppointments, search, status]);

  return (
    <ScreenShell
      onRefresh={() => void fetchAppointments({ date, refresh: true, search, status })}
      refreshing={refreshing}
      title="Calendar"
    >
      <FilterBar
        date={date}
        onDateChange={setDate}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        search={search}
        status={status}
      />
      <CalendarPreview appointments={appointments} date={date} />
    </ScreenShell>
  );
}

export function SearchFilterScreen() {
  return <AppointmentListScreen />;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 74,
    justifyContent: "center",
  },
  actionButtonDanger: {
    backgroundColor: Colors.errorBg,
    borderColor: "rgba(114, 106, 99, 0.18)",
  },
  actionButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  actionButtonTextDanger: {
    color: Colors.error,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
  },
  amountText: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
  },
  calendarCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
  },
  calendarDate: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 58,
    width: 58,
  },
  calendarDay: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "900",
  },
  calendarEmpty: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: Spacing.lg,
    textAlign: "center",
  },
  calendarEvent: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  calendarEventMeta: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 4,
  },
  calendarEvents: {
    flex: 1,
    gap: Spacing.sm,
  },
  calendarEventTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  calendarMonth: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  availabilityCard: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  availabilityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  availabilityHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  availabilityItem: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 62,
    padding: Spacing.sm,
  },
  availabilityRows: {
    gap: Spacing.xs,
  },
  availabilityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
    minHeight: 30,
  },
  availabilityLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  availabilityTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
  },
  availabilityValue: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  availabilityRowLabel: {
    color: Colors.text2,
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  availabilityRowValue: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
    maxWidth: "56%",
    textAlign: "right",
  },
  autocompleteAnchor: {
    overflow: "visible",
    position: "relative",
    zIndex: 50,
  },
  bookingBottomBar: {
    backgroundColor: Colors.bg,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    gap: Spacing.md,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 12,
  },
  bookingContent: {
    paddingBottom: 150,
  },
  bookingFlow: {
    gap: Spacing.md,
  },
  bookingPrimaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: AppLayout.cardPadding,
  },
  bookingPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  bookingSection: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    overflow: "visible",
    padding: AppLayout.cardPadding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  bookingSectionAction: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: "900",
  },
  bookingSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  bookingSectionTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "900",
  },
  bookingStepDot: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  bookingStepDotActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  bookingStepItem: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  bookingStepLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "800",
  },
  bookingStepNumber: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "900",
  },
  bookingStepNumberActive: {
    color: "#FFFFFF",
  },
  bookingSteps: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
  },
  bookingTwoColumnSection: {
    gap: Spacing.md,
  },
  calendarRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  cardFooter: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  cardSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  cardTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "900",
  },
  cardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  chip: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  chipText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  clientBlock: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.md,
  },
  clientCopy: {
    flex: 1,
  },
  content: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: Colors.error,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: AppLayout.cardPadding,
  },
  dangerButtonCompact: {
    alignItems: "center",
    backgroundColor: Colors.error,
    borderRadius: AppRadius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  dateInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    textAlignVertical: "center",
  },
  dateInputRow: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  detailHero: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
  },
  detailHeroCopy: {
    flex: 1,
  },
  detailHeroMeta: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
  },
  detailHeroTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "900",
  },
  detailLabel: {
    color: Colors.text2,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  detailRow: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  detailValue: {
    color: Colors.heading,
    flex: 1.4,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  disabledButton: {
    opacity: 0.68,
  },
  emptyInlineState: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  fieldError: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  fieldHint: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  fieldHintError: {
    color: Colors.error,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  fieldHintRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: Spacing.sm,
  },
  filterPanel: {
    gap: Spacing.md,
    marginBottom: AppLayout.sectionGap,
  },
  floatingDropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  floatingDropdownLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  floatingSearchDropdown: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    elevation: 24,
    overflow: "hidden",
    position: "absolute",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    zIndex: 1000,
  },
  weekStripRow: {
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  weekDayPill: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 46,
    paddingVertical: Spacing.sm,
  },
  weekDayPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  weekDayLabel: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  weekDayLabelActive: {
    color: "rgba(255,255,255,0.78)",
  },
  weekDayNumber: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },
  weekDayNumberActive: {
    color: "#FFFFFF",
  },
  flatListContent: {
    paddingBottom: AppLayout.contentBottomPadding,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  flex: {
    flex: 1,
  },
  footerLoader: {
    padding: Spacing.lg,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
    position: "relative",
  },
  formDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  clientActionChip: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 42,
    paddingHorizontal: Spacing.md,
  },
  clientActionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  clientActionText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "900",
  },
  clientActionTextActive: {
    color: "#FFFFFF",
  },
  clientDropdown: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    elevation: 7,
    left: 0,
    marginTop: 6,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    top: 184,
    zIndex: 6,
  },
  clientModeHint: {
    color: Colors.primary,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: Spacing.sm,
    maxWidth: "60%",
  },
  clientOptionRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 58,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  clientQuickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  clientSearchGroup: {
    position: "relative",
    zIndex: 6,
  },
  clientSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calculatedCard: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
  },
  calculatedItem: {
    flex: 1,
    minWidth: 0,
  },
  dateButton: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },
  dateButtonText: {
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  existingClientToggle: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    minHeight: 38,
    paddingHorizontal: Spacing.md,
  },
  existingClientToggleActive: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.primary,
  },
  existingClientToggleText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "900",
  },
  existingClientToggleTextActive: {
    color: Colors.primary,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.sectionGap,
  },
  headerTitle: {
    color: Colors.heading,
    flex: 1,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
    textAlign: "center",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  iconButtonGhost: {
    height: AppLayout.headerActionSize,
    width: AppLayout.headerActionSize,
  },
  inlineAlert: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: AppRadius.control,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  inlineAlertText: {
    color: Colors.error,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  inputLabel: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  inputLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  listHeader: {
    paddingTop: Spacing.sm,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  metaPill: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: 5,
    maxWidth: "48%",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaPillText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(36, 59, 52, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: AppRadius.card,
    padding: AppLayout.cardPadding,
    width: "100%",
  },
  modalText: {
    color: Colors.text2,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  modalInlineAlert: {
    marginBottom: 0,
    marginTop: Spacing.md,
  },
  modalTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "900",
  },
  mutedText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  optionChip: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  optionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionChipText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
  },
  optionChipTextActive: {
    color: "#FFFFFF",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: AppLayout.cardPadding,
  },
  primaryButtonCompact: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 46,
  },
  primaryButtonSmall: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.pill,
    justifyContent: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  primaryButtonSmallText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  rawKey: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
    width: 130,
  },
  rawList: {
    marginTop: Spacing.md,
  },
  rawRow: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  rawValue: {
    color: Colors.heading,
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  readOnlyInput: {
    backgroundColor: Colors.bg2,
    color: Colors.text2,
  },
  removeServiceButton: {
    alignItems: "center",
    backgroundColor: Colors.text2,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 24,
  },
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  appointmentSearchDropdown: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    elevation: 6,
    left: 0,
    marginTop: 6,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    top: AppLayout.searchBarHeight,
    zIndex: 6,
  },
  appointmentSearchDropdownScroll: {
    maxHeight: 260,
  },
  appointmentSearchEmpty: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  appointmentSearchEmptyText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  appointmentSearchRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  appointmentSearchGroup: {
    position: "relative",
    zIndex: 5,
  },
  appointmentSearchGroupFlex: {
    flex: 1,
  },
  filterToggleButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.searchBarHeight,
    justifyContent: "center",
    width: AppLayout.searchBarHeight,
  },
  filterToggleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  appointmentSearchItem: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  appointmentSearchItemMeta: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  appointmentSearchItemTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    minHeight: 48,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.search,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: AppLayout.searchBarPaddingX,
  },
  serviceDropdown: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    elevation: 6,
    left: 0,
    marginTop: 6,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    top: 76,
    zIndex: 5,
  },
  serviceDropdownScroll: {
    maxHeight: 360,
  },
  serviceDropdownState: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  selectedServiceCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 96,
    padding: Spacing.md,
    position: "relative",
    width: 186,
  },
  selectedServiceCardActive: {
    borderColor: Colors.primaryDark,
    borderWidth: 1.5,
  },
  selectedServiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectedServiceIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  selectedServiceMeta: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  selectedServiceName: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
    paddingRight: 18,
  },
  selectedServicePrice: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
  },
  selectedServiceRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  serviceSearchGroup: {
    position: "relative",
    zIndex: 4,
  },
  serviceTotalDivider: {
    backgroundColor: Colors.border,
    width: 1,
  },
  serviceTotalItem: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.md,
  },
  serviceBreakdownCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  serviceTotalsCard: {
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.control,
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  secondaryButtonText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  serviceOptionChip: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    minWidth: 148,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  serviceOptionMeta: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  serviceOptionMetaActive: {
    color: "rgba(255,255,255,0.82)",
  },
  serviceOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  serviceOptionName: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "900",
  },
  serviceOptionNameActive: {
    color: "#FFFFFF",
  },
  serviceOptionNameMatch: {
    backgroundColor: Colors.successBg,
    color: Colors.primaryDark,
  },
  serviceOptionPrice: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
  },
  serviceOptionPriceActive: {
    color: "#FFFFFF",
  },
  serviceOptionPriceMatch: {
    backgroundColor: Colors.successBg,
    borderRadius: Radius.sm,
    overflow: "hidden",
    paddingHorizontal: 4,
  },
  serviceOptionRow: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 62,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  serviceOptionRowActive: {
    backgroundColor: Colors.primary,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 17,
    fontWeight: "900",
  },
  segment: {
    borderRadius: AppRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmented: {
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    padding: 3,
  },
  segmentText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "900",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  skeletonLine: {
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.pill,
    height: 14,
    marginTop: Spacing.sm,
    width: "80%",
  },
  skeletonLineShort: {
    width: "48%",
  },
  skeletonTitle: {
    backgroundColor: Colors.bg2,
    borderRadius: AppRadius.pill,
    height: 18,
    width: "55%",
  },
  slotChip: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: Spacing.md,
  },
  slotChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotChipText: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "900",
  },
  slotChipTextActive: {
    color: "#FFFFFF",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  stickySearchDropdown: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    elevation: 24,
    left: 0,
    maxHeight: 360,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    top: AppLayout.searchBarHeight + AUTOCOMPLETE_DROPDOWN_GAP,
    zIndex: 80,
  },
  snackbar: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    bottom: 16,
    flexDirection: "row",
    gap: Spacing.sm,
    left: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    position: "absolute",
    right: Spacing.lg,
  },
  snackbarError: {
    backgroundColor: Colors.error,
  },
  snackbarText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  stack: {
    gap: Spacing.md,
  },
  staffCardRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  staffSelectCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 72,
    padding: Spacing.sm,
    position: "relative",
    width: 184,
  },
  staffSelectCardActive: {
    borderColor: Colors.primaryDark,
    borderWidth: 1.5,
  },
  staffSelectCopy: {
    flex: 1,
    minWidth: 0,
  },
  staffSelectedBadge: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 24,
  },
  staffSelectName: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "900",
    paddingRight: 18,
  },
  staffSelectRole: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  stateMessage: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "900",
    marginTop: Spacing.md,
    textAlign: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryTile: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    minHeight: 122,
    padding: Spacing.md,
  },
  summaryTileWrap: {
    minWidth: 150,
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "900",
    marginTop: Spacing.md,
  },
  textArea: {
    minHeight: 96,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  textInput: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
  },
  twoColumn: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  twoColumnItem: {
    flex: 1,
  },
  notesText: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
});
