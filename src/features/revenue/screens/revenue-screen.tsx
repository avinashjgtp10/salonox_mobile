import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { getApiErrorMessage } from "@/services/api";
import { dashboardService } from "@/services/dashboard.service";
import { fetchReportThunk } from "@/middleware/report/report.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { rememberReportFilters } from "@/store/report/report.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

type RevenuePeriod = "monthly" | "today";

type Revenue = {
  revenue: number;
  staffRecords: Awaited<ReturnType<typeof dashboardService.getStaffRevenue>>["staffRecords"];
  staffError: string | null;
};

const currency = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

// The staff-performance report window must match the revenue figure the staff
// row was tapped from, otherwise the drill-down shows a different total than
// the list that led to it.
const getReportRange = (period: RevenuePeriod) => {
  const today = new Date();

  if (period === "today") {
    return { end_date: toIsoDate(today), start_date: toIsoDate(today) };
  }

  return {
    end_date: toIsoDate(today),
    start_date: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  };
};

export default function RevenueScreen({ period }: { period: RevenuePeriod }) {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const salonId = useAppSelector(selectActiveBranchId);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(true);

  const load = useCallback(() => {
    const date = new Date();

    setPeriodLabel(
      period === "today"
        ? date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
        : date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    );
    setLoading(true);
    setError(null);
    setRevenue(null);

    void dashboardService.getOwnerDashboard(date, salonId)
      .then(async (dashboard) => {
        let staffRecords: Revenue["staffRecords"] = [];
        let staffError: string | null = null;

        try {
          const staff = await dashboardService.getStaffRevenue(date, salonId, period);
          staffRecords = staff.staffRecords;
        } catch (cause: unknown) {
          staffError = getApiErrorMessage(cause);
        }

        if (activeRef.current) {
          setRevenue({
            revenue:
              period === "today"
                ? dashboard.metrics.todaysRevenue
                : dashboard.metrics.monthlyRevenue,
            staffError,
            staffRecords,
          });
        }
      })
      .catch((cause: unknown) => { if (activeRef.current) setError(getApiErrorMessage(cause)); })
      .finally(() => { if (activeRef.current) setLoading(false); });
  }, [period, salonId]);

  useFocusEffect(useCallback(() => {
    activeRef.current = true;
    load();
    return () => { activeRef.current = false; };
  }, [load]));

  // Drills into the existing Staff Performance report rather than a bespoke
  // screen: it already returns invoice count, items sold, revenue, commission,
  // collected and due for a given staff member and window.
  const handleStaffPress = (staffId: string) => {
    const filters = {
      ...getReportRange(period),
      limit: 10,
      page: 1,
      staff_ids: staffId,
    };

    dispatch(rememberReportFilters({ filters, slug: "staff-performance" }));
    // ReportScreen only auto-loads when its entry has no data yet, so a second
    // visit would otherwise show the previous staff member's rows.
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
          {period === "today" ? "Today's Revenue" : "Current Month Revenue"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ color: colors.text2 }}>{periodLabel}</Text>
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
                {period === "today" ? "Today's Revenue" : "This Month's Revenue"}
              </Text>
              <Text style={[styles.total, { color: colors.heading }]}>{currency(revenue.revenue)}</Text>
            </View>
            <Text style={[styles.title, { color: colors.heading }]}>Top Staff Revenue</Text>
            {revenue.staffError ? (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={{ color: colors.error }}>{revenue.staffError}</Text>
              </View>
            ) : revenue.staffRecords.length === 0 ? (
              <Text style={{ color: colors.text2 }}>
                {period === "today" ? "No revenue records for today." : "No revenue records for this month."}
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
                  <Text style={{ color: colors.text2 }}>{staff.role}</Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>{currency(staff.revenue)}</Text>
                <Ionicons color={colors.hint} name="chevron-forward" size={18} />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
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
});
