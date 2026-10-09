import { AttendanceBreakModal } from "@/features/attendance/components/AttendanceBreakModal";
import { AttendanceActivityDetails } from "@/features/attendance/components/AttendanceActivityDetails";
import { appAlert } from "@/services/appAlert";
import { useStaffSelfAttendance } from "@/features/attendance/components/StaffAttendanceGate";
import { useAppToast } from "@/hooks/useAppToast";
import { getApiErrorMessage } from "@/services/api";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout } from "@/constants/layout";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { findAttendanceRecordForStaff } from "@/features/attendance/utils/attendanceMatching";
import {
  formatAttendanceDate,
  formatAttendanceTime,
  getAttendanceBadgeConfig,
  getTodayAttendanceDateKey,
  getWorkingHoursLabel,
} from "@/features/attendance/utils/attendanceStatus";
import {
  fetchAttendanceOverviewThunk,
} from "@/middleware/attendance/attendance.thunk";
import {
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
  const selfAttendance = useStaffSelfAttendance();
  const [breakVisible, setBreakVisible] = useState(false);
  const toast = useAppToast();
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

  const todayKey = selfAttendance?.state?.date ?? getTodayAttendanceDateKey();
  const currentStaffId = currentStaff?.id ?? null;
  const overviewRecord = useMemo(
    () => (currentStaff ? findAttendanceRecordForStaff(records, currentStaff) : undefined),
    [currentStaff, records],
  );
  const selfRecord = selfAttendance?.record ?? overviewRecord;
  const badge = getAttendanceBadgeConfig(selfRecord, Colors);
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

  const refreshSelf = selfAttendance?.refresh;
  const handleRefresh = useCallback(() => {
    loadAttendance(); void refreshSelf?.();
  }, [loadAttendance, refreshSelf]);

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
            {formatAttendanceDate(todayKey)}
          </Text>
        </View>

        {selfAttendance?.state?.current_status === "ON_BREAK" ? (
          <TouchableOpacity disabled={selfAttendance.busy} accessibilityRole="button" onPress={() => void selfAttendance.checkIn().then(() => { toast.showSuccess("Welcome back. You are working."); loadAttendance(); }).catch(error => toast.showError(getApiErrorMessage(error)))} style={{ backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: "center" }}>
            {selfAttendance.busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Check In</Text>}
          </TouchableOpacity>
        ) : selfAttendance?.state?.checked_in && !selfAttendance.state.record?.check_out ? (
          <TouchableOpacity disabled={selfAttendance.busy} accessibilityRole="button" onPress={() => appAlert.alert("Check Out", "Do you need a break, or are you done for today?", [
            { text: "Cancel", style: "cancel" },
            { text: "Take a Break", onPress: () => setBreakVisible(true) },
            { text: "Final Checkout", style: "destructive", onPress: () => void selfAttendance.checkOut().then(() => { toast.showSuccess("Shift completed."); loadAttendance(); }).catch(error => toast.showError(getApiErrorMessage(error))) },
          ])} style={{ backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: "center" }}>
            {selfAttendance.busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Check Out</Text>}
          </TouchableOpacity>
        ) : null}
        {isOffline ? (
          <View style={[styles.notice, { backgroundColor: Colors.warningBg, borderColor: Colors.border }]}>
            <Ionicons name="cloud-offline-outline" size={16} color={Colors.warning} />
            <Text style={[styles.noticeText, { color: Colors.text }]}>
              Showing the latest cached attendance while you are offline.
            </Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
          {loading && !selfRecord ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={[styles.stateText, { color: Colors.text2 }]}>Loading attendance…</Text>
            </View>
          ) : error && !selfRecord ? (
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

              <AttendanceActivityDetails activity={selfRecord?.activity} finalCheckout={selfRecord?.checkOutTime} />
              <View style={[styles.detailsGrid, { borderColor: Colors.border }]}>
                <Detail label="Check In" value={formatAttendanceTime(selfRecord?.checkInTime)} />
                <Detail label="Check Out" value={formatAttendanceTime(selfRecord?.checkOutTime)} />
                <Detail label="Hours" value={getWorkingHoursLabel(selfRecord)} />
                <Detail label="Schedule" value={formatValue(selfRecord?.scheduledHours)} />
              </View>


            </>
          )}
        </View>
      </ScrollView>
      <AttendanceBreakModal visible={breakVisible} state={selfAttendance?.state ?? null} busy={selfAttendance?.busy ?? false} onClose={() => setBreakVisible(false)} onSubmit={async body => {
        if (!selfAttendance) throw new Error("Attendance is unavailable. Please refresh.");
        await selfAttendance.startBreak(body); toast.showSuccess("Break started. Check in when you return."); loadAttendance();
      }} />
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
  card: { borderRadius: 28, borderWidth: 1, padding: 20 },
  centerState: { alignItems: "center", gap: 10, paddingVertical: 32 },
  content: { gap: 18, paddingBottom: 120 },
  detail: { gap: 6, width: "50%" },
  detailLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  detailValue: { fontSize: 18, fontWeight: "800" },
  detailsGrid: { borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 18, marginTop: 20, paddingTop: 20 },
  eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 1.8 },
  header: { gap: 6 },
  notice: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 8, padding: 12 },
  noticeText: { flex: 1, fontSize: 13, fontWeight: "600" },
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
