import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Local-time ISO day. `toISOString()` would convert to UTC first, which rolls
// the date back a day for any timezone ahead of UTC (IST included).
export const toISODate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const fromISODate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

type DateRangeCalendarProps = {
  endDate?: string | null;
  mode?: "range" | "single";
  onChange: (startDate: string | null, endDate: string | null) => void;
  startDate?: string | null;
};

export function DateRangeCalendar({
  endDate,
  mode = "range",
  onChange,
  startDate,
}: DateRangeCalendarProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [visibleMonth, setVisibleMonth] = useState(
    () => fromISODate(startDate) ?? new Date(),
  );

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const cells = useMemo(() => {
    const leadingBlanks = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...Array.from({ length: daysInMonth }, (_value, index) => index + 1),
    ];
  }, [month, year]);

  const todayKey = toISODate(new Date());

  const handleSelect = (day: number) => {
    const selected = toISODate(new Date(year, month, day));

    if (mode === "single") {
      onChange(selected, null);
      return;
    }

    // A completed range (or no range at all) starts a fresh one; picking a day
    // before the open start moves the start rather than making an inverted range.
    if (!startDate || endDate) {
      onChange(selected, null);
      return;
    }

    if (selected < startDate) {
      onChange(selected, null);
      return;
    }

    onChange(startDate, selected);
  };

  return (
    <View style={styles.container}>
      <View style={styles.monthBar}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setVisibleMonth(new Date(year, month - 1, 1))}
          style={styles.monthButton}
        >
          <Ionicons name="chevron-back" size={18} color={Colors.heading} />
        </Pressable>
        <Text style={styles.monthLabel}>{`${MONTHS[month]} ${year}`}</Text>
        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setVisibleMonth(new Date(year, month + 1, 1))}
          style={styles.monthButton}
        >
          <Ionicons name="chevron-forward" size={18} color={Colors.heading} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday, index) => (
          <View key={`${weekday}-${index}`} style={styles.cell}>
            <Text style={styles.weekdayText}>{weekday}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`blank-${index}`} style={styles.cell} />;
          }

          const key = toISODate(new Date(year, month, day));
          const isStart = key === startDate;
          const isEnd = key === endDate;
          const isBetween = Boolean(
            startDate && endDate && key > startDate && key < endDate,
          );
          const isEdge = isStart || isEnd;

          return (
            <View
              key={key}
              style={[styles.cell, (isBetween || (isEdge && endDate)) && styles.cellInRange]}
            >
              <Pressable
                accessibilityLabel={key}
                accessibilityRole="button"
                accessibilityState={{ selected: isEdge }}
                onPress={() => handleSelect(day)}
                style={[styles.day, isEdge && styles.dayEdge]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isBetween && styles.dayTextInRange,
                    isEdge && styles.dayTextEdge,
                    !isEdge && key === todayKey && styles.dayTextToday,
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { gap: Spacing.md },
  monthBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: Colors.backgroundElement,
    borderRadius: AppRadius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  monthLabel: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  weekRow: { flexDirection: "row" },
  weekdayText: { color: Colors.text2, fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    width: `${100 / 7}%`,
  },
  cellInRange: { backgroundColor: Colors.backgroundSelected },
  day: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: AppRadius.pill,
    justifyContent: "center",
    width: "82%",
  },
  dayEdge: { backgroundColor: Colors.primaryDark },
  dayText: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  dayTextInRange: { color: Colors.primaryDark, fontWeight: "700" },
  dayTextEdge: { color: "#FFFFFF", fontWeight: "800" },
  dayTextToday: { color: Colors.primaryDark, fontWeight: "800" },
});
