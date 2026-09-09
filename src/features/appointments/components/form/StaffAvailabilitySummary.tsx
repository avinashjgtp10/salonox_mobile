import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export function StaffAvailabilitySummary({
  availabilityLabel,
  checkedInLabel,
  checkedOutLabel,
  currentStatusLabel,
  error,
  hasStaff,
  holidayLabel,
  loading,
  onLeaveLabel,
  shiftEndLabel,
  shiftStartLabel,
  workingHoursLabel,
}: {
  availabilityLabel: string;
  checkedInLabel: string;
  checkedOutLabel: string;
  currentStatusLabel: string;
  error?: string | null;
  hasStaff: boolean;
  holidayLabel: string;
  loading: boolean;
  onLeaveLabel: string;
  shiftEndLabel: string;
  shiftStartLabel: string;
  workingHoursLabel: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const availabilityRows = [
    ["Working Hours", workingHoursLabel],
    ["Shift Start", shiftStartLabel],
    ["Shift End", shiftEndLabel],
    ["Current Status", currentStatusLabel],
    ["Available / Busy", availabilityLabel],
    ["Checked In", checkedInLabel],
    ["Checked Out", checkedOutLabel],
    ["On Leave", onLeaveLabel],
    ["Holiday", holidayLabel],
  ];

  return (
    <View style={styles.availabilityCard}>
      <View style={styles.availabilityHeader}>
        <Text style={styles.availabilityTitle}>Staff availability</Text>
        {loading ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
      </View>
      {loading ? (
        <View style={styles.availabilityRows}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={`availability-skeleton-${index}`} style={styles.availabilityRow}>
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLine} />
            </View>
          ))}
        </View>
      ) : !hasStaff ? (
        <Text style={styles.fieldHint}>Select a staff member to view availability.</Text>
      ) : (
        <View style={styles.availabilityRows}>
          {availabilityRows.map(([label, value]) => (
            <View key={label} style={styles.availabilityRow}>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowLabel}>
                {label}
              </Text>
              <Text ellipsizeMode="tail" numberOfLines={1} style={styles.availabilityRowValue}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      )}
      {error ? <Text style={styles.fieldHintError}>{error}</Text> : null}
    </View>
  );
}
