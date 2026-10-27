import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Text } from "@/components/ui/AppTypography";
import { DateRangeField } from "@/components/ui/DateRangeField";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { toComparableId } from "@/features/appointments/utils/staffAssignment";
import { getApiErrorMessage } from "@/services/api";
import { appointmentService } from "@/services/appointment.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentBilledItem, AppointmentListItem } from "@/types/appointment";
import { getAppointmentBillLabel, maskClientName } from "@/utils/clientPrivacy";
import { formatCurrency } from "@/utils/currency";
import { getDateRangePreset } from "@/utils/dateRangePresets";
import { formatAppDate, formatAppTime } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type StaffRevenueItemType = AppointmentBilledItem["type"];

const TITLES: Record<StaffRevenueItemType, string> = {
  membership: "Memberships",
  package: "Packages",
  product: "Products",
  service: "Services",
};

// Billed appointments only — "paid" shows as Completed, "partial" as Partial.
const DONE_STATUSES = new Set<AppointmentListItem["status"]>(["Completed", "Partial"]);

const toItemType = (value: unknown): StaffRevenueItemType =>
  value === "product" || value === "package" || value === "membership" ? value : "service";

const toDateParam = (value: unknown, fallback: string) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;

const rowAmount = (item: AppointmentBilledItem) => item.totalAmount ?? item.price * item.quantity;

type StaffAppointmentItems = { appointment: AppointmentListItem; items: AppointmentBilledItem[]; total: number };

/**
 * The appointments behind one row of the staff Revenue breakdown: the
 * logged-in staff member's completed/partly paid appointments in the range,
 * with only their own rows of the chosen type. A row without its own staff
 * belongs to the appointment's staff member, as on the bill.
 */
export function StaffRevenueItemsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 16 : width >= 768 ? 32 : 20;
  const params = useLocalSearchParams<{ endDate?: string; startDate?: string; type?: string }>();
  const type = toItemType(params.type);
  const staff = useAppSelector(selectCurrentStaff);
  const branchId = useAppSelector(selectActiveBranchId);

  const [range, setRange] = useState(() => {
    const today = getDateRangePreset("today");
    return { endDate: toDateParam(params.endDate, today.endDate), startDate: toDateParam(params.startDate, today.startDate) };
  });
  // Hidden tab screens stay mounted: re-open with the Revenue screen's range.
  useEffect(() => {
    const today = getDateRangePreset("today");
    setRange({ endDate: toDateParam(params.endDate, today.endDate), startDate: toDateParam(params.startDate, today.startDate) });
  }, [params.endDate, params.startDate, params.type]);
  const [appointments, setAppointments] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    if (!staff) return;
    const request = ++requestRef.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const response = await appointmentService.getStaffAppointments({
        from_date: range.startDate, limit: Number.MAX_SAFE_INTEGER, page: 1, search: "",
        sort_by: "scheduled_at", sort_order: "DESC", to_date: range.endDate,
      }, staff, branchId);
      if (request === requestRef.current) setAppointments(response.appointments);
    } catch (failure) {
      if (request === requestRef.current) setError(getApiErrorMessage(failure));
    } finally {
      if (request === requestRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [branchId, range.endDate, range.startDate, staff]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo<StaffAppointmentItems[]>(() => {
    if (!staff) return [];
    const staffIds = new Set([staff.id, staff.userId, staff.employeeCode, ...(staff.staffIdAliases ?? [])]
      .map(toComparableId).filter((id): id is string => id !== null));
    return appointments.flatMap(appointment => {
      if (!DONE_STATUSES.has(appointment.status)) return [];
      const billStaff = toComparableId(appointment.staffId) ?? toComparableId(appointment.raw.staff_id);
      const items = appointment.billedItems.filter(item => {
        const owner = toComparableId(item.staffId) ?? billStaff;
        return item.type === type && owner !== null && staffIds.has(owner);
      });
      return items.length ? [{ appointment, items, total: items.reduce((sum, item) => sum + rowAmount(item), 0) }] : [];
    });
  }, [appointments, staff, type]);

  const totals = useMemo(() => rows.reduce(
    (sum, row) => ({ amount: sum.amount + row.total, count: sum.count + row.items.reduce((count, item) => count + item.quantity, 0) }),
    { amount: 0, count: 0 },
  ), [rows]);

  // Tabs send "back" to Home, so return to Revenue explicitly.
  const goBack = useCallback(() => router.navigate("/(staff)/revenue" as Href), []);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { goBack(); return true; });
    return () => subscription.remove();
  }, [goBack]));

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: Colors.bg }]}>
      <AppStatusBar />
      <RefreshViewport><ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={[Colors.primary]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Back" accessibilityRole="button" activeOpacity={0.84} hitSlop={AppLayout.headerActionHitSlop} onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color={Colors.primaryText} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{TITLES[type]}</Text>
            <Text style={styles.subtitle}>{staff?.name ? `${staff.name} · ` : ""}My appointments</Text>
          </View>
        </View>

        <DateRangeField
          disabled={loading}
          endDate={range.endDate}
          label="Date range"
          maximumDate={new Date()}
          onChange={(startDate, endDate) => setRange({ endDate, startDate })}
          startDate={range.startDate}
        />

        {!loading && !error ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>{TITLES[type]}</Text>
              <Text style={styles.summaryMeta}>
                {totals.count} sold · {rows.length} {rows.length === 1 ? "appointment" : "appointments"}
              </Text>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(totals.amount)}</Text>
          </View>
        ) : null}

        {loading ? <ActivityIndicator color={Colors.primaryText} style={styles.loader} /> : null}

        {error ? (
          <View style={styles.card}>
            <Ionicons name="alert-circle-outline" size={26} color={Colors.error} />
            <Text style={styles.stateTitle}>Unable to load your appointments</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => void load()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && rows.length === 0 ? (
          <View style={styles.card}>
            <Ionicons name="receipt-outline" size={26} color={Colors.text2} />
            <Text style={styles.stateTitle}>No {TITLES[type].toLowerCase()} in this range</Text>
            <Text style={styles.stateText}>Try another date range.</Text>
          </View>
        ) : null}

        {!loading && !error ? rows.map(({ appointment, items, total }) => (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.84}
            key={appointment.id}
            onPress={() => router.push(`/(staff)/appointment-details/${appointment.id}` as Href)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={styles.rowCopy}>
                <Text style={styles.clientName}>{maskClientName(appointment.clientName)}</Text>
                <Text style={styles.rowMeta}>
                  {getAppointmentBillLabel(appointment)} · {formatAppDate(appointment.scheduledAt, "")} {formatAppTime(appointment.scheduledAt, "")}
                </Text>
              </View>
              <View style={[styles.statusChip, appointment.status === "Partial" ? styles.statusPartial : styles.statusDone]}>
                <Text style={styles.statusText}>{appointment.status === "Partial" ? "Partly paid" : "Paid"}</Text>
              </View>
            </View>
            {items.map((item, index) => (
              <View key={item.id ?? `${appointment.id}-${index}`} style={styles.itemRow}>
                <Text numberOfLines={2} style={styles.itemName}>{item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</Text>
                <Text style={styles.itemValue}>{formatCurrency(rowAmount(item))}</Text>
              </View>
            ))}
            {items.length > 1 ? (
              <View style={styles.cardFooter}>
                <Text style={styles.rowMeta}>Total</Text>
                <Text style={styles.itemValue}>{formatCurrency(total)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )) : null}
      </ScrollView></RefreshViewport>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  backButton: {
    alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.control,
    borderWidth: 1, height: AppLayout.headerActionSize, justifyContent: "center", width: AppLayout.headerActionSize,
  },
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 24, borderWidth: 1, gap: 4, padding: 18 },
  cardFooter: { borderTopColor: Colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingTop: 10 },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, marginBottom: 6 },
  clientName: { color: Colors.heading, fontSize: 16, fontWeight: "800" },
  content: { gap: 16, paddingBottom: 140, paddingTop: Spacing.md },
  header: { alignItems: "center", flexDirection: "row" },
  headerCopy: { flex: 1, gap: 2, marginLeft: Spacing.md },
  itemName: { color: Colors.heading, flex: 1, fontSize: 14, fontWeight: "600" },
  itemRow: { alignItems: "center", borderTopColor: Colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, justifyContent: "space-between", paddingVertical: 10 },
  itemValue: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  loader: { marginTop: 24 },
  retryButton: { alignSelf: "flex-start", backgroundColor: Colors.primary, borderRadius: 14, marginTop: 8, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: Colors.onPrimary, fontWeight: "800" },
  rowCopy: { flex: 1, gap: 2 },
  rowMeta: { color: Colors.text2, fontSize: 12, fontWeight: "600" },
  safeArea: { flex: 1 },
  stateText: { color: Colors.text2, fontSize: 14, fontWeight: "600" },
  stateTitle: { color: Colors.heading, fontSize: 16, fontWeight: "800" },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusDone: { backgroundColor: Colors.successBg },
  statusPartial: { backgroundColor: Colors.warningBg },
  statusText: { color: Colors.heading, fontSize: 11, fontWeight: "800" },
  subtitle: { color: Colors.text2, fontSize: 14, fontWeight: "600" },
  summaryCard: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 24, borderWidth: 1, flexDirection: "row", gap: 12, padding: 18 },
  summaryCopy: { flex: 1, gap: 2 },
  summaryLabel: { color: Colors.text2, fontSize: 13, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  summaryMeta: { color: Colors.text2, fontSize: 13, fontWeight: "600" },
  summaryValue: { color: Colors.heading, fontSize: 22, fontWeight: "900" },
  title: { color: Colors.heading, fontSize: AppLayout.headerTitleFontSize, fontWeight: "900" },
});
