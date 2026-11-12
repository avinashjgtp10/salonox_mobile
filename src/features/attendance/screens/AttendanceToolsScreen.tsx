import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Text } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareForm } from "@/components/ui/KeyboardAwareForm";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import { attendanceService } from "@/services/attendance.service";
import { attendanceDeviceService as devicesApi, type AttendanceDevice, type PendingAttendanceDevice, type AttendanceDeviceMapping } from "@/services/attendanceDevice.service";
import { staffService } from "@/services/staff.service";
import { getApiErrorMessage } from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { pearlGradients } from "@/components/auth/pearl/tokens";
import { emitRealtimeEntityChanged } from "@/services/realtimeEvents";
import { realtimeSocket } from "@/services/realtimeSocket";
import type { AttendanceSettings, UpdateAttendanceSettingsRequest } from "@/types/attendance";
import type { StaffMember } from "@/data/teamData";

const numberFields = [
  ["gracePeriodMinutes", "Grace period (minutes)"],
  ["minFullDayHours", "Minimum hours for full day"],
  ["halfDayThresholdMinutes", "Minimum minutes for half day"],
  ["thresholdHours", "Late arrival threshold (hours)"],
  ["halfDayDeductionAmount", "Half-day deduction amount"],
  ["attendanceBonus", "Attendance bonus"],
  ["commissionThresholdDays", "Commission threshold (days)"],
] as const;
type NumberField = typeof numberFields[number][0];
type RuleForm = Record<NumberField, string> & { workStartTime: string; workEndTime: string };
const toForm = (settings: AttendanceSettings): RuleForm => Object.fromEntries([
  ...numberFields.map(([key]) => [key, String(settings[key])]),
  ["workStartTime", settings.workStartTime?.slice(0, 5) ?? "09:00"],
  ["workEndTime", settings.workEndTime?.slice(0, 5) ?? "18:00"],
]) as RuleForm;

export default function AttendanceToolsScreen() {
  const user = useAppSelector(selectCurrentUser);
  const allowed = ["salon_owner", "admin"].includes(user?.role ?? "");
  const colors = usePearlColors();
  const [tab, setTab] = useState<"Rules" | "Devices" | "Export">("Rules");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [pending, setPending] = useState<PendingAttendanceDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<AttendanceDevice | null>(null);
  const [mappings, setMappings] = useState<AttendanceDeviceMapping[]>([]);
  const [mappingStaff, setMappingStaff] = useState("");
  const [pin, setPin] = useState("");
  const [deviceForm, setDeviceForm] = useState<{ mode: "add" | "connect" | "edit"; serial: string; name: string; location: string; id?: string } | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));

  const loadStaff = useCallback(async () => {
    const members: StaffMember[] = [];
    for (let page = 1; ; page++) {
      const result = await staffService.getStaff({ page, limit: 100 });
      members.push(...result.staffMembers);
      if (!result.pagination.hasMore || result.staffMembers.length === 0) break;
    }
    setStaff(members);
  }, []);
  const loadDevices = useCallback(async () => {
    const [list, discovered] = await Promise.all([devicesApi.list(), devicesApi.pending()]);
    setDevices(list); setPending(discovered);
  }, []);
  useEffect(() => {
    if (!allowed || tab !== "Devices") return;
    const socket = realtimeSocket.activeSocket;
    const onChanged = (event?: { refresh?: boolean; device_id?: string; last_seen?: string; last_ip?: string }) => {
      if (event?.device_id && event.last_seen) {
        setDevices(list => list.map(device => device.id === event.device_id
          ? { ...device, last_seen: event.last_seen!, last_ip: event.last_ip ?? device.last_ip } : device));
      } else {
        void loadDevices().catch(failure => setError(getApiErrorMessage(failure)));
      }
    };
    socket?.on("devices:changed", onChanged);
    return () => { socket?.off("devices:changed", onChanged); };
  }, [allowed, tab, loadDevices]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true); setError("");
    const load = async () => {
      if (tab === "Rules") {
        const result = await attendanceService.getSettings();
        if (active) { setSettings(result); setForm(toForm(result)); }
        await loadStaff();
      } else if (tab === "Devices") {
        await Promise.all([loadDevices(), loadStaff()]);
      }
    };
    void load().catch(failure => { if (active) setError(getApiErrorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed, tab, loadDevices, loadStaff]);

  const run = async (action: () => Promise<void>) => {
    if (!allowed || actionLock.current) return;
    actionLock.current = true;
    setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { actionLock.current = false; setBusy(false); }
  };
  const toggleHalfDayRule = () => {
    if (!settings || loading || actionLock.current) return;
    const previous = settings.active;
    const active = !previous;
    void run(async () => {
      setSettings(current => current ? { ...current, active } : current);
      try {
        const result = await attendanceService.updateSettings({ active });
        setSettings(current => current ? { ...current, active: result.settings.active } : current);
        setMessage(result.settings.active ? "Half-day rule enabled." : "Half-day rule disabled.");
      } catch (failure) {
        setSettings(current => current ? { ...current, active: previous } : current);
        throw failure;
      }
    });
  };
  const saveRules = async () => {
    if (!settings || !form) return;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(form.workStartTime) || !timePattern.test(form.workEndTime)) throw new Error("Enter shift times in HH:MM format, for example 09:00 or 18:30.");
    const numbers = {} as Record<NumberField, number>;
    for (const [key, label] of numberFields) {
      const value = Number(form[key]);
      if (!form[key].trim() || !Number.isFinite(value) || value < 0) throw new Error(`Enter a valid non-negative value for ${label.toLowerCase()}.`);
      numbers[key] = value;
    }
    if (numbers.halfDayThresholdMinutes > numbers.minFullDayHours * 60) throw new Error("Minimum half-day hours cannot exceed full-day hours.");
    if (!Number.isInteger(numbers.gracePeriodMinutes) || !Number.isInteger(numbers.commissionThresholdDays)) throw new Error("Grace minutes and commission days must be whole numbers.");
    if (settings.active && numbers.thresholdHours <= 0) throw new Error("Late arrival threshold must be greater than zero when the rule is enabled.");
    if (settings.staffScope === "selected" && !settings.selectedStaffIds.length) throw new Error("Select at least one staff member for this rule.");
    const payload: UpdateAttendanceSettingsRequest = {
      ...numbers, workStartTime: form.workStartTime, workEndTime: form.workEndTime,
      active: settings.active, staffScope: settings.staffScope, selectedStaffIds: settings.selectedStaffIds,
    };
    const result = await attendanceService.updateSettings(payload);
    setSettings(result.settings); setForm(toForm(result.settings)); setMessage("Attendance rules saved.");
  };
  const selectDevice = async (device: AttendanceDevice) => {
    const result = await devicesApi.mappings(device.id);
    setSelectedDevice(device); setMappings(result); setMappingStaff(""); setPin("");
  };
  const saveDevice = async () => {
    if (!deviceForm) return;
    const name = deviceForm.name.trim(), serial = deviceForm.serial.trim();
    if (!name || !serial) throw new Error("Enter a device name and serial number.");
    const body = { name, location: deviceForm.location.trim() };
    if (deviceForm.mode === "edit" && deviceForm.id) await devicesApi.update(deviceForm.id, body);
    else if (deviceForm.mode === "connect") await devicesApi.connect(serial, body);
    else await devicesApi.add({ ...body, serial_no: serial });
    setDeviceForm(null); setSelectedDevice(null); await loadDevices(); setMessage("Device saved.");
  };
  const exportCsv = async () => {
    const y = Number(year), m = Number(month);
    if (!Number.isInteger(y) || y < 2000 || y > 9999 || !Number.isInteger(m) || m < 1 || m > 12) throw new Error("Enter a valid year and month (1–12).");
    if (!await Sharing.isAvailableAsync()) throw new Error("File sharing is unavailable on this device. Please use web attendance export.");
    const csv = await attendanceService.exportCSV(y, m);
    const file = new File(Paths.cache, `attendance-${y}-${String(m).padStart(2, "0")}.csv`);
    file.create({ overwrite: true }); file.write(csv);
    try { await Sharing.shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text", dialogTitle: "Export attendance" }); }
    finally { file.delete(); }
  };

  if (!allowed) return <Redirect href="/team/attendance" />;
  const button = (label: string, onPress: () => void, danger = false, primary = false) => (
    <TouchableOpacity accessibilityRole="button" disabled={busy || loading} onPress={onPress} style={[styles.button, { borderColor: colors.border, backgroundColor: danger ? colors.errorBg : colors.bg2, opacity: busy || loading ? 0.5 : 1 }]}>
      {primary ? <LinearGradient colors={pearlGradients.primary} style={StyleSheet.absoluteFill} /> : null}
      <Text translate style={{ color: danger ? colors.error : primary ? colors.onPrimary : colors.primaryText, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
  const staffChoices = (multiple: boolean) => staff.filter(member => multiple || !mappings.some(mapping => mapping.staff_id === member.id)).map(member => {
    const chosen = multiple ? settings?.selectedStaffIds.includes(member.id) : mappingStaff === member.id;
    return <TouchableOpacity key={member.id} disabled={busy || loading} style={[styles.button, { backgroundColor: chosen ? colors.primary : colors.bg2 }]} onPress={() => {
      if (multiple && settings) setSettings({ ...settings, selectedStaffIds: chosen ? settings.selectedStaffIds.filter(id => id !== member.id) : [...settings.selectedStaffIds, member.id] });
      else setMappingStaff(member.id);
    }}><Text style={{ color: chosen ? "#fff" : colors.text2 }}>{chosen ? "✓ " : ""}{member.name}</Text></TouchableOpacity>;
  });

  return <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
    <AppStatusBar />
    <View style={styles.header}><AppBackButton /><Text translate style={[styles.title, { color: colors.heading }]}>Attendance tools</Text></View>
    <View style={[styles.tabs, { borderColor: colors.border, backgroundColor: colors.card }]}>{(["Rules", "Devices", "Export"] as const).map(item => <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: tab === item, disabled: busy }} key={item} disabled={busy} style={[styles.tab, { backgroundColor: tab === item ? colors.primary : "transparent" }]} onPress={() => { setTab(item); setError(""); setMessage(""); setDeviceForm(null); setSelectedDevice(null); }}><Ionicons name={item === "Rules" ? "options-outline" : item === "Devices" ? "hardware-chip-outline" : "download-outline"} size={16} color={tab === item ? colors.onPrimary : colors.text2} /><Text translate style={{ color: tab === item ? colors.onPrimary : colors.text2, fontWeight: "700", fontSize: 13 }}>{item}</Text></TouchableOpacity>)}</View>
    <KeyboardAwareForm autoReveal>
    <View style={styles.content}>
      {loading || busy ? <ActivityIndicator color={colors.primaryText} /> : null}
      {error ? <Text translate accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text> : null}
      {error && !busy && !loading ? button("Retry loading", () => void run(async () => {
        if (tab === "Rules") { const result = await attendanceService.getSettings(); setSettings(result); setForm(toForm(result)); await loadStaff(); }
        if (tab === "Devices") await Promise.all([loadDevices(), loadStaff()]);
      })) : null}
      {message ? <Text translate style={{ color: colors.success }}>{message}</Text> : null}
      {tab === "Rules" && settings && form ? <>
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text translate style={[styles.sectionTitle, { color: colors.heading }]}>Shift & attendance rules</Text>
        <Text translate style={{ color: colors.text2 }}>Manage the attendance settings shared with your web app.</Text>
        <StaffTextField label="Shift start (HH:MM)" value={form.workStartTime} editable={!busy && !loading} onChangeText={value => setForm({ ...form, workStartTime: value })} />
        <StaffTextField label="Shift end (HH:MM)" value={form.workEndTime} editable={!busy && !loading} onChangeText={value => setForm({ ...form, workEndTime: value })} />
        </View>
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text translate style={[styles.sectionTitle, { color: colors.heading }]}>Attendance & payroll</Text>
        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityLabel="Apply half-day rule for late arrivals"
          accessibilityState={{ checked: settings.active, disabled: busy || loading }}
          disabled={busy || loading}
          onPress={toggleHalfDayRule}
          style={[styles.row, { minHeight: 52 }]}
        >
          <Text translate style={{ color: colors.heading, flex: 1 }}>Apply half-day rule for late arrivals</Text>
          <View pointerEvents="none">
            <Switch accessible={false} disabled={busy || loading} value={settings.active}
              trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
          </View>
        </TouchableOpacity>
        {numberFields.map(([key, label]) => <StaffTextField key={key} label={label} keyboardType="decimal-pad" value={form[key]} editable={!busy && !loading} onChangeText={value => setForm({ ...form, [key]: value })} />)}
        </View>
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text translate style={[styles.sectionTitle, { color: colors.heading }]}>Apply late arrival rule to</Text>
        <View style={styles.row}>{button(settings.staffScope === "all" ? "✓ All staff" : "All staff", () => setSettings({ ...settings, staffScope: "all" }))}{button(settings.staffScope === "selected" ? "✓ Selected staff" : "Selected staff", () => setSettings({ ...settings, staffScope: "selected" }))}</View>
        {settings.staffScope === "selected" ? staffChoices(true) : null}
        </View>
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text translate style={[styles.sectionTitle, { color: colors.heading }]}>Staff visibility</Text>
          <View style={styles.row}>
            <Text translate style={{ flex: 1, color: colors.heading }}>Show only checked-in staff</Text>
            <Switch accessibilityLabel="Show only checked-in staff" value={settings.requireCheckinForVisibility ?? false} disabled={busy || loading}
              trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.onPrimary}
              onValueChange={value => void run(async () => {
                const result = await attendanceService.updateSettings({ requireCheckinForVisibility: value });
                setSettings(current => current ? { ...current, requireCheckinForVisibility: result.settings.requireCheckinForVisibility } : current);
                emitRealtimeEntityChanged({ entity: "attendance" });
                setMessage("Staff visibility updated.");
              })} />
          </View>
          <Text translate style={{ color: colors.text2, lineHeight: 20 }}>Only checked-in staff appear as available in the booking calendar. This setting saves immediately.</Text>
        </View>
        {button("Save attendance rules", () => void run(saveRules), false, true)}
      </> : null}
      {tab === "Devices" ? <>
        <Text translate style={{ color: colors.text2 }}>Connect a biometric device and link its employee PINs to your staff.</Text>
        <View style={styles.row}>{button("Refresh devices", () => void run(loadDevices))}{button("Register device", () => setDeviceForm({ mode: "add", serial: "", name: "", location: "" }))}</View>
        {deviceForm ? <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text translate style={{ color: colors.heading }}>{deviceForm.mode === "edit" ? "Edit device" : deviceForm.mode === "add" ? "Register device" : "Connect device"}</Text>
          <StaffTextField label="Serial number" editable={deviceForm.mode === "add" && !busy} value={deviceForm.serial} onChangeText={serial => setDeviceForm({ ...deviceForm, serial })} />
          <StaffTextField label="Device name" editable={!busy} value={deviceForm.name} onChangeText={name => setDeviceForm({ ...deviceForm, name })} />
          <StaffTextField label="Location (optional)" editable={!busy} value={deviceForm.location} onChangeText={location => setDeviceForm({ ...deviceForm, location })} />
          <View style={styles.row}>{button("Save device", () => void run(saveDevice), false, true)}{button("Cancel", () => setDeviceForm(null))}</View>
        </View> : null}
        {pending.length ? <Text translate style={{ color: colors.heading }}>Discovered devices</Text> : null}
        {pending.map(device => <View key={device.sn} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}><Text style={{ color: colors.text2 }}>{device.sn}</Text><Text style={{ color: colors.text2 }}>IP: {device.ip}</Text>{button("Connect", () => setDeviceForm({ mode: "connect", serial: device.sn, name: "", location: "" }))}</View>)}
        {!loading && !devices.length ? <Text translate style={{ color: colors.text2 }}>No devices registered yet.</Text> : null}
        {devices.map(device => <View key={device.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <DeviceConnectionStatus lastSeen={device.last_seen} />
          <Text style={{ color: colors.heading, fontWeight: "700" }}>{device.name}</Text><Text style={{ color: colors.text2 }}>{device.serial_no} · {device.is_active ? "Active" : "Inactive"}{device.location ? ` · ${device.location}` : ""}</Text>
          <Text style={{ color: colors.text2 }}>{device.last_seen ? `Last seen: ${new Date(device.last_seen).toLocaleString()}` : "Never connected"}</Text>{device.last_ip ? <Text style={{ color: colors.text2 }}>IP: {device.last_ip}</Text> : null}<View style={styles.row}>{button("Staff PINs", () => void run(() => selectDevice(device)))}{button("Edit", () => setDeviceForm({ mode: "edit", id: device.id, serial: device.serial_no, name: device.name, location: device.location ?? "" }))}{button(device.is_active ? "Deactivate" : "Activate", () => void run(async () => { await devicesApi.update(device.id, { is_active: !device.is_active }); await loadDevices(); }))}</View>
          {button("Remove device", () => Alert.alert("Remove device?", `Remove ${device.name} and its staff PIN mappings?`, [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void run(async () => { await devicesApi.remove(device.id); if (selectedDevice?.id === device.id) setSelectedDevice(null); await loadDevices(); }) }]), true)}
        </View>)}
        {selectedDevice ? <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={{ color: colors.heading }}>Staff PINs · {selectedDevice.name}</Text>
          {!mappings.length ? <Text translate style={{ color: colors.text2 }}>No staff linked yet.</Text> : null}
          {mappings.map(mapping => <View key={mapping.id}><Text style={{ color: colors.text2 }}>{mapping.staff_name ?? staff.find(item => item.id === mapping.staff_id)?.name ?? "Staff member"} · PIN {mapping.pin}</Text>{button("Remove PIN", () => Alert.alert("Remove staff PIN?", "This staff member's punches will no longer be linked from this device.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void run(async () => { await devicesApi.removeMapping(selectedDevice.id, mapping.id); await selectDevice(selectedDevice); }) }]), true)}</View>)}
          <Text translate style={{ color: colors.heading }}>Select staff member</Text>{staffChoices(false)}
          <StaffTextField label="Device employee PIN" keyboardType="number-pad" editable={!busy} value={pin} onChangeText={setPin} />
          {button("Link staff PIN", () => void run(async () => {
            if (!mappingStaff || !/^\d+$/.test(pin.trim())) throw new Error("Select a staff member and enter their numeric device PIN.");
            await devicesApi.addMapping(selectedDevice.id, mappingStaff, pin.trim()); await selectDevice(selectedDevice); setMessage("Staff PIN linked.");
          }))}
          {button("Close staff PINs", () => setSelectedDevice(null))}
        </View> : null}
      </> : null}
      {tab === "Export" ? <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Ionicons name="document-text-outline" size={32} color={colors.primaryText} />
        <Text translate style={[styles.sectionTitle, { color: colors.heading }]}>Monthly attendance report</Text>
        <Text translate style={{ color: colors.text2 }}>Export monthly attendance as a CSV file to share or save.</Text>
        <StaffTextField label="Year" keyboardType="number-pad" editable={!busy} value={year} onChangeText={setYear} maxLength={4} />
        <StaffTextField label="Month (1–12)" keyboardType="number-pad" editable={!busy} value={month} onChangeText={setMonth} maxLength={2} />
        {button("Export CSV", () => void run(exportCsv), false, true)}
      </View> : null}
    </View>
    </KeyboardAwareForm>
  </SafeAreaView></PearlBackground>;
}

function DeviceConnectionStatus({ lastSeen }: { lastSeen: string | null }) {
  const colors = usePearlColors();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const online = lastSeen !== null && now - new Date(lastSeen).getTime() < 120_000;
  return <Text translate style={{ color: online ? colors.success : colors.text2, fontSize: 12, fontWeight: "700" }}>{online ? "Online" : "Offline"}</Text>;
}

const styles = StyleSheet.create({
  header: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  tabs: { flexDirection: "row", marginHorizontal: 16, padding: 4, borderRadius: 18, borderWidth: 1 },
  tab: { flex: 1, minHeight: 46, flexDirection: "row", justifyContent: "center", gap: 6, alignItems: "center", borderRadius: 14 },
  button: { minHeight: 48, borderWidth: 1, overflow: "hidden", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, alignItems: "center" },
  card: { borderWidth: 1, padding: 16, borderRadius: 22, gap: 16 },
});
