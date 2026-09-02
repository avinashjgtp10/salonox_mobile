import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import QuickSaleScreen, { type QuickSaleSlot } from "@/features/quickSale/screens/QuickSaleScreen";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Badge } from "@/components/ui/Badge";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { StateIllustration } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import type { StaffMember } from "@/data/teamData";
import { useAppForeground } from "@/hooks/useAppForeground";
import { useAppToast } from "@/hooks/useAppToast";
import {
  cancelAppointmentThunk,
  completeAppointmentThunk,
  createAppointmentThunk,
  fetchAppointmentByIdThunk,
  fetchAppointmentHistoryThunk,
  fetchAppointmentsThunk,
  rescheduleAppointmentThunk,
  startAppointmentThunk,
  updateAppointmentThunk,
} from "@/middleware/appointment/appointment.thunk";
import { fetchClientByIdThunk, fetchClientsThunk } from "@/middleware/client/client.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchSaleByIdThunk } from "@/middleware/sales/sales.thunk";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { fetchStaffAvailabilityThunk } from "@/middleware/staff/staffAvailability.thunk";
import { getApiErrorMessage } from "@/services/api";
import {
  appointmentStatusMatchesFilter,
  appointmentStatusToApiValue,
} from "@/services/appointment.service";
import { clientService } from "@/services/client.service";
import { addRealtimeEntityChangedListener } from "@/services/realtimeEvents";
import {
  clearAppointmentToast,
  selectAppointmentById,
  selectAppointmentDetailsState,
  selectAppointmentHistory,
  selectAppointmentHistoryError,
  selectAppointmentHistoryLoading,
  selectAppointmentMutating,
  selectAppointmentMutationError,
  selectAppointments,
  selectAppointmentsError,
  selectAppointmentsIsLoading,
  selectAppointmentsLoadingMore,
  selectAppointmentsPagination,
  selectAppointmentsRefreshing,
  selectAppointmentToast,
} from "@/store/appointment/appointment.slice";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectClients } from "@/store/client/client.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSaleDetail } from "@/store/sales/sales.slice";
import {
  selectCurrentStaff,
  selectCurrentStaffError,
  selectCurrentStaffLoading,
  selectStaffMembers,
} from "@/store/staff/staff.slice";
import {
  selectStaffAvailability,
  selectStaffAvailabilityError,
  selectStaffAvailabilityLoading,
} from "@/store/staff/staffAvailability.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatInvoiceNumber, type InvoiceSequence } from "@/utils/receipt";
import {
  useAppointmentListFilters,
  useFetchAppointments,
} from "@/features/appointments/hooks/useAppointmentList";
import {
  AUTOCOMPLETE_DROPDOWN_GAP,
  CALENDAR_STATUS_FILTERS,
  CLIENT_SEARCH_DEBOUNCE_MS,
  CLIENT_SEARCH_MIN_LETTERS,
  CLIENT_SEARCH_RESULT_LIMIT,
  FORM_STATUS_OPTIONS,
  PAYMENT_METHODS,
  STAFF_AVAILABILITY_REALTIME_ENTITIES,
  STATUS_FILTERS,
} from "@/features/appointments/constants/appointmentConstants";
import type {
  AppointmentFormState,
  AppointmentSelectedService,
  ClientBookingMode,
  FormErrors,
} from "@/features/appointments/types/appointmentForm";
import {
  appointmentsOverlap,
  getAppointmentRange,
  getCalendarAppointmentTitle,
  getCalendarTokenLabel,
  getWebCalendarGradient,
  hasCalendarInteractionFlag,
  isReadonlyCalendarAppointment,
} from "@/features/appointments/utils/appointmentCalendar";
import {
  addMinutesToTime,
  combineDateTime,
  formatTimeLabel,
  getDateKey,
  getDefaultTimeSlots,
  minutesToDisplayTime,
  parseAppointmentDateTime,
  parseClockToMinutes,
  todayIsoDate,
  toInputDate,
  toInputTime,
  validateDate,
  validateTime,
} from "@/features/appointments/utils/appointmentDateTime";
import {
  appointmentServicesToSelectedServices,
  appointmentToForm,
  formatCurrency,
  formatDurationLabel,
  getSelectedServiceCatalogId,
  getServicePricingTotals,
  validateForm,
} from "@/features/appointments/utils/appointmentForm";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  matchesAppointment,
  sortBySchedule,
  sortWithActiveFirst,
} from "@/features/appointments/utils/appointmentList";
import {
  isAssignedToStaff,
  realtimePayloadMatchesStaff,
  staffIdMatches,
} from "@/features/appointments/utils/staffAssignment";
import { fetchServiceCatalog } from "@/features/appointments/utils/serviceCatalog";
import {
  buildStaffAppointmentRows,
  isSameDay,
} from "@/features/appointments/utils/staffAppointmentRows";
import type {
  AppointmentListItem,
  AppointmentStatus,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from "@/types/appointment";
import type { ClientListItem } from "@/types/client";
import type { ServiceListItem } from "@/types/service";
import type { StaffAvailabilitySlot } from "@/types/staffAvailability";
import type { BlockedTimeEntry } from "@/types/staffBlockedTimes";
import { formatAppDate, formatAppTime } from "@/utils/dateTime";

const getResponsiveHorizontalPadding = (width = 393) => {
  if (width < 360) {
    return 16;
  }

  if (width >= 768) {
    return 40;
  }

  if (width >= 600) {
    return 32;
  }

  return AppLayout.contentHorizontalPadding;
};

const getResponsiveTopPadding = (width = 393) => (width < 360 ? Spacing.sm : Spacing.md);

const getResponsiveHeaderTitleSize = (width = 393) =>
  width < 360 ? AppLayout.headerTitleFontSize - 2 : AppLayout.headerTitleFontSize;

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

const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 4) {
    return value || "-";
  }

  return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
};

function ScreenShell({
  backFallback = "/dashboard" as Href,
  children,
  footer,
  hideHeader = false,
  onRefresh,
  refreshing,
  safeAreaEdges = ["top", "bottom"],
  scrollable = true,
  showCreateAction = true,
  title,
}: {
  backFallback?: Href;
  children: React.ReactNode;
  footer?: React.ReactNode;
  hideHeader?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  safeAreaEdges?: React.ComponentProps<typeof SafeAreaView>["edges"];
  scrollable?: boolean;
  showCreateAction?: boolean;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { width } = useWindowDimensions();
  const contentStyle = useMemo(
    () => ({
      paddingHorizontal: getResponsiveHorizontalPadding(width),
      paddingTop: getResponsiveTopPadding(width),
    }),
    [width],
  );
  const headerTitleStyle = useMemo(
    () => ({ fontSize: getResponsiveHeaderTitleSize(width) }),
    [width],
  );
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(backFallback);
  };

  const content = (
    <>
        {!hideHeader ? <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.8} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, headerTitleStyle]}>{title}</Text>
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
        </View> : null}
        {children}
    </>
  );

  return (
    <SafeAreaView edges={safeAreaEdges} style={styles.safeArea}>
      <AppStatusBar />
      {scrollable ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
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
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fixedContent, contentStyle]}>{content}</View>
      )}
      {footer}
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
      <StateIllustration Colors={Colors} accent={tone === "error" ? "error" : "blue"} icon={icon} />
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

function AppointmentCard({
  appointment,
  detailRoute,
  showPaymentStatus = false,
}: {
  appointment: AppointmentListItem;
  detailRoute?: (appointmentId: string) => Href;
  showPaymentStatus?: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const route = detailRoute?.(appointment.id) ?? (`/appointments/${appointment.id}` as Href);

  return (
    <Animated.View layout={Layout.springify().damping(18).stiffness(160)}>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => router.push(route)}
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
          <MetaPill icon="card-outline" label={showPaymentStatus ? appointment.paymentStatus : appointment.paymentMethod} />
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
        <Text style={styles.dateInput}>{date ? formatAppDate(`${date}T00:00:00`) : "DD-MM-YYYY"}</Text>
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

export function AppointmentDashboardScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const appointments = useAppSelector(selectAppointments);
  const error = useAppSelector(selectAppointmentsError);
  const loading = useAppSelector(selectAppointmentsIsLoading);
  const loadingMore = useAppSelector(selectAppointmentsLoadingMore);
  const pagination = useAppSelector(selectAppointmentsPagination);
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
        <TouchableOpacity activeOpacity={0.8} hitSlop={12} onPress={handleBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.iconButton} />
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
  const pagination = useAppSelector(selectAppointmentsPagination);
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
                hitSlop={12}
                onPress={() => router.replace("/bookings" as Href)}
                style={styles.iconButton}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.primary} />
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
          filtered.length > 0 ? (
            <PaginationControls
              currentPage={pagination.page}
              hasNextPage={pagination.hasMore}
              hasPreviousPage={false}
              loading={loadingMore}
              onNext={pagination.hasMore ? () => void fetchNext({ date, search, status }) : undefined}
              totalItems={pagination.totalCount}
              totalPages={Math.max(1, pagination.totalPages ?? 1)}
              visibleItems={filtered.length}
            />
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

export function StaffMyAppointmentsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { width } = useWindowDimensions();
  const flatListContentStyle = useMemo(
    () => [
      styles.flatListContent,
      {
        paddingHorizontal: getResponsiveHorizontalPadding(width),
        paddingTop: getResponsiveTopPadding(width),
      },
    ],
    [styles.flatListContent, width],
  );
  const headerTitleStyle = useMemo(
    () => ({ fontSize: getResponsiveHeaderTitleSize(width) }),
    [width],
  );
  const appointments = useAppSelector(selectAppointments);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const error = useAppSelector(selectAppointmentsError);
  const loading = useAppSelector(selectAppointmentsIsLoading);
  const loadingMore = useAppSelector(selectAppointmentsLoadingMore);
  const pagination = useAppSelector(selectAppointmentsPagination);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const { fetchAppointments, fetchNext } = useFetchAppointments();
  const today = todayIsoDate();
  const currentStaffId = currentStaff?.id ?? "";

  useEffect(() => {
    if (!currentStaffId) {
      return;
    }

    void fetchAppointments({ reset: true, staffId: currentStaffId });
  }, [currentStaffId, fetchAppointments]);

  const staffAppointments = useMemo(
    () => (currentStaff ? appointments.filter((appointment) => isAssignedToStaff(appointment, currentStaff)) : []),
    [appointments, currentStaff],
  );
  const rows = useMemo(() => buildStaffAppointmentRows(staffAppointments, today), [staffAppointments, today]);
  const counts = useMemo(
    () => ({
      cancelled: staffAppointments.filter((appointment) => appointment.status === "Cancelled").length,
      completed: staffAppointments.filter((appointment) => appointment.status === "Completed").length,
      today: staffAppointments.filter((appointment) => isSameDay(appointment, today)).length,
      upcoming: staffAppointments.filter((appointment) => ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)).length,
    }),
    [staffAppointments, today],
  );
  const blockingError =
    currentStaffError ??
    (!currentStaffId && !currentStaffLoading ? "Staff profile is not available for this session." : null) ??
    error;
  const isInitialLoading = currentStaffLoading || loading;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.headerTitle, headerTitleStyle]}>My Appointments</Text>
              </View>
            </View>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryTileWrap, { width: "48%" }]}>
                <SummaryTile icon="today-outline" label="Today" value={String(counts.today)} />
              </View>
              <View style={[styles.summaryTileWrap, { width: "48%" }]}>
                <SummaryTile icon="arrow-up-circle-outline" label="Upcoming" value={String(counts.upcoming)} />
              </View>
              <View style={[styles.summaryTileWrap, { width: "48%" }]}>
                <SummaryTile icon="checkmark-done-outline" label="Completed" value={String(counts.completed)} />
              </View>
              <View style={[styles.summaryTileWrap, { width: "48%" }]}>
                <SummaryTile icon="close-circle-outline" label="Cancelled" value={String(counts.cancelled)} />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          isInitialLoading ? (
            <SkeletonList />
          ) : blockingError ? (
            <StateCard
              actionLabel="Retry"
              icon="cloud-offline-outline"
              message={blockingError}
              onAction={() => currentStaffId && void fetchAppointments({ reset: true, staffId: currentStaffId })}
              title="Unable to load appointments"
              tone="error"
            />
          ) : (
            <StateCard
              icon="calendar-clear-outline"
              message="No appointments are currently assigned to you."
              title="No appointments"
            />
          )
        }
        ListFooterComponent={
          rows.length > 0 ? (
            <PaginationControls
              currentPage={pagination.page}
              hasNextPage={pagination.hasMore}
              hasPreviousPage={false}
              loading={loadingMore}
              onNext={pagination.hasMore ? () => currentStaffId && void fetchNext({ staffId: currentStaffId }) : undefined}
              totalItems={pagination.totalCount}
              totalPages={Math.max(1, pagination.totalPages ?? 1)}
              visibleItems={staffAppointments.length}
            />
          ) : null
        }
        contentContainerStyle={flatListContentStyle}
        data={isInitialLoading || blockingError ? [] : rows}
        keyExtractor={(item) => item.id}
        onEndReached={() => currentStaffId && void fetchNext({ staffId: currentStaffId })}
        onEndReachedThreshold={0.45}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={() => currentStaffId && void fetchAppointments({ refresh: true, staffId: currentStaffId })}
            refreshing={refreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) =>
          item.type === "section" ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
            </View>
          ) : (
            <AppointmentCard
              appointment={item.appointment}
              detailRoute={(appointmentId) => `/(staff)/appointment-details/${appointmentId}` as Href}
              showPaymentStatus
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />
      <AppointmentSnackbar />
    </SafeAreaView>
  );
}

function CalendarPreview({
  appointments,
  date,
  onRefresh,
  refreshing = false,
  staffNames = [],
  viewMode = "week",
}: {
  appointments: AppointmentListItem[];
  date: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  staffNames?: string[];
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
  const columns = useMemo(() => viewMode === "day"
    ? (staffNames.length ? staffNames.map((name) => ({ key: date, label: name, staffName: name })) : [{ key: date, label: "All Staff", staffName: "" }])
    : days.map((day) => ({ ...day, staffName: "" })), [date, days, staffNames, viewMode]);
  const columnWidth = viewMode === "day" ? 132 : 118;
  const calendarContentWidth = 54 + columns.length * columnWidth;
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
                <View style={styles.dinggListStatusRow}><View style={[styles.dinggListStatusDot, appointment.status === "Completed" && styles.dinggStatusCompleted, appointment.status === "Confirmed" && styles.dinggStatusConfirmed]} /><Text style={styles.dinggListStatus}>{appointment.status}</Text><Ionicons name="chevron-down" size={18} color={Colors.appointmentTextSecondary} /></View>
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
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator style={styles.dinggHorizontalScroller}>
        <View style={{ height: "100%", width: calendarContentWidth }}>
          <View style={styles.dinggCalendarHeader}>
            <View style={styles.dinggTimeHeader}>{viewMode === "day" ? <Text style={styles.dinggStaffHeader}>Staff</Text> : null}</View>
            {columns.map((column, index) => <View key={`${column.key}-${column.label}-${index}`} style={[styles.dinggDayHeader, { width: columnWidth }]}>{viewMode === "day" ? <Ionicons name="person-outline" size={12} color={Colors.appointmentAccent} /> : null}<Text numberOfLines={1} style={styles.dinggDayHeaderText}>{column.label}</Text></View>)}
          </View>
          <ScrollView
            nestedScrollEnabled
            ref={verticalScrollRef}
            refreshControl={onRefresh ? <RefreshControl colors={[Colors.primary]} onRefresh={onRefresh} refreshing={refreshing} tintColor={Colors.primary} /> : undefined}
            showsVerticalScrollIndicator
            style={styles.dinggVerticalScroller}
          >
            <View style={[styles.dinggGridBody, { height: hours.length * hourHeight }]}>
              <View style={styles.dinggTimeColumn}>
                {timeSlots.map(({ hour, minute }) => (
                  <View key={`${hour}-${minute}`} style={[styles.dinggTimeCell, { height: hourHeight / 4 }]}>
                    <Text style={[styles.dinggTimeText, minute === 0 && styles.dinggHourText]}>{minute === 0 ? new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: true }).format(new Date(2020, 0, 1, hour)) : `${String(hour % 12 || 12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}</Text>
                  </View>
                ))}
              </View>
              {columns.map((column, columnIndex) => {
                const columnAppointments = appointments.filter((appointment) => getDateKey(appointment.scheduledAt) === column.key && (!column.staffName || appointment.staffName === column.staffName));
                return (
                <View key={`${column.key}-${column.label}-${columnIndex}`} style={[styles.dinggDayColumn, viewMode === "day" && (columnIndex % 2 === 0 ? styles.dinggColumnAvailable : styles.dinggColumnUnavailable), { width: columnWidth }]}>
                  {timeSlots.map(({ hour, minute }, slotIndex) => (
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
                      style={[styles.dinggQuickSaleSlot, { height: hourHeight / 4, top: slotIndex * (hourHeight / 4) }]}
                    />
                  ))}
                  {hours.map((hour) => (
                    <View key={`${column.key}-${hour}`} style={[styles.dinggHourCell, { height: hourHeight }]}>
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
              );})}
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

function AppointmentPreviewSheet({
  appointment,
  onClose,
}: {
  appointment: AppointmentListItem | null;
  onClose: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [stage, setStage] = useState<"actions" | "details">("actions");
  const [detailsTab, setDetailsTab] = useState<"appointment" | "notes">("appointment");

  useEffect(() => {
    setStage("actions");
    setDetailsTab("appointment");
  }, [appointment?.id]);

  if (!appointment) return null;
  const isPaid = appointment.paymentStatus.toLowerCase() === "paid" || (appointment.total > 0 && appointment.paidAmount >= appointment.total);
  const start = formatBusinessTime(appointment.startTime || appointment.scheduledAt);
  const end = formatBusinessTime(appointment.endTime);

  const openNoteEditor = () => {
    onClose();
    requestAnimationFrame(() => router.push(`/appointments/${appointment.id}/edit` as Href));
  };

  const handleViewInvoice = () => {
    if (!appointment.saleId) {
      Alert.alert("Invoice unavailable", "A receipt has not been created for this appointment yet.");
      return;
    }

    onClose();
    requestAnimationFrame(() => router.push({
      pathname: "/quick-sale/checkout",
      params: { openReceipt: "1", saleId: appointment.saleId },
    } as Href));
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <Pressable onPress={onClose} style={styles.previewBackdrop}>
        {stage === "actions" ? (
          <Pressable style={styles.calendarActionsModal}>
            <View style={styles.calendarActionsHeader}>
              <Text style={styles.calendarActionsTitle}>Actions</Text>
              <TouchableOpacity accessibilityLabel="Close actions" onPress={onClose} style={styles.calendarActionsClose}>
                <Ionicons name="close-circle-outline" size={28} color={Colors.appointmentText} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.82} onPress={() => setStage("details")} style={styles.calendarActionPrimary}>
              <Text style={styles.calendarActionText}>View Appointment Details</Text>
            </TouchableOpacity>
          </Pressable>
        ) : (
          <Pressable style={styles.appointmentDetailsModal}>
            <View style={styles.appointmentModalHeader}>
              <View style={styles.appointmentModalHeading}>
                <Text numberOfLines={1} style={styles.appointmentModalTitle}>Appointment - {formatBusinessDate(appointment.scheduledAt)}</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Close appointment details" onPress={onClose}>
                <Ionicons name="close" size={28} color={Colors.appointmentTextSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.appointmentClientBand}>
              <View style={styles.appointmentClientAvatar}><Ionicons name="person-outline" size={26} color={Colors.appointmentAccent} /></View>
              <View style={styles.appointmentClientCopy}>
                <Text style={styles.appointmentClientName}>{appointment.clientName}</Text>
                <Text style={styles.appointmentClientPhone}>{maskPhone(appointment.phone)}</Text>
              </View>
              {appointment.status !== "Completed" ? <View style={styles.appointmentStatusControl}><View style={[styles.appointmentStatusDot, { backgroundColor: isPaid ? "#22C55E" : "#F59E0B" }]} /><Text numberOfLines={1} style={styles.appointmentStatusLabel}>{appointment.status}</Text><Ionicons name="chevron-down" size={18} color={Colors.appointmentTextSecondary} /></View> : null}
            </View>
            <View style={styles.appointmentTabs}>
              <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: detailsTab === "appointment" }} onPress={() => setDetailsTab("appointment")}>
                <Text style={detailsTab === "appointment" ? styles.appointmentTabActive : styles.appointmentTab}>Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: detailsTab === "notes" }} onPress={() => setDetailsTab("notes")}>
                <Text style={detailsTab === "notes" ? styles.appointmentTabActive : styles.appointmentTab}>Notes</Text>
              </TouchableOpacity>
            </View>
            {detailsTab === "appointment" ? (
              <ScrollView contentContainerStyle={styles.appointmentModalContent}>
                <Text style={styles.appointmentServiceHeading}>Service (1)</Text>
                <View style={styles.appointmentServiceCard}>
                  <View style={styles.appointmentServiceTop}><Text numberOfLines={2} style={styles.appointmentServiceName}>{appointment.serviceName}</Text><Text style={styles.appointmentServiceTime}>at {start}-{end}</Text></View>
                  <View style={styles.appointmentServiceMeta}><Text style={styles.appointmentBookedBy}>Booked by - {appointment.staffName || "-"}</Text><Text style={styles.appointmentWith}>With {appointment.staffName || "-"}</Text></View>
                  <View style={styles.appointmentServiceStatus}><View style={[styles.appointmentStatusDot, { backgroundColor: isPaid ? "#22C55E" : "#F59E0B" }]} /><Text style={styles.appointmentServiceStatusText}>{appointment.status}</Text></View>
                </View>
              </ScrollView>
            ) : (
              <ScrollView contentContainerStyle={styles.appointmentModalContent}>
                <Text style={styles.appointmentNotesHeading}>Client Notes</Text>
                <Text style={[styles.appointmentNotesText, !appointment.notes.trim() && styles.appointmentNotesEmpty]}>
                  {appointment.notes.trim() || "No client notes added."}
                </Text>
                <TouchableOpacity activeOpacity={0.84} onPress={openNoteEditor} style={styles.appointmentNotesButton}>
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.appointmentNotesButtonText}>{appointment.notes.trim() ? "Edit Client Note" : "Add Client Note"}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
            <TouchableOpacity activeOpacity={0.88} disabled={!isPaid} onPress={handleViewInvoice} style={[styles.appointmentInvoiceButton, !isPaid && styles.appointmentInvoiceDisabled]}>
              <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
              <Text style={styles.appointmentInvoiceText}>{isPaid ? "View Invoice" : "Invoice available after payment"}</Text>
            </TouchableOpacity>
          </Pressable>
        )}
      </Pressable>
    </Modal>
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

function AppointmentStatusDropdown({
  error,
  onSelect,
  value,
}: {
  error?: string;
  onSelect: (value: AppointmentStatus) => void;
  value: AppointmentStatus;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>Status</Text>
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => setVisible(true)}
        style={[styles.compactSelectButton, error && styles.inputError]}
      >
        <Text numberOfLines={1} style={styles.compactSelectText}>{value}</Text>
        <Ionicons name="chevron-down" size={15} color={Colors.text2} />
      </TouchableOpacity>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
        <Pressable onPress={() => setVisible(false)} style={styles.modalBackdrop}>
          <Pressable style={styles.statusModalCard}>
            <Text style={styles.modalTitle}>Status</Text>
            {FORM_STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={`appointment-status-${option}`}
                activeOpacity={0.82}
                onPress={() => {
                  onSelect(option);
                  setVisible(false);
                }}
                style={styles.statusOptionRow}
              >
                <Text style={[styles.statusOptionText, option === value && styles.statusOptionTextActive]}>{option}</Text>
                {option === value ? <Ionicons name="checkmark" size={18} color={Colors.appointmentAccent} /> : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
  searchInputRef,
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
  searchInputRef?: RefObject<TextInput | null>;
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
            color={bookingMode === "existing" ? Colors.appointmentAccentDark : Colors.appointmentTextSecondary}
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
            color={bookingMode === "walkIn" ? Colors.appointmentAccentDark : Colors.appointmentTextSecondary}
          />
          <Text style={[styles.clientActionText, bookingMode === "walkIn" && styles.clientActionTextActive]}>
            Walk-in Client
          </Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.84} onPress={onNewClient} style={styles.clientActionChip}>
          <Ionicons name="person-add-outline" size={16} color={Colors.appointmentTextSecondary} />
          <Text style={styles.clientActionText}>New Client</Text>
        </TouchableOpacity>
      </View>

      {bookingMode === "existing" ? (
        <>
          <View style={styles.autocompleteAnchor}>
            <View style={[styles.searchWrap, error && styles.inputError]}>
              <Ionicons name="search-outline" size={18} color={Colors.text2} />
              <TextInput
                ref={searchInputRef}
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

    return formatAppDate(`${value}T00:00:00`);
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
        <Text numberOfLines={1} style={styles.dateButtonText}>{displayDate}</Text>
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
  pricingTotals: {
    subtotal: number;
    grandTotal: number;
    discount?: number;
    totalDisc?: number;
    tax?: number;
    gstAmount?: number;
    taxBreakdown?: { name: string; rate: number; amount: number; inclusive: boolean }[];
  };
  selectedStaff: StaffMember | undefined;
  services: ServiceListItem[];
  startTime: string;
  totalDuration: number;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const serviceLabel = services.length > 0 ? services.map((service) => service.name).join(", ") : "-";
  const dateLabel = validateDate(date) ? formatAppDate(`${date}T00:00:00`) : "-";
  const timeLabel = validateTime(startTime) ? minutesToDisplayTime(parseClockToMinutes(startTime) ?? 0) : "-";
  const taxValue = pricingTotals.tax !== undefined ? pricingTotals.tax : (pricingTotals.gstAmount ?? 0);
  const discountValue = pricingTotals.discount !== undefined ? pricingTotals.discount : (pricingTotals.totalDisc ?? 0);

  const taxRows: [string, string][] = pricingTotals.taxBreakdown && pricingTotals.taxBreakdown.length > 0
    ? pricingTotals.taxBreakdown.map((t) => [`${t.name} (${t.rate}%)${t.inclusive ? " (Incl.)" : ""}`, formatCurrency(t.amount)])
    : [["Tax", formatCurrency(taxValue)]];

  const reviewRows: [string, string][] = [
    ["Client", clientLabel],
    ["Services", serviceLabel],
    ["Assigned Staff", selectedStaff?.name ?? "-"],
    ["Date", dateLabel],
    ["Time", timeLabel],
    ["Duration", totalDuration > 0 ? `${totalDuration} min` : "-"],
    ["Subtotal", formatCurrency(pricingTotals.subtotal)],
    ["Discount", formatCurrency(discountValue)],
    ...taxRows,
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedSlot = slots.find((slot) => slot.value === selectedTime);
  const canOpenDropdown = !disabledReason && slots.length > 0 && !loading;

  const handleToggleDropdown = () => {
    if (!canOpenDropdown) {
      return;
    }

    setDropdownOpen((current) => !current);
  };

  const handleSelectSlot = (time: string) => {
    onSelect(time);
    setDropdownOpen(false);
  };

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
        <View style={styles.timeDropdownWrap}>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={!canOpenDropdown}
            onPress={handleToggleDropdown}
            style={[
              styles.timeDropdownButton,
              error && styles.inputError,
              !canOpenDropdown && styles.inputDisabled,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.timeDropdownValue, !selectedSlot && styles.timeDropdownPlaceholder]}
            >
              {selectedSlot?.display ?? "Select time"}
            </Text>
            <Ionicons
              name={dropdownOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.text2}
            />
          </TouchableOpacity>

          {dropdownOpen ? (
            <View style={styles.timeDropdownMenu}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={slots.length > 5}>
                {slots.map((slot) => {
                  const selected = slot.value === selectedTime;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.84}
                      key={slot.value}
                      onPress={() => handleSelectSlot(slot.value)}
                      style={[styles.timeDropdownOption, selected && styles.timeDropdownOptionActive]}
                    >
                      <Text style={[styles.timeDropdownOptionText, selected && styles.timeDropdownOptionTextActive]}>
                        {slot.display}
                      </Text>
                      {selected ? <Ionicons name="checkmark-circle" size={18} color={Colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
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
                <Ionicons name="trash-outline" size={14} color={Colors.error} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
      </View>
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
      {title || action ? (
        <View style={styles.bookingSectionHeader}>
          <Text style={styles.bookingSectionTitle}>{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

function ServiceCatalogPicker({
  error,
  loading,
  onClose,
  onContinue,
  onSelect,
  onSelectStaff,
  selectedStaffId,
  selectedServiceIds,
  staffError,
  staffMembers,
  services,
  visible,
}: {
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onContinue: () => void;
  onSelect: (service: ServiceListItem) => void;
  onSelectStaff: (staffId: string) => void;
  selectedStaffId: string;
  selectedServiceIds: string[];
  staffError?: string;
  staffMembers: StaffMember[];
  services: ServiceListItem[];
  visible: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const selectedStaff = staffMembers.find((staff) => staffIdMatches(staff, selectedStaffId));
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(services.map((service) => service.category).filter(Boolean) as string[]))],
    [services],
  );
  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return services.filter((service) => {
      const categoryMatches = category === "All" || service.category === category;
      const queryMatches = !normalizedQuery || service.name.toLowerCase().includes(normalizedQuery);

      return categoryMatches && queryMatches;
    });
  }, [category, query, services]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.servicePickerSafeArea}>
        <AppStatusBar />
        <View style={styles.servicePickerHeader}>
          <AppBackButton onPress={onClose} />
          <Text style={styles.servicePickerTitle}>Add services</Text>
        </View>

        <View style={styles.servicePickerBody}>
          <Text style={styles.servicePickerLabel}>Assigned Staff*</Text>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setStaffPickerOpen(true)}
            style={[styles.servicePickerSelect, staffError && styles.inputError]}
          >
            <Text style={[styles.servicePickerSelectText, !selectedStaff && styles.servicePickerSelectPlaceholder]}>{selectedStaff?.name ?? "-"}</Text>
            <Ionicons name="chevron-down" size={18} color={Colors.appointmentTextSecondary} />
          </TouchableOpacity>
          {staffError ? <Text style={styles.fieldError}>{staffError}</Text> : null}
          <View style={styles.requestedStylistRow}>
            <Text style={styles.requestedStylistLabel}>Requested Stylist</Text>
            <Text style={styles.requestedStylistValue}>{selectedStaff?.name ?? "No Preferences"}</Text>
          </View>

          <Text style={styles.servicePickerLabel}>Services</Text>
          <View style={styles.servicePickerSearch}>
            <TextInput
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Search for services"
              placeholderTextColor={Colors.appointmentPlaceholder}
              style={styles.servicePickerSearchInput}
              value={query}
            />
            {query ? (
              <TouchableOpacity accessibilityLabel="Clear service search" onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={22} color={Colors.appointmentMuted} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search-outline" size={28} color={Colors.appointmentText} />
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceCategoryScroll}>
            <View style={styles.serviceCategoryRow}>
              {categories.map((item) => {
                const active = item === category;
                return (
                  <TouchableOpacity key={item} onPress={() => setCategory(item)} style={styles.serviceCategoryTab}>
                    <Text style={[styles.serviceCategoryText, active && styles.serviceCategoryTextActive]}>{item}</Text>
                    {active ? <View style={styles.serviceCategoryIndicator} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {loading ? (
            <View style={styles.servicePickerState}><ActivityIndicator color={Colors.appointmentAccent} /></View>
          ) : error ? (
            <View style={styles.servicePickerState}><Text style={styles.fieldHintError}>{error}</Text></View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filteredServices.map((service) => {
                const selected = selectedServiceIds.includes(service.id);
                return (
                  <View key={service.id} style={styles.catalogServiceRow}>
                    <View style={styles.catalogServiceCopy}>
                      <Text style={styles.catalogServiceName}>{service.name}</Text>
                      <Text style={styles.catalogServiceMeta}>
                        {formatCurrency(service.price)} <Text style={styles.catalogServiceDivider}>|</Text> {formatDurationLabel(service.durationMinutes)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() => onSelect(service)}
                      style={[styles.catalogAddButton, selected && styles.catalogQuantityButton]}
                    >
                      {selected ? (
                        <><Ionicons name="remove" size={18} color={Colors.appointmentText} /><Text style={styles.catalogQuantityText}>1</Text><Ionicons name="add" size={18} color={Colors.appointmentMuted} /></>
                      ) : (
                        <><Text style={styles.catalogAddText}>Add</Text><Ionicons name="add" size={18} color={Colors.appointmentText} /></>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
              {filteredServices.length === 0 ? <Text style={styles.servicePickerEmpty}>No services found.</Text> : null}
            </ScrollView>
          )}
        </View>

        <Modal animationType="fade" onRequestClose={() => setStaffPickerOpen(false)} transparent visible={staffPickerOpen}>
          <Pressable onPress={() => setStaffPickerOpen(false)} style={styles.stylistModalBackdrop}>
            <Pressable style={styles.stylistModalCard}>
              <View style={styles.stylistModalHeader}>
                <Text style={styles.stylistModalTitle}>Assigned Staff</Text>
                <TouchableOpacity onPress={() => setStaffPickerOpen(false)}><Ionicons name="close" size={26} color={Colors.appointmentMuted} /></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => { onSelectStaff(""); setStaffPickerOpen(false); }} style={styles.stylistOptionRow}>
                <Text style={styles.stylistOptionName}>No Preferences</Text>
              </TouchableOpacity>
              <ScrollView showsVerticalScrollIndicator={false}>
                {staffMembers.map((staff) => (
                  <TouchableOpacity key={staff.id} onPress={() => { onSelectStaff(staff.id); setStaffPickerOpen(false); }} style={styles.stylistOptionRow}>
                    <InitialsAvatar initials={staff.initials} size={36} />
                    <Text numberOfLines={1} style={styles.stylistOptionName}>{staff.name}</Text>
                    <Text style={styles.stylistAvailability}>{staff.availabilityLabel || "Available"}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <View style={styles.servicePickerFooter}>
          <Text style={styles.servicePickerCount}>{selectedServiceIds.length} {selectedServiceIds.length === 1 ? "Service" : "Services"}</Text>
          <TouchableOpacity
            disabled={selectedServiceIds.length === 0}
            onPress={onContinue}
            style={[styles.servicePickerContinue, selectedServiceIds.length === 0 && styles.disabledButton]}
          >
            <Text style={styles.servicePickerContinueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
  const toast = useAppToast();
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
  const clientSearchInputRef = useRef<TextInput | null>(null);
  const serviceSearchInputRef = useRef<TextInput | null>(null);
  const clientRequestIdRef = useRef(0);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceListItem[]>([]);
  const [serviceCatalogError, setServiceCatalogError] = useState<string | null>(null);
  const [serviceCatalogLoading, setServiceCatalogLoading] = useState(false);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [selectedServices, setSelectedServices] = useState<AppointmentSelectedService[]>([]);
  const [sendAppointmentSms, setSendAppointmentSms] = useState(true);
  const [sendAppointmentEmail, setSendAppointmentEmail] = useState(true);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
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
  const totalServiceDuration = useMemo(
    () => selectedServices.reduce((total, service) => total + Math.max(service.durationMinutes ?? 0, 0), 0),
    [selectedServices],
  );
  const servicePricingTotals = useMemo(
    () => getServicePricingTotals(selectedServices),
    [selectedServices],
  );
  const totalServicePrice = servicePricingTotals.grandTotal;
  const defaultTimeSlots = useMemo(() => getDefaultTimeSlots(form.date), [form.date]);
  const allowedPastEditDate = mode === "edit" && existingAppointment
    ? toInputDate(existingAppointment.scheduledAt)
    : undefined;
  const originalEditSlot = useMemo<StaffAvailabilitySlot | null>(() => {
    if (!existingAppointment || mode !== "edit") return null;

    const originalDate = toInputDate(existingAppointment.scheduledAt);
    const originalStart = toInputTime(existingAppointment.startTime ?? existingAppointment.scheduledAt);
    const originalEnd = toInputTime(existingAppointment.endTime);
    const sameStaff = form.staffId === existingAppointment.staffId ||
      Boolean(selectedStaff && staffIdMatches(selectedStaff, existingAppointment.staffId));

    if (form.date !== originalDate || !sameStaff || !validateTime(originalStart)) return null;

    return {
      display: minutesToDisplayTime(parseClockToMinutes(originalStart) ?? 0),
      endTime: validateTime(originalEnd) ? originalEnd : addMinutesToTime(originalDate, originalStart, existingAppointment.durationMinutes ?? 30),
      value: originalStart,
    };
  }, [existingAppointment, form.date, form.staffId, mode, selectedStaff]);
  const availableSlots = useMemo<StaffAvailabilitySlot[]>(
    () => {
      if (!validateDate(form.date)) {
        return [];
      }

      const slots = form.staffId
        ? staffAvailability?.availableSlots ?? []
        : defaultTimeSlots;

      if (!originalEditSlot || slots.some((slot) => slot.value === originalEditSlot.value)) return slots;

      return [...slots, originalEditSlot].sort((left, right) => left.value.localeCompare(right.value));
    },
    [defaultTimeSlots, form.date, form.staffId, originalEditSlot, staffAvailability?.availableSlots],
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
  const slotDisabledReason = !validateDate(form.date)
    ? "Select a date to view times."
    : form.staffId && availabilityBlockReason
      ? availabilityBlockReason
      : form.staffId && !staffAvailability && !schedulerLoading
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
  const refreshStaffAvailability = useCallback(() => {
    setAvailabilityRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    void dispatch(fetchClientsThunk({ limit: 50, offset: 0, reset: true }));
    void dispatch(fetchStaffThunk({ limit: 50, page: 1, reset: true }));
  }, [dispatch]);

  useEffect(() => {
    if (!servicePickerVisible || serviceCatalog.length > 0 || serviceCatalogLoading) {
      return;
    }

    setServiceCatalogLoading(true);
    setServiceCatalogError(null);
    fetchServiceCatalog(activeBranchId).then(
      (catalog) => {
        setServiceCatalog(catalog);
        setServiceCatalogLoading(false);
      },
      (error) => {
        setServiceCatalogError(getApiErrorMessage(error));
        setServiceCatalogLoading(false);
      },
    );
  }, [activeBranchId, serviceCatalog.length, serviceCatalogLoading, servicePickerVisible]);

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
    if (!form.startTime) {
      return;
    }

    if (form.staffId && (schedulerLoading || !staffAvailability)) {
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
  }, [availableSlots, form.staffId, form.startTime, schedulerLoading, staffAvailability]);

  // Client search must hit the backend rather than filtering only the first
  // page of clients loaded into Redux (`fetchClientsThunk({ limit: 50 })` on
  // mount) — otherwise any client beyond that first batch is unfindable here.
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
      setSelectedServices(appointmentServicesToSelectedServices(existingAppointment));
      setClientBookingMode("existing");
      setClientSearch(existingAppointment.clientName);
      setClientDropdownOpen(false);
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
      setClientSearch("");
      return;
    }

    void dispatch(fetchClientByIdThunk(returnedClientId)).then((result) => {
      if (!cancelled && fetchClientByIdThunk.fulfilled.match(result)) {
        setSelectedClientRecord(result.payload);
        setClientSearch("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clients, dispatch, mode, returnedClientId]);

  useEffect(() => {
    const firstService = selectedServices[0];
    const firstServiceId = firstService ? getSelectedServiceCatalogId(firstService) : "";
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
        serviceId: firstServiceId,
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
      if (key === "date" && current.date !== value) {
        return { ...current, date: value, endTime: "", startTime: "" };
      }

      return { ...current, [key]: value };
    });
    setErrors((current) => ({
      ...current,
      [key]: undefined,
      ...(key === "date" ? { startTime: undefined } : {}),
    }));
    setFormSubmitError(null);
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
    setClientSearch("");
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
    serviceSearchInputRef.current?.blur();
    clientSearchInputRef.current?.blur();
    Keyboard.dismiss();
    setSelectedServices((current) => {
      if (current.some((selectedService) => getSelectedServiceCatalogId(selectedService) === service.id)) {
        return current.filter((selectedService) => getSelectedServiceCatalogId(selectedService) !== service.id);
      }

      // Copy the catalog service's configured recipe onto this appointment
      // line the instant it's picked — mirrors Web's ServiceRow.tsx
      // selectService(), which does this unconditionally (no staff action
      // needed). actualQty defaults to qty until a future "adjust actual
      // usage" UI (not built here — no equivalent exists in this screen
      // today) would let staff override it.
      const consumables: AppointmentSelectedService["consumables"] = service.consumablesUsed?.length
        ? service.consumablesUsed.map((item) => ({ ...item, actualQty: item.qty }))
        : undefined;

      return [...current, { ...service, ...(consumables ? { consumables } : {}) }];
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

  const handleServicePickerContinue = () => {
    if (!form.staffId) {
      setErrors((current) => ({ ...current, staffId: "Select the staff." }));
      return;
    }

    setServicePickerVisible(false);
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
    const nextErrors = validateForm(form, {
      allowedPastDate: allowedPastEditDate,
      requireClient: !isWalkInClient,
    });

    setErrors(nextErrors);
    setFormSubmitError(null);

    if (Object.keys(nextErrors).length > 0) {
      setFormSubmitError("Please correct the highlighted appointment details and try again.");
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

    if (form.staffId && schedulerLoading) {
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
    const serviceItems = selectedServices
      .map((service) => {
        const serviceId = getSelectedServiceCatalogId(service).trim();

        if (!serviceId) {
          return null;
        }

        const quantity = Math.max(1, Math.trunc(service.quantity ?? 1));

        return {
          // Resend this line's exact consumables snapshot unchanged — the
          // backend does a full replace of appointment_service_consumables
          // whenever `services` is present in the patch (flattenServiceConsumables),
          // so omitting this on an edit that didn't touch this service would
          // silently wipe its already-persisted consumables.
          ...(service.consumables?.length
            ? {
                consumables: service.consumables.map((c) => ({
                  actual_qty: c.actualQty ?? c.qty,
                  product_id: c.productId,
                  qty: c.qty,
                  unit: c.unit,
                })),
              }
            : {}),
          ...(service.discount !== undefined ? { discount: service.discount } : {}),
          ...(service.durationMinutes ? { duration: service.durationMinutes } : {}),
          ...(service.isPackageService ? { is_package_service: true } : {}),
          name: service.name,
          price: service.price,
          quantity,
          service_id: serviceId,
          staff_id: service.staffId ?? form.staffId,
          staff_name: service.staffName ?? selectedStaff?.name,
          time: service.startTime ?? selectedSlot.value,
          total: service.total ?? service.price * quantity,
        };
      })
      .filter((service): service is NonNullable<typeof service> => Boolean(service));

    const payload: Omit<CreateAppointmentRequest, "salon_id"> = {
      duration_minutes: durationMinutes,
      end_time: combineDateTime(form.date, calculatedEndTime || selectedSlot.value),
      ...(calculatedDiscount > 0 ? { discount: calculatedDiscount } : {}),
      notes: form.notes.trim() || undefined,
      price: calculatedPrice,
      scheduled_at: combineDateTime(form.date, selectedSlot.value),
      service_id: form.serviceId.trim() || undefined,
      service_name: form.serviceName.trim() || undefined,
      services: serviceItems,
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
    toast.showSuccess(mode === "create" ? "Appointment created successfully." : "Appointment updated successfully.");
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
      <ServiceCatalogPicker
        error={serviceCatalogError}
        loading={serviceCatalogLoading}
        onClose={() => setServicePickerVisible(false)}
        onContinue={handleServicePickerContinue}
        onSelect={handleSelectService}
        onSelectStaff={handleSelectStaff}
        selectedStaffId={form.staffId}
        selectedServiceIds={selectedServices.map(getSelectedServiceCatalogId)}
        staffError={errors.staffId}
        staffMembers={staffMembers}
        services={serviceCatalog}
        visible={servicePickerVisible}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, styles.bookingContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.flex}
      >
          <View style={styles.headerRow}>
            <AppBackButton fallbackHref="/bookings" />
            <View style={styles.appointmentHeaderCopy}>
              <Text style={styles.headerTitle}>{mode === "create" ? "New Appointment" : "Edit Appointment"}</Text>
              <Text style={styles.appointmentHeaderSubtitle}>
                {mode === "create"
                  ? "Select a client, date, and time to start the booking."
                  : "Update the appointment details below."}
              </Text>
            </View>
          </View>

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

            <BookingSection stackIndex={clientDropdownOpen ? 40 : 5} title="Client details">
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
                searchInputRef={clientSearchInputRef}
                selectedClient={selectedClient}
                selectedClientId={form.clientId}
              />
            </BookingSection>

            <View style={styles.appointmentCoreRow}>
              <View style={styles.appointmentCoreField}>
                <AppointmentDateField error={errors.date} onChange={(value) => updateForm("date", value)} value={form.date} />
              </View>
              <View style={styles.appointmentCoreField}>
                <TimeSlotSelector disabledReason={slotDisabledReason} error={errors.startTime} loading={schedulerLoading} onSelect={handleSelectSlot} selectedTime={form.startTime} slots={availableSlots} />
              </View>
              <View style={[styles.appointmentCoreField, styles.compactStatusField]}>
                <AppointmentStatusDropdown
                  error={errors.status}
                  onSelect={(value) => updateForm("status", value)}
                  value={form.status}
                />
              </View>
            </View>

            <BookingSection
              action={selectedServices.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setServicePickerVisible(true)}
                  style={styles.bookingSectionActionButton}
                >
                  <Ionicons name="add" size={16} color={Colors.appointmentAccent} />
                  <Text style={styles.bookingSectionAction}>Add more services</Text>
                </TouchableOpacity>
              ) : undefined}
              stackIndex={serviceDropdownOpen ? 40 : 4}
              title={selectedServices.length === 0 ? "" : "Appointment services"}
            >
              {selectedServices.length === 0 ? (
                <TouchableOpacity activeOpacity={0.86} onPress={() => setServicePickerVisible(true)} style={styles.emptyAddServicesButton}>
                  <View style={styles.emptyAddServicesIcon}><Ionicons name="add" size={20} color="#FFFFFF" /></View>
                  <Text style={styles.emptyAddServicesText}>Add Services</Text>
                </TouchableOpacity>
              ) : (
                <SelectedServicesPanel
                  onRemove={handleRemoveSelectedService}
                  pricingTotals={servicePricingTotals}
                  services={selectedServices}
                  totalDuration={totalServiceDuration}
                  totalPrice={totalServicePrice}
                />
              )}
            </BookingSection>

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
              </>
            ) : null}

            <BookingSection title="Appointment summary">
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

            <View style={styles.appointmentDeliverySection}>
              <View style={styles.appointmentDeliveryTitleRow}>
                <Ionicons name="document-text-outline" size={17} color={Colors.appointmentTextSecondary} />
                <Text style={styles.appointmentDeliveryTitle}>Send appointment details on</Text>
              </View>
              <View style={styles.appointmentDeliveryOptions}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => setSendAppointmentSms((selected) => !selected)}
                  style={styles.appointmentDeliveryOption}
                >
                  <Ionicons
                    name={sendAppointmentSms ? "checkbox" : "square-outline"}
                    size={20}
                    color={sendAppointmentSms ? Colors.appointmentAccent : Colors.appointmentMuted}
                  />
                  <Text style={styles.appointmentDeliveryOptionText}>SMS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => setSendAppointmentEmail((selected) => !selected)}
                  style={styles.appointmentDeliveryOption}
                >
                  <Ionicons
                    name={sendAppointmentEmail ? "checkbox" : "square-outline"}
                    size={20}
                    color={sendAppointmentEmail ? Colors.appointmentAccent : Colors.appointmentMuted}
                  />
                  <Text style={styles.appointmentDeliveryOptionText}>Email</Text>
                </TouchableOpacity>
              </View>
            </View>

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
      </KeyboardAwareScrollView>
      <View style={[styles.bookingBottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <View style={styles.bookingBottomSummary}>
          <View>
            <Text style={styles.bookingBottomLabel}>
              {selectedServices.length} {selectedServices.length === 1 ? "service" : "services"}
            </Text>
            <Text style={styles.bookingBottomMeta}>{totalServiceDuration} min</Text>
          </View>
          <View style={styles.bookingBottomTotalWrap}>
            <Text style={styles.bookingBottomLabel}>Estimated total</Text>
            <Text style={styles.bookingBottomTotal}>{formatCurrency(totalServicePrice)}</Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={mutating}
          onPress={handleSubmit}
          style={[styles.bookingPrimaryButton, mutating && styles.disabledButton]}
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
  return formatAppDate(parseAppointmentDateTime(value), value ?? "-");
};

const formatBusinessTime = (value: string | null) => {
  return formatAppTime(parseAppointmentDateTime(value), value ?? "-");
};

const toInvoiceSequence = (value: unknown): InvoiceSequence =>
  typeof value === "string" || typeof value === "number" ? value : null;

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

export function AppointmentDetailsScreen({ mode = "owner" }: { mode?: "owner" | "staff" } = {}) {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const appointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const detailsState = useAppSelector((state) => selectAppointmentDetailsState(state, appointmentId));
  const saleDetail = useAppSelector(selectSaleDetail);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const isStaffMode = mode === "staff";
  const isStaffAppointment =
    !isStaffMode || !appointment || (currentStaff ? isAssignedToStaff(appointment, currentStaff) : false);

  useEffect(() => {
    if (appointmentId) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointmentId, dispatch]);

  const appointmentInvoiceNumber = formatInvoiceNumber(
    toInvoiceSequence(
      appointment?.raw.invoice_number ??
        appointment?.raw.invoiceNumber ??
        appointment?.raw.invoice_no ??
        appointment?.raw.invoiceNo,
    ),
  );

  useEffect(() => {
    if (appointment?.saleId && !appointmentInvoiceNumber) {
      void dispatch(fetchSaleByIdThunk(appointment.saleId));
    }
  }, [appointment?.saleId, appointmentInvoiceNumber, dispatch]);

  const invoiceNumber =
    appointmentInvoiceNumber ??
    (saleDetail && saleDetail.id === appointment?.saleId
      ? formatInvoiceNumber(saleDetail.receiptNumber)
      : null);

  const displayName = appointment?.clientName?.trim() ? appointment.clientName.trim() : "Walk-in Client";
  const appointmentIsPaid = Boolean(appointment && (appointment.paymentStatus.toLowerCase() === "paid" || (appointment.total > 0 && appointment.paidAmount >= appointment.total)));

  return (
    <ScreenShell
      onRefresh={() => {
        if (appointmentId) {
          void dispatch(fetchAppointmentByIdThunk(appointmentId));
        }
      }}
      refreshing={detailsState?.loading}
      title={isStaffMode ? "My Appointment" : "Appointment Details"}
    >
      {(detailsState?.loading || (isStaffMode && currentStaffLoading)) && !appointment ? <SkeletonList /> : null}
      {isStaffMode && currentStaffError && !appointment ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={currentStaffError}
          onAction={() => appointmentId && void dispatch(fetchAppointmentByIdThunk(appointmentId))}
          title="Unable to resolve staff profile"
          tone="error"
        />
      ) : null}
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
      {appointment && !isStaffAppointment ? (
        <StateCard
          icon="lock-closed-outline"
          message="This appointment is not assigned to your staff profile."
          title="Appointment unavailable"
          tone="error"
        />
      ) : null}
      {appointment && isStaffAppointment ? (
        <>
          <View style={styles.detailInvoiceRow}>
            <View>
              <Text style={styles.detailInvoiceLabel}>Invoice Number</Text>
              <Text style={styles.detailInvoiceNumber}>{invoiceNumber ?? "Not generated"}</Text>
            </View>
            <View style={[styles.previewStatusBadge, appointmentIsPaid ? styles.previewPaidBadge : styles.previewUnpaidBadge]}>
              <Text style={[styles.previewStatusText, !appointmentIsPaid && styles.previewUnpaidText]}>{appointmentIsPaid ? "PAID" : appointment.paymentStatus}</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Client Details</Text>
            <DetailRow label="Client Name" value={displayName} />
            <DetailRow label="Phone" value={appointment.phone} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Appointment Details</Text>
            <DetailRow label="Date" value={formatBusinessDate(appointment.scheduledAt)} />
            <DetailRow label="Time" value={[formatBusinessTime(appointment.startTime || appointment.scheduledAt), formatBusinessTime(appointment.endTime)].filter((value) => value && value !== "-").join(" - ")} />
            <DetailRow label="Duration" value={appointment.durationLabel || (appointment.durationMinutes ? `${appointment.durationMinutes} mins` : null)} />
            <DetailRow label="Staff" value={appointment.staffName} />
            <DetailRow label="Status" value={appointment.status} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Payment & Billing</Text>
            <DetailRow
              label="Payment Status"
              value={appointment.paymentStatus.toLowerCase() === "paid" || (appointment.total > 0 && appointment.paidAmount >= appointment.total) ? "Paid successfully" : appointment.paymentStatus}
            />
            <DetailRow label="Payment Method" value={appointment.paymentMethod} />
            <DetailRow label="Total Amount" value={formatCurrency(appointment.total || appointment.amount)} />
            <DetailRow label="Amount Paid" value={appointment.paidAmount > 0 ? formatCurrency(appointment.paidAmount) : null} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Services</Text>
            <DetailRow label={appointment.serviceName || "Service"} value={formatCurrency(appointment.total || appointment.amount)} />
            <DetailRow label="Duration" value={appointment.durationLabel || (appointment.durationMinutes ? `${appointment.durationMinutes} mins` : null)} />
          </View>

          {appointment.notes && appointment.notes.trim() ? (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          ) : null}

          <View style={styles.actionGrid}>
            {appointment.status === "Confirmed" ? <StartAppointmentAction appointment={appointment} /> : null}
            {appointment.status === "In Progress" ? <CompleteAppointmentAction appointment={appointment} /> : null}
            {!isStaffMode ? (
              <>
                <ActionButton icon="calendar-outline" label="Reschedule" route={`/appointments/${appointment.id}/reschedule`} />
                <ActionButton icon="close-circle-outline" label="Cancel" route={`/appointments/${appointment.id}/cancel`} danger />
              </>
            ) : null}
          </View>
        </>
      ) : null}
    </ScreenShell>
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
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        numberOfLines={1}
        style={[styles.actionButtonText, danger && styles.actionButtonTextDanger]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CancelAppointmentScreen() {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const toast = useAppToast();
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

    toast.showSuccess("Appointment cancelled successfully.");
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
  const toast = useAppToast();
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

    toast.showSuccess("Appointment rescheduled successfully.");
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
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const appointments = useAppSelector(selectAppointments);
  const staffMembers = useAppSelector(selectStaffMembers);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const { date, search, setDate, setSearch, setStatus, status } = useAppointmentListFilters();
  const { fetchAppointments } = useFetchAppointments();
  const [selectedStaffNames, setSelectedStaffNames] = useState<string[]>([]);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarSearchOpen, setCalendarSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "day" | "list">("day");
  const [viewMenuVisible, setViewMenuVisible] = useState(false);
  const [staffFilterVisible, setStaffFilterVisible] = useState(false);
  const staffNames = useMemo(() => ["All Staff", ...Array.from(new Set([...staffMembers.map((staff) => staff.name), ...appointments.map((item) => item.staffName)].filter(Boolean)))], [appointments, staffMembers]);
  const filteredStaffNames = useMemo(() => staffNames.filter((name) => name !== "All Staff"), [staffNames]);
  const visibleAppointments = useMemo(
    () => appointments.filter((item) => {
      const matchesStaff = selectedStaffNames.length === 0 || selectedStaffNames.includes(item.staffName);
      const matchesStatus = status === "All"
        ? item.status !== "Unknown"
        : status === "Deleted"
          ? item.status === "Deleted"
          : appointmentStatusMatchesFilter(item.status, status);

      return matchesStaff && matchesStatus;
    }),
    [appointments, selectedStaffNames, status],
  );
  const selectedStaffLabel = selectedStaffNames.length === 0
    ? "All Staff"
    : selectedStaffNames.length === 1
      ? selectedStaffNames[0]
      : `${selectedStaffNames.length} Staff`;
  const rangeEnd = useMemo(() => { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + (viewMode === "week" ? 6 : 0)); return value; }, [date, viewMode]);
  const rangeEndKey = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, "0")}-${String(rangeEnd.getDate()).padStart(2, "0")}`;
  const selectedStaffId = selectedStaffNames.length === 1 ? staffMembers.find((staff) => staff.name === selectedStaffNames[0])?.id : undefined;
  const changeDate = (amount: number) => { const value = new Date(`${date}T00:00:00`); value.setDate(value.getDate() + amount); setDate(`${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`); };
  const toggleStaffFilter = (name: string) => {
    if (name === "All Staff") {
      setSelectedStaffNames([]);
      return;
    }

    setSelectedStaffNames((current) =>
      current.includes(name) ? current.filter((staffName) => staffName !== name) : [...current, name],
    );
  };

  useEffect(() => {
    void fetchAppointments(viewMode === "week"
      ? { fromDate: date, limit: 200, reset: true, search, staffId: selectedStaffId, status, toDate: rangeEndKey }
      : { date, limit: 200, reset: true, search, staffId: selectedStaffId, status });
  }, [date, fetchAppointments, rangeEndKey, search, selectedStaffId, status, viewMode]);

  useEffect(() => {
    void dispatch(fetchStaffThunk({ limit: 50, page: 1, reset: true }));
  }, [dispatch]);

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
        staffNames={selectedStaffNames.length ? selectedStaffNames : filteredStaffNames}
        viewMode={viewMode}
      />
      <Modal animationType="fade" onRequestClose={() => setViewMenuVisible(false)} transparent visible={viewMenuVisible}><Pressable onPress={() => setViewMenuVisible(false)} style={styles.calendarMenuBackdrop}><Pressable style={styles.calendarMenuCard}>{([['week','calendar-outline','Week view'],['day','today-outline','Day view'],['list','list-outline','List view']] as const).map(([value, icon, label]) => <TouchableOpacity key={value} onPress={() => { setViewMode(value); setViewMenuVisible(false); }} style={[styles.calendarMenuOption, viewMode === value && styles.calendarMenuOptionActive]}><Ionicons name={icon} size={18} color={Colors.appointmentText} /><Text style={styles.calendarMenuText}>{label}</Text>{viewMode === value ? <Ionicons name="radio-button-on" size={16} color={Colors.appointmentAccent} /> : null}</TouchableOpacity>)}</Pressable></Pressable></Modal>
      <Modal animationType="fade" onRequestClose={() => setStaffFilterVisible(false)} transparent visible={staffFilterVisible}><Pressable onPress={() => setStaffFilterVisible(false)} style={styles.calendarMenuBackdrop}><Pressable style={styles.staffFilterCard}><Text style={styles.staffFilterTitle}>By Staff</Text><ScrollView>{staffNames.map((name) => { const selected = name === "All Staff" ? selectedStaffNames.length === 0 : selectedStaffNames.includes(name); return <TouchableOpacity key={name} onPress={() => toggleStaffFilter(name)} style={styles.staffFilterOption}><Ionicons name={selected ? "checkbox" : "square-outline"} size={20} color={selected ? Colors.appointmentAccent : Colors.appointmentMuted} /><Text style={styles.staffFilterText}>{name}</Text></TouchableOpacity>; })}</ScrollView><View style={styles.staffFilterActions}><TouchableOpacity onPress={() => setSelectedStaffNames([])}><Text style={styles.staffFilterClear}>Clear</Text></TouchableOpacity><TouchableOpacity onPress={() => setStaffFilterVisible(false)} style={styles.staffFilterApply}><Text style={styles.staffFilterApplyText}>Apply</Text></TouchableOpacity></View></Pressable></Pressable></Modal>
    </ScreenShell>
  );
}

function ReadOnlyBlockedTimesSummary({
  blockedTimes,
  error,
  loading,
  onRetry,
}: {
  blockedTimes: BlockedTimeEntry[];
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const sortedBlockedTimes = useMemo(
    () => [...blockedTimes].sort((left, right) => (left.startAt ?? "").localeCompare(right.startAt ?? "")),
    [blockedTimes],
  );

  return (
    <View style={styles.availabilityCard}>
      <View style={styles.availabilityHeader}>
        <Text style={styles.availabilityTitle}>Blocked Times</Text>
        {loading ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
      </View>
      {error ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={error}
          onAction={onRetry}
          title="Unable to load blocked times"
          tone="error"
        />
      ) : null}
      {!error && loading ? <Text style={styles.fieldHint}>Loading blocked times...</Text> : null}
      {!error && !loading && sortedBlockedTimes.length === 0 ? (
        <Text style={styles.fieldHint}>No blocked times for this date.</Text>
      ) : null}
      {!error && sortedBlockedTimes.length > 0 ? (
        <View style={styles.availabilityRows}>
          {sortedBlockedTimes.map((blockedTime) => (
            <View key={blockedTime.id} style={styles.availabilityRow}>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowLabel}>
                {blockedTime.reason || "Blocked time"}
              </Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowValue}>
                {[blockedTime.startAt, blockedTime.endAt].filter(Boolean).join(" — ") || "-"}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function StaffCalendarScreen() {
  const appointments = useAppSelector(selectAppointments);
  const appointmentsError = useAppSelector(selectAppointmentsError);
  const appointmentsLoading = useAppSelector(selectAppointmentsIsLoading);
  const refreshing = useAppSelector(selectAppointmentsRefreshing);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const { date, search, setDate, setSearch, setStatus, status } = useAppointmentListFilters();
  const { fetchAppointments } = useFetchAppointments();
  const dispatch = useAppDispatch();
  const currentStaffId = currentStaff?.id ?? "";
  const availability = useAppSelector((state) => selectStaffAvailability(state, currentStaffId, date));
  const availabilityLoading = useAppSelector((state) =>
    selectStaffAvailabilityLoading(state, currentStaffId, date),
  );
  const availabilityError = useAppSelector((state) =>
    selectStaffAvailabilityError(state, currentStaffId, date),
  );
  const loadCalendar = useCallback(
    (refresh = false) => {
      if (!currentStaffId) {
        return;
      }

      void fetchAppointments({ date, refresh, reset: !refresh, search, staffId: currentStaffId, status });
      void dispatch(fetchStaffAvailabilityThunk({ date, staffId: currentStaffId }));
    },
    [currentStaffId, date, dispatch, fetchAppointments, search, status],
  );

  useEffect(() => {
    loadCalendar(false);
  }, [loadCalendar]);

  const staffAppointments = useMemo(
    () =>
      currentStaff
        ? appointments
          .filter((appointment) => isAssignedToStaff(appointment, currentStaff))
          .filter((appointment) => getDateKey(appointment.scheduledAt) === date)
          .filter((appointment) => matchesAppointment(appointment, search, status))
        : [],
    [appointments, currentStaff, date, search, status],
  );
  const dateBlockedTimes = useMemo(
    () =>
      (availability?.blockedTimes ?? []).filter((blockedTime) =>
        [blockedTime.startAt, blockedTime.endAt].some((value) => value?.startsWith(date)),
      ),
    [availability?.blockedTimes, date],
  );
  const blockingError =
    currentStaffError ??
    (!currentStaffId && !currentStaffLoading ? "Staff profile is not available for this session." : null) ??
    appointmentsError;

  return (
    <ScreenShell
      backFallback={"/(staff)/home" as Href}
      onRefresh={() => loadCalendar(true)}
      refreshing={refreshing || availabilityLoading}
      safeAreaEdges={["top"]}
      showCreateAction={false}
      title="My Calendar"
    >
      <FilterBar
        date={date}
        onDateChange={setDate}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        search={search}
        status={status}
      />

      {currentStaffLoading || appointmentsLoading ? <SkeletonList /> : null}
      {!currentStaffLoading && !appointmentsLoading && blockingError ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={blockingError}
          onAction={() => loadCalendar(false)}
          title="Unable to load calendar"
          tone="error"
        />
      ) : null}
      {!blockingError ? (
        <>
          <StaffAvailabilitySummary
            availabilityLabel={availability?.availabilityLabel ?? currentStaff?.availabilityLabel ?? "-"}
            checkedInLabel={availability?.checkedInLabel ?? "-"}
            checkedOutLabel={availability?.checkedOutLabel ?? "-"}
            currentStatusLabel={availability?.currentStatusLabel ?? currentStaff?.status ?? "-"}
            error={availabilityError}
            hasStaff={Boolean(currentStaffId)}
            holidayLabel={availability?.holidayLabel ?? "-"}
            loading={availabilityLoading}
            onLeaveLabel={availability?.onLeaveLabel ?? "-"}
            shiftEndLabel={availability?.shiftEndLabel ?? "-"}
            shiftStartLabel={availability?.shiftStartLabel ?? "-"}
            workingHoursLabel={availability?.workingHoursLabel ?? currentStaff?.workingHours ?? "-"}
          />
          <ReadOnlyBlockedTimesSummary
            blockedTimes={dateBlockedTimes}
            error={availabilityError}
            loading={availabilityLoading}
            onRetry={() => loadCalendar(false)}
          />
          <CalendarPreview
            appointments={staffAppointments}
            date={date}
          />
        </>
      ) : null}
    </ScreenShell>
  );
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
    borderColor: Colors.errorBorder,
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
  dinggToolbar: {
    backgroundColor: Colors.appointmentSurface,
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: 1,
    marginHorizontal: -AppLayout.contentHorizontalPadding,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  dinggToolbarActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
  },
  dinggTodayButton: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  dinggTodayText: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "700",
  },
  dinggToolbarIcons: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  dinggRangeControls: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
  },
  dinggRangeButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minWidth: 108,
  },
  dinggRangeText: {
    color: Colors.appointmentText,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    textAlign: "center",
  },
  dinggStylistSummary: {
    alignItems: "center",
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  dinggStylistLabel: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "800",
  },
  dinggStylistValue: {
    color: Colors.appointmentTextSecondary,
    fontSize: 13,
    maxWidth: "65%",
  },
  dinggSearchField: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurfaceMuted,
    borderRadius: 6,
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  dinggSearchInput: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 12,
    minHeight: 40,
  },
  dinggToolbarIcon: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  dinggAddButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  dinggWeekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dinggWeekDay: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  dinggWeekLabel: {
    color: Colors.appointmentMuted,
    fontSize: 9,
  },
  dinggWeekNumberWrap: {
    alignItems: "center",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  dinggWeekNumberActive: {
    backgroundColor: Colors.appointmentAccent,
  },
  dinggWeekNumber: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "700",
  },
  dinggWeekNumberTextActive: {
    color: "#FFFFFF",
  },
  dinggSelectedDateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 34,
  },
  dinggSelectedDate: {
    color: Colors.appointmentAccent,
    fontSize: 11,
    fontWeight: "700",
  },
  dinggStaffRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  dinggStaffChip: {
    borderColor: "transparent",
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  dinggStaffChipActive: {
    backgroundColor: Colors.appointmentAccent,
    borderColor: Colors.appointmentAccent,
  },
  dinggStaffText: {
    color: Colors.appointmentText,
    fontSize: 11,
    fontWeight: "600",
  },
  dinggStaffTextActive: {
    color: "#FFFFFF",
  },
  dinggCalendar: {
    backgroundColor: Colors.appointmentSurface,
    flex: 1,
    marginHorizontal: -AppLayout.contentHorizontalPadding,
  },
  dinggListView: {
    backgroundColor: Colors.appointmentSurface,
    marginHorizontal: -AppLayout.contentHorizontalPadding,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dinggListTimelineRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 10,
    minHeight: 250,
  },
  dinggListTimeRail: {
    alignItems: "center",
    width: 54,
  },
  dinggListHour: {
    color: Colors.appointmentTextSecondary,
    fontSize: 13,
    marginBottom: 7,
  },
  dinggListRailLine: {
    backgroundColor: Colors.appointmentDivider,
    flex: 1,
    width: 1,
  },
  dinggListAppointment: {
    backgroundColor: "#E8F8FA",
    borderLeftColor: "#2AA7B2",
    borderLeftWidth: 6,
    borderRadius: 8,
    flex: 1,
    marginBottom: 18,
    padding: 18,
  },
  dinggListCompleted: {
    backgroundColor: "#E9FAE8",
    borderLeftColor: "#35B64A",
  },
  dinggListConfirmed: {
    backgroundColor: "#FFF4E8",
    borderLeftColor: "#F08A24",
  },
  dinggListCopy: {
    display: "none",
  },
  dinggListClientRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  dinggListAvatar: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  dinggListClientCopy: {
    flex: 1,
    minWidth: 0,
  },
  dinggListClientName: {
    color: Colors.appointmentAccent,
    fontSize: 20,
    fontWeight: "900",
  },
  dinggListPhone: {
    color: Colors.appointmentText,
    fontSize: 14,
    marginTop: 3,
  },
  dinggListDetailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  dinggListService: {
    color: Colors.appointmentAccent,
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  dinggListTimeRange: {
    color: Colors.appointmentAccent,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  dinggListStaffWrap: {
    marginLeft: "auto",
    maxWidth: "34%",
  },
  dinggListWith: {
    color: Colors.appointmentTextSecondary,
    fontSize: 12,
  },
  dinggListStaff: {
    color: Colors.appointmentText,
    fontSize: 15,
    fontWeight: "800",
  },
  dinggListStatusRow: {
    alignItems: "center",
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 12,
  },
  dinggListStatusDot: {
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  dinggStatusCompleted: {
    backgroundColor: "#35B64A",
  },
  dinggStatusConfirmed: {
    backgroundColor: "#F08A24",
  },
  dinggListStatus: {
    color: Colors.appointmentText,
    fontSize: 17,
  },
  dinggCalendarHeader: {
    borderBottomColor: Colors.appointmentBorder,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 38,
  },
  dinggHorizontalScroller: {
    flex: 1,
  },
  dinggVerticalScroller: {
    flex: 1,
  },
  dinggTimeHeader: {
    alignItems: "center",
    borderRightColor: "#8A838A",
    borderRightWidth: 1.5,
    justifyContent: "center",
    width: 54,
  },
  dinggStaffHeader: {
    color: Colors.appointmentText,
    fontSize: 10,
    fontWeight: "800",
  },
  dinggDayHeader: {
    alignItems: "center",
    borderRightColor: "#8A838A",
    borderRightWidth: 1.5,
    color: Colors.appointmentTextSecondary,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  dinggDayHeaderText: {
    color: Colors.appointmentTextSecondary,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  dinggGridBody: {
    flexDirection: "row",
  },
  dinggTimeColumn: {
    borderRightColor: "#8A838A",
    borderRightWidth: 1.5,
    width: 54,
  },
  dinggTimeCell: {
    borderBottomColor: "#8A838A",
    borderBottomWidth: 1.5,
    paddingRight: 5,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  dinggTimeText: {
    color: Colors.appointmentMuted,
    fontSize: 10,
    textAlign: "right",
  },
  dinggHourText: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "800",
  },
  dinggDayColumn: {
    borderRightColor: "#8A838A",
    borderRightWidth: 1.5,
    position: "relative",
  },
  dinggQuickSaleSlot: {
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 1,
  },
  dinggColumnAvailable: {
    backgroundColor: "#FFFBE4",
  },
  dinggColumnUnavailable: {
    backgroundColor: "#FCF7FA",
  },
  dinggHourCell: {
    borderBottomColor: "#8A838A",
    borderBottomWidth: 1.5,
    position: "relative",
  },
  dinggQuarterLine: {
    backgroundColor: "#8A838A",
    height: StyleSheet.hairlineWidth,
    left: 0,
    opacity: 0.75,
    position: "absolute",
    right: 0,
  },
  dinggAppointmentCard: {
    borderColor: "transparent",
    borderWidth: 2,
    borderRadius: 5,
    left: 3,
    padding: 0,
    position: "absolute",
    right: 3,
    zIndex: 3,
  },
  dinggAppointmentGradient: {
    borderRadius: 3,
    flex: 1,
    overflow: "hidden",
    padding: 7,
  },
  dinggAppointmentOverlapping: {
    borderColor: "#ffffff",
  },
  dinggAppointmentHighlighted: {
    borderColor: "#7c3aed",
    borderWidth: 3,
  },
  dinggAppointmentDragging: {
    opacity: 0.92,
  },
  dinggAppointmentResizing: {
    elevation: 12,
    shadowColor: "#000000",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    zIndex: 8,
  },
  dinggAppointmentDeleted: {
    opacity: 0.7,
  },
  quickSaleModalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 28,
  },
  quickSaleModalSurface: {
    backgroundColor: Colors.bg,
    borderRadius: 8,
    elevation: 24,
    height: "94%",
    maxWidth: 620,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    width: "100%",
  },
  dinggAppointmentIcons: {
    flexDirection: "row",
    gap: 4,
  },
  dinggAppointmentSummary: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
    marginTop: 3,
  },
  dinggAppointmentName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15,
  },
  dinggAppointmentClient: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    marginTop: 3,
  },
  dinggAppointmentMeta: {
    color: Colors.appointmentMuted,
    fontSize: 7,
    marginTop: 1,
  },
  dinggPaidText: {
    alignSelf: "flex-end",
    backgroundColor: "#25A83A",
    borderRadius: 3,
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "800",
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  dinggCurrentTime: {
    alignItems: "center",
    flexDirection: "row",
    left: 4,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  dinggCurrentTimeLabel: {
    backgroundColor: "#E31B23",
    borderRadius: 4,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  dinggCurrentTimeDot: {
    backgroundColor: "#E31B23",
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  dinggCurrentTimeLine: {
    backgroundColor: "#E31B23",
    flex: 1,
    height: 2,
  },
  previewBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.34)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  calendarActionsModal: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 16,
    elevation: 20,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    width: "100%",
  },
  calendarActionsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 66,
    paddingHorizontal: 20,
  },
  calendarActionsTitle: {
    color: Colors.appointmentText,
    fontSize: 25,
    fontWeight: "900",
  },
  calendarActionsClose: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  calendarActionPrimary: {
    backgroundColor: Colors.appointmentAccentSoft,
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    justifyContent: "center",
    minHeight: 68,
    paddingHorizontal: 20,
  },
  calendarActionRow: {
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    justifyContent: "center",
    minHeight: 68,
    paddingHorizontal: 20,
  },
  calendarActionText: {
    color: Colors.appointmentText,
    fontSize: 20,
    fontWeight: "500",
  },
  appointmentDetailsModal: {
    backgroundColor: Colors.appointmentSurface,
    elevation: 24,
    maxHeight: "82%",
    minHeight: "68%",
    shadowColor: Colors.shadow,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
    width: "100%",
  },
  appointmentModalHeader: {
    alignItems: "flex-start",
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  appointmentModalHeading: { flex: 1, minWidth: 0 },
  appointmentModalTitle: { color: Colors.appointmentText, fontSize: 18, fontWeight: "900" },
  appointmentClientBand: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccentSoft,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  appointmentClientAvatar: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  appointmentClientCopy: { flex: 1, minWidth: 0 },
  appointmentClientName: { color: Colors.appointmentText, fontSize: 20, fontWeight: "900", lineHeight: 25 },
  appointmentClientPhone: { color: Colors.appointmentTextSecondary, fontSize: 14, marginTop: 5 },
  appointmentStatusControl: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    maxWidth: 132,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  appointmentStatusDot: { borderRadius: 5, height: 10, width: 10 },
  appointmentStatusLabel: { color: Colors.appointmentTextSecondary, flexShrink: 1, fontSize: 13, fontWeight: "700" },
  appointmentTabs: {
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 36,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  appointmentTabActive: {
    borderBottomColor: Colors.appointmentAccent,
    borderBottomWidth: 3,
    color: Colors.appointmentAccent,
    fontSize: 18,
    fontWeight: "900",
    paddingBottom: 12,
  },
  appointmentTab: { color: Colors.appointmentText, fontSize: 18, fontWeight: "600", paddingBottom: 12 },
  appointmentModalContent: { flexGrow: 1, padding: 18 },
  appointmentServiceHeading: { color: Colors.appointmentText, fontSize: 18, fontWeight: "900", marginBottom: 16 },
  appointmentServiceCard: {
    borderColor: Colors.appointmentBorder,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  appointmentServiceTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  appointmentServiceName: { color: Colors.appointmentText, flex: 1, fontSize: 17, fontWeight: "900", paddingRight: 10 },
  appointmentServiceTime: { color: Colors.appointmentText, fontSize: 13 },
  appointmentServiceMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  appointmentBookedBy: { color: Colors.appointmentTextSecondary, flex: 1, fontSize: 13 },
  appointmentWith: { color: Colors.appointmentTextSecondary, fontSize: 13 },
  appointmentServiceStatus: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 22 },
  appointmentServiceStatusText: { color: Colors.appointmentText, fontSize: 16, fontWeight: "700" },
  appointmentNotesHeading: {
    color: Colors.appointmentText,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  appointmentNotesText: {
    color: Colors.appointmentText,
    fontSize: 15,
    lineHeight: 23,
  },
  appointmentNotesEmpty: {
    color: Colors.appointmentTextSecondary,
  },
  appointmentNotesButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    marginTop: 22,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  appointmentNotesButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  appointmentInvoiceButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 28,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    margin: 18,
    minHeight: 54,
  },
  appointmentInvoiceDisabled: { opacity: 0.45 },
  appointmentInvoiceText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  previewSheet: {
    backgroundColor: Colors.appointmentSurface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    elevation: 20,
    paddingBottom: 12,
    paddingHorizontal: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  previewHandle: {
    alignSelf: "center",
    backgroundColor: Colors.appointmentBorder,
    borderRadius: 3,
    height: 4,
    marginBottom: 12,
    marginTop: 9,
    width: 42,
  },
  previewHeader: {
    alignItems: "center",
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 48,
  },
  previewClose: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  previewTitle: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 3,
  },
  previewStatusBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  previewPaidBadge: {
    backgroundColor: "#DDF4D9",
  },
  previewUnpaidBadge: {
    backgroundColor: Colors.appointmentAccentSoft,
  },
  previewStatusText: {
    color: "#238A32",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  previewUnpaidText: {
    color: Colors.appointmentAccentDark,
  },
  previewDetailRow: {
    alignItems: "center",
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  previewDetailCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewDetailPrimary: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "600",
  },
  previewDetailSecondary: {
    color: Colors.appointmentTextSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  previewDetailTrailing: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "800",
  },
  previewDetailsButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 6,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44,
  },
  previewDetailsButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  dinggLegend: {
    backgroundColor: Colors.appointmentSurface,
    flexGrow: 0,
  },
  dinggLegendContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dinggLegendPill: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 22,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 88,
    paddingHorizontal: 16,
  },
  dinggLegendActive: {
    backgroundColor: Colors.appointmentAccent,
  },
  dinggLegendDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  dinggLegendText: {
    color: Colors.appointmentText,
    fontSize: 11,
    fontWeight: "600",
  },
  dinggLegendTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  calendarMenuBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  calendarMenuCard: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 7,
    padding: 10,
    width: "82%",
  },
  calendarMenuOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 10,
  },
  calendarMenuOptionActive: {
    backgroundColor: Colors.appointmentAccentSoft,
  },
  calendarMenuText: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  staffFilterCard: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 7,
    maxHeight: "72%",
    padding: 16,
    width: "92%",
  },
  staffFilterTitle: {
    color: Colors.appointmentText,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
  },
  staffFilterOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
  },
  staffFilterText: {
    color: Colors.appointmentText,
    fontSize: 13,
  },
  staffFilterActions: {
    alignItems: "center",
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 12,
  },
  staffFilterClear: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "700",
  },
  staffFilterApply: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 20,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 120,
  },
  staffFilterApplyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  calendarEmpty: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: Spacing.lg,
    textAlign: "center",
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
    backgroundColor: Colors.appointmentSurface,
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 12,
  },
  bookingContent: {
    paddingBottom: 150,
  },
  bookingBottomLabel: {
    color: Colors.appointmentTextSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  bookingBottomMeta: {
    color: Colors.appointmentText,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  bookingBottomSummary: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bookingBottomTotal: {
    color: Colors.appointmentText,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 1,
  },
  bookingBottomTotalWrap: {
    alignItems: "flex-end",
  },
  bookingFlow: {
    gap: 0,
  },
  appointmentDeliverySection: {
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
  },
  appointmentDeliveryTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  appointmentDeliveryTitle: {
    color: Colors.appointmentText,
    fontSize: 15,
    fontWeight: "700",
  },
  appointmentDeliveryOptions: {
    flexDirection: "row",
    gap: 28,
    marginTop: 14,
    paddingLeft: 2,
  },
  appointmentDeliveryOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    minHeight: 32,
  },
  appointmentDeliveryOptionText: {
    color: Colors.appointmentText,
    fontSize: 14,
    fontWeight: "500",
  },
  appointmentCoreRow: {
    backgroundColor: Colors.appointmentSurface,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 0,
    paddingTop: 16,
  },
  appointmentCoreField: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
  },
  compactStatusField: {
    flex: 0.92,
    minWidth: 0,
  },
  compactSelectButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  compactSelectText: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  bookingPrimaryButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 28,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: AppLayout.cardPadding,
  },
  bookingPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  bookingSection: {
    backgroundColor: Colors.appointmentSurface,
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    overflow: "visible",
    paddingHorizontal: 0,
    paddingVertical: 18,
    shadowOpacity: 0,
    elevation: 0,
  },
  bookingSectionActionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    minHeight: 32,
    paddingHorizontal: 4,
  },
  bookingSectionAction: {
    color: Colors.appointmentAccent,
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
    color: Colors.appointmentText,
    fontSize: 16,
    fontWeight: "700",
  },
  bookingTwoColumnSection: {
    gap: Spacing.md,
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
    paddingHorizontal: 24,
    paddingTop: Spacing.sm,
  },
  fixedContent: {
    flex: 1,
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
  detailInvoiceRow: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 14,
  },
  detailInvoiceLabel: {
    color: Colors.appointmentTextSecondary,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  detailInvoiceNumber: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
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
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  clientActionChipActive: {
    backgroundColor: Colors.appointmentAccentSoft,
    borderColor: Colors.appointmentAccent,
  },
  clientActionText: {
    color: Colors.appointmentTextSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  clientActionTextActive: {
    color: Colors.appointmentAccentDark,
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
    gap: 8,
    marginBottom: 12,
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
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    minHeight: 48,
    paddingHorizontal: 6,
  },
  dateButtonText: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
  },
  statusModalCard: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 8,
    marginHorizontal: 24,
    padding: 18,
    width: "86%",
  },
  statusOptionRow: {
    alignItems: "center",
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 4,
  },
  statusOptionText: {
    color: Colors.appointmentTextSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  statusOptionTextActive: {
    color: Colors.appointmentAccent,
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
    marginBottom: 12,
    minHeight: 48,
  },
  headerTitle: {
    color: Colors.appointmentText,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  appointmentHeaderCopy: {
    flex: 1,
    marginLeft: 4,
  },
  appointmentHeaderSubtitle: {
    color: Colors.appointmentTextSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
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
  inputDisabled: {
    opacity: 0.55,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputActionText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  inputLabel: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
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
    backgroundColor: "rgba(15, 23, 32, 0.42)",
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
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
  },
  optionChipActive: {
    backgroundColor: Colors.appointmentAccentSoft,
    borderColor: Colors.appointmentAccent,
  },
  optionChipText: {
    color: Colors.appointmentTextSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  optionChipTextActive: {
    color: Colors.appointmentAccentDark,
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
    backgroundColor: Colors.errorBg,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 24,
  },
  safeArea: {
    backgroundColor: Colors.appointmentBackground,
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
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 14,
    minHeight: 48,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
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
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentDivider,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 64,
    padding: 10,
    position: "relative",
    width: "100%",
  },
  selectedServiceCardActive: {
    borderColor: Colors.border,
  },
  selectedServiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  selectedServiceIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  selectedServiceMeta: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  selectedServiceName: {
    color: Colors.appointmentText,
    fontSize: 14,
    fontWeight: "900",
    paddingRight: 18,
  },
  selectedServicePrice: {
    color: Colors.appointmentAccent,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
  },
  selectedServiceRow: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
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
    backgroundColor: Colors.infoBg,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: AppRadius.control,
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
    padding: 10,
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
  timeDropdownButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: Spacing.md,
  },
  timeDropdownMenu: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    elevation: 8,
    marginTop: Spacing.sm,
    maxHeight: 220,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  timeDropdownOption: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  timeDropdownOptionActive: {
    backgroundColor: Colors.appointmentAccentSoft,
  },
  timeDropdownOptionText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  timeDropdownOptionTextActive: {
    color: Colors.appointmentAccentDark,
    fontWeight: "700",
  },
  timeDropdownPlaceholder: {
    color: Colors.placeholder,
  },
  timeDropdownValue: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  timeDropdownWrap: {
    position: "relative",
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
    gap: 8,
    paddingBottom: 2,
    paddingTop: Spacing.sm,
  },
  staffSelectCard: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 58,
    padding: 8,
    position: "relative",
    width: 152,
  },
  staffSelectCardActive: {
    borderColor: Colors.appointmentAccent,
    backgroundColor: Colors.appointmentAccentSoft,
    borderWidth: 1,
  },
  staffSelectCopy: {
    flex: 1,
    minWidth: 0,
  },
  staffSelectedBadge: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 24,
  },
  staffSelectName: {
    color: Colors.appointmentText,
    fontSize: 13,
    fontWeight: "700",
    paddingRight: 18,
  },
  staffSelectRole: {
    color: Colors.appointmentTextSecondary,
    fontSize: 11,
    fontWeight: "600",
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
  emptyAddServicesButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentAccent,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginVertical: 26,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  emptyAddServicesIcon: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: 18,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  emptyAddServicesText: {
    color: Colors.appointmentAccent,
    fontSize: 16,
    fontWeight: "700",
  },
  servicePickerSafeArea: {
    backgroundColor: Colors.appointmentBackground,
    flex: 1,
  },
  servicePickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 72,
    paddingHorizontal: 24,
  },
  servicePickerBack: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 34,
  },
  servicePickerTitle: {
    color: Colors.appointmentText,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
  },
  servicePickerBody: {
    flex: 1,
    paddingHorizontal: 24,
  },
  servicePickerLabel: {
    color: Colors.appointmentText,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  servicePickerSelect: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 16,
  },
  servicePickerSelectText: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  servicePickerSelectPlaceholder: {
    color: Colors.appointmentPlaceholder,
  },
  requestedStylistRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    marginTop: 10,
  },
  requestedStylistLabel: {
    color: Colors.appointmentTextSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  requestedStylistValue: {
    color: Colors.appointmentAccent,
    fontSize: 14,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  stylistModalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.48)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stylistModalCard: {
    backgroundColor: Colors.appointmentSurface,
    borderRadius: 10,
    maxHeight: "64%",
    padding: 18,
  },
  stylistModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stylistModalTitle: {
    color: Colors.appointmentText,
    fontSize: 20,
    fontWeight: "900",
  },
  stylistOptionRow: {
    alignItems: "center",
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
  },
  stylistOptionName: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  stylistAvailability: {
    color: Colors.appointmentAccent,
    fontSize: 12,
    fontWeight: "700",
  },
  servicePickerSearch: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 16,
  },
  servicePickerSearchInput: {
    color: Colors.appointmentText,
    flex: 1,
    fontSize: 16,
    minHeight: 56,
  },
  serviceCategoryScroll: {
    flexGrow: 0,
    marginHorizontal: -24,
    marginTop: 20,
  },
  serviceCategoryRow: {
    flexDirection: "row",
    gap: 26,
    paddingHorizontal: 24,
  },
  serviceCategoryTab: {
    minHeight: 42,
  },
  serviceCategoryText: {
    color: Colors.appointmentTextSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  serviceCategoryTextActive: {
    color: Colors.appointmentAccent,
    fontWeight: "900",
  },
  serviceCategoryIndicator: {
    backgroundColor: Colors.appointmentAccent,
    height: 3,
    marginTop: 10,
    width: 24,
  },
  servicePickerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  servicePickerEmpty: {
    color: Colors.appointmentTextSecondary,
    fontSize: 14,
    paddingVertical: 48,
    textAlign: "center",
  },
  catalogServiceRow: {
    alignItems: "center",
    borderBottomColor: Colors.appointmentDivider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 98,
    paddingVertical: 14,
  },
  catalogServiceCopy: {
    flex: 1,
  },
  catalogServiceName: {
    color: Colors.appointmentText,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  catalogServiceMeta: {
    color: Colors.appointmentAccent,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  catalogServiceDivider: {
    color: Colors.appointmentMuted,
  },
  catalogAddButton: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccentSoft,
    borderRadius: 7,
    flexDirection: "row",
    gap: 6,
    minHeight: 46,
    minWidth: 92,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  catalogAddText: {
    color: Colors.appointmentText,
    fontSize: 14,
    fontWeight: "900",
  },
  catalogQuantityButton: {
    backgroundColor: Colors.appointmentSurface,
    borderColor: Colors.appointmentAccent,
    borderWidth: 1,
  },
  catalogQuantityText: {
    color: Colors.appointmentText,
    fontSize: 14,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "center",
  },
  servicePickerFooter: {
    alignItems: "center",
    backgroundColor: Colors.appointmentSurface,
    borderTopColor: Colors.appointmentDivider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 88,
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
  servicePickerCount: {
    color: Colors.appointmentText,
    flex: 0.7,
    fontSize: 16,
    fontWeight: "900",
  },
  servicePickerContinue: {
    alignItems: "center",
    backgroundColor: Colors.appointmentAccent,
    borderRadius: AppRadius.pill,
    flex: 1.3,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54,
  },
  servicePickerContinueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
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
