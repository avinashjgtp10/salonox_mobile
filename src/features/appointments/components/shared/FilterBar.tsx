import { WeekDayStrip } from "@/features/appointments/components/shared/WeekDayStrip";
import { STATUS_FILTERS } from "@/features/appointments/constants/appointmentConstants";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatTimeLabel, todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem, AppointmentStatus } from "@/types/appointment";
import { formatAppDate } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

export function FilterBar({
  date,
  onDateChange,
  onSearchChange,
  onSelectSearchResult,
  onStatusChange,
  search,
  searchResults,
  status,
}: {
  date: string;
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSelectSearchResult?: (appointment: AppointmentListItem) => void;
  onStatusChange: (value: "All" | AppointmentStatus) => void;
  search: string;
  searchResults?: AppointmentListItem[];
  status: "All" | AppointmentStatus;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  // Additive UI-only toggle for the status chip row below — default visible
  // so nothing changes for anyone who doesn't touch this control. The chip
  // row itself, onStatusChange, and `status` are untouched.
  const [isStatusRowVisible, setIsStatusRowVisible] = useState(true);
  const showDropdown =
    isSearchFocused && search.trim().length > 0 && searchResults !== undefined;

  const dateValue = useMemo(() => {
    const parsed = new Date(`${date || todayIsoDate()}T00:00:00`);

    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [date]);

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setIsDatePickerVisible(false);
    }

    if (event.type === "dismissed" || !selected) {
      return;
    }

    const year = selected.getFullYear();
    const month = String(selected.getMonth() + 1).padStart(2, "0");
    const day = String(selected.getDate()).padStart(2, "0");

    onDateChange(`${year}-${month}-${day}`);
  };

  return (
    <View style={styles.filterPanel}>
      <WeekDayStrip date={date} onSelect={onDateChange} />

      <View style={styles.appointmentSearchRow}>
        <View style={[styles.appointmentSearchGroup, styles.appointmentSearchGroupFlex]}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={Colors.text2} />
            <TextInput
              onBlur={() => setIsSearchFocused(false)}
              onChangeText={onSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search client, service, staff or phone"
              placeholderTextColor={Colors.placeholder}
              style={styles.searchInput}
              value={search}
            />
            {search ? (
              <TouchableOpacity onPress={() => onSearchChange("")}>
                <Ionicons name="close-circle" size={18} color={Colors.text2} />
              </TouchableOpacity>
            ) : null}
          </View>

          {showDropdown ? (
            <View style={styles.appointmentSearchDropdown}>
              {searchResults.length === 0 ? (
                <View style={styles.appointmentSearchEmpty}>
                  <Text style={styles.appointmentSearchEmptyText}>
                    No matching appointments.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  style={styles.appointmentSearchDropdownScroll}
                >
                  {searchResults.map((appointment) => (
                    <TouchableOpacity
                      key={appointment.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setIsSearchFocused(false);
                        onSelectSearchResult?.(appointment);
                      }}
                      style={styles.appointmentSearchItem}
                    >
                      <Text numberOfLines={1} style={styles.appointmentSearchItemTitle}>
                        {appointment.clientName}
                      </Text>
                      <Text numberOfLines={1} style={styles.appointmentSearchItemMeta}>
                        {[
                          formatTimeLabel(appointment.scheduledAt),
                          appointment.serviceName,
                          appointment.staffName,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          accessibilityLabel={isStatusRowVisible ? "Hide status filters" : "Show status filters"}
          activeOpacity={0.82}
          onPress={() => setIsStatusRowVisible((current) => !current)}
          style={[styles.filterToggleButton, isStatusRowVisible && styles.filterToggleButtonActive]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={isStatusRowVisible ? "#FFFFFF" : Colors.text2}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => setIsDatePickerVisible(true)}
        style={styles.dateInputRow}
      >
        <Ionicons name="calendar-outline" size={18} color={Colors.text2} />
        <Text style={styles.dateInput}>{date ? formatAppDate(`${date}T00:00:00`) : "DD-MM-YYYY"}</Text>
      </TouchableOpacity>

      {isDatePickerVisible && Platform.OS === "android" ? (
        <DateTimePicker mode="date" onChange={handleDateChange} value={dateValue} />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setIsDatePickerVisible(false)}
          transparent
          visible={isDatePickerVisible}
        >
          <Pressable onPress={() => setIsDatePickerVisible(false)} style={styles.modalBackdrop}>
            <Pressable style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <DateTimePicker
                display="spinner"
                mode="date"
                onChange={handleDateChange}
                value={dateValue}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setIsDatePickerVisible(false)}
                  style={styles.primaryButtonCompact}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {isStatusRowVisible ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {STATUS_FILTERS.map((filter) => {
              const isActive = filter === status;

              return (
                <TouchableOpacity
                  key={filter}
                  activeOpacity={0.82}
                  onPress={() => onStatusChange(filter)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}
