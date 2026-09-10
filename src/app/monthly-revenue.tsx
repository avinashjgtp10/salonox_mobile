import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { getApiErrorMessage } from "@/services/api";
import { dashboardService } from "@/services/dashboard.service";
import { useAppSelector } from "@/store/hooks";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

type Revenue = {
  monthlyRevenue: number;
  staffRecords: Awaited<ReturnType<typeof dashboardService.getStaffRevenue>>["staffRecords"];
  staffError: string | null;
};
const currency = (value: number) => `Rs. ${value.toLocaleString("en-IN")}`;

export default function MonthlyRevenueScreen() {
  const colors = useThemeColors();
  const salonId = useAppSelector(selectActiveBranchId);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [month, setMonth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(true);

  const load = useCallback(() => {
    const date = new Date();
    setMonth(date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
    setLoading(true);
    setError(null);
    setRevenue(null);
    void dashboardService.getOwnerDashboard(date, salonId)
      .then(async (dashboard) => {
        let staffRecords: Revenue["staffRecords"] = [];
        let staffError: string | null = null;

        try {
          const staff = await dashboardService.getStaffRevenue(date, salonId);
          staffRecords = staff.staffRecords;
        } catch (cause: unknown) {
          staffError = getApiErrorMessage(cause);
        }

        if (activeRef.current) {
          setRevenue({
            monthlyRevenue: dashboard.metrics.monthlyRevenue,
            staffError,
            staffRecords,
          });
        }
      })
      .catch((cause: unknown) => { if (activeRef.current) setError(getApiErrorMessage(cause)); })
      .finally(() => { if (activeRef.current) setLoading(false); });
  }, [salonId]);

  useFocusEffect(useCallback(() => {
    activeRef.current = true;
    load();
    return () => { activeRef.current = false; };
  }, [load]));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg2 }]}>
      <AppStatusBar />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12}
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
          <Ionicons name="arrow-back" size={24} color={colors.heading} />
        </Pressable>
        <Text style={[styles.title, { color: colors.heading }]}>Current Month Revenue</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ color: colors.text2 }}>{month}</Text>
        {loading ? <ActivityIndicator accessibilityLabel="Loading monthly revenue" color={colors.primary} /> : error ? (
          <View style={styles.card}>
            <Text style={{ color: colors.error }}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={load}>
              <Text style={{ color: colors.primary }}>Retry</Text>
            </Pressable>
          </View>
        ) : revenue ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text2 }}>This Month&apos;s Revenue</Text>
              <Text style={[styles.total, { color: colors.heading }]}>{currency(revenue.monthlyRevenue)}</Text>
            </View>
            <Text style={[styles.title, { color: colors.heading }]}>Top Staff Revenue</Text>
            {revenue.staffError ? (
              <View style={[styles.card, { backgroundColor: colors.card }]}>
                <Text style={{ color: colors.error }}>{revenue.staffError}</Text>
              </View>
            ) : revenue.staffRecords.length === 0 ? (
              <Text style={{ color: colors.text2 }}>No revenue records for this month.</Text>
            ) : revenue.staffRecords.map((staff) => (
              <View key={staff.id} style={[styles.card, styles.row, { backgroundColor: colors.card }]}>
                <View style={styles.staff}>
                  <Text style={{ color: colors.heading, fontWeight: "700" }}>{staff.name}</Text>
                  <Text style={{ color: colors.text2 }}>{staff.role}</Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>{currency(staff.revenue)}</Text>
              </View>
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
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  staff: { flex: 1, gap: 4 },
});
