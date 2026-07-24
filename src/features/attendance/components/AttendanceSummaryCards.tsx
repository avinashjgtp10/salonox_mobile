import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AttendanceSummary } from "@/types/attendance";

type AttendanceSummaryCardsProps = {
  summary: AttendanceSummary;
};

type SummaryCardConfig = {
  bg: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  key: keyof AttendanceSummary;
  label: string;
};

const getCards = (Colors: ThemeColors): SummaryCardConfig[] => [
  { bg: Colors.successBg, color: Colors.success, icon: "checkmark-circle", key: "present", label: "Present" },
  { bg: Colors.warningBg, color: Colors.warning, icon: "time", key: "late", label: "Late" },
  { bg: Colors.errorBg, color: Colors.error, icon: "close-circle", key: "absent", label: "Absent" },
  { bg: Colors.purpleBg, color: Colors.purple, icon: "moon", key: "onLeave", label: "On Leave" },
  { bg: Colors.infoBg, color: Colors.info, icon: "contrast", key: "halfDay", label: "Half Day" },
];

function AttendanceSummaryCardsComponent({ summary }: AttendanceSummaryCardsProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const cards = useMemo(() => getCards(Colors), [Colors]);

  return (
    <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
      {cards.map((card) => (
        <View key={card.key} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: card.bg }]}>
            <Ionicons name={card.icon} size={16} color={card.color} />
          </View>
          <Text style={styles.value}>{summary[card.key] as number}</Text>
          <Text style={styles.label}>{card.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export const AttendanceSummaryCards = memo(AttendanceSummaryCardsComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: 2,
  },
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    minWidth: 108,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  value: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 10,
  },
  label: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});
