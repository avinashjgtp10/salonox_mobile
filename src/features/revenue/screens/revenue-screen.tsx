import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { getApiErrorMessage } from "@/services/api";
import { dashboardService } from "@/services/dashboard.service";
import { reportService } from "@/services/report.service";
import { staffService } from "@/services/staff.service";
import { fetchReportThunk } from "@/middleware/report/report.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { rememberReportFilters } from "@/store/report/report.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { ReportRangeSheet } from "@/features/reports/components/report-range-sheet";
import { formatAppDate } from "@/utils/dateTime";

type RevenuePeriod = "monthly" | "today";

type Revenue = {
  revenue: number;
  staffRecords: Awaited<ReturnType<typeof reportService.getStaffPerformanceRevenue>>;
  range: { start_date: string; end_date: string };
  staffError: string | null;
};

const currency = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

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
  const now = new Date();
  const isCurrentMonth = value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth();
  return {
    end_date: toIsoDate(isCurrentMonth ? now : new Date(value.getFullYear(), value.getMonth() + 1, 0)),
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

  const load = useCallback(() => {
    const date = new Date();
    const range = period === "today" ? getReportRange(period, date) : monthlyRange;
    const requestId = ++requestRef.current;
    const isCurrent = () => activeRef.current && requestRef.current === requestId;

    setPeriodLabel(
      period === "today"
        ? date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
        : `${formatAppDate(range.start_date, range.start_date)} – ${formatAppDate(range.end_date, range.end_date)}`,
    );
    setLoading(true);
    setError(null);
    setRevenue(null);

    const dashboardDate = period === "today" ? date : new Date(`${range.start_date}T12:00:00`);
    void dashboardService.getOwnerDashboard(dashboardDate, salonId)
      .then(async (dashboard) => {
        let staffRecords: Revenue["staffRecords"] = [];
        let staffError: string | null = null;

        try {
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

          const revenueRecords = await reportService.getStaffPerformanceRevenue(range, true);
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
          setRevenue({
            range,
            revenue:
              period === "today"
                ? dashboard.metrics.todaysRevenue
                : dashboard.metrics.monthlyRevenue,
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
          {period === "today" ? "Today's Revenue" : `${new Date(`${monthlyRange.start_date}T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })} Revenue`}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {period === "monthly" ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Choose revenue date range"
            onPress={() => setRangeSheetVisible(true)} style={[styles.rangeButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.heading, flex: 1 }}>{periodLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.hint} />
          </Pressable>
        ) : <Text style={{ color: colors.text2 }}>{periodLabel}</Text>}
        {loading ? <ActivityIndicator accessibilityLabel="Loading revenue" color={colors.primary} /> : error ? (
          <View style={styles.card}>
            <Text style={{ color: colors.error }}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={load}>
              <Text style={{ color: colors.primary }}>Retry</Text>
            </Pressable>
          </View>
        ) : revenue ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text2 }}>
                {period === "today" ? "Today's Revenue" : `${new Date(`${monthlyRange.start_date}T12:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })} Revenue`}
              </Text>
              <Text style={[styles.total, { color: colors.heading }]}>{currency(revenue.revenue)}</Text>
            </View>
            <Text style={[styles.title, { color: colors.heading }]}>Staff Performance</Text>
            <Text style={{ color: colors.text2 }}>
              Item revenue including GST, as in Staff Performance. The salon total above shows collections.
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
                <Text style={{ color: colors.primary, fontWeight: "700" }}>{currency(staff.revenue)}</Text>
                <Ionicons color={colors.hint} name="chevron-forward" size={18} />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
      {period === "monthly" ? (
        <ReportRangeSheet
          endDate={null}
          mode="single"
          onApply={(selectedDate) => {
            if (selectedDate) setMonthlyRange(getMonthRange(new Date(`${selectedDate}T12:00:00`)));
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
