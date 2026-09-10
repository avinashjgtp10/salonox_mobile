import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { useAppToast } from "@/hooks/useAppToast";
import {
  fetchStaffScheduleThunk,
  updateStaffScheduleThunk,
} from "@/middleware/staff/staffSchedule.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffSchedule,
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
const DAY_TO_BACKEND_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DEFAULT_DAYS: ScheduleDayEntry[] = WEEK_DAYS.map((day) => ({
  day,
  endTime: null,
  isOff: day === "sunday",
  startTime: null,
}));

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const formatMinutesAs12Hour = (totalMinutes: number) => {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;

  return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

const TIME_OPTIONS = Array.from({ length: 24 }, (_, index) => formatMinutesAs12Hour(index * 60));

type TimePickerTarget = {
  day: string;
  field: "endTime" | "startTime";
};

const parseTimeToMinutes = (value: string | null) => {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
};

const formatDuration = (startTime: string | null, endTime: string | null) => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null || end <= start) {
    return null;
  }

  const totalMinutes = end - start;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
};

const toBackendTime = (value: string | null) => {
  if (!value?.trim()) {
    return null;
  }

  const minutes = parseTimeToMinutes(value);

  if (minutes === null) {
    return value.trim();
  }

  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
};

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

  const [days, setDays] = useState<ScheduleDayEntry[]>(DEFAULT_DAYS);
  const [timePickerTarget, setTimePickerTarget] = useState<TimePickerTarget | null>(null);
  const [pendingTimeTarget, setPendingTimeTarget] = useState<TimePickerTarget | null>(null);
  const [selectedPickerTime, setSelectedPickerTime] = useState<string | null>(null);

  const summary = useMemo(() => {
    let totalMinutes = 0;
    let workingDays = 0;

    days.forEach((entry) => {
      if (entry.isOff) {
        return;
      }

      workingDays += 1;
      const start = parseTimeToMinutes(entry.startTime);
      const end = parseTimeToMinutes(entry.endTime);

      if (start !== null && end !== null && end > start) {
        totalMinutes += end - start;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      totalHours: minutes ? `${hours} hr ${minutes} min` : `${hours} hr`,
      workingDays,
    };
  }, [days]);

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

  const openTimePicker = (day: string, field: "endTime" | "startTime") => {
    if (timePickerTarget?.day === day && timePickerTarget.field === field) {
      setTimePickerTarget(null);
      return;
    }
    const currentDay = days.find((entry) => entry.day === day);

    setTimePickerTarget({ day, field });
    setPendingTimeTarget(null);
    setSelectedPickerTime(currentDay?.[field] ?? null);
  };

  const handleSelectPickerTime = (value: string) => {
    if (!timePickerTarget) {
      return;
    }

    updateDayTime(timePickerTarget.day, timePickerTarget.field, value);
    setPendingTimeTarget(timePickerTarget);
    setSelectedPickerTime(value);
    setTimePickerTarget(null);
  };

  const handleApplySelectedTime = (applyToAllWorkingDays: boolean) => {
    const target = pendingTimeTarget ?? timePickerTarget;

    if (!target) {
      return;
    }

    const nextTime = selectedPickerTime;

    if (!nextTime) {
      return;
    }

    setDays((current) =>
      current.map((entry) => {
        const shouldUpdate = applyToAllWorkingDays
          ? !entry.isOff
          : entry.day === target.day;

        return shouldUpdate ? { ...entry, [target.field]: nextTime } : entry;
      }),
    );
    setTimePickerTarget(null);
    setPendingTimeTarget(null);
    setSelectedPickerTime(null);
  };

  const handleSave = async () => {
    if (!staffId) {
      return;
    }

    const resultAction = await dispatch(
      updateStaffScheduleThunk({
        staffId,
        updates: {
          items: days.map((entry) => ({
            day_of_week: DAY_TO_BACKEND_INDEX[entry.day] ?? 0,
            end_time: entry.isOff ? null : toBackendTime(entry.endTime),
            is_available: !entry.isOff,
            start_time: entry.isOff ? null : toBackendTime(entry.startTime),
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
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.workingDays}</Text>
          <Text style={styles.summaryLabel}>Working Days</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.totalHours}</Text>
          <Text style={styles.summaryLabel}>Weekly Hours</Text>
        </View>
      </View>
      <View style={styles.list}>
        {days.map((entry) => {
          const isActiveRow = pendingTimeTarget?.day === entry.day || timePickerTarget?.day === entry.day;
          const startDisplayValue =
            pendingTimeTarget?.day === entry.day && pendingTimeTarget.field === "startTime"
              ? selectedPickerTime ?? entry.startTime ?? ""
              : entry.startTime ?? "";
          const endDisplayValue =
            pendingTimeTarget?.day === entry.day && pendingTimeTarget.field === "endTime"
              ? selectedPickerTime ?? entry.endTime ?? ""
              : entry.endTime ?? "";

          return (
          <View key={entry.day} style={[styles.dayRow, isActiveRow && styles.dayRowActive]}>
            <View style={styles.dayHeader}>
              <View>
                <Text style={styles.dayLabel}>{titleCase(entry.day)}</Text>
                {!entry.isOff ? (
                  <Text style={styles.dayMeta}>{formatDuration(entry.startTime, entry.endTime) ?? "Working"}</Text>
                ) : null}
              </View>
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
                  <TimeDropdownField
                    active={timePickerTarget?.day === entry.day && timePickerTarget.field === "startTime"}
                    label="Start"
                    onPress={() => openTimePicker(entry.day, "startTime")}
                    onSelect={handleSelectPickerTime}
                    onDismiss={() => setTimePickerTarget(null)}
                    options={TIME_OPTIONS}
                    placeholder="09:00 AM"
                    selectedValue={selectedPickerTime}
                    value={startDisplayValue}
                  />
                </View>
                <View style={styles.timeField}>
                  <TimeDropdownField
                    active={timePickerTarget?.day === entry.day && timePickerTarget.field === "endTime"}
                    label="End"
                    onPress={() => openTimePicker(entry.day, "endTime")}
                    onSelect={handleSelectPickerTime}
                    onDismiss={() => setTimePickerTarget(null)}
                    options={TIME_OPTIONS}
                    placeholder="06:00 PM"
                    selectedValue={selectedPickerTime}
                    value={endDisplayValue}
                  />
                </View>
              </View>
            ) : null}
            {(pendingTimeTarget?.day === entry.day || timePickerTarget?.day === entry.day) ? (
              <View style={styles.timePickerActions}>
                <TouchableOpacity
                  activeOpacity={0.84}
                  disabled={!selectedPickerTime}
                  onPress={() => handleApplySelectedTime(false)}
                  style={[styles.timePickerSecondaryButton, !selectedPickerTime && styles.buttonDisabled]}
                >
                  <Text style={styles.timePickerSecondaryText}>Use for this day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.84}
                  disabled={!selectedPickerTime}
                  onPress={() => handleApplySelectedTime(true)}
                  style={[styles.timePickerPrimaryButton, !selectedPickerTime && styles.buttonDisabled]}
                >
                  <Text style={styles.timePickerPrimaryText}>Apply to all working days</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )})}
      </View>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

      <View style={styles.footer}>
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

function TimeDropdownField({
  active,
  label,
  onPress,
  onSelect,
  onDismiss,
  options,
  placeholder,
  selectedValue,
  value,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  onSelect: (value: string) => void;
  onDismiss: () => void;
  options: string[];
  placeholder: string;
  selectedValue: string | null;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const anchorRef = useRef<View>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 160, height: 48 });
  const menuHeight = Math.min(210, windowHeight - 32);
  const below = anchor.y + anchor.height + 6;
  const menuTop = below + menuHeight <= windowHeight - 16
    ? below
    : Math.max(16, anchor.y - menuHeight - 6);

  const measureAnchor = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  };

  return (
    <View style={[styles.timeDropdownGroup, active && styles.timeDropdownGroupActive]}>
      <Text style={styles.timeDropdownLabel}>{label}</Text>
      <View ref={anchorRef} collapsable={false}>
      <TouchableOpacity activeOpacity={0.84} onPress={() => {
        if (active) {
          onDismiss();
          return;
        }
        anchorRef.current?.measureInWindow((x, y, width, height) => {
          setAnchor({ x, y, width, height });
          onPress();
        });
      }} style={styles.timeDropdownButton}>
        <Text style={[styles.timeDropdownValue, !value && styles.timeDropdownPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name={active ? "chevron-up" : "chevron-down"} size={14} color={Colors.text2} />
      </TouchableOpacity>
      </View>
      {active ? (
        <Modal
          transparent
          visible
          animationType="none"
          onRequestClose={onDismiss}
          onShow={measureAnchor}
          statusBarTranslucent={false}
        >
        <View style={styles.menuOverlay}>
        <Pressable accessibilityLabel="Close time list" onPress={onDismiss} style={StyleSheet.absoluteFill} />
        <View style={[styles.inlineTimeMenu, {
          top: menuTop,
          left: Math.max(8, Math.min(anchor.x, windowWidth - anchor.width - 8)),
          width: anchor.width,
          height: menuHeight,
        }]}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator style={styles.inlineTimeScroll}>
            {options.map((option) => {
              const selected = option === selectedValue;

              return (
                <TouchableOpacity
                  activeOpacity={0.84}
                  key={option}
                  onPress={() => {
                    onSelect(option);
                    onDismiss();
                  }}
                  style={[styles.inlineTimeOption, selected && styles.inlineTimeOptionSelected]}
                >
                  <Text style={[styles.inlineTimeOptionText, selected && styles.inlineTimeOptionTextSelected]}>
                    {option}
                  </Text>
                  {selected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        </View>
        </Modal>
      ) : null}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  list: {
    gap: 10,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  dayRow: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
  },
  dayRowActive: {
    elevation: 20,
    zIndex: 20,
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
  dayMeta: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
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
  timeDropdownGroup: {
    marginBottom: Spacing.md,
  },
  timeDropdownGroupActive: {
    elevation: 30,
    zIndex: 30,
  },
  timeDropdownLabel: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  timeDropdownButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  timeDropdownValue: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  timeDropdownPlaceholder: {
    color: Colors.placeholder,
    fontWeight: "500",
  },
  inlineTimeMenu: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
    position: "absolute",
    zIndex: 30,
  },
  inlineTimeOption: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
    paddingHorizontal: 14,
  },
  inlineTimeOptionSelected: {
    backgroundColor: Colors.primary,
  },
  inlineTimeOptionText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  inlineTimeOptionTextSelected: {
    color: "#FFFFFF",
  },
  inlineTimeScroll: {
    flex: 1,
  },
  menuOverlay: {
    flex: 1,
  },
  timePickerActions: {
    gap: 8,
    marginTop: 10,
  },
  timePickerSecondaryButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  timePickerSecondaryText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  timePickerPrimaryButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  timePickerPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
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
