import { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import { DashboardRadius as Radius, type ThemeColors } from "@/constants/theme";
import { uniqueByKey } from "@/features/quickSale/utils/unique";
import { useThemeColors } from "@/theme/ThemeProvider";

export type CategoryChipOption = {
  categoryId?: string | null;
  id: string | null;
  label: string;
};

type CategoryChipsProps = {
  onSelect: (id: string | null) => void;
  options: CategoryChipOption[];
  selectedId: string | null;
};

function CategoryChipsComponent({ onSelect, options, selectedId }: CategoryChipsProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const visibleOptions = useMemo(
    () => uniqueByKey(options, (option) => option.id ?? "__all__"),
    [options],
  );

  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
    >
      {visibleOptions.map((option) => {
        const isActive = option.id === selectedId;

        return (
          <Animated.View
            key={`category-chip-${option.id ?? "all"}`}
            entering={FadeIn.duration(140)}
            layout={LinearTransition.springify().damping(18)}
          >
            <Pressable
              android_ripple={{ color: "rgba(28, 25, 23, 0.08)" }}
              onPress={() => onSelect(option.id)}
              style={({ pressed }) => [styles.chip, isActive && styles.chipActive, pressed && styles.chipPressed]}
            >
              <Text numberOfLines={1} style={[styles.chipText, isActive && styles.chipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

export const CategoryChips = memo(CategoryChipsComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  scroll: {
    flexGrow: 0,
    minHeight: 44,
  },
  row: {
    alignItems: "center",
    gap: 9,
    paddingRight: 4,
    paddingVertical: 4,
  },
  chip: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipPressed: {
    transform: [{ scale: 0.98 }],
  },
  chipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  chipText: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: 16,
    textAlignVertical: "center",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});
