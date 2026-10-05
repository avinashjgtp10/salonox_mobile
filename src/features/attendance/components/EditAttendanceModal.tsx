import { Text, TextInput } from "@/components/ui/AppTypography";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import type { StaffMember } from "@/data/teamData";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import { useAttendanceActions } from "@/features/attendance/hooks/useAttendanceActions";
import {
  formatHourMinuteAmPm,
  getAttendanceErrorMessage,
  MANUAL_STATUS_OPTIONS,
  parseAttendanceDateTime,
  statusKeyToManualStatus,
} from "@/features/attendance/utils/attendanceStatus";
import type { AttendanceRejectValue } from "@/middleware/attendance/attendance.thunk";
import { useThemeColors } from "@/theme/ThemeProvider";
import { attendanceTimeToIso } from "@/features/attendance/utils/attendanceRules";
import type { AttendanceRecord, ManualAttendanceStatus } from "@/types/attendance";

type EditAttendanceModalProps = {
  attendanceDate: string;
  onClose: () => void;
  record: AttendanceRecord | null;
  staffMember: StaffMember | null;
  visible: boolean;
};

type TimeValue = { hour: string; minute: string; period: "AM" | "PM" };

const EMPTY_TIME: TimeValue = { hour: "", minute: "", period: "AM" };

const toTimeValue = (value: string | null | undefined): TimeValue | null => {
  const date = parseAttendanceDateTime(value);

  if (!date) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(formatHourMinuteAmPm(date));

  if (!match) {
    return null;
  }

  return { hour: match[1], minute: match[2], period: match[3] as "AM" | "PM" };
};

const isTimeValueComplete = (value: TimeValue) => value.hour.trim() !== "" && value.minute.trim() !== "";

const isTimeValuePartial = (value: TimeValue) =>
  (value.hour.trim() !== "") !== (value.minute.trim() !== "");

const MAX_SHIFT_DURATION_MS = 16 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const resolveCheckOutDate = (checkInDate: Date | null, checkOutDate: Date | null): Date | null => {
  if (!checkInDate || !checkOutDate) {
    return checkOutDate;
  }

  if (checkOutDate.getTime() > checkInDate.getTime()) {
    return checkOutDate;
  }

  const rolledOverCheckOutDate = new Date(checkOutDate.getTime() + ONE_DAY_MS);

  if (rolledOverCheckOutDate.getTime() - checkInDate.getTime() <= MAX_SHIFT_DURATION_MS) {
    return rolledOverCheckOutDate;
  }

  return null;
};

const timeValueToDate = (value: TimeValue, referenceDate: Date): Date | null => {
  if (!isTimeValueComplete(value)) {
    return null;
  }

  const hourNum = Number(value.hour);
  const minuteNum = Number(value.minute);

  if (!Number.isInteger(hourNum) || hourNum < 1 || hourNum > 12) {
    return null;
  }

  if (!Number.isInteger(minuteNum) || minuteNum < 0 || minuteNum > 59) {
    return null;
  }

  const hour24 = value.period === "PM" ? (hourNum % 12) + 12 : hourNum % 12;
  const dateKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}-${String(referenceDate.getDate()).padStart(2, "0")}`;
  const iso = attendanceTimeToIso(dateKey, hour24, minuteNum);
  return iso ? new Date(iso) : null;
};

function TimeField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: TimeValue) => void;
  value: TimeValue;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.timeFieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.timeRow}>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(text) => onChange({ ...value, hour: text.replace(/[^0-9]/g, "") })}
          placeholder="HH"
          placeholderTextColor={Colors.placeholder}
          style={styles.timeInput}
          value={value.hour}
        />
        <Text style={styles.timeSeparator}>:</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(text) => onChange({ ...value, minute: text.replace(/[^0-9]/g, "") })}
          placeholder="MM"
          placeholderTextColor={Colors.placeholder}
          style={styles.timeInput}
          value={value.minute}
        />
        <View style={styles.periodGroup}>
          {(["AM", "PM"] as const).map((period) => (
            <TouchableOpacity
              key={period}
              activeOpacity={0.84}
              onPress={() => onChange({ ...value, period })}
              style={[styles.periodChip, value.period === period && styles.periodChipActive]}
            >
              <Text
                style={[styles.periodChipText, value.period === period && styles.periodChipTextActive]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {isTimeValueComplete(value) ? (
          <TouchableOpacity
            accessibilityLabel={`Clear ${label}`}
            activeOpacity={0.84}
            onPress={() => onChange(EMPTY_TIME)}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function EditAttendanceModal({
  attendanceDate,
  onClose,
  record,
  staffMember,
  visible,
}: EditAttendanceModalProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { markAttendance, markingStaffIds, updateAttendance, updatingAttendanceIds } =
    useAttendanceActions();
  const isMarkMode = !record;
  const isSaving = isMarkMode
    ? markingStaffIds.includes(staffMember?.id ?? "")
    : updatingAttendanceIds.includes(record?.id ?? "");

  const [status, setStatus] = useState<ManualAttendanceStatus>("present");
  const [checkInTime, setCheckInTime] = useState<TimeValue>(EMPTY_TIME);
  const [checkOutTime, setCheckOutTime] = useState<TimeValue>(EMPTY_TIME);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setStatus(record ? statusKeyToManualStatus(record.statusKey) : "present");
    setCheckInTime(toTimeValue(record?.checkInTime) ?? EMPTY_TIME);
    setCheckOutTime(toTimeValue(record?.checkOutTime) ?? EMPTY_TIME);
    setNote("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, record?.id, staffMember?.id]);

  if (!staffMember) {
    return null;
  }

  const handleSave = async () => {
    setError(null);

    try {
      if (isMarkMode) {
        await markAttendance(staffMember.id, status, note.trim() || undefined, attendanceDate);
        onClose();
        return;
      }

      if (isTimeValuePartial(checkInTime)) {
        setError("Enter both hour and minute for check-in time, or leave both blank.");
        return;
      }

      if (isTimeValuePartial(checkOutTime)) {
        setError("Enter both hour and minute for check-out time, or leave both blank.");
        return;
      }

      const referenceDate = new Date(`${record?.date?.slice(0, 10) || attendanceDate}T00:00:00`);
      const checkInDate = timeValueToDate(checkInTime, referenceDate);
      const rawCheckOutDate = timeValueToDate(checkOutTime, referenceDate);

      if (isTimeValueComplete(checkInTime) && !checkInDate) {
        setError("Enter a valid check-in time.");
        return;
      }

      if (isTimeValueComplete(checkOutTime) && !rawCheckOutDate) {
        setError("Enter a valid check-out time.");
        return;
      }

      const checkOutDate = resolveCheckOutDate(checkInDate, rawCheckOutDate);

      if (rawCheckOutDate && !checkOutDate) {
        setError("Check-out time cannot be earlier than check-in time.");
        return;
      }

      await updateAttendance(record.id, {
        status,
        ...(checkInDate ? { checkInTime: checkInDate.toISOString() } : {}),
        ...(checkOutDate ? { checkOutTime: checkOutDate.toISOString() } : {}),
        notes: note.trim() || undefined,
      }, attendanceDate);
      onClose();
    } catch (thunkError) {
      const rejectValue = thunkError as Partial<AttendanceRejectValue> | undefined;

      setError(getAttendanceErrorMessage(rejectValue?.kind, rejectValue?.message));
    }
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
            onPress={() => void handleSave()}
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </>
      }
      onClose={onClose}
      subtitle={staffMember.name}
      title={isMarkMode ? "Mark Attendance" : "Edit Attendance"}
      visible={visible}
    >
      <Text style={styles.label}>Status</Text>
      <View style={styles.statusGrid}>
        {MANUAL_STATUS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.84}
            onPress={() => setStatus(option.value)}
            style={[styles.statusChip, status === option.value && styles.statusChipActive]}
          >
            <Text
              style={[styles.statusChipText, status === option.value && styles.statusChipTextActive]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isMarkMode ? (
        <>
          <TimeField label="Check In Time" onChange={setCheckInTime} value={checkInTime} />
          <TimeField label="Check Out Time" onChange={setCheckOutTime} value={checkOutTime} />
        </>
      ) : null}

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
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.md,
  },
  statusChip: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  statusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusChipText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  timeFieldGroup: {
    marginBottom: Spacing.md,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  timeInput: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "700",
    height: 44,
    textAlign: "center",
    width: 52,
  },
  timeSeparator: {
    color: Colors.text2,
    fontSize: 16,
    fontWeight: "800",
  },
  periodGroup: {
    flexDirection: "row",
    gap: 4,
  },
  periodChip: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  periodChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  periodChipText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "800",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
  },
  clearButton: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
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
