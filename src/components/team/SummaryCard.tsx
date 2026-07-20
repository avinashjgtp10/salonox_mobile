import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { AppLayout, AppRadius } from "@/constants/layout";
import type { TeamSummaryItem } from "@/data/teamData";
import { useThemeColors } from "@/theme/ThemeProvider";

type SummaryCardProps = {
  index: number;
  item: TeamSummaryItem;
};

function SummaryCardComponent({ index, item }: SummaryCardProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View
      entering={FadeInDown.duration(240).delay(Math.min(index * 40, 160))}
      style={styles.card}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon} size={18} color={Colors.primary} />
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {item.title}
      </Text>
      <Text style={styles.value}>{item.value}</Text>
      <Text numberOfLines={2} style={styles.subtitle}>
        {item.subtitle}
      </Text>
    </Animated.View>
  );
}

export const SummaryCard = memo(SummaryCardComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    minHeight: AppLayout.summaryCardMinHeight,
    padding: AppLayout.cardPadding,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    width: AppLayout.summaryCardWidth,
    elevation: 2,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  title: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: Spacing.md,
  },
  value: {
    color: Colors.heading,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    color: Colors.text2,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
});
