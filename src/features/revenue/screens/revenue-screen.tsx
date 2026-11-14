import { useRegionalPreferences } from "@/localization/preferences";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { BottomSheet } from "@/components/pearl/Sheet";
import { pearl } from "@/components/auth/pearl/tokens";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { getApiErrorMessage } from "@/services/api";
import { reportService, type RevenueCategoryBreakdown } from "@/services/report.service";
import { staffService } from "@/services/staff.service";
import { fetchReportThunk } from "@/middleware/report/report.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { rememberReportFilters } from "@/store/report/report.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";
import { dateRangeLabel } from "@/utils/dateRangePresets";
import { formatCurrency as currency } from "@/utils/currency";

// Breakdown legend colours, from the design's share bar.

const SPLIT_COLORS = {
  service: "#3B3950",
  product: "#7E78B0",
  membership: "#B3ACDB",
  packages: "#DDD8EF",
};

type RevenuePeriod = "monthly" | "today";

type Revenue = {
  revenue: number;
  billedRevenue: number | null;
  gst: number | null;
  staffRecords: Awaited<ReturnType<typeof reportService.getStaffPerformanceRevenue>>;
  range: { start_date: string; end_date: string };
  staffError: string | null;
};

// Local calendar date — toISOString() is UTC, which in IST rolls back to
// yesterday before 5:30am and opened the wrong day's report.
const toIsoDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const getReportRange = (period: RevenuePeriod, today = new Date()) => {

  if (period === "today") {
    return { end_date: toIsoDate(today), start_date: toIsoDate(today) };
  }

  return {
    end_date: toIsoDate(today),
    start_date: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  };
};

const getMonthRange = (value: Date) => {
  return {
    end_date: toIsoDate(new Date(value.getFullYear(), value.getMonth() + 1, 0)),
    start_date: toIsoDate(new Date(value.getFullYear(), value.getMonth(), 1)),
  };
};

export default function RevenueScreen({ period }: { period: RevenuePeriod }) {
  "use no memo";
  useRegionalPreferences();
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const salonId = useAppSelector(selectActiveBranchId);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");
  const [monthlyRange, setMonthlyRange] = useState(() => getMonthRange(new Date()));
  const [rangeSheetVisible, setRangeSheetVisible] = useState(false);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  // Slices land one at a time, so the sheet can render what has arrived
  // instead of blocking on the slowest report.
  const [categories, setCategories] = useState<Partial<RevenueCategoryBreakdown>>({});
  const [categoriesDone, setCategoriesDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(true);
  const requestRef = useRef(0);
  const loadedContextRef = useRef<string | null>(null);

  const load = useCallback(() => {
    const date = new Date();
    const range = period === "today" ? getReportRange(period, date) : monthlyRange;
    const requestId = ++requestRef.current;
    const context = `${salonId}:${period}:${range.start_date}:${range.end_date}`;
    const isCurrent = () => activeRef.current && requestRef.current === requestId;

    setPeriodLabel(
      period === "today"
        ? "Today"
        : dateRangeLabel(range.start_date, range.end_date),
    );
    if (loadedContextRef.current !== context) {
      setLoading(true);
      setRevenue(null);
    }
    setError(null);

    const totalRequest = reportService.getRevenueSummary(range);
    void totalRequest
      .then(async (summary) => {
        let staffRecords: Revenue["staffRecords"] = [];
        let staffError: string | null = null;

        try {
          const revenueRecords = await reportService.getStaffPerformanceRevenue(range, true);
          const allStaff = [];
          let page = 1;
          while (true) {
            const result = await staffService.getStaff({ limit: 100, page }, salonId);
            allStaff.push(...result.staffMembers);
            if (!result.pagination.hasMore) break;
            if (result.pagination.nextPage <= page || result.staffMembers.length === 0) {
              throw new Error("Unable to load all staff members.");
            }
            page = result.pagination.nextPage;
          }

          const revenueByStaffId = new Map(revenueRecords.map((staff) => [staff.id, staff.revenue]));
          staffRecords = allStaff.map((staff) => ({
            id: staff.id,
            name: staff.name,
            revenue: revenueByStaffId.get(staff.id) ?? 0,
          })).sort((a, b) => b.revenue - a.revenue);
        } catch (cause: unknown) {
          staffError = getApiErrorMessage(cause);
        }

        if (isCurrent()) {
          loadedContextRef.current = context;
          setRevenue({
            range,
            revenue: summary.collected,
            billedRevenue: summary.billed,
            gst: summary.gst,
            staffError,
            staffRecords,
          });
        }
      })
      .catch((cause: unknown) => { if (isCurrent()) setError(getApiErrorMessage(cause)); })
      .finally(() => { if (isCurrent()) setLoading(false); });
  }, [monthlyRange, period, salonId]);

  useFocusEffect(useCallback(() => {
    activeRef.current = true;
    load();
    return () => { activeRef.current = false; requestRef.current += 1; };
  }, [load]));

  // Warmed as soon as the revenue totals land, so the sheet is already filled
  // by the time the card is tapped rather than starting four calls on open.
  useEffect(() => {
    if (!revenue) return;
    let active = true;
    setCategories({});
    setCategoriesDone(false);
    void reportService
      .getRevenueCategoryBreakdown(revenue.range, (key, value) => {
        if (active) setCategories((current) => ({ ...current, [key]: value }));
      })
      .finally(() => { if (active) setCategoriesDone(true); });
    return () => { active = false; };
  }, [revenue]);


  const handleStaffPress = (staffId: string, staffName: string) => {
    const filters = {
      ...(revenue?.range ?? getReportRange(period)),
      include_gst: "true",
      limit: 10,
      page: 1,
      staff_ids: staffId,
    };

    dispatch(rememberReportFilters({ filters, slug: "staff-performance" }));
    void dispatch(fetchReportThunk({ filters, refresh: true, slug: "staff-performance" }));
    // The name rides along so the detail header is right from the first frame,
    // before the report for this staff member has come back.
    router.push({ pathname: "/reports/[slug]", params: { slug: "staff-performance", staffName } } as Href);
  };

  // Collected revenue splits cleanly into net + GST, so the sheet can show a
  // real proportion. The per-category split is not available salon-wide yet.
  // Each slice's share is of the category total, not of collected revenue:
  // the four reports have their own bases and need not sum to it exactly.
  const slices = (() => {
    const read = (key: keyof RevenueCategoryBreakdown) => categories[key] ?? null;
    const rows = [
      { key: "service", label: "Services", color: SPLIT_COLORS.service, value: read("service") },
      { key: "product", label: "Products", color: SPLIT_COLORS.product, value: read("product") },
      { key: "membership", label: "Memberships", color: SPLIT_COLORS.membership, value: read("membership") },
      { key: "packages", label: "Packages", color: SPLIT_COLORS.packages, value: read("packages") },
    ].filter((row) => row.value !== null && row.value > 0) as {
      key: string; label: string; color: string; value: number;
    }[];
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    if (!rows.length || total <= 0) return null;
    return { rows: rows.map((row) => ({ ...row, pct: (row.value / total) * 100 })), total };
  })();
  const outstanding =
    revenue && revenue.billedRevenue !== null
      ? Math.max(0, revenue.billedRevenue - revenue.revenue)
      : null;

  return (
    <PearlBackground>
    <SafeAreaView style={styles.screen}>
      <AppStatusBar />
      <View style={styles.header}>
        <AppBackButton accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />
        <Text translate style={styles.title}>
          {period === "today" ? "Today's Revenue" : "Revenue"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {period === "monthly" ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Choose revenue date range"
            onPress={() => setRangeSheetVisible(true)} style={styles.rangeButton}>
            <Ionicons name="calendar-outline" size={20} color={pearl.accentDeep} />
            <Text style={styles.rangeText}>{periodLabel}</Text>
            <Ionicons name="chevron-down" size={18} color={pearl.ink2} />
          </Pressable>
        ) : <Text style={{ color: colors.text2 }}>{periodLabel}</Text>}
        {error && revenue && <Text translate style={{ color: colors.error }}>{error}</Text>}
        {loading ? <ActivityIndicator accessibilityLabel="Loading revenue" color={colors.primaryText} /> : error && !revenue ? (
          <View style={styles.card}>
            <Text translate style={{ color: colors.error }}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={load}>
              <Text translate style={{ color: colors.primaryText }}>Retry</Text>
            </Pressable>
          </View>
        ) : revenue ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Collected revenue ${currency(revenue.revenue)}, view breakdown`}
              onPress={() => setBreakdownVisible(true)}
              style={({ pressed }) => [styles.heroWrap, pressed && { opacity: 0.92 }]}
            >
              <LinearGradient
                colors={["#8C86BD", "#6E68A6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroTop}>
                  <Text translate style={styles.heroLabel}>Collected revenue</Text>
                  <View style={styles.heroPill}>
                    <Text translate style={styles.heroPillText}>Breakdown</Text>
                    <Ionicons name="chevron-up" size={14} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.heroAmount}>{currency(revenue.revenue)}</Text>
                <View style={styles.heroRule} />
                <View style={styles.heroTop}>
                  <Text translate style={styles.heroFoot}>GST collected</Text>
                  <Text style={styles.heroFootValue}>
                    {revenue.gst === null ? "—" : currency(revenue.gst)}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
            <Text translate style={[styles.title, { color: colors.heading }]}>Staff Performance</Text>
            <Text translate style={{ color: colors.text2 }}>
              Billed item revenue including GST, using the same report as the web app. Collections are shown separately above.
            </Text>
            {revenue.staffError ? (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={{ color: colors.error }}>{revenue.staffError}</Text>
              </View>
            ) : revenue.staffRecords.length === 0 ? (
              <Text translate style={{ color: colors.text2 }}>
                {period === "today" ? "No revenue records for today." : "No revenue records for this date range."}
              </Text>
            ) : revenue.staffRecords.map((staff) => (
              <Pressable
                accessibilityHint="Opens this staff member's performance report"
                accessibilityLabel={`${staff.name}, ${currency(staff.revenue)}`}
                accessibilityRole="button"
                key={staff.id}
                onPress={() => handleStaffPress(staff.id, staff.name)}
                style={({ pressed }) => [
                  styles.card,
                  styles.row,
                  { backgroundColor: colors.card },
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.staff}>
                  <Text style={{ color: colors.heading, fontWeight: "700" }}>{staff.name}</Text>
                  <Text translate style={{ color: colors.text2 }}>Staff</Text>
                </View>
                <Text style={{ color: colors.primaryText, fontWeight: "700" }}>{currency(staff.revenue)}</Text>
                <Ionicons color={colors.hint} name="chevron-forward" size={18} />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
      {period === "monthly" ? (
        <DateRangePickerSheet
          pearlStyle
          centered={false}
          endDate={monthlyRange.end_date}
          mode="range"
          title="Revenue date range"
          onApply={(start, end) => {
            if (start && end) setMonthlyRange({ start_date: start, end_date: end });
            setRangeSheetVisible(false);
          }}
          onClose={() => setRangeSheetVisible(false)}
          startDate={monthlyRange.start_date}
          visible={rangeSheetVisible}
        />
      ) : null}
      {revenue ? (
        <BottomSheet
          visible={breakdownVisible}
          onClose={() => setBreakdownVisible(false)}
          title="Collected revenue"
          subtitle={periodLabel}
        >
          <Text style={styles.sheetEyebrow} translate>Collected revenue</Text>
          <Text style={styles.sheetAmount}>{currency(revenue.revenue)}</Text>

          {!slices && !categoriesDone ? (
            <ActivityIndicator accessibilityLabel="Loading breakdown" color={pearl.accentDeep} style={{ marginTop: 20 }} />
          ) : slices ? (
            <>
              <View
                accessibilityRole="image"
                accessibilityLabel={`Share of revenue: ${slices.rows.map((row) => `${row.label} ${row.pct.toFixed(1)} percent`).join(", ")}`}
                style={styles.splitBar}
              >
                {slices.rows.map((row) => (
                  <View key={row.key} style={[styles.splitFill, { flex: row.pct, backgroundColor: row.color }]} />
                ))}
              </View>

              <View style={styles.sheetCard}>
                {slices.rows.map((row, index) => (
                  <View
                    key={row.key}
                    style={[styles.sheetCardRow, index === slices.rows.length - 1 && styles.sheetCardRowLast]}
                  >
                    <View style={[styles.swatch, { backgroundColor: row.color }]} />
                    <Text style={styles.sheetCardLabel}>{row.label}</Text>
                    <Text style={styles.sheetCardPct}>{row.pct.toFixed(1)}%</Text>
                    <Text style={styles.sheetCardValue}>{currency(row.value)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.sheetRows}>
            <View style={styles.sheetRow}>
              <Text translate style={styles.sheetRowLabel}>GST collected (included above)</Text>
              <Text style={styles.sheetRowValue}>
                {revenue.gst === null ? "—" : currency(revenue.gst)}
              </Text>
            </View>
            <View style={styles.sheetRow}>
              <Text translate style={styles.sheetRowLabel}>Net revenue (excl. GST)</Text>
              <Text style={styles.sheetRowValue}>
                {revenue.gst === null ? "—" : currency(revenue.revenue - revenue.gst)}
              </Text>
            </View>
            <View style={styles.sheetRow}>
              <Text translate style={styles.sheetRowLabel}>Billed revenue (incl. GST)</Text>
              <Text style={styles.sheetRowValue}>
                {revenue.billedRevenue === null ? "—" : currency(revenue.billedRevenue)}
              </Text>
            </View>
            {outstanding !== null && outstanding > 0 ? (
              <View style={styles.sheetRow}>
                <Text translate style={styles.sheetRowLabel}>Yet to collect</Text>
                <Text style={[styles.sheetRowValue, styles.sheetRowWarn]}>{currency(outstanding)}</Text>
              </View>
            ) : null}
          </View>
        </BottomSheet>
      ) : null}
    </SafeAreaView>
    </PearlBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, color: pearl.ink, flexShrink: 1 },
  content: { padding: 20, gap: 16 },
  card: { padding: 18, borderRadius: 14, gap: 10 },
  total: { fontSize: 28, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowPressed: { opacity: 0.7 },
  staff: { flex: 1, gap: 4 },
  rangeButton: { alignItems: "center", borderRadius: 16, borderWidth: 1, borderColor: pearl.fieldBorder, backgroundColor: pearl.field, flexDirection: "row", gap: 10, minHeight: 56, paddingHorizontal: 16 },
  rangeText: { color: pearl.ink, flex: 1, fontSize: 16, fontWeight: "600" },
  // Collected-revenue hero: the gradient card that opens the breakdown sheet.
  heroWrap: { borderRadius: 26, shadowColor: "#5D5890", shadowOpacity: 0.28, shadowRadius: 34, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  hero: { borderRadius: 26, padding: 22, paddingBottom: 18 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroLabel: { color: "#F1EFFA", fontSize: 12.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  heroPillText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  heroAmount: { color: "#FFFFFF", fontSize: 36, fontWeight: "800", letterSpacing: -0.9, marginTop: 10 },
  heroRule: { height: 1, backgroundColor: "rgba(255,255,255,0.22)", marginTop: 16, marginBottom: 14 },
  heroFoot: { color: "#F1EFFA", fontSize: 14, fontWeight: "600" },
  heroFootValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  sheetEyebrow: { color: pearl.accentDeep, fontSize: 12.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  sheetAmount: { color: pearl.ink, fontSize: 32, fontWeight: "800", letterSpacing: -0.8, marginTop: 4 },
  // Share bar: one flex-weighted segment per slice, like the design's legend bar.
  splitBar: { flexDirection: "row", gap: 2, height: 12, borderRadius: 12, overflow: "hidden", marginTop: 18 },
  splitFill: { height: "100%" },
  sheetCard: { marginTop: 16, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EEECF4", overflow: "hidden" },
  sheetCardRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#F1EFF6" },
  sheetCardRowLast: { borderBottomWidth: 0 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  sheetCardLabel: { flex: 1, color: pearl.ink, fontSize: 15, fontWeight: "700" },
  sheetCardPct: { width: 52, textAlign: "right", color: pearl.ink2, fontSize: 12.5, fontWeight: "700" },
  sheetCardValue: { minWidth: 104, textAlign: "right", color: pearl.ink, fontSize: 15, fontWeight: "800" },
  sheetRows: { marginTop: 16, gap: 10, paddingHorizontal: 4 },
  sheetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetRowLabel: { color: pearl.ink2, fontSize: 14, fontWeight: "600", flexShrink: 1 },
  sheetRowValue: { color: pearl.ink, fontSize: 15, fontWeight: "800" },
  sheetRowWarn: { color: pearl.accentDeep },
});
