import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout } from "@/constants/layout";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { findAttendanceRecordForStaff } from "@/features/attendance/utils/attendanceMatching";
import {
  formatAttendanceTime,
  getAttendanceAction,
  getAttendanceBadgeConfig,
  getTodayAttendanceDateKey,
  getWorkingHoursLabel,
} from "@/features/attendance/utils/attendanceStatus";
import {
  checkInThunk,
  checkOutThunk,
  fetchAttendanceOverviewThunk,
} from "@/middleware/attendance/attendance.thunk";
import {
  selectAttendanceIsCheckingIn,
  selectAttendanceIsCheckingOut,
  selectAttendanceIsOffline,
  selectAttendanceRecords,
  selectAttendanceRecordsError,
  selectAttendanceRecordsLoading,
  selectAttendanceRecordsRefreshing,
} from "@/store/attendance/attendance.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectCurrentStaff,
  selectCurrentStaffError,
  selectCurrentStaffLoading,
} from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

const formatValue = (value?: string | number | null) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const getResponsiveHorizontalPadding = (width: number) => {
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

export function StaffAttendanceScreen() {
  const Colors = useThemeColors();
  const { width } = useWindowDimensions();
  const horizontalPadding = getResponsiveHorizontalPadding(width);
  const titleSize = width < 360 ? 28 : width >= 768 ? 36 : 32;
  const dispatch = useAppDispatch();
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const records = useAppSelector(selectAttendanceRecords);
  const recordsError = useAppSelector(selectAttendanceRecordsError);
  const recordsLoading = useAppSelector(selectAttendanceRecordsLoading);
  const recordsRefreshing = useAppSelector(selectAttendanceRecordsRefreshing);
  const isOffline = useAppSelector(selectAttendanceIsOffline);
  const [actionError, setActionError] = useState<string | null>(null);

  const todayKey = useMemo(() => getTodayAttendanceDateKey(), []);
  const currentStaffId = currentStaff?.id ?? null;
  const selfRecord = useMemo(
    () => (currentStaff ? findAttendanceRecordForStaff(records, currentStaff) : undefined),
    [currentStaff, records],
  );
  const badge = getAttendanceBadgeConfig(selfRecord, Colors);
  const action = getAttendanceAction(selfRecord);
  const checkingIn = useAppSelector((state) => selectAttendanceIsCheckingIn(state, currentStaffId));
  const checkingOut = useAppSelector((state) => selectAttendanceIsCheckingOut(state, currentStaffId));
  const actionBusy = checkingIn || checkingOut;
  const loading = currentStaffLoading || recordsLoading;
  const error = currentStaffError ?? recordsError;

  const loadAttendance = useCallback(() => {
    if (!currentStaffId) {
      return;
    }

    void dispatch(fetchAttendanceOverviewThunk(todayKey));
  }, [currentStaffId, dispatch, todayKey]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleRefresh = useCallback(() => {
    setActionError(null);
    loadAttendance();
  }, [loadAttendance]);

  const handlePrimaryAction = useCallback(async () => {
    if (!currentStaffId || action.kind === "edit") {
      return;
    }

    setActionError(null);

    try {
      if (action.kind === "checkIn") {
        await dispatch(checkInThunk({ date: todayKey, staffId: currentStaffId })).unwrap();
        return;
      }

      await dispatch(checkOutThunk({ date: todayKey, staffId: currentStaffId })).unwrap();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update attendance.");
    }
  }, [action.kind, currentStaffId, dispatch, todayKey]);

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: Colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: width < 360 ? Spacing.sm : Spacing.md,
          },
        ]}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={handleRefresh}
            refreshing={recordsRefreshing}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: Colors.text2 }]}>MY ATTENDANCE</Text>
          <Text style={[styles.title, { color: Colors.heading, fontSize: titleSize }]}>Today’s status</Text>
          <Text style={[styles.subtitle, { color: Colors.text2 }]}>
            {new Intl.DateTimeFormat("en-IN", {
              day: "numeric",
              month: "short",
              weekday: "long",
              year: "numeric",
            }).format(new Date())}
          </Text>
        </View>

        {isOffline ? (
          <View style={[styles.notice, { backgroundColor: Colors.warningBg, borderColor: Colors.border }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.warning} />
            <Text style={[styles.noticeText, { color: Colors.text }]}>
              Showing the latest cached attendance while you are offline.
            </Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={[styles.stateText, { color: Colors.text2 }]}>Loading attendance…</Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Ionicons name="alert-circle-outline" size={28} color={Colors.error} />
              <Text style={[styles.stateTitle, { color: Colors.heading }]}>Unable to load attendance</Text>
              <Text style={[styles.stateText, { color: Colors.text2 }]}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={handleRefresh}
                style={[styles.retryButton, { backgroundColor: Colors.primaryDark }]}
              >
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, { backgroundColor: badge.bg }]}>
                  <Ionicons name={badge.icon} size={24} color={badge.color} />
                </View>
                <View style={styles.statusCopy}>
                  <Text style={[styles.statusTitle, { color: Colors.heading }]}>{badge.label}</Text>
                  <Text style={[styles.statusSubtitle, { color: Colors.text2 }]}>
                    {currentStaff?.name ?? "Your attendance"} is scoped to your staff profile.
                  </Text>
                </View>
              </View>

              <View style={[styles.detailsGrid, { borderColor: Colors.border }]}>
                <Detail label="Check In" value={formatAttendanceTime(selfRecord?.checkInTime)} />
                <Detail label="Check Out" value={formatAttendanceTime(selfRecord?.checkOutTime)} />
                <Detail label="Hours" value={getWorkingHoursLabel(selfRecord)} />
                <Detail label="Schedule" value={formatValue(selfRecord?.scheduledHours)} />
              </View>

              {actionError ? <Text style={[styles.errorText, { color: Colors.error }]}>{actionError}</Text> : null}

              <Pressable
                accessibilityRole="button"
                disabled={actionBusy || !currentStaffId || action.kind === "edit"}
                onPress={handlePrimaryAction}
                style={[
                  styles.primaryButton,
                  { backgroundColor: Colors.primaryDark },
                  (actionBusy || !currentStaffId || action.kind === "edit") && styles.buttonDisabled,
                ]}
              >
                {actionBusy ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text style={styles.primaryButtonText}>
                  {action.kind === "edit" ? "Attendance Complete" : action.label}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();

  return (
    <View style={styles.detail}>
      <Text style={[styles.detailLabel, { color: Colors.text2 }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: Colors.heading }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: { opacity: 0.5 },
  card: { borderRadius: 28, borderWidth: 1, padding: 20 },
  centerState: { alignItems: "center", gap: 10, paddingVertical: 32 },
  content: { gap: 18, paddingBottom: 120 },
  detail: { gap: 6, width: "50%" },
  detailLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  detailValue: { fontSize: 18, fontWeight: "800" },
  detailsGrid: { borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 18, marginTop: 20, paddingTop: 20 },
  errorText: { fontSize: 13, fontWeight: "700", marginTop: 16 },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.8 },
  header: { gap: 6 },
  notice: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 8, padding: 12 },
  noticeText: { flex: 1, fontSize: 13, fontWeight: "600" },
  primaryButton: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  retryButton: { borderRadius: 16, marginTop: 8, paddingHorizontal: 18, paddingVertical: 12 },
  safeArea: { flex: 1 },
  stateText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  stateTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  statusCopy: { flex: 1, gap: 4 },
  statusIcon: { alignItems: "center", borderRadius: 22, height: 54, justifyContent: "center", width: 54 },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  statusSubtitle: { fontSize: 14, fontWeight: "600" },
  statusTitle: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 15, fontWeight: "600" },
  title: { fontWeight: "900" },
});
