import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
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
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { getApiErrorMessage } from "@/services/api";
import { serviceService } from "@/services/service.service";
import { fetchClientsThunk } from "@/middleware/client/client.thunk";
import {
  cancelAppointmentThunk,
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
  selectAppointmentsTotalCount,
  selectAppointmentToast,
} from "@/store/appointment/appointment.slice";
import { selectClients } from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectStaffMembers } from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import type {
  AppointmentCalendarView,
  AppointmentListItem,
  AppointmentPaymentMethod,
  AppointmentStatus,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from "@/types/appointment";
import type { ServiceListItem } from "@/types/service";

const STATUS_FILTERS: ("All" | AppointmentStatus)[] = [
  "All",
  "Upcoming",
  "Confirmed",
  "Waiting",
  "Checked In",
  "In Service",
  "In Progress",
  "Completed",
  "Cancelled",
  "Missed",
];

const FORM_STATUS_OPTIONS: AppointmentStatus[] = [
  "Upcoming",
  "Confirmed",
  "Waiting",
  "Checked In",
  "In Service",
  "In Progress",
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
const SERVICE_SEARCH_DEBOUNCE_MS = 240;
const SERVICE_SEARCH_NAME_RESULT_LIMIT = 25;
const SERVICE_CATALOG_MAX_PAGES = 50;
const SERVICE_CATALOG_PAGE_SIZE = 100;

const STATUS_STYLES: Record<AppointmentStatus, { bg: string; color: string }> = {
  Cancelled: { bg: "#FEECEC", color: Colors.error },
  "Checked In": { bg: "#EAF5EF", color: Colors.primaryDark },
  Completed: { bg: Colors.successBg, color: "#2E7049" },
  Confirmed: { bg: "#EAF5EF", color: Colors.primaryDark },
  "In Progress": { bg: "#E9F0FF", color: Colors.info },
  "In Service": { bg: "#EEF4F1", color: Colors.primaryDark },
  Missed: { bg: "#F8E8E8", color: Colors.error },
  Upcoming: { bg: "#FBF3E5", color: Colors.goldDark },
  Waiting: { bg: "#FBF3E5", color: Colors.goldDark },
};

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

const formatCurrency = (amount: number) =>
  `Rs. ${Math.max(0, amount).toLocaleString("en-IN")}`;

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

const formatDateLabel = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
    year: "numeric",
  }).format(parsedDate);
};

const formatTimeLabel = (value: string | null) => {
  if (!value) {
    return "--:--";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
};

const getDateKey = (value: string | null) => {
  if (!value) {
    return "";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value.slice(0, 10);
  }

  return parsedDate.toISOString().slice(0, 10);
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

const matchesAppointment = (
  appointment: AppointmentListItem,
  search: string,
  status: "All" | AppointmentStatus,
) => {
  const query = search.trim().toLowerCase();
  const digits = query.replace(/\D/g, "");
  const statusMatches = status === "All" || appointment.status === status;

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
  const leftTime = left.scheduledAt ? new Date(left.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.scheduledAt ? new Date(right.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;

  return leftTime - rightTime;
};

const statusToApiValue = (status: AppointmentStatus) => status.toLowerCase().replace(/\s+/g, "_");

const validateTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const validateDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const validateForm = (form: AppointmentFormState, options?: { requireClient?: boolean }): FormErrors => {
  const errors: FormErrors = {};
  const duration = Number(form.duration);
  const price = Number(form.price || 0);

  if (options?.requireClient !== false && !form.clientId) {
    errors.clientId = "Select a client.";
  }

  if (!form.serviceName.trim() && !form.serviceId.trim()) {
    errors.serviceName = "Service is required.";
  }

  if (!form.staffId) {
    errors.staffId = "Select a staff member.";
  }

  if (!validateDate(form.date)) {
    errors.date = "Use YYYY-MM-DD.";
  }

  if (!validateTime(form.startTime)) {
    errors.startTime = "Use HH:mm.";
  }

  if (!validateTime(form.endTime)) {
    errors.endTime = "Use HH:mm.";
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    errors.duration = "Duration must be greater than 0.";
  }

  if (!Number.isFinite(price) || price < 0) {
    errors.price = "Price cannot be negative.";
  }

  if (!form.status) {
    errors.status = "Select a status.";
  }

  if (validateDate(form.date) && validateTime(form.startTime) && validateTime(form.endTime)) {
    const start = new Date(`${form.date}T${form.startTime}:00`).getTime();
    const end = new Date(`${form.date}T${form.endTime}:00`).getTime();

    if (end <= start) {
      errors.endTime = "End time must be after start time.";
    }
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
  title,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  title: string;
}) {
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/dashboard" as Href);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
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
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/bookings/new" as Href)}
            style={styles.iconButton}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        {children}
      </ScrollView>
      <AppointmentSnackbar />
    </SafeAreaView>
  );
}

function AppointmentSnackbar() {
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
      style={[styles.snackbar, toast.tone === "error" && styles.snackbarError]}
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
  const statusStyle = STATUS_STYLES[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
      <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{status}</Text>
    </View>
  );
}

function ClientAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CL";

  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function AppointmentCard({ appointment }: { appointment: AppointmentListItem }) {
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
          <Text style={styles.mutedText}>{formatDateLabel(appointment.scheduledAt)}</Text>
          <Text style={styles.amountText}>{formatCurrency(appointment.total || appointment.amount)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
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
  onStatusChange,
  search,
  status,
}: {
  date: string;
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: "All" | AppointmentStatus) => void;
  search: string;
  status: "All" | AppointmentStatus;
}) {
  return (
    <View style={styles.filterPanel}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.text2} />
        <TextInput
          onChangeText={onSearchChange}
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

      <View style={styles.dateInputRow}>
        <Ionicons name="calendar-outline" size={18} color={Colors.text2} />
        <TextInput
          onChangeText={onDateChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.placeholder}
          style={styles.dateInput}
          value={date}
        />
      </View>

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
    </View>
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
      page = 1,
      refresh = false,
      reset = false,
      search = "",
      status = "All",
    }: {
      date?: string;
      page?: number;
      refresh?: boolean;
      reset?: boolean;
      search?: string;
      status?: "All" | AppointmentStatus;
    } = {}) => {
      await dispatch(
        fetchAppointmentsThunk({
          date: date || undefined,
          limit: query.limit,
          page,
          refresh,
          reset,
          search,
          sort_by: query.sort_by,
          sort_order: query.sort_order,
          status: status && status !== "All" ? statusToApiValue(status) : undefined,
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
  const appointments = useAppSelector(selectAppointments);
  const error = useAppSelector(selectAppointmentsError);
  const loading = useAppSelector(selectAppointmentsIsLoading);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const totalCount = useAppSelector(selectAppointmentsTotalCount);
  const { date, search, setDate, setSearch, setStatus, status } = useAppointmentListFilters();
  const { fetchAppointments } = useFetchAppointments();
  const { width } = useWindowDimensions();
  const tileWidth = width >= 720 ? "31%" : "48%";

  useEffect(() => {
    void fetchAppointments({ date, reset: true, search, status });
  }, [date, fetchAppointments, search, status]);

  const filtered = useMemo(
    () =>
      appointments
        .filter((appointment) => getDateKey(appointment.scheduledAt) === date)
        .filter((appointment) => matchesAppointment(appointment, search, status))
        .sort(sortBySchedule),
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

  return (
    <ScreenShell
      onRefresh={() => void fetchAppointments({ date, refresh: true, search, status })}
      refreshing={refreshing}
      title="Appointments"
    >
      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>SalonOX Scheduler</Text>
          <Text style={styles.heroTitle}>Appointment Dashboard</Text>
          <Text style={styles.heroSubtitle}>
            {totalCount} appointment{totalCount === 1 ? "" : "s"} scheduled
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => router.push("/bookings/new" as Href)}
          style={styles.heroAction}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.heroActionText}>New</Text>
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
          onAction={() => void fetchAppointments({ date, reset: true, search, status })}
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
      {!loading && !error && filtered.slice(0, 5).map((appointment) => (
        <AppointmentCard appointment={appointment} key={appointment.id} />
      ))}

      <CalendarPreview appointments={filtered} date={date} />
    </ScreenShell>
  );
}

export function AppointmentListScreen() {
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
    () => appointments.filter((appointment) => matchesAppointment(appointment, search, status)),
    [appointments, search, status],
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
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

function SearchableServiceField({
  dropdownOpen,
  error,
  loading,
  onDismiss,
  onFocus,
  onSearchChange,
  onSelect,
  search,
  selectedServiceId,
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
  selectedServiceId: string;
  services: ServiceListItem[];
  serviceError: string | null;
}) {
  const serviceQuery = getServiceSearchQuery(search);
  const hasValidQuery = serviceQuery.kind !== "invalid";
  const showDropdown = dropdownOpen && hasValidQuery;
  const showMinimumHint = dropdownOpen && serviceQuery.raw.length > 0 && !hasValidQuery;

  return (
    <View style={[styles.inputGroup, styles.serviceSearchGroup]}>
      <Text style={styles.inputLabel}>Service</Text>
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
      {showMinimumHint ? (
        <Text style={styles.fieldHint}>Type at least 3 letters to search services.</Text>
      ) : null}
      {showDropdown ? (
        <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(90)} style={styles.serviceDropdown}>
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
                const selected = service.id === selectedServiceId;

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
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const existingAppointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const mutating = useAppSelector(selectAppointmentMutating);
  const mutationError = useAppSelector(selectAppointmentMutationError);
  const clients = useAppSelector(selectClients);
  const staffMembers = useAppSelector(selectStaffMembers);
  const currentUser = useAppSelector(selectCurrentUser);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<AppointmentFormState>(() => appointmentToForm(existingAppointment));
  const [durationEditable, setDurationEditable] = useState(mode === "edit");
  const [priceEditable, setPriceEditable] = useState(mode === "edit");
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState(form.serviceName);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const serviceCacheRef = useRef(new Map<string, ServiceListItem[] | Promise<ServiceListItem[]>>());
  const serviceRequestIdRef = useRef(0);

  useEffect(() => {
    if (mode === "edit") {
      void dispatch(fetchClientsThunk({ limit: 50, offset: 0, reset: true }));
    }
    void dispatch(fetchStaffThunk({ limit: 50, page: 1, reset: true }));
  }, [dispatch, mode]);

  useEffect(() => {
    const query = getServiceSearchQuery(serviceSearch);

    if (!serviceDropdownOpen || query.kind === "invalid") {
      serviceRequestIdRef.current += 1;
      setServiceLoading(false);
      setServiceError(null);
      setServices([]);
      return;
    }

    const queryKey = getServiceSearchKey(query, currentUser?.salonId);
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
          ? searchServicesByName(query, currentUser?.salonId)
          : fetchServiceCatalog(currentUser?.salonId).then((catalog) =>
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
  }, [currentUser?.salonId, serviceDropdownOpen, serviceSearch]);

  useEffect(() => {
    if (mode === "edit" && appointmentId && !existingAppointment) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointmentId, dispatch, existingAppointment, mode]);

  useEffect(() => {
    if (existingAppointment) {
      setForm(appointmentToForm(existingAppointment));
      setServiceSearch(existingAppointment.serviceName);
      setServiceDropdownOpen(false);
    }
  }, [existingAppointment]);

  const updateForm = (key: keyof AppointmentFormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "duration" || key === "startTime" || key === "date") {
        const duration = Number(key === "duration" ? value : next.duration);
        const start = key === "startTime" ? value : next.startTime;
        const nextDate = key === "date" ? value : next.date;

        if (Number.isFinite(duration) && duration > 0 && validateTime(start) && validateDate(nextDate)) {
          next.endTime = addMinutesToTime(nextDate, start, duration);
        }
      }

      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleServiceSearchChange = (value: string) => {
    setServiceSearch(value);
    setServiceDropdownOpen(Boolean(value.trim()));
    setForm((current) => ({
      ...current,
      serviceId: "",
      serviceName: value,
    }));
    setErrors((current) => ({ ...current, serviceName: undefined }));
  };

  const dismissServiceDropdown = () => {
    setServiceDropdownOpen(false);
  };

  const handleSelectService = (service: ServiceListItem) => {
    setForm((current) => {
      const duration = service.durationMinutes ? String(service.durationMinutes) : current.duration;
      const next = {
        ...current,
        duration,
        price: service.price ? String(service.price) : current.price,
        serviceId: service.id,
        serviceName: service.name,
      };

      if (Number(service.durationMinutes) > 0 && validateTime(next.startTime) && validateDate(next.date)) {
        next.endTime = addMinutesToTime(next.date, next.startTime, Number(service.durationMinutes));
      }

      return next;
    });
    setDurationEditable(false);
    setPriceEditable(false);
    setServiceSearch(service.name);
    setServiceDropdownOpen(false);
    setErrors((current) => ({
      ...current,
      duration: undefined,
      price: undefined,
      serviceName: undefined,
    }));
  };

  const handleSubmit = async () => {
    const authenticatedClientId = currentUser?.clientId ?? currentUser?.id ?? "";
    const clientId = mode === "create" ? authenticatedClientId : form.clientId;
    const nextErrors = validateForm(form, { requireClient: mode !== "create" });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!clientId) {
      setErrors({
        notes: "Unable to identify the logged-in client. Please sign in again.",
      });
      return;
    }

    const payload: Omit<CreateAppointmentRequest, "salon_id"> = {
      client_id: clientId,
      duration: Number(form.duration),
      end_time: combineDateTime(form.date, form.endTime),
      notes: form.notes.trim() || undefined,
      price: Number(form.price || 0),
      scheduled_at: combineDateTime(form.date, form.startTime),
      service_id: form.serviceId.trim() || undefined,
      service_name: form.serviceName.trim() || undefined,
      staff_id: form.staffId,
      start_time: combineDateTime(form.date, form.startTime),
      status: statusToApiValue(form.status),
    };

    if (mode === "edit") {
      payload.discount = Number(form.discount || 0);
      payload.payment_method = form.paymentMethod;
    }

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

    if (!result) {
      return;
    }

    if (createAppointmentThunk.rejected.match(result) || updateAppointmentThunk.rejected.match(result)) {
      setErrors({
        notes: getRejectedMessage(result.payload, mode === "create" ? "Unable to create appointment." : "Unable to update appointment."),
      });
      return;
    }

    const savedId = result.payload.appointment.id;
    router.replace(`/appointments/${savedId}` as Href);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
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

          <View style={styles.formCard}>
            {serviceDropdownOpen ? (
              <Pressable
                accessibilityLabel="Close service search"
                onPress={dismissServiceDropdown}
                style={styles.formDismissOverlay}
              />
            ) : null}
            {mode === "edit" ? (
              <SelectField
                error={errors.clientId}
                label="Client"
                onSelect={(value) => updateForm("clientId", value)}
                options={clients.map((client) => ({ label: client.fullName, value: client.id }))}
                value={form.clientId}
              />
            ) : null}
            <SearchableServiceField
              dropdownOpen={serviceDropdownOpen}
              error={errors.serviceName}
              loading={serviceLoading}
              onDismiss={dismissServiceDropdown}
              onFocus={() => setServiceDropdownOpen(Boolean(serviceSearch.trim()))}
              onSearchChange={handleServiceSearchChange}
              onSelect={handleSelectService}
              search={serviceSearch}
              selectedServiceId={form.serviceId}
              serviceError={serviceError}
              services={services}
            />
            <SelectField
              error={errors.staffId}
              label="Staff"
              onSelect={(value) => updateForm("staffId", value)}
              options={staffMembers.map((staff) => ({ label: staff.name, value: staff.id }))}
              value={form.staffId}
            />
            <TextField
              error={errors.date}
              label="Date"
              onChangeText={(value) => updateForm("date", value)}
              placeholder="YYYY-MM-DD"
              value={form.date}
            />
            <View style={styles.twoColumn}>
              <View style={styles.twoColumnItem}>
                <TextField
                  error={errors.startTime}
                  label="Start Time"
                  onChangeText={(value) => updateForm("startTime", value)}
                  placeholder="HH:mm"
                  value={form.startTime}
                />
              </View>
              <View style={styles.twoColumnItem}>
                <TextField
                  error={errors.endTime}
                  label="End Time"
                  onChangeText={(value) => updateForm("endTime", value)}
                  placeholder="HH:mm"
                  value={form.endTime}
                />
              </View>
            </View>
            <View style={styles.twoColumn}>
              <View style={styles.twoColumnItem}>
                <TextField
                  actionLabel={!durationEditable && mode === "create" ? "Edit" : undefined}
                  editable={durationEditable || mode === "edit"}
                  error={errors.duration}
                  keyboardType="numeric"
                  label="Duration"
                  onActionPress={() => setDurationEditable(true)}
                  onChangeText={(value) => updateForm("duration", value)}
                  placeholder="Minutes"
                  value={form.duration}
                />
              </View>
              <View style={styles.twoColumnItem}>
                <TextField
                  actionLabel={!priceEditable && mode === "create" ? "Edit" : undefined}
                  editable={priceEditable || mode === "edit"}
                  error={errors.price}
                  keyboardType="decimal-pad"
                  label="Price"
                  onActionPress={() => setPriceEditable(true)}
                  onChangeText={(value) => updateForm("price", value)}
                  placeholder="0"
                  value={form.price}
                />
              </View>
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
            <TextField
              error={errors.notes}
              label="Notes"
              multiline
              onChangeText={(value) => updateForm("notes", value)}
              placeholder="Appointment notes"
              value={form.notes}
            />

            {mutationError ? (
              <View style={styles.inlineAlert}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
                <Text style={styles.inlineAlertText}>{mutationError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={mutating}
              onPress={handleSubmit}
              style={[styles.primaryButton, mutating && styles.disabledButton]}
            >
              {mutating ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="save-outline" size={18} color="#FFFFFF" />}
              <Text style={styles.primaryButtonText}>
                {mutating ? "Saving..." : mode === "create" ? "Create Appointment" : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AppointmentSnackbar />
    </SafeAreaView>
  );
}

const formatBusinessDate = (value: string | null) => {
  if (!value) return null;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  const day = String(parsedDate.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[parsedDate.getMonth()];
  const year = parsedDate.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatBusinessTime = (value: string | null) => {
  if (!value) return null;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  let hours = parsedDate.getHours();
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
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

const styles = StyleSheet.create({
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
    borderColor: "rgba(214, 91, 91, 0.18)",
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
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  avatarText: {
    color: Colors.primaryDark,
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
    shadowColor: Colors.primaryDark,
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
    justifyContent: "space-between",
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
    minHeight: 46,
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
  heroAction: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  heroActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.card,
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroSubtitle: {
    color: "#DCE7E2",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
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
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
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
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    top: 76,
    zIndex: 5,
  },
  serviceDropdownScroll: {
    maxHeight: 252,
  },
  serviceDropdownState: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  serviceSearchGroup: {
    position: "relative",
    zIndex: 4,
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
  statusBadge: {
    borderRadius: AppRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "900",
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
