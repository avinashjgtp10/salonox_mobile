import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, ScrollView, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { KeyboardAwareFormHandle } from "@/components/ui/KeyboardAwareForm";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { StaffSelfAttendance } from "@/services/staffSelfAttendance.service";
import type { StartBreakRequest } from "@/types/attendance";
import { getApiErrorMessage } from "@/services/api";
import { formatAttendanceTime, parseAttendanceDateTime } from "../utils/attendanceStatus";
import { formatAttendanceDuration } from "./AttendanceActivityDetails";
import { useStaffSelfAttendance } from "./StaffAttendanceGate";

// Inline list, not a nested native Modal: opening a Modal from inside this
// popup (right after the Check Out confirmation Modal closes) often never
// appeared, so the time could not be picked.
function TimeSelect({ label, value, options, open, disabled, onToggle, onSelect }: {
  label: string; value: number; options: number[]; open: boolean; disabled: boolean;
  onToggle: () => void; onSelect: (value: number) => void;
}) {
  const Colors = useThemeColors();
  const text = (time: number) => Number.isFinite(time) ? formatAttendanceTime(new Date(time).toISOString()) : "Select time";
  return <View style={{ gap: 8 }}>
    <Text style={{ color: Colors.heading, fontWeight: "700" }}>{label}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${label}, ${text(value)}`} accessibilityState={{ expanded: open, disabled }}
      disabled={disabled} onPress={onToggle}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: open ? Colors.primary : Colors.border, backgroundColor: Colors.bg2 }}>
      <Text style={{ color: Number.isFinite(value) ? Colors.text : Colors.text2, fontSize: 15 }}>{text(value)}</Text>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={Colors.text2} />
    </TouchableOpacity>
    {open ? <View style={{ maxHeight: 200, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, overflow: "hidden" }}>
      {options.length === 0 ? <Text style={{ color: Colors.text2, padding: 14 }}>No times available in your shift.</Text> : (
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
          {options.map(option => {
            const selected = option === value;
            return <TouchableOpacity key={option} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onSelect(option)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: selected ? Colors.primary : "transparent" }}>
              <Text style={{ color: selected ? "#FFFFFF" : Colors.text, fontSize: 15 }}>{text(option)}</Text>
              {selected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
            </TouchableOpacity>;
          })}
        </ScrollView>
      )}
    </View> : null}
  </View>;
}

export function AttendanceBreakModal({ visible, state, busy, onClose, onSubmit }: {
  visible: boolean; state: StaffSelfAttendance | null; busy: boolean;
  onClose: () => void; onSubmit: (body: StartBreakRequest) => Promise<void>;
}) {
  const Colors = useThemeColors();
  const refreshAttendance = useStaffSelfAttendance()?.refresh;
  const [refreshing, setRefreshing] = useState(false);
  const [from, setFrom] = useState(Number.NaN), [to, setTo] = useState(Number.NaN);
  const [openedAt, setOpenedAt] = useState(Number.NaN);
  const [active, setActive] = useState<"from" | "to" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const formRef = useRef<KeyboardAwareFormHandle>(null);
  const noteFieldRef = useRef<View>(null);
  const request = useRef<StartBreakRequest | null>(null);
  const submitting = useRef(false);
  const initializedWindow = useRef<string | null>(null);
  // PostgreSQL punches can be "2026-10-09 02:44:27.824+00". Hermes
  // needs the same explicit ISO normalization used by attendance labels.
  const timestamp = (value: string | null | undefined) => parseAttendanceDateTime(value)?.getTime() ?? Number.NaN;
  const shiftStart = timestamp(state?.shift_start);
  const shiftEnd = timestamp(state?.shift_end);
  const lastWork = state?.sessions?.filter(item => item.type === "WORK").at(-1)?.start_time ?? state?.record?.check_in;
  const lastCheckIn = timestamp(lastWork);
  const lowerBound = Math.max(shiftStart, lastCheckIn);
  const hasShift = Number.isFinite(shiftStart) && Number.isFinite(shiftEnd) && shiftEnd > shiftStart;
  useEffect(() => {
    if (!visible || !refreshAttendance) return;
    let active = true;
    setRefreshing(true);
    void refreshAttendance().finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [visible, refreshAttendance]);
  useEffect(() => {
    if (!visible) { initializedWindow.current = null; return; }
    if (!state) return;
    const windowKey = `${state.date}:${shiftStart}:${shiftEnd}:${lastCheckIn}`;
    if (initializedWindow.current === windowKey) return;
    const now = (parseAttendanceDateTime(state.server_time)?.getTime() ?? Number.NaN) + Math.max(0, Date.now() - (state.received_at ?? Date.now()));
    setOpenedAt(now); setFrom(now);
    setTo(Math.min(Math.ceil((now + 30 * 60000) / 300000) * 300000, shiftEnd));
    setActive(null); setError(null);
    if (initializedWindow.current === null) setNote("");
    request.current = null;
    initializedWindow.current = windowKey;
  }, [visible, state, shiftStart, shiftEnd, lastCheckIn]);
  const slots: number[] = [];
  if (Number.isFinite(lowerBound) && Number.isFinite(shiftEnd)) {
    for (let value = Math.ceil(lowerBound / 300000) * 300000; value <= shiftEnd; value += 300000) slots.push(value);
  }
  const optionsFor = (field: "from" | "to") => [...new Set([...(field === "from" ? [openedAt] : [shiftEnd, to]), ...slots])]
    .filter(item => Number.isFinite(item) && item >= lowerBound && item <= shiftEnd && (field === "from" ? item < shiftEnd : item > from))
    .sort((a, b) => a - b);
  const availabilityError = !hasShift ? "No working shift is saved for this attendance day. Ask your manager to save its working hours, then reopen this window."
    : !Number.isFinite(lastCheckIn) ? "Your check-in time could not be read. Close this window and refresh attendance."
    : openedAt < shiftStart ? `Your shift starts at ${formatAttendanceTime(state?.shift_start)}. You can take a break once it starts.`
    : openedAt >= shiftEnd ? "Your scheduled shift has ended. Use Final Checkout to finish your attendance." : null;
  const invalid = Boolean(availabilityError) || !Number.isFinite(from) || !Number.isFinite(to) || to <= from || from < lowerBound || to > shiftEnd;
  const disabled = busy || refreshing;
  const close = () => { if (!busy && !submitting.current) { Keyboard.dismiss(); onClose(); } };
  const submit = async () => {
    if (disabled || submitting.current || invalid) return;
    Keyboard.dismiss();
    submitting.current = true; setError(null); setActive(null);
    const start = new Date(from).toISOString(), end = new Date(to).toISOString();
    if (!request.current || request.current.from !== start || request.current.to !== end || request.current.note !== note.trim()) request.current = {
      from: start, to: end, note: note.trim(), request_id: `break-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    try { await onSubmit(request.current); onClose(); }
    catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { submitting.current = false; }
  };
  return <BottomSheet centered visible={visible} keyboardAwareFormRef={formRef} title="Take a Break" subtitle="Temporarily leave your shift. Check in when you return." onClose={close}>
    <View style={{ gap: 18 }}>
      {refreshing ? <ActivityIndicator accessibilityLabel="Refreshing shift times" color={Colors.primary} /> : hasShift ? <Text style={{ color: Colors.text2 }}>Shift: {formatAttendanceTime(state?.shift_start)} – {formatAttendanceTime(state?.shift_end)}</Text> : null}
      <TimeSelect label="From" value={from} options={optionsFor("from")} open={active === "from"} disabled={disabled || Boolean(availabilityError)}
        onToggle={() => setActive(current => current === "from" ? null : "from")}
        onSelect={value => { setFrom(value); if (to <= value) setTo(Math.min(value + 30 * 60000, shiftEnd)); setActive(null); }} />
      <TimeSelect label="To — Expected return" value={to} options={optionsFor("to")} open={active === "to"} disabled={disabled || Boolean(availabilityError)}
        onToggle={() => setActive(current => current === "to" ? null : "to")}
        onSelect={value => { setTo(value); setActive(null); }} />
      <Text style={{ color: Colors.heading, fontWeight: "700" }}>Break Duration: {Number.isFinite(to - from) && to > from ? formatAttendanceDuration((to - from) / 1000) : "Select a later return time"}</Text>
      <View ref={noteFieldRef} collapsable={false} style={{ gap: 8 }}>
        <Text style={{ color: Colors.heading, fontWeight: "700" }}>Note (optional)</Text>
        <TextInput accessibilityLabel="Break note" placeholder="Add a reason or a note for your manager" placeholderTextColor={Colors.text2} value={note} onChangeText={setNote}
          onFocus={() => { setActive(null); formRef.current?.revealField(noteFieldRef.current); }}
          onTouchEnd={() => formRef.current?.revealField(noteFieldRef.current)}
          editable={!busy} multiline maxLength={500} textAlignVertical="top" style={{ color: Colors.text, backgroundColor: Colors.bg2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, minHeight: 88 }} />
      </View>
      <Text style={{ color: Colors.text2, fontSize: 13 }}>Actual break time starts when you tap Start Break and ends when you check in again. Your scheduled shift stays unchanged.</Text>
      {!refreshing && invalid ? <Text accessibilityRole="alert" style={{ color: Colors.error }}>{availabilityError ?? "Select a valid period within your saved shift and after your current check-in."}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: Colors.error }}>{error}</Text> : null}
      <TouchableOpacity accessibilityRole="button" disabled={disabled || invalid} onPress={() => void submit()} style={{ backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: "center", opacity: disabled || invalid ? 0.5 : 1 }}>
        {disabled ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Start Break</Text>}
      </TouchableOpacity>
    </View>
  </BottomSheet>;
}
