import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import type { StaffMember } from "@/data/teamData";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import { useThemeColors } from "@/theme/ThemeProvider";

type AttendanceCheckMode = "checkIn" | "checkOut";
type TimeValue = { hour: string; minute: string; period: "AM" | "PM" };

type AttendanceCheckModalProps = {
  date: string;
  isSaving: boolean;
  mode: AttendanceCheckMode;
  onClose: () => void;
  onSubmit: (payload: { isoTime?: string; note?: string }) => Promise<void>;
  staffMember: StaffMember | null;
  visible: boolean;
};

const defaultTimeForMode = (mode: AttendanceCheckMode): TimeValue =>
  mode === "checkIn"
    ? { hour: "09", minute: "00", period: "AM" }
    : { hour: "06", minute: "00", period: "PM" };

const isTimeComplete = (value: TimeValue) => value.hour.trim() !== "" && value.minute.trim() !== "";

const isTimePartial = (value: TimeValue) =>
  (value.hour.trim() !== "") !== (value.minute.trim() !== "");

const timeToIso = (dateKey: string, value: TimeValue) => {
  const hourNum = Number(value.hour);
  const minuteNum = Number(value.minute);

  if (!Number.isInteger(hourNum) || hourNum < 1 || hourNum > 12) {
    return null;
  }

  if (!Number.isInteger(minuteNum) || minuteNum < 0 || minuteNum > 59) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const hour24 = value.period === "PM" ? (hourNum % 12) + 12 : hourNum % 12;
  const date = new Date(year, (month || 1) - 1, day || 1, hour24, minuteNum, 0, 0);

  return date.toISOString();
};

export function AttendanceCheckModal({
  date,
  isSaving,
  mode,
  onClose,
  onSubmit,
  staffMember,
  visible,
}: AttendanceCheckModalProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [time, setTime] = useState<TimeValue>(defaultTimeForMode(mode));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isCheckIn = mode === "checkIn";

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTime(defaultTimeForMode(mode));
    setNote("");
    setError(null);
  }, [mode, staffMember?.id, visible]);

  if (!staffMember) {
    return null;
  }

  const handleSubmit = async () => {
    setError(null);

    if (isTimePartial(time)) {
      setError(`Enter both hour and minute for ${isCheckIn ? "check-in" : "check-out"} time, or clear both.`);
      return;
    }

    const isoTime = isTimeComplete(time) ? timeToIso(date, time) : undefined;

    if (isTimeComplete(time) && !isoTime) {
      setError(`Enter a valid ${isCheckIn ? "check-in" : "check-out"} time.`);
      return;
    }

    await onSubmit({
      isoTime: isoTime ?? undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <StaffBottomSheet
      footer={
        <>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={isSaving}
            onPress={onClose}
            style={[styles.cancelButton, isSaving && styles.buttonDisabled]}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={isSaving}
            onPress={() => void handleSubmit()}
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>{isCheckIn ? "Check In" : "Check Out"}</Text>
            )}
          </TouchableOpacity>
        </>
      }
      onClose={onClose}
      subtitle={staffMember.name}
      title={isCheckIn ? "Check In" : "Check Out"}
      visible={visible}
    >
      <Text style={styles.label}>{isCheckIn ? "Check-In Time" : "Check-Out Time"}</Text>
      <View style={styles.timeRow}>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(text) => setTime((current) => ({ ...current, hour: text.replace(/[^0-9]/g, "") }))}
          placeholder="HH"
          placeholderTextColor={Colors.placeholder}
          style={styles.timeInput}
          value={time.hour}
        />
        <Text style={styles.timeSeparator}>:</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(text) => setTime((current) => ({ ...current, minute: text.replace(/[^0-9]/g, "") }))}
          placeholder="MM"
          placeholderTextColor={Colors.placeholder}
          style={styles.timeInput}
          value={time.minute}
        />
        <View style={styles.periodGroup}>
          {(["AM", "PM"] as const).map((period) => (
            <TouchableOpacity
              key={period}
              activeOpacity={0.84}
              onPress={() => setTime((current) => ({ ...current, period }))}
              style={[styles.periodChip, time.period === period && styles.periodChipActive]}
            >
              <Text style={[styles.periodChipText, time.period === period && styles.periodChipTextActive]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.84} onPress={() => setTime({ hour: "", minute: "", period: "AM" })}>
        <Text style={styles.clearText}>Use current time</Text>
      </TouchableOpacity>

      <StaffTextField
        label="Note (optional)"
        multiline
        onChangeText={setNote}
        placeholder="Add a note..."
        value={note}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </StaffBottomSheet>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  label: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
    height: 44,
    textAlign: "center",
    width: 58,
  },
  timeSeparator: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  periodGroup: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    padding: 3,
  },
  periodChip: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  periodChipActive: {
    backgroundColor: Colors.primaryDark,
  },
  periodChipText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "800",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
  },
  clearText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 13,
  },
  cancelButtonText: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 13,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
