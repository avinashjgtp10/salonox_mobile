import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DashboardRadius as Radius, DashboardSpacing as Spacing } from "@/constants/theme";
import { getAttendanceStatusConfig } from "@/features/attendance/utils/attendanceStatus";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AttendanceStatusKey } from "@/types/attendance";

type AttendanceStatusChipProps = {
  statusKey: AttendanceStatusKey;
};

function AttendanceStatusChipComponent({ statusKey }: AttendanceStatusChipProps) {
  const Colors = useThemeColors();
  const config = getAttendanceStatusConfig(statusKey, Colors);

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={12} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

export const AttendanceStatusChip = memo(AttendanceStatusChipComponent);

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
  },
});
