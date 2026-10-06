import { Text } from "@/components/ui/AppTypography";
import { useAuth } from "@/context/AuthContext";
import { useAppForeground } from "@/hooks/useAppForeground";
import { getApiErrorMessage } from "@/services/api";
import { staffSelfAttendanceService, type StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import { normalizeAttendanceRecord } from "@/services/attendance.service";
import type { AttendanceRecord } from "@/types/attendance";
import { useThemeColors } from "@/theme/ThemeProvider";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { canUnlockStaffApp } from "@/features/attendance/utils/staffAttendanceGate";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AttendanceContext = { state: StaffSelfAttendance | null; record: AttendanceRecord | null; refresh: () => Promise<void>; checkOut: () => Promise<void>; busy: boolean };
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
  const punchLock = useRef(false);
  const requestVersion = useRef(0);
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(async () => {
    if (!identity || punchLock.current) return;
    const version = ++requestVersion.current;
    try {
      const next = await staffSelfAttendanceService.get();
      if (liveIdentity.current !== identity || version !== requestVersion.current) return;
      setSnapshot({ identity, state: next }); setError(null); setNow(new Date());
    } catch (failure) {
      if (liveIdentity.current !== identity || version !== requestVersion.current) return;
      setError(getApiErrorMessage(failure));
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
  useAppForeground(() => { setNow(new Date()); void refresh(); });

  const punch = useCallback(async (kind: "checkIn" | "checkOut") => {
    if (!identity || punchLock.current) return;
    punchLock.current = true; ++requestVersion.current; setBusy(true); setError(null);
    try {
      const next = await staffSelfAttendanceService[kind]();
      if (liveIdentity.current === identity) { setSnapshot({ identity, state: next }); setNow(new Date()); }
    } catch (failure) {
      if (liveIdentity.current === identity) setError(getApiErrorMessage(failure));
      throw failure;
    } finally { punchLock.current = false; setBusy(false); }
  }, [identity]);
  const locked = enabled && !canUnlockStaffApp(state, now);
  return (
    <StaffAttendanceContext.Provider value={{ state, record, refresh, checkOut: () => punch("checkOut"), busy }}>
      {children}
      <Modal visible={locked} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => {}}>
        <SafeAreaView style={[styles.screen, { backgroundColor: Colors.bg }]}>
          <View style={[styles.card, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <Text style={[styles.title, { color: Colors.heading }]}>Check in to start your day</Text>
            <Text style={[styles.copy, { color: Colors.text2 }]}>Your app details will be available after your check-in is confirmed.</Text>
            {!state && !error ? <ActivityIndicator color={Colors.primary} /> : null}
            {state ? <>
              {state.shift_start && state.shift_end ? <Text style={[styles.shift, { color: Colors.heading }]}>Your shift: {displayTime(state.shift_start)} – {displayTime(state.shift_end)}</Text> : null}
              <Text style={[styles.copy, { color: Colors.text2 }]}>{state.blocked_reason ?? "Tap Check In to record the current time."}</Text>
            </> : null}
            {error ? <Text accessibilityRole="alert" style={[styles.copy, { color: Colors.error }]}>{error}</Text> : null}
            <TouchableOpacity accessibilityRole="button" disabled={busy || !state?.can_check_in} onPress={() => void punch("checkIn").catch(() => undefined)}
              style={[styles.button, { backgroundColor: Colors.primary, opacity: busy || !state?.can_check_in ? 0.5 : 1 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Check In</Text>}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void refresh()} style={styles.link}><Text style={{ color: Colors.primary }}>Refresh shift and attendance</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void signOut()} style={styles.link}><Text style={{ color: Colors.text2 }}>Sign out</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </StaffAttendanceContext.Provider>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" }, copy: { fontSize: 15, lineHeight: 22 },
  shift: { fontSize: 17, fontWeight: "700" }, button: { padding: 16, borderRadius: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 17 }, link: { paddingVertical: 10, alignItems: "center" },
});
