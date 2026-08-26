import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import { useAppToast } from "@/hooks/useAppToast";
import {
  deleteStaffScheduleThunk,
  fetchStaffScheduleThunk,
  updateStaffScheduleThunk,
} from "@/middleware/staff/staffSchedule.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffSchedule,
  selectStaffScheduleDeleting,
  selectStaffScheduleError,
  selectStaffScheduleLoaded,
  selectStaffScheduleLoading,
  selectStaffScheduleSaveError,
  selectStaffScheduleSaving,
} from "@/store/staff/staffSchedule.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ScheduleDayEntry } from "@/types/staffSchedule";
import { isValidStaffId } from "@/utils/staffIds";

type StaffScheduleSectionProps = {
  staffId?: string | null;
};

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DEFAULT_DAYS: ScheduleDayEntry[] = WEEK_DAYS.map((day) => ({
  day,
  endTime: null,
  isOff: day === "sunday",
  startTime: null,
}));

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function StaffScheduleSection({ staffId }: StaffScheduleSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const schedule = useAppSelector((state) => selectStaffSchedule(state, staffId));
  const loaded = useAppSelector((state) => selectStaffScheduleLoaded(state, staffId));
  const loading = useAppSelector((state) => selectStaffScheduleLoading(state, staffId));
  const listError = useAppSelector((state) => selectStaffScheduleError(state, staffId));
  const saving = useAppSelector((state) => selectStaffScheduleSaving(state, staffId));
  const saveError = useAppSelector((state) => selectStaffScheduleSaveError(state, staffId));
  const deleting = useAppSelector((state) => selectStaffScheduleDeleting(state, staffId));

  const [days, setDays] = useState<ScheduleDayEntry[]>(DEFAULT_DAYS);

  useEffect(() => {
    if (staffId && isValidStaffId(staffId) && !loaded && !loading) {
      void dispatch(fetchStaffScheduleThunk(staffId));
    }
  }, [dispatch, loaded, loading, staffId]);

  useEffect(() => {
    if (schedule) {
      setDays(schedule.days);
    }
  }, [schedule]);

  const handleRetry = () => {
    if (staffId) {
      void dispatch(fetchStaffScheduleThunk(staffId));
    }
  };

  const toggleDayOff = (day: string) => {
    setDays((current) =>
      current.map((entry) => (entry.day === day ? { ...entry, isOff: !entry.isOff } : entry)),
    );
  };

  const updateDayTime = (day: string, field: "endTime" | "startTime", value: string) => {
    setDays((current) =>
      current.map((entry) => (entry.day === day ? { ...entry, [field]: value } : entry)),
    );
  };

  const handleSave = async () => {
    if (!staffId) {
      return;
    }

    const resultAction = await dispatch(
      updateStaffScheduleThunk({
        staffId,
        updates: {
          days: days.map((entry) => ({
            day: entry.day,
            is_off: entry.isOff,
            ...(entry.startTime ? { start_time: entry.startTime } : {}),
            ...(entry.endTime ? { end_time: entry.endTime } : {}),
          })),
        },
      }),
    );

    if (updateStaffScheduleThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to save schedule",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    toast.showSuccess("Schedule updated successfully.");
  };

  const handleClear = () => {
    if (!staffId) {
      return;
    }

    Alert.alert(
      "Clear Schedule",
      "Are you sure you want to clear this staff member's working schedule?",
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void handleConfirmClear(), style: "destructive", text: "Clear" },
      ],
    );
  };

  const handleConfirmClear = async () => {
    if (!staffId) {
      return;
    }

    const resultAction = await dispatch(deleteStaffScheduleThunk(staffId));

    if (deleteStaffScheduleThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to clear schedule",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    setDays(DEFAULT_DAYS);
    toast.showSuccess("Schedule cleared successfully.");
  };

  if (listError) {
    return (
      <StaffSectionCard title="Schedule">
        <StaffStateView
          actionLabel="Retry"
          description={listError}
          onAction={handleRetry}
          title="Unable to load schedule"
          variant="error"
        />
      </StaffSectionCard>
    );
  }

  if (loading && !loaded) {
    return (
      <StaffSectionCard title="Schedule">
        <StaffStateView description="Fetching working schedule." loading title="Loading schedule" />
      </StaffSectionCard>
    );
  }

  return (
    <StaffSectionCard title="Schedule">
      <View style={styles.list}>
        {days.map((entry) => (
          <View key={entry.day} style={styles.dayRow}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{titleCase(entry.day)}</Text>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => toggleDayOff(entry.day)}
                style={[styles.offToggle, entry.isOff && styles.offToggleActive]}
              >
                <Text style={[styles.offToggleText, entry.isOff && styles.offToggleTextActive]}>
                  {entry.isOff ? "Day Off" : "Working"}
                </Text>
              </TouchableOpacity>
            </View>
            {!entry.isOff ? (
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <StaffTextField
                    label="Start"
                    onChangeText={(value) => updateDayTime(entry.day, "startTime", value)}
                    placeholder="09:00 AM"
                    value={entry.startTime ?? ""}
                  />
                </View>
                <View style={styles.timeField}>
                  <StaffTextField
                    label="End"
                    onChangeText={(value) => updateDayTime(entry.day, "endTime", value)}
                    placeholder="06:00 PM"
                    value={entry.endTime ?? ""}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={deleting}
          onPress={handleClear}
          style={[styles.clearButton, deleting && styles.buttonDisabled]}
        >
          {deleting ? (
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <Text style={styles.clearButtonText}>Clear</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={saving}
          onPress={() => void handleSave()}
          style={[styles.saveButton, saving && styles.buttonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Schedule</Text>
          )}
        </TouchableOpacity>
      </View>
    </StaffSectionCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  list: {
    gap: 10,
    marginBottom: Spacing.md,
  },
  dayRow: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
  },
  dayHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayLabel: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  offToggle: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  offToggleActive: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  offToggleText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
  },
  offToggleTextActive: {
    color: Colors.error,
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  timeField: {
    flex: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  clearButtonText: {
    color: Colors.error,
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
  buttonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
