import { Text, TextInput } from "@/components/ui/AppTypography";
import { TourView, TourButton } from "@/features/userGuide/DashboardTour";
import { WeekDayStrip } from "@/features/appointments/components/shared/WeekDayStrip";
import { STATUS_FILTERS } from "@/features/appointments/constants/appointmentConstants";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatTimeLabel, todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem, AppointmentStatus } from "@/types/appointment";
import { formatAppDate } from "@/utils/dateTime";
import { Ionicons } from "@expo/vector-icons";
import { AppDatePickerModal } from "@/components/ui/AppDatePickerModal";
import { useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";

export function FilterBar({
  compact,
  date,
  onDateChange,
  onSearchChange,
  onSelectSearchResult,
  onStatusChange,
  search,
  searchResults,
  status,
}: {
  // Hides the search bar, the filter toggle button, and the "All" chip —
  // used on the dashboard's Appointments page, which only needs the quick
  // Today/Upcoming/Completed/Cancelled chips.
  compact?: boolean;
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
  const [isStatusRowVisible, setIsStatusRowVisible] = useState(true);
  const showDropdown =
    isSearchFocused && search.trim().length > 0 && searchResults !== undefined;

  return (
    <View style={styles.filterPanel}>
      {compact ? null : <WeekDayStrip date={date} onSelect={onDateChange} />}

      {compact ? null : (
        <View style={styles.appointmentSearchRow}>
          <View style={[styles.appointmentSearchGroup, styles.appointmentSearchGroupFlex]}>
            <TourView tourId="search" style={styles.searchWrap}>
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
            </TourView>

            {showDropdown ? (
              <View style={styles.appointmentSearchDropdown}>
                {searchResults.length === 0 ? (
                  <View style={styles.appointmentSearchEmpty}>
                    <Text translate style={styles.appointmentSearchEmptyText}>
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

          <TourButton tourId="filters"
            accessibilityLabel={isStatusRowVisible ? "Hide status filters" : "Show status filters"}
            activeOpacity={0.82}
            onPress={() => setIsStatusRowVisible((current) => !current)}
            style={[styles.filterToggleButton, isStatusRowVisible && styles.filterToggleButtonActive]}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={isStatusRowVisible ? Colors.onPrimary : Colors.text2}
            />
          </TourButton>
        </View>
      )}

      <TourButton tourId="date"
        activeOpacity={0.82}
        onPress={() => setIsDatePickerVisible(true)}
        style={styles.dateInputRow}
      >
        <Ionicons name="calendar-outline" size={18} color={Colors.text2} />
        <Text style={styles.dateInput}>{date ? formatAppDate(`${date}T00:00:00`) : "DD-MM-YY"}</Text>
      </TourButton>

      <AppDatePickerModal
        subtitle="Tap the day to show appointments for."
        visible={isDatePickerVisible}
        value={date || null}
        onChange={onDateChange}
        onClose={() => setIsDatePickerVisible(false)}
      />

      {isStatusRowVisible || compact ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {compact ? null : (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => onStatusChange("All")}
                style={[styles.chip, status === "All" && styles.chipActive]}
              >
                <Text translate style={[styles.chipText, status === "All" && styles.chipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => onDateChange(todayIsoDate())}
              style={[styles.chip, date === todayIsoDate() && styles.chipActive]}
            >
              <Text translate style={[styles.chipText, date === todayIsoDate() && styles.chipTextActive]}>
                Today
              </Text>
            </TouchableOpacity>
            {STATUS_FILTERS.filter((filter) => filter !== "All").map((filter) => {
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
