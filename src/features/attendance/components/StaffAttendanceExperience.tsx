import { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { Text } from "@/components/ui/AppTypography";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SettingsButton, useSettingsStyles } from "@/features/settings/SettingsUI";
import { useAuth } from "@/context/AuthContext";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { getUserFullName } from "@/utils/userProfile";
import { isManagerAccount } from "@/utils/staffExperience";
import { staffAttendanceErrorMessage } from "../utils/attendanceErrors";
import type { StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import { formatAttendanceTime, parseAttendanceDateTime } from "../utils/attendanceStatus";
import { hasUnfinishedStaffShift } from "../utils/staffAttendanceGate";
import { formatAttendanceDuration } from "./AttendanceActivityDetails";
import { AttendanceBreakModal } from "./AttendanceBreakModal";
import { useStaffSelfAttendance } from "./StaffSelfAttendanceContext";
import { AttendancePunchLocations } from "./AttendancePunchLocations";

export function StaffCheckInScreen({ state, busy, refreshing, error, onCheckIn, onRetry, onSignOut }: {
  state: StaffSelfAttendance | null; busy: boolean; refreshing: boolean; error: string | null;
  onCheckIn: () => void; onRetry: () => void; onSignOut: () => void;
}) {
  const p = usePearlPalette(), ui = useSettingsStyles();
  const { user } = useAuth();
  const staff = useAppSelector(selectCurrentStaff);
  const name = (staff?.name || getUserFullName(user)).split(" ")[0];
  const hour = new Date().getHours();
  return <PearlBackground><SafeAreaView style={{ flex: 1 }}><AppStatusBar />
    <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, gap: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={ui.title}>Hi, {name}</Text><View style={[ui.icon, { backgroundColor: p.accentTint }]}><Text style={ui.title}>{name.slice(0, 2).toUpperCase()}</Text></View>
      </View>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <View style={{ width: 76, height: 76, borderRadius: 26, backgroundColor: p.accentWash, alignItems: "center", justifyContent: "center" }}><Ionicons name="location-outline" size={32} color={p.accentDeep} /></View>
        <Text style={[ui.heading, { fontSize: 28, lineHeight: 36 }]}>{hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, {name}</Text>
        <Text translate style={ui.body}>Check in to unlock today’s bookings and sales.</Text>
        <View style={[ui.formCard, { gap: 18 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text translate style={ui.muted}>Time</Text><Text style={ui.title}>{formatAttendanceTime(new Date().toISOString())}</Text></View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}><Text translate style={ui.muted}>Location</Text><Text style={[ui.title, { flex: 1, textAlign: "right" }]}>{user?.businessName || "Your salon"}</Text></View>
        </View>
        <Text translate style={ui.muted}>Your location is recorded only at check-in and check-out, to confirm you’re at the salon.</Text>
        {!!state?.blocked_reason && <Text style={ui.body}>{state.blocked_reason}</Text>}
        {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        <SettingsButton label={state ? "Check in" : "Retry connection"} loading={busy || refreshing} disabled={!!state && !state.can_check_in}
          onPress={state ? onCheckIn : onRetry} />
        {!!error && !!state && <SettingsButton label="Retry connection" secondary onPress={onRetry} disabled={busy || refreshing} />}
      </View>
      <TouchableOpacity onPress={onSignOut} disabled={busy} style={{ padding: 14, alignItems: "center" }}><Text style={ui.muted}>Not {name}? <Text translate style={{ color: p.accentDeep }}>Sign out</Text></Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView></PearlBackground>;
}

/** One attendance surface and action flow shared by staff home and the business dashboard. */
export function StaffAttendanceCard({ compact = false }: { compact?: boolean }) {
  const attendance = useStaffSelfAttendance();
  const { user } = useAuth();
  const p = usePearlPalette(), ui = useSettingsStyles();
  const [sheet, setSheet] = useState<"checkout" | "activity" | "break" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15_000); return () => clearInterval(timer); }, []);
  if (!attendance) return null;
  const state = attendance.state;
  const pending = state?.pending_checkout;
  const onBreak = state?.current_status === "ON_BREAK";
  const working = hasUnfinishedStaffShift(state) && !onBreak;
  const shiftEnd = parseAttendanceDateTime(state?.shift_end)?.getTime();
  const serverNow = parseAttendanceDateTime(state?.server_time)?.getTime();
  const overdue = working && shiftEnd !== undefined && serverNow !== undefined && serverNow > shiftEnd;
  const finished = state?.current_status === "CHECKED_OUT" || !!state?.record?.check_out;
  const received = state?.received_at ?? now;
  const seconds = (state?.total_worked_seconds ?? 0) + (working ? Math.max(0, Math.floor((now - received) / 1000)) : 0);
  const shiftSeconds = ((parseAttendanceDateTime(state?.shift_end)?.getTime() ?? 0) - (parseAttendanceDateTime(state?.shift_start)?.getTime() ?? 0)) / 1000;
  const progress = shiftSeconds > 0 ? Math.min(1, seconds / shiftSeconds) : 0;
  const status = pending || overdue ? "Checkout pending" : working ? "Working" : onBreak ? "On break" : finished ? "Checked out" : "Not checked in";
  const punch = async (kind: "checkIn" | "checkOut") => {
    setError(null);
    try {
      if (kind === "checkOut") await attendance.checkOut(pending?.attendance_id);
      else if (!pending) await attendance.checkIn();
      setSheet(null);
    } catch (failure) { setError(staffAttendanceErrorMessage(failure)); }
  };
  const action = () => {
    if (!state) { void attendance.refresh(); return; }
    if (pending) { void punch("checkOut"); return; }
    if (working) setSheet("checkout");
    else if (onBreak || state.can_check_in) void punch("checkIn");
  };
  const buttonLabel = !state ? "Refresh attendance" : pending || overdue ? "Check out" : working ? (compact ? "Check out or break" : "Check out or take a break") : onBreak ? "Check in — return from break" : finished && !state.can_check_in ? "Checked out" : "Check in";
  return <>
    <View style={[ui.formCard, { gap: compact ? 10 : 12, padding: compact ? 14 : 16, borderRadius:24 }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <View style={{ borderRadius: 20, backgroundColor: working ? p.successBg : p.warningBg, paddingHorizontal: 10, paddingVertical: 6 }}><Text translate style={{ color: working ? p.successText : p.warningText, fontSize: 12, fontWeight: "700" }}>{status}</Text></View>
        {compact ? <Text style={ui.muted}>{working ? `since ${formatAttendanceTime(state?.record?.check_in)}` : state?.shift_start ? `Shift starts ${formatAttendanceTime(state.shift_start)}` : ""}</Text>
          : <><Text style={[ui.muted,{flex:1}]}>{working ? `since ${formatAttendanceTime(state?.record?.check_in)}` : ""}</Text><TouchableOpacity onPress={() => setSheet("activity")} style={{ padding: 8 }}><Text translate style={{ color: p.accentDeep, fontSize: 13, fontWeight: "700" }}>Activity</Text></TouchableOpacity></>}
      </View>
      {pending ? <View style={{gap:8}}><Text translate style={ui.title}>Complete previous checkout</Text><Text style={ui.body}>Your shift from {pending.date} is still open. Today’s check-in is blocked until you complete checkout.</Text><Text style={ui.muted}>{pending.scheduled_end ? `Checkout will be saved at the assigned schedule end: ${formatAttendanceTime(pending.scheduled_end)}.` : pending.blocked_reason || "Your previous day’s assigned schedule is unavailable. Ask your manager to correct it, then refresh."}</Text></View> : compact ? <Text style={ui.body}>{working ? `You’re on the clock${user?.businessName ? ` · ${user.businessName}` : ""}` : isManagerAccount(user) ? "Check in to start your shift. You can still approve your team’s check-ins." : "Check in to start your shift."}</Text> : <>
        <View style={{ alignItems: "center", paddingVertical: 6 }}>
          <View style={{ width: 140, height: 140, justifyContent: "center", alignItems: "center" }}>
            <Svg width={140} height={140} style={{ position: "absolute" }}><Circle cx={70} cy={70} r={64} stroke={p.accentWash} strokeWidth={12} fill={p.fieldFocus} /><Circle cx={70} cy={70} r={64} stroke={p.accent} strokeWidth={12} fill="none" strokeDasharray={`${402.124 * progress} 402.124`} strokeLinecap="round" rotation={-90} origin="70,70" /></Svg>
            <Text style={[ui.heading, { fontSize: 24 }]}>{formatAttendanceDuration(seconds)}</Text><Text translate style={ui.muted}>worked today</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {[["Checked in", formatAttendanceTime(state?.record?.check_in)], ["Breaks", formatAttendanceDuration(state?.total_break_seconds ?? 0)], ["Shift ends", formatAttendanceTime(state?.shift_end)]].map(([label, value]) => <View key={label} style={{ alignItems: "center", gap: 4 }}><Text translate style={ui.muted}>{label}</Text><Text style={ui.title}>{value}</Text></View>)}
        </View>
        {!!user?.businessName && <Text style={[ui.muted, { textAlign: "center" }]}>{user.businessName}</Text>}
      </>}
      <AttendancePunchLocations record={attendance.record} />
      {overdue && !pending && <Text style={ui.muted}>Your shift from {state?.date} is still open. Check out before starting a new shift.</Text>}
      <SettingsButton label={buttonLabel} secondary={working && !pending} loading={attendance.busy} disabled={!!pending?.blocked_reason || (finished && !state?.can_check_in)} onPress={action} />
      {!!pending && <SettingsButton label="Refresh attendance" secondary disabled={attendance.busy || attendance.refreshing} onPress={() => void attendance.refresh()} />}
      {!!(error || attendance.error) && <Text accessibilityRole="alert" style={ui.error}>{error || attendance.error}</Text>}
    </View>
    <BottomSheet pearlStyle centered={false} visible={sheet === "checkout"} title="Leaving the floor?" onClose={() => { if (!attendance.busy) setSheet(null); }}>
      <View style={{ gap: 12 }}>
        {!overdue && <TouchableOpacity disabled={attendance.busy} onPress={() => setSheet("break")} style={[ui.formCard, { flexDirection: "row", alignItems: "center" }]}><Ionicons name="cafe-outline" size={24} color={p.accentDeep} /><View style={{ flex: 1, gap: 4 }}><Text translate style={ui.title}>Take a break</Text><Text translate style={ui.muted}>Pause your time and come back</Text></View><Ionicons name="chevron-forward" size={18} color={p.muted} /></TouchableOpacity>}
        <TouchableOpacity disabled={attendance.busy} onPress={() => void punch("checkOut")} style={[ui.formCard, { flexDirection: "row", alignItems: "center" }]}><Ionicons name="log-out-outline" size={24} color={p.accentDeep} /><View style={{ flex: 1, gap: 4 }}><Text translate style={ui.title}>Done for the day</Text><Text style={ui.muted}>Final check-out · {formatAttendanceDuration(seconds)} worked</Text></View><Ionicons name="chevron-forward" size={18} color={p.muted} /></TouchableOpacity>
        {!!error && <Text style={ui.error}>{error}</Text>}
        <TouchableOpacity disabled={attendance.busy} onPress={() => setSheet(null)} style={{ alignItems: "center", padding: 12 }}><Text translate style={{ color: p.accentDeep, fontWeight: "700" }}>Cancel</Text></TouchableOpacity>
      </View>
    </BottomSheet>
    <BottomSheet pearlStyle centered={false} visible={sheet === "activity"} title="Today’s activity" onClose={() => setSheet(null)}>
      <View style={{ gap: 18, paddingBottom: 12 }}>
        {(state?.sessions ?? []).map((session, index) => <View key={`${session.start_time}:${index}`} style={{ flexDirection: "row", gap: 12 }}><Ionicons name={session.type === "BREAK" ? "cafe-outline" : "checkmark-circle-outline"} size={22} color={p.accent} /><View style={{ gap: 4 }}><Text style={ui.title}>{session.type === "BREAK" ? "Break started" : index === 0 ? "Checked in" : "Returned from break"} · {formatAttendanceTime(session.start_time)}</Text>{!!session.end_time && <Text style={ui.muted}>Until {formatAttendanceTime(session.end_time)}</Text>}</View></View>)}
        {!state?.sessions?.length && <Text translate style={ui.muted}>No attendance activity yet.</Text>}
        {!!state?.shift_end && <View style={{ flexDirection: "row", gap: 12 }}><Ionicons name="time-outline" size={22} color={p.muted} /><View><Text style={ui.title}>Shift ends · {formatAttendanceTime(state.shift_end)}</Text><Text translate style={ui.muted}>Scheduled</Text></View></View>}
      </View>
    </BottomSheet>
    <AttendanceBreakModal fullPage visible={sheet === "break"} state={state} busy={attendance.busy} onClose={() => setSheet(null)} onSubmit={attendance.startBreak} />
  </>;
}
