import { useRegionalPreferences } from "@/localization/preferences";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Text } from "@/components/ui/AppTypography";
import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { MyCommissionCard } from "@/features/staff/components/MyCommissionCard";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffRevenueService, type StaffRevenue } from "@/services/staffRevenue.service";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { usePearlColors as useThemeColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
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

/** Server errors are shown in plain words; offline/timeout messages are already friendly. */
const revenueErrorMessage = (failure: unknown) => {
  if (!(failure instanceof ApiError) || !failure.status) return getApiErrorMessage(failure);
  if (failure.status === 404) return "Your revenue isn't available right now. Please try again later.";
  return "Something went wrong while loading your revenue. Please try again.";
};

/**
 * The logged-in staff member's revenue — their own row of the web Staff
 * Performance report (non-draft sales by sale date, per line staff, partly
 * paid bills in full, direct sales included), excluding GST like the web's
 * staff revenue — from the staff-scoped /mobile/staff/revenue endpoint.
 */
export function StaffRevenueScreen() {
  "use no memo";
  useRegionalPreferences();
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 16 : width >= 768 ? 32 : 20;
  const staff = useAppSelector(selectCurrentStaff);

  const [customOpen, setCustomOpen] = useState(false);
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
      if (request === requestRef.current) { setRevenue(null); setError(revenueErrorMessage(failure)); }
    } finally {
      if (request === requestRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [range.endDate, range.startDate]);

  useEffect(() => { void load(); }, [load]);

  const isEmpty = !!revenue && revenue.invoiceCount === 0 && revenue.totalRevenue === 0;

  const activeQuick = QUICK_RANGES.find(({ key }) => {
    const preset = key === "this_month" ? thisMonthToDate() : getDateRangePreset(key);
    return preset.startDate === range.startDate && preset.endDate === range.endDate;
  })?.key;

  return (
    <PearlBackground><SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: "transparent" }]}>
      <AppStatusBar />
      <RefreshViewport><ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={[Colors.primary]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text translate style={[styles.title, { fontSize: 22 }]}>My revenue</Text>
          <Text style={styles.subtitle}>{staff?.name ? `${staff.name} · ` : ""}{formatAppDate(toDate(range.startDate))} – {formatAppDate(toDate(range.endDate))}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
          {QUICK_RANGES.map(({key,label})=><TouchableOpacity key={key} disabled={loading} onPress={()=>setRange(key==="this_month"?thisMonthToDate():getDateRangePreset(key))} style={[styles.quickChip,activeQuick===key&&{backgroundColor:Colors.backgroundSelected,borderColor:Colors.primary}]}><Text translate style={[styles.quickChipText,{color:activeQuick===key?Colors.primaryText:Colors.text2}]}>{label}</Text></TouchableOpacity>)}
          <TouchableOpacity onPress={()=>setCustomOpen(true)} disabled={loading} style={[styles.quickChip,!activeQuick&&{backgroundColor:Colors.backgroundSelected,borderColor:Colors.primary}]}><Text translate style={styles.quickChipText}>Custom</Text></TouchableOpacity>
        </ScrollView>
        <DateRangePickerSheet visible={customOpen} pearlStyle centered={false} title="Date range" startDate={range.startDate} endDate={range.endDate} maximumDate={new Date()} onClose={()=>setCustomOpen(false)} onApply={(start,end)=>{if(start&&end){setRange({startDate:start,endDate:end});setCustomOpen(false);}}} />

        <View style={styles.totalCard}>
          <Text translate style={styles.totalLabel}>Sales I billed</Text>
          {loading ? <ActivityIndicator color={Colors.primaryText} /> : <Text style={styles.totalAmount}>{error ? "—" : formatCurrency(revenue?.totalRevenue ?? 0)}</Text>}
          {!loading && revenue && !isEmpty ? (
            <Text style={styles.totalMeta}>
              {revenue.invoiceCount} {revenue.invoiceCount === 1 ? "invoice" : "invoices"} · Avg bill {formatCurrency(revenue.avgBill)}
            </Text>
          ) : null}
        </View>

        {error ? (
          <View style={styles.card}>
            <Ionicons name="alert-circle-outline" size={26} color={Colors.error} />
            <Text translate style={styles.stateTitle}>{"Couldn't load your revenue"}</Text>
            <Text translate style={styles.stateText}>{error}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => void load()} style={styles.retryButton}>
              <Text translate style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && isEmpty ? (
          <View style={styles.card}>
            <Ionicons name="receipt-outline" size={26} color={Colors.text2} />
            <Text translate style={styles.stateTitle}>No revenue for this period</Text>
            <Text translate style={styles.stateText}>{"Sales you're assigned to will show up here. Try a different date range."}</Text>
          </View>
        ) : null}

        {!loading && !error && revenue && !isEmpty ? (
          <>
            <View style={styles.card}>
              <Text translate style={styles.sectionTitle}>Breakdown</Text>
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
                    <Text translate style={styles.rowLabel}>{label}</Text>
                    <Text style={styles.rowMeta}>{revenue[count]} sold</Text>
                  </View>
                  <Text style={styles.rowValue}>{formatCurrency(revenue[revenueKey])}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.text2} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
        {!!staff?.id && <MyCommissionCard compact staffId={staff.id} staffName={staff.name} dateRange={range} />}
      </ScrollView></RefreshViewport>
    </SafeAreaView></PearlBackground>
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
  row: { alignItems: "center", borderTopColor: Colors.border, borderTopWidth: 0, flexDirection: "row", gap: 12, justifyContent: "space-between", paddingVertical: 12 },
  rowCopy: { flex: 1, gap: 2 },
  rowLabel: { color: Colors.heading, fontSize: 15, fontWeight: "800" },
  rowMeta: { color: Colors.text2, fontSize: 12, fontWeight: "600" },
  rowValue: { color: Colors.heading, fontSize: 15, fontWeight: "800" },
  safeArea: { flex: 1 },
  sectionTitle: { color: Colors.heading, fontSize: 17, fontWeight: "900", marginBottom: 4 },
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
