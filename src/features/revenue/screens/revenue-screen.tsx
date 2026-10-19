import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { getApiErrorMessage } from "@/services/api";
import { reportService } from "@/services/report.service";
import { staffService } from "@/services/staff.service";
import { fetchReportThunk } from "@/middleware/report/report.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { rememberReportFilters } from "@/store/report/report.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";
import { dateRangeLabel } from "@/utils/dateRangePresets";
import { formatCurrency as currency } from "@/utils/currency";

type RevenuePeriod = "monthly" | "today";

type Revenue = {
  revenue: number;
  billedRevenue: number | null;
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
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const salonId = useAppSelector(selectActiveBranchId);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");
  const [monthlyRange, setMonthlyRange] = useState(() => getMonthRange(new Date()));
  const [rangeSheetVisible, setRangeSheetVisible] = useState(false);
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

  const handleStaffPress = (staffId: string) => {
    const filters = {
      ...(revenue?.range ?? getReportRange(period)),
      include_gst: "true",
      limit: 10,
      page: 1,
      staff_ids: staffId,
    };

    dispatch(rememberReportFilters({ filters, slug: "staff-performance" }));
    void dispatch(fetchReportThunk({ filters, refresh: true, slug: "staff-performance" }));
    router.push("/reports/staff-performance" as Href);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg2 }]}>
      <AppStatusBar />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
          <Ionicons name="arrow-back" size={24} color={colors.heading} />
        </Pressable>
        <Text style={[styles.title, { color: colors.heading }]}>
          {period === "today" ? "Today's Revenue" : "Revenue"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {period === "monthly" ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Choose revenue date range"
            onPress={() => setRangeSheetVisible(true)} style={[styles.rangeButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.primaryText} />
            <Text style={{ color: colors.heading, flex: 1 }}>{periodLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.hint} />
          </Pressable>
        ) : <Text style={{ color: colors.text2 }}>{periodLabel}</Text>}
        {error && revenue && <Text style={{ color: colors.error }}>{error}</Text>}
        {loading ? <ActivityIndicator accessibilityLabel="Loading revenue" color={colors.primaryText} /> : error && !revenue ? (
          <View style={styles.card}>
            <Text style={{ color: colors.error }}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={load}>
              <Text style={{ color: colors.primaryText }}>Retry</Text>
            </Pressable>
          </View>
        ) : revenue ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text2 }}>
                Collected revenue
              </Text>
              <Text style={[styles.total, { color: colors.heading }]}>{currency(revenue.revenue)}</Text>
              <Text style={{ color: colors.text2 }}>Billed revenue including GST: {revenue.billedRevenue === null ? "Unavailable" : currency(revenue.billedRevenue)}</Text>
            </View>
            <Text style={[styles.title, { color: colors.heading }]}>Staff Performance</Text>
            <Text style={{ color: colors.text2 }}>
              Billed item revenue including GST, using the same report as the web app. Collections are shown separately above.
            </Text>
            {revenue.staffError ? (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={{ color: colors.error }}>{revenue.staffError}</Text>
              </View>
            ) : revenue.staffRecords.length === 0 ? (
              <Text style={{ color: colors.text2 }}>
                {period === "today" ? "No revenue records for today." : "No revenue records for this date range."}
              </Text>
            ) : revenue.staffRecords.map((staff) => (
              <Pressable
                accessibilityHint="Opens this staff member's performance report"
                accessibilityLabel={`${staff.name}, ${currency(staff.revenue)}`}
                accessibilityRole="button"
                key={staff.id}
                onPress={() => handleStaffPress(staff.id)}
                style={({ pressed }) => [
                  styles.card,
                  styles.row,
                  { backgroundColor: colors.card },
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.staff}>
                  <Text style={{ color: colors.heading, fontWeight: "700" }}>{staff.name}</Text>
                  <Text style={{ color: colors.text2 }}>Staff</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20 },
  title: { fontSize: 18, fontWeight: "700", flexShrink: 1 },
  content: { padding: 20, gap: 16 },
  card: { padding: 18, borderRadius: 14, gap: 10 },
  total: { fontSize: 28, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowPressed: { opacity: 0.7 },
  staff: { flex: 1, gap: 4 },
  rangeButton: { alignItems: "center", borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, minHeight: 48, paddingHorizontal: 14 },
});
