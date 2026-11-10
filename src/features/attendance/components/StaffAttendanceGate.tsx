import { StaffAttendanceContext } from "./StaffSelfAttendanceContext";
import { StaffCheckInScreen } from "./StaffAttendanceExperience";
import { hasBusinessDashboard } from "@/utils/staffExperience";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { getApiErrorMessage } from "@/services/api";
import { staffSelfAttendanceService, type StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import { normalizeAttendanceRecord } from "@/services/attendance.service";
import type { StartBreakRequest } from "@/types/attendance";
import { useThemeColors } from "@/theme/ThemeProvider";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { canUnlockStaffApp } from "@/features/attendance/utils/staffAttendanceGate";
import { staffAttendanceErrorMessage } from "../utils/attendanceErrors";
import { StaffCheckoutReminder } from "./StaffCheckoutReminder";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Modal, StyleSheet, View } from "react-native";

export { useStaffSelfAttendance } from "./StaffSelfAttendanceContext";

const PUNCH_RESULT = { checkIn: "WORKING", startBreak: "ON_BREAK", checkOut: "CHECKED_OUT" } as const;

export function StaffAttendanceGate({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, signOut } = useAuth();
  const Colors = useThemeColors();
  const enabled = isAuthenticated && isStaffExperienceUser(user);
  const identity = enabled ? `${user?.id}:${user?.salonId}` : "";
  const liveIdentity = useRef(identity);
  liveIdentity.current = identity;
  const [snapshot, setSnapshot] = useState<{ identity: string; state: StaffSelfAttendance } | null>(null);
  const state = snapshot?.identity === identity ? snapshot.state : null;
  const record = useMemo(() => state?.record ? normalizeAttendanceRecord({ ...state.record, staff_id: state.staff_id }) : null, [state]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const punchLock = useRef(false);
  const requestVersion = useRef(0);
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(async () => {
    if (!identity || punchLock.current) return;
    const version = ++requestVersion.current;
    setRefreshing(true);
    try {
      const next = await staffSelfAttendanceService.get();
      if (liveIdentity.current !== identity || version !== requestVersion.current) return;
      setSnapshot({ identity, state: next }); setError(null); setNow(new Date());
    } catch (failure) {
      if (liveIdentity.current !== identity || version !== requestVersion.current) return;
      setError(getApiErrorMessage(failure));
    } finally {
      if (liveIdentity.current === identity && version === requestVersion.current) setRefreshing(false);
    }
  }, [identity]);
  useEffect(() => {
    setError(null); void refresh();
    if (!identity) return;
    const timer = setInterval(() => {
      setNow(new Date());
      if (AppState.currentState === "active") void refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [identity, refresh]);
  useEffect(() => NetInfo.addEventListener(info => { if (info.isConnected) void refresh(); }), [refresh]);
  useAppForeground(() => { setNow(new Date()); void refresh(); });

  const punch = useCallback(async (kind: "checkIn" | "checkOut" | "startBreak", body?: StartBreakRequest, pendingAttendanceId?: string) => {
    if (!identity || punchLock.current) throw new Error("An attendance action is already in progress.");
    punchLock.current = true; ++requestVersion.current; setRefreshing(false); setBusy(true); setError(null);
    try {
      let next: StaffSelfAttendance;
      try {
        next = kind === "startBreak" ? await staffSelfAttendanceService.startBreak(body!) : kind === "checkOut" ? await staffSelfAttendanceService.checkOut(pendingAttendanceId) : await staffSelfAttendanceService.checkIn();
      } catch (failure) {
        // The server can save a punch after the app stops waiting (timeout, dropped
        // response). A retry then fails with "You are already working", so ask the
        // server whether the punch landed before reporting failure.
        const current = await staffSelfAttendanceService.get().catch(() => null);
        if (current?.pending_checkout && liveIdentity.current === identity) setSnapshot({ identity, state: current });
        if (kind === "checkOut" && pendingAttendanceId) {
          // Repeating this exact record is idempotent, even after today's state
          // replaces yesterday's. Never mistake another attendance day for it.
          if (!current || current.pending_checkout?.attendance_id === pendingAttendanceId) throw failure;
          next = await staffSelfAttendanceService.checkOut(pendingAttendanceId);
        } else {
          if (current?.current_status !== PUNCH_RESULT[kind]) throw failure;
          next = current;
        }
      }
      if (liveIdentity.current === identity) { setSnapshot({ identity, state: next }); setNow(new Date()); }
    } catch (failure) {
      if (liveIdentity.current === identity) setError(staffAttendanceErrorMessage(failure));
      throw failure;
    } finally { punchLock.current = false; setBusy(false); }
  }, [identity]);
  const locked = enabled && !hasBusinessDashboard(user) && !canUnlockStaffApp(state, now);
  // An unknown attendance state is not evidence that a check-in is required.
  const checkingAttendance = locked && !state && !error;
  return (
    <StaffAttendanceContext.Provider value={{ state, record, refresh, checkIn: () => punch("checkIn"), startBreak: body => punch("startBreak", body), checkOut: pendingAttendanceId => punch("checkOut", undefined, pendingAttendanceId), busy, error, refreshing }}>
      {children}
      {enabled && <StaffCheckoutReminder key={identity} state={state} refresh={refresh} busy={busy} unavailable={!!error || locked} />}
      {checkingAttendance ? (
        <View style={styles.loadingOverlay} accessibilityRole="progressbar" accessibilityLabel="Checking today's attendance">
          <ActivityIndicator color={Colors.primaryText} size="large" />
        </View>
      ) : null}
      <Modal visible={locked && !checkingAttendance} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => {}}>
        <StaffCheckInScreen state={state} busy={busy} refreshing={refreshing} error={error}
          onCheckIn={() => void punch("checkIn").catch(() => undefined)} onRetry={() => void refresh()}
          onSignOut={() => void signOut().catch(failure => setError(getApiErrorMessage(failure)))} />
      </Modal>
    </StaffAttendanceContext.Provider>
  );
}
const styles = StyleSheet.create({
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 0, 0, 0.15)" },
});
