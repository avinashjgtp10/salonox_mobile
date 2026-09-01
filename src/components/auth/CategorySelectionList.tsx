import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";

import type { BusinessCategory } from "@/constants/businessCategories";
import type { ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

const createCategoryColors = (theme: ThemeColors, scheme: "light" | "dark") => ({
  border: theme.border,
  borderStrong: theme.gold,
  disabledText: theme.placeholder,
  rowBg: theme.card,
  selectedBg: scheme === "dark" ? theme.bg2 : "#F2EFE9",
  text: theme.heading,
  textMuted: theme.text2,
});

type CategoryColors = ReturnType<typeof createCategoryColors>;

const useCategoryColors = () => {
  const { colors, scheme } = useAppTheme();

  return useMemo(() => createCategoryColors(colors, scheme), [colors, scheme]);
};

const REQUIRED_TOTAL_CATEGORY_COUNT = 3;

type CategorySelectionListProps = {
  categories: BusinessCategory[];
  primaryCategoryId: string;
  relatedCategoryIds: string[];
  onToggleCategory: (categoryId: string) => void;
};

type CategoryListEntry =
  | {
      id: string;
      kind: "section";
      subtitle: string;
      title: string;
    }
  | {
      category: BusinessCategory;
      id: string;
      kind: "category";
      limitReached: boolean;
      selected: boolean;
    };

type CategoryChoiceRowProps = {
  category: BusinessCategory;
  limitReached: boolean;
  onPress: (categoryId: string) => void;
  selected: boolean;
};

const CategoryChoiceRow = memo(
  ({
    category,
    limitReached,
    onPress,
    selected,
  }: CategoryChoiceRowProps) => {
    const Colors = useCategoryColors();
    const styles = useMemo(() => createStyles(Colors), [Colors]);
    const selectionProgress = useRef(new Animated.Value(selected ? 1 : 0)).current;
    const pressScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.timing(selectionProgress, {
        toValue: selected ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    }, [selected, selectionProgress]);

    const rowBackground = selectionProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.rowBg, Colors.selectedBg],
    });
    const rowBorder = selectionProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.border, Colors.borderStrong],
    });

    return (
      <View style={styles.rowShell}>
        <Animated.View
          style={[
            styles.rowScaleLayer,
            {
              transform: [{ scale: pressScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.row,
              limitReached && !selected && styles.rowAtLimit,
              {
                backgroundColor: rowBackground,
                borderColor: rowBorder,
              },
            ]}
          >
            <Pressable
              accessibilityLabel={`Business category ${category.name}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => onPress(category.id)}
              onPressIn={() => {
                Animated.spring(pressScale, {
                  toValue: 0.985,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(pressScale, {
                  toValue: 1,
                  friction: 7,
                  tension: 80,
                  useNativeDriver: true,
                }).start();
              }}
              style={styles.selectionPressable}
            >
              <Text
                style={[
                  styles.categoryName,
                  selected && styles.categoryNameSelected,
                  limitReached && !selected && styles.categoryNameAtLimit,
                ]}
                numberOfLines={1}
              >
                {category.name}
              </Text>
            </Pressable>

          </Animated.View>
        </Animated.View>
      </View>
    );
  },
);

CategoryChoiceRow.displayName = "CategoryChoiceRow";

export function CategorySelectionList({
  categories,
  primaryCategoryId,
  relatedCategoryIds,
  onToggleCategory,
}: CategorySelectionListProps) {
  const Colors = useCategoryColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const data = useMemo<CategoryListEntry[]>(() => {
    const selectedCategoryIds = [primaryCategoryId, ...relatedCategoryIds].filter(Boolean);
    const categoryRows: CategoryListEntry[] = categories.map((category) => {
      const selected = selectedCategoryIds.includes(category.id);

      return {
      category,
      id: `category-${category.id}`,
      kind: "category",
      limitReached: !selected && selectedCategoryIds.length >= REQUIRED_TOTAL_CATEGORY_COUNT,
      selected,
      };
    });

    return [
      {
        id: "category-header",
        kind: "section",
        subtitle: `${selectedCategoryIds.length}/${REQUIRED_TOTAL_CATEGORY_COUNT} selected`,
        title: "Business Categories",
      },
      ...categoryRows,
    ];
  }, [categories, primaryCategoryId, relatedCategoryIds]);

  const renderItem = useCallback<ListRenderItem<CategoryListEntry>>(
    ({ item }) => {
      if (item.kind === "section") {
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <Text style={styles.sectionSubtitle}>{item.subtitle}</Text>
          </View>
        );
      }

      return (
        <CategoryChoiceRow
          category={item.category}
          limitReached={item.limitReached}
          onPress={onToggleCategory}
          selected={item.selected}
        />
      );
    },
    [onToggleCategory, styles],
  );

  return (
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={false}
        initialNumToRender={24}
        maxToRenderPerBatch={24}
        windowSize={7}
      />
  );
}

const createStyles = (Colors: CategoryColors) => StyleSheet.create({
  listContent: {
    paddingBottom: 4,
  },
  sectionHeader: {
    paddingBottom: 10,
    paddingTop: 22,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 4,
  },
  rowShell: {
    marginBottom: 8,
  },
  rowScaleLayer: {
    borderRadius: 14,
  },
  row: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.2,
    flexDirection: "row",
    minHeight: 58,
    paddingLeft: 16,
    paddingRight: 6,
  },
  rowAtLimit: {
    opacity: 0.72,
  },
  categoryName: {
    color: Colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    paddingRight: 12,
    textAlignVertical: "center",
  },
  categoryNameSelected: {
    color: Colors.text,
    fontWeight: "800",
  },
  categoryNameAtLimit: {
    color: Colors.disabledText,
  },
  selectionPressable: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: 10,
  },
});
