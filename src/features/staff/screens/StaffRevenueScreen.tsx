import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Text } from "@/components/ui/AppTypography";
import { DateRangeField } from "@/components/ui/DateRangeField";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { getApiErrorMessage } from "@/services/api";
import { staffRevenueService, type StaffRevenue } from "@/services/staffRevenue.service";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatCurrency } from "@/utils/currency";
import { getDateRangePreset } from "@/utils/dateRangePresets";
import { formatAppDate } from "@/utils/dateTime";
import type { StaffRevenueItemType } from "@/features/staff/screens/StaffRevenueItemsScreen";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Range = { endDate: string; startDate: string };

const BREAKDOWN: { count: keyof StaffRevenue; label: string; revenue: keyof StaffRevenue; type: StaffRevenueItemType }[] = [
  { count: "serviceCount", label: "Services", revenue: "serviceRevenue", type: "service" },
  { count: "productCount", label: "Products", revenue: "productRevenue", type: "product" },
  { count: "packageCount", label: "Packages", revenue: "packageRevenue", type: "package" },
  { count: "membershipCount", label: "Memberships", revenue: "membershipRevenue", type: "membership" },
];

const QUICK_RANGES = [
  { key: "today", label: "Today" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
] as const;

const todayKey = () => getDateRangePreset("today").startDate;
/** "This month" so far: the 1st through today. */
const thisMonthToDate = (): Range => ({ startDate: getDateRangePreset("this_month").startDate, endDate: todayKey() });
const toDate = (key: string) => new Date(`${key}T00:00:00`);

/**
 * The logged-in staff member's revenue — their own row of the web Staff
 * Performance report (non-draft sales by sale date, per line staff, partly
 * paid bills in full, direct sales included), excluding GST like the web's
 * staff revenue — from the staff-scoped /mobile/staff/revenue endpoint.
 */
export function StaffRevenueScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 16 : width >= 768 ? 32 : 20;
  const staff = useAppSelector(selectCurrentStaff);

  const [range, setRange] = useState<Range>(() => getDateRangePreset("today"));
  const [revenue, setRevenue] = useState<StaffRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (refresh = false) => {
    const request = ++requestRef.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const next = await staffRevenueService.getRevenue({ endDate: range.endDate, startDate: range.startDate });
      if (request === requestRef.current) setRevenue(next);
    } catch (failure) {
      if (request === requestRef.current) setError(getApiErrorMessage(failure));
    } finally {
      if (request === requestRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [range.endDate, range.startDate]);

  useEffect(() => { void load(); }, [load]);

  const activeQuick = QUICK_RANGES.find(({ key }) => {
    const preset = key === "this_month" ? thisMonthToDate() : getDateRangePreset(key);
    return preset.startDate === range.startDate && preset.endDate === range.endDate;
  })?.key;

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: Colors.bg }]}>
      <AppStatusBar />
      <RefreshViewport><ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={[Colors.primary]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MY REVENUE</Text>
          <Text style={[styles.title, { fontSize: width < 360 ? 28 : 32 }]}>Revenue</Text>
          <Text style={styles.subtitle}>{staff?.name ? `${staff.name} · ` : ""}{formatAppDate(toDate(range.startDate))} – {formatAppDate(toDate(range.endDate))}</Text>
        </View>

        <View style={styles.quickRow}>
          {QUICK_RANGES.map(({ key, label }) => {
            const active = activeQuick === key;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                activeOpacity={0.84}
                disabled={loading}
                key={key}
                onPress={() => setRange(key === "this_month" ? thisMonthToDate() : getDateRangePreset(key))}
                style={[styles.quickChip, active && styles.quickChipActive]}
              >
                <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <DateRangeField
          disabled={loading}
          endDate={range.endDate}
          label="Date range"
          maximumDate={new Date()}
          onChange={(startDate, endDate) => setRange({ endDate, startDate })}
          startDate={range.startDate}
        />

        <View style={styles.totalCard}>
          <View style={styles.totalIcon}><Ionicons name="wallet-outline" size={24} color={Colors.primaryText} /></View>
          <Text style={styles.totalLabel}>Revenue generated</Text>
          {loading ? <ActivityIndicator color={Colors.primaryText} /> : <Text style={styles.totalAmount}>{formatCurrency(revenue?.totalRevenue ?? 0)}</Text>}
          {!loading && revenue ? (
            <Text style={styles.totalMeta}>
              {revenue.invoiceCount} {revenue.invoiceCount === 1 ? "invoice" : "invoices"} · Avg bill {formatCurrency(revenue.avgBill)}
            </Text>
          ) : null}
        </View>

        {error ? (
          <View style={styles.card}>
            <Ionicons name="alert-circle-outline" size={26} color={Colors.error} />
            <Text style={styles.stateTitle}>Unable to load your revenue</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => void load()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && revenue ? (
          <>
            <View style={styles.splitRow}>
              <View style={[styles.splitCard, styles.splitCollected]}>
                <Text style={styles.splitLabel}>Collected</Text>
                <Text style={styles.splitValue}>{formatCurrency(revenue.collected)}</Text>
              </View>
              <View style={[styles.splitCard, styles.splitDue]}>
                <Text style={styles.splitLabel}>Due</Text>
                <Text style={styles.splitValue}>{formatCurrency(revenue.due)}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Breakdown</Text>
              {BREAKDOWN.map(({ count, label, revenue: revenueKey, type }) => (
                <TouchableOpacity
                  accessibilityHint={`Shows your ${label.toLowerCase()} appointments`}
                  accessibilityRole="button"
                  activeOpacity={0.84}
                  key={label}
                  onPress={() => router.push(`/(staff)/revenue-items?type=${type}&startDate=${range.startDate}&endDate=${range.endDate}` as Href)}
                  style={styles.row}
                >
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    <Text style={styles.rowMeta}>{revenue[count]} sold</Text>
                  </View>
                  <Text style={styles.rowValue}>{formatCurrency(revenue[revenueKey])}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.text2} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView></RefreshViewport>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 24, borderWidth: 1, gap: 4, padding: 18 },
  content: { gap: 16, paddingBottom: 140, paddingTop: Spacing.md },
  eyebrow: { color: Colors.text2, fontSize: 12, fontWeight: "800", letterSpacing: 1.8 },
  header: { gap: 6 },
  quickChip: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 9 },
  quickChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  quickChipText: { color: Colors.text2, fontSize: 13, fontWeight: "700" },
  quickChipTextActive: { color: Colors.onPrimary },
  quickRow: { flexDirection: "row", gap: 10 },
  retryButton: { alignSelf: "flex-start", backgroundColor: Colors.primary, borderRadius: 14, marginTop: 8, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: Colors.onPrimary, fontWeight: "800" },
  row: { alignItems: "center", borderTopColor: Colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, justifyContent: "space-between", paddingVertical: 12 },
  rowCopy: { flex: 1, gap: 2 },
  rowLabel: { color: Colors.heading, fontSize: 15, fontWeight: "800" },
  rowMeta: { color: Colors.text2, fontSize: 12, fontWeight: "600" },
  rowValue: { color: Colors.heading, fontSize: 15, fontWeight: "800" },
  safeArea: { flex: 1 },
  sectionTitle: { color: Colors.heading, fontSize: 17, fontWeight: "900", marginBottom: 4 },
  splitCard: { borderRadius: 20, flex: 1, gap: 6, padding: 16 },
  splitCollected: { backgroundColor: Colors.successBg },
  splitDue: { backgroundColor: Colors.warningBg },
  splitLabel: { color: Colors.text2, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  splitRow: { flexDirection: "row", gap: 12 },
  splitValue: { color: Colors.heading, fontSize: 20, fontWeight: "900" },
  stateText: { color: Colors.text2, fontSize: 14, fontWeight: "600" },
  stateTitle: { color: Colors.heading, fontSize: 16, fontWeight: "800" },
  subtitle: { color: Colors.text2, fontSize: 15, fontWeight: "600" },
  title: { color: Colors.heading, fontWeight: "900" },
  totalAmount: { color: Colors.heading, fontSize: 34, fontWeight: "900" },
  totalCard: { alignItems: "flex-start", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 24, borderWidth: 1, gap: 6, padding: 20 },
  totalIcon: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: 18, height: 44, justifyContent: "center", marginBottom: 4, width: 44 },
  totalLabel: { color: Colors.text2, fontSize: 13, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  totalMeta: { color: Colors.text2, fontSize: 13, fontWeight: "600" },
});
