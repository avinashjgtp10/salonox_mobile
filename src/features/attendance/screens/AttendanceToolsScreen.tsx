import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Text } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import { attendanceService } from "@/services/attendance.service";
import { attendanceDeviceService as devicesApi, type AttendanceDevice, type PendingAttendanceDevice, type AttendanceDeviceMapping } from "@/services/attendanceDevice.service";
import { staffService } from "@/services/staff.service";
import { getApiErrorMessage } from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
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
  const colors = useThemeColors();
  const [tab, setTab] = useState<"Rules" | "Devices" | "Export">("Rules");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
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
    if (!allowed || busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { setBusy(false); }
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
  const button = (label: string, onPress: () => void, danger = false) => (
    <TouchableOpacity disabled={busy || loading} onPress={onPress} style={[styles.button, { backgroundColor: danger ? colors.errorBg : colors.bg2, opacity: busy || loading ? 0.5 : 1 }]}>
      <Text style={{ color: danger ? colors.error : colors.primaryDark, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
  const staffChoices = (multiple: boolean) => staff.map(member => {
    const chosen = multiple ? settings?.selectedStaffIds.includes(member.id) : mappingStaff === member.id;
    return <TouchableOpacity key={member.id} disabled={busy || loading} style={[styles.button, { backgroundColor: chosen ? colors.primary : colors.bg2 }]} onPress={() => {
      if (multiple && settings) setSettings({ ...settings, selectedStaffIds: chosen ? settings.selectedStaffIds.filter(id => id !== member.id) : [...settings.selectedStaffIds, member.id] });
      else setMappingStaff(member.id);
    }}><Text style={{ color: chosen ? "#fff" : colors.text2 }}>{chosen ? "✓ " : ""}{member.name}</Text></TouchableOpacity>;
  });

  return <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.bg }}>
    <AppStatusBar />
    <View style={styles.header}><AppBackButton /><Text style={[styles.title, { color: colors.heading }]}>Attendance tools</Text></View>
    <View style={styles.row}>{(["Rules", "Devices", "Export"] as const).map(item => <TouchableOpacity key={item} disabled={busy} style={[styles.tab, { backgroundColor: tab === item ? colors.primary : colors.bg2 }]} onPress={() => { setTab(item); setError(""); setMessage(""); setDeviceForm(null); setSelectedDevice(null); }}><Text style={{ color: tab === item ? "#fff" : colors.text2 }}>{item}</Text></TouchableOpacity>)}</View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {loading || busy ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text> : null}
      {error && !busy && !loading ? button("Retry loading", () => void run(async () => {
        if (tab === "Rules") { const result = await attendanceService.getSettings(); setSettings(result); setForm(toForm(result)); await loadStaff(); }
        if (tab === "Devices") await Promise.all([loadDevices(), loadStaff()]);
      })) : null}
      {message ? <Text style={{ color: colors.success }}>{message}</Text> : null}
      {tab === "Rules" && settings && form ? <>
        <Text style={{ color: colors.text2 }}>These settings are shared with the web app. Shift times use India time (IST).</Text>
        <StaffTextField label="Shift start (HH:MM)" value={form.workStartTime} editable={!busy && !loading} onChangeText={value => setForm({ ...form, workStartTime: value })} />
        <StaffTextField label="Shift end (HH:MM)" value={form.workEndTime} editable={!busy && !loading} onChangeText={value => setForm({ ...form, workEndTime: value })} />
        <View style={styles.row}><Text style={{ color: colors.heading, flex: 1 }}>Apply half-day rule for late arrivals</Text><Switch disabled={busy || loading} value={settings.active} onValueChange={active => setSettings({ ...settings, active })} /></View>
        {numberFields.map(([key, label]) => <StaffTextField key={key} label={label} keyboardType="decimal-pad" value={form[key]} editable={!busy && !loading} onChangeText={value => setForm({ ...form, [key]: value })} />)}
        <Text style={{ color: colors.heading }}>Apply late arrival rule to</Text>
        <View style={styles.row}>{button(settings.staffScope === "all" ? "✓ All staff" : "All staff", () => setSettings({ ...settings, staffScope: "all" }))}{button(settings.staffScope === "selected" ? "✓ Selected staff" : "Selected staff", () => setSettings({ ...settings, staffScope: "selected" }))}</View>
        {settings.staffScope === "selected" ? staffChoices(true) : null}
        {button("Save attendance rules", () => void run(saveRules))}
      </> : null}
      {tab === "Devices" ? <>
        <Text style={{ color: colors.text2 }}>Connect a biometric device and link its employee PINs to your staff.</Text>
        <View style={styles.row}>{button("Refresh devices", () => void run(loadDevices))}{button("Register device", () => setDeviceForm({ mode: "add", serial: "", name: "", location: "" }))}</View>
        {deviceForm ? <View style={[styles.card, { borderColor: colors.border }]}>
          <Text style={{ color: colors.heading }}>{deviceForm.mode === "edit" ? "Edit device" : "Connect device"}</Text>
          <StaffTextField label="Serial number" editable={deviceForm.mode === "add" && !busy} value={deviceForm.serial} onChangeText={serial => setDeviceForm({ ...deviceForm, serial })} />
          <StaffTextField label="Device name" editable={!busy} value={deviceForm.name} onChangeText={name => setDeviceForm({ ...deviceForm, name })} />
          <StaffTextField label="Location (optional)" editable={!busy} value={deviceForm.location} onChangeText={location => setDeviceForm({ ...deviceForm, location })} />
          <View style={styles.row}>{button("Save device", () => void run(saveDevice))}{button("Cancel", () => setDeviceForm(null))}</View>
        </View> : null}
        {pending.length ? <Text style={{ color: colors.heading }}>Discovered devices</Text> : null}
        {pending.map(device => <View key={device.sn} style={[styles.card, { borderColor: colors.border }]}><Text style={{ color: colors.text2 }}>{device.sn}</Text>{button("Connect", () => setDeviceForm({ mode: "connect", serial: device.sn, name: "", location: "" }))}</View>)}
        {!loading && !devices.length ? <Text style={{ color: colors.text2 }}>No devices registered yet.</Text> : null}
        {devices.map(device => <View key={device.id} style={[styles.card, { borderColor: colors.border }]}>
          <Text style={{ color: colors.heading, fontWeight: "700" }}>{device.name}</Text><Text style={{ color: colors.text2 }}>{device.serial_no} · {device.is_active ? "Active" : "Inactive"}{device.location ? ` · ${device.location}` : ""}</Text>
          <View style={styles.row}>{button("Staff PINs", () => void run(() => selectDevice(device)))}{button("Edit", () => setDeviceForm({ mode: "edit", id: device.id, serial: device.serial_no, name: device.name, location: device.location ?? "" }))}{button(device.is_active ? "Deactivate" : "Activate", () => void run(async () => { await devicesApi.update(device.id, { is_active: !device.is_active }); await loadDevices(); }))}</View>
          {button("Remove device", () => Alert.alert("Remove device?", `Remove ${device.name} and its staff PIN mappings?`, [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void run(async () => { await devicesApi.remove(device.id); if (selectedDevice?.id === device.id) setSelectedDevice(null); await loadDevices(); }) }]), true)}
        </View>)}
        {selectedDevice ? <View style={[styles.card, { borderColor: colors.border }]}>
          <Text style={{ color: colors.heading }}>Staff PINs · {selectedDevice.name}</Text>
          {!mappings.length ? <Text style={{ color: colors.text2 }}>No staff linked yet.</Text> : null}
          {mappings.map(mapping => <View key={mapping.id}><Text style={{ color: colors.text2 }}>{mapping.staff_name ?? staff.find(item => item.id === mapping.staff_id)?.name ?? "Staff member"} · PIN {mapping.pin}</Text>{button("Remove PIN", () => Alert.alert("Remove staff PIN?", "This staff member's punches will no longer be linked from this device.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void run(async () => { await devicesApi.removeMapping(selectedDevice.id, mapping.id); await selectDevice(selectedDevice); }) }]), true)}</View>)}
          <Text style={{ color: colors.heading }}>Select staff member</Text>{staffChoices(false)}
          <StaffTextField label="Device employee PIN" keyboardType="number-pad" editable={!busy} value={pin} onChangeText={setPin} />
          {button("Link staff PIN", () => void run(async () => {
            if (!mappingStaff || !/^\d+$/.test(pin.trim())) throw new Error("Select a staff member and enter their numeric device PIN.");
            await devicesApi.addMapping(selectedDevice.id, mappingStaff, pin.trim()); await selectDevice(selectedDevice); setMessage("Staff PIN linked.");
          }))}
          {button("Close staff PINs", () => setSelectedDevice(null))}
        </View> : null}
      </> : null}
      {tab === "Export" ? <>
        <Text style={{ color: colors.text2 }}>Export monthly attendance as a CSV file to share or save.</Text>
        <StaffTextField label="Year" keyboardType="number-pad" editable={!busy} value={year} onChangeText={setYear} maxLength={4} />
        <StaffTextField label="Month (1–12)" keyboardType="number-pad" editable={!busy} value={month} onChangeText={setMonth} maxLength={2} />
        {button("Export CSV", () => void run(exportCsv))}
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  header: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  tab: { flex: 1, padding: 12, alignItems: "center", borderRadius: 12 },
  button: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  card: { borderWidth: 1, padding: 14, borderRadius: 14, gap: 12 },
});
