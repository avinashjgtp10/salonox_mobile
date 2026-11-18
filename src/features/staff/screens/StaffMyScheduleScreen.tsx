import { useRegionalPreferences } from "@/localization/preferences";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { Text } from "@/components/ui/AppTypography";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { usePearlColors as useThemeColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import {
  selectStaffSchedule,
  selectStaffScheduleError,
  selectStaffScheduleLoaded,
  selectStaffScheduleLoading,
} from "@/store/staff/staffSchedule.slice";
import { fetchStaffScheduleThunk } from "@/middleware/staff/staffSchedule.thunk";
import type { ScheduleDayEntry } from "@/types/staffSchedule";
import { isValidStaffId } from "@/utils/staffIds";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DEFAULT_DAYS: ScheduleDayEntry[] = WEEK_DAYS.map((day) => ({
  day, endTime: null, isOff: day === "sunday", startTime: null,
}));

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** "09:00" → "9:00 AM"; null stays null. */
const formatTime = (value: string | null) => {
  if (!value) return null;
  const [h, m] = value.split(":").map((part) => parseInt(part, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

/**
 * The signed-in staff member's own weekly shift — read-only. Mirrors the
 * owner-side StaffScheduleSection, without the edit affordances, since
 * staff may only view their own schedule.
 */
export function StaffMyScheduleScreen() {
  "use no memo";
  useRegionalPreferences();
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 360 ? 16 : width >= 768 ? 32 : 20;

  const dispatch = useAppDispatch();
  const staff = useAppSelector(selectCurrentStaff);
  const staffId = staff?.id ?? null;
  const schedule = useAppSelector((state) => selectStaffSchedule(state, staffId));
  const loaded = useAppSelector((state) => selectStaffScheduleLoaded(state, staffId));
  const loading = useAppSelector((state) => selectStaffScheduleLoading(state, staffId));
  const error = useAppSelector((state) => selectStaffScheduleError(state, staffId));

  const load = useCallback(() => {
    if (!staffId || !isValidStaffId(staffId)) return;
    void dispatch(fetchStaffScheduleThunk(staffId));
  }, [dispatch, staffId]);

  useEffect(() => { load(); }, [load]);

  const days = schedule?.days?.length ? schedule.days : DEFAULT_DAYS;
  const allOff = days.every((day) => day.isOff);

  return (
    <PearlBackground><SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        refreshControl={<RefreshControl colors={[pearl.accent]} onRefresh={load} refreshing={loading && loaded} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text translate style={styles.title}>My schedule</Text>
          <Text style={styles.subtitle}>{staff?.name ? `${staff.name} · ` : ""}Weekly shift</Text>
        </View>

        {loading && !loaded ? (
          <View style={styles.card}><ActivityIndicator color={pearl.accentDeep} /></View>
        ) : error ? (
          <View style={styles.card}>
            <Ionicons name="alert-circle-outline" size={26} color={Colors.error} />
            <Text translate style={styles.stateTitle}>Unable to load your schedule</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : (
          <>
            {allOff ? (
              <View style={styles.card}>
                <Ionicons name="calendar-outline" size={26} color={Colors.text2} />
                <Text translate style={styles.stateTitle}>No shift set</Text>
                <Text translate style={styles.stateText}>Your weekly shift hasn{"'"}t been configured yet. Ask your manager to set it.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {days.map((entry, index) => (
                  <View key={entry.day} style={[styles.row, index === 0 && styles.rowFirst]}>
                    <Text style={styles.dayLabel}>{titleCase(entry.day)}</Text>
                    {entry.isOff ? (
                      <Text translate style={styles.dayOff}>Day off</Text>
                    ) : (
                      <Text style={styles.dayHours}>
                        {formatTime(entry.startTime) ?? "—"} <Text style={styles.dayHoursDash}> – </Text> {formatTime(entry.endTime) ?? "—"}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            <Text translate style={styles.footerNote}>Only your manager can change your schedule.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView></PearlBackground>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: "transparent", flex: 1 },
  content: { gap: 16, paddingBottom: 140, paddingTop: Spacing.md },
  header: { gap: 6 },
  title: { color: Colors.heading, fontSize: 22, fontWeight: "900" },
  subtitle: { color: Colors.text2, fontSize: 15, fontWeight: "600" },
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 24, borderWidth: 1, gap: 4, padding: 18 },
  row: { alignItems: "center", borderTopColor: Colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, justifyContent: "space-between", paddingVertical: 14 },
  rowFirst: { borderTopWidth: 0 },
  dayLabel: { color: Colors.heading, fontSize: 15, fontWeight: "800" },
  dayOff: { color: Colors.text2, fontSize: 13, fontWeight: "700" },
  dayHours: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  dayHoursDash: { color: Colors.text2 },
  stateTitle: { color: Colors.heading, fontSize: 16, fontWeight: "800" },
  stateText: { color: Colors.text2, fontSize: 14, fontWeight: "600" },
  footerNote: { color: Colors.text2, fontSize: 12, fontWeight: "600", textAlign: "center" },
});

export default StaffMyScheduleScreen;
