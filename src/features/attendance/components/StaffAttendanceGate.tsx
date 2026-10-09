import NetInfo from "@react-native-community/netinfo";
import { Text } from "@/components/ui/AppTypography";
import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { getApiErrorMessage } from "@/services/api";
import { staffSelfAttendanceService, type StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import { normalizeAttendanceRecord } from "@/services/attendance.service";
import type { AttendanceRecord, StartBreakRequest } from "@/types/attendance";
import { useThemeColors } from "@/theme/ThemeProvider";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { canUnlockStaffApp } from "@/features/attendance/utils/staffAttendanceGate";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AttendanceContext = { state: StaffSelfAttendance | null; record: AttendanceRecord | null; refresh: () => Promise<void>; checkIn: () => Promise<void>; startBreak: (body: StartBreakRequest) => Promise<void>; checkOut: () => Promise<void>; busy: boolean };
const StaffAttendanceContext = createContext<AttendanceContext | null>(null);
export const useStaffSelfAttendance = () => useContext(StaffAttendanceContext);
const displayTime = (value: string | null | undefined) => value ? new Date(value).toLocaleTimeString("en-IN", {
  timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
}) : "—";

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

  const punch = useCallback(async (kind: "checkIn" | "checkOut" | "startBreak", body?: StartBreakRequest) => {
    if (!identity || punchLock.current) throw new Error("An attendance action is already in progress.");
    punchLock.current = true; ++requestVersion.current; setRefreshing(false); setBusy(true); setError(null);
    try {
      const next = kind === "startBreak" ? await staffSelfAttendanceService.startBreak(body!) : await staffSelfAttendanceService[kind]();
      if (liveIdentity.current === identity) { setSnapshot({ identity, state: next }); setNow(new Date()); }
    } catch (failure) {
      if (liveIdentity.current === identity) setError(getApiErrorMessage(failure));
      throw failure;
    } finally { punchLock.current = false; setBusy(false); }
  }, [identity]);
  const locked = enabled && !canUnlockStaffApp(state, now);
  // An unknown attendance state is not evidence that a check-in is required.
  const checkingAttendance = locked && !state && !error;
  const showCheckIn = locked && Boolean(state);
  return (
    <StaffAttendanceContext.Provider value={{ state, record, refresh, checkIn: () => punch("checkIn"), startBreak: body => punch("startBreak", body), checkOut: () => punch("checkOut"), busy }}>
      {children}
      {checkingAttendance ? (
        <View style={styles.loadingOverlay} accessibilityRole="progressbar" accessibilityLabel="Checking today's attendance">
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : null}
      <Modal visible={locked && !checkingAttendance} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={() => {}}>
        <SafeAreaView style={[styles.screen, { backgroundColor: "rgba(0, 0, 0, 0.45)" }]}>
          <View style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <Text style={[styles.title, { color: Colors.heading }]}>{showCheckIn ? "Check in to start your day" : "Unable to verify attendance"}</Text>
            <Text style={[styles.copy, { color: Colors.text2 }]}>{showCheckIn ? "Your app details will be available after your check-in is confirmed." : "Retry to load today's attendance. If you have already checked in, you do not need to check in again."}</Text>
            {state ? <>
              {state.shift_start && state.shift_end ? <Text style={[styles.shift, { color: Colors.heading }]}>Your shift: {displayTime(state.shift_start)} – {displayTime(state.shift_end)}</Text> : null}
              <Text style={[styles.copy, { color: Colors.text2 }]}>{state.blocked_reason ?? "Tap Check In to record the current time and your location."}</Text>
            </> : null}
            {error ? <Text accessibilityRole="alert" style={[styles.copy, { color: Colors.error }]}>{error}</Text> : null}
            {showCheckIn ? <TouchableOpacity accessibilityRole="button" disabled={busy || !state?.can_check_in} onPress={() => void punch("checkIn").catch(() => undefined)}
              style={[styles.button, { backgroundColor: Colors.primary, opacity: busy || !state?.can_check_in ? 0.5 : 1 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check In</Text>}
            </TouchableOpacity> : null}
            <TouchableOpacity accessibilityRole="button" disabled={busy || refreshing} onPress={() => void refresh()} style={styles.link}>
              {refreshing ? <ActivityIndicator color={Colors.primary} /> : <Text style={{ color: Colors.primary }}>{error ? "Retry connection" : "Refresh shift and attendance"}</Text>}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void signOut().catch((failure) => setError(getApiErrorMessage(failure)))} style={styles.link}><Text style={{ color: Colors.text2 }}>Sign out</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </StaffAttendanceContext.Provider>
  );
}
const styles = StyleSheet.create({
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 0, 0, 0.15)" },
  screen: { flex: 1, justifyContent: "center", padding: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" }, copy: { fontSize: 15, lineHeight: 22 },
  shift: { fontSize: 17, fontWeight: "700" }, button: { padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 17 }, link: { paddingVertical: 10, alignItems: "center" },
});
