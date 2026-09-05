import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";

export function WeekDayStrip({ date, onSelect }: { date: string; onSelect: (value: string) => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const days = useMemo(() => {
    const anchor = new Date(`${date || todayIsoDate()}T00:00:00`);

    if (Number.isNaN(anchor.getTime())) {
      anchor.setTime(Date.now());
    }

    // Monday-start week containing `anchor`.
    const dayOfWeek = anchor.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - diffToMonday);

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);

      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, "0");
      const dayOfMonth = String(day.getDate()).padStart(2, "0");

      return {
        dayNumber: day.getDate(),
        key: `${year}-${month}-${dayOfMonth}`,
        label: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(day),
      };
    });
  }, [date]);

  return (
    <ScrollView contentContainerStyle={styles.weekStripRow} horizontal showsHorizontalScrollIndicator={false}>
      {days.map((day) => {
        const isActive = day.key === date;

        return (
          <TouchableOpacity
            key={day.key}
            activeOpacity={0.82}
            onPress={() => onSelect(day.key)}
            style={[styles.weekDayPill, isActive && styles.weekDayPillActive]}
          >
            <Text style={[styles.weekDayLabel, isActive && styles.weekDayLabelActive]}>{day.label}</Text>
            <Text style={[styles.weekDayNumber, isActive && styles.weekDayNumberActive]}>{day.dayNumber}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
