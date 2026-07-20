import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { BusinessCategory } from "@/constants/businessCategories";
import type { ThemeColors } from "@/constants/theme";
import { useAppTheme } from "@/theme/ThemeProvider";

const createCategoryColors = (theme: ThemeColors, scheme: "light" | "dark") => ({
  accent: theme.gold,
  accentSoft: scheme === "dark" ? "rgba(175, 167, 157, 0.18)" : "rgba(175, 167, 157, 0.14)",
  border: theme.border,
  borderStrong: theme.gold,
  disabledText: theme.placeholder,
  overlay: scheme === "dark" ? "rgba(0, 0, 0, 0.62)" : "rgba(20, 31, 27, 0.32)",
  rowBg: theme.card,
  selectedBg: scheme === "dark" ? theme.bg2 : "#F2EFE9",
  text: theme.heading,
  textMuted: theme.text2,
  textSoft: theme.hint,
  sheetBg: theme.card,
  chipBg: theme.bg2,
  closeBg: theme.primaryDark,
  closeBgPressed: theme.primary,
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
  onMore: (category: BusinessCategory) => void;
  onPress: (categoryId: string) => void;
  selected: boolean;
};

const CategoryChoiceRow = memo(
  ({
    category,
    limitReached,
    onMore,
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
            <Pressable
              accessibilityLabel={`More about ${category.name}`}
              hitSlop={10}
              onPress={() => onMore(category)}
              style={({ pressed }) => [styles.moreButton, pressed && styles.moreButtonPressed]}
            >
              <Text style={styles.moreButtonText}>More</Text>
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
  const insets = useSafeAreaInsets();
  const [detailCategory, setDetailCategory] = useState<BusinessCategory | null>(null);
  const sheetTranslateY = useRef(new Animated.Value(420)).current;

  useEffect(() => {
    if (detailCategory) {
      sheetTranslateY.setValue(420);
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 24,
        mass: 0.9,
        stiffness: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [detailCategory, sheetTranslateY]);

  const closeDetailSheet = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: 420,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDetailCategory(null);
      }
    });
  }, [sheetTranslateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          sheetTranslateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 88 || gestureState.vy > 0.85) {
            closeDetailSheet();
            return;
          }

          Animated.spring(sheetTranslateY, {
            toValue: 0,
            damping: 22,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
        },
      }),
    [closeDetailSheet, sheetTranslateY],
  );

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
          onMore={setDetailCategory}
          onPress={onToggleCategory}
          selected={item.selected}
        />
      );
    },
    [onToggleCategory, styles],
  );

  return (
    <>
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

      <Modal
        animationType="fade"
        onRequestClose={closeDetailSheet}
        transparent
        visible={Boolean(detailCategory)}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDetailSheet}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 34) },
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <Pressable onPress={() => undefined}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{detailCategory?.name}</Text>
              <Text style={styles.sheetDescription}>{detailCategory?.description}</Text>

              <Text style={styles.sheetLabel}>Example services included</Text>
              <View style={styles.exampleList}>
                {detailCategory?.exampleServices.map((service) => (
                  <Text key={service} style={styles.exampleItem}>
                    {service}
                  </Text>
                ))}
              </View>

              <Pressable
                accessibilityLabel="Close category details"
                onPress={closeDetailSheet}
                style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
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
  },
  categoryNameSelected: {
    color: Colors.text,
    fontWeight: "800",
  },
  categoryNameAtLimit: {
    color: Colors.disabledText,
  },
  selectionPressable: {
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
  },
  moreButton: {
    alignItems: "center",
    borderRadius: 999,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  moreButtonPressed: {
    backgroundColor: Colors.accentSoft,
  },
  moreButtonText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: "800",
  },
  modalOverlay: {
    backgroundColor: Colors.overlay,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.sheetBg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 34,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: Colors.border,
    borderRadius: 999,
    height: 4,
    marginBottom: 18,
    width: 42,
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  sheetDescription: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
    marginTop: 10,
  },
  sheetLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 22,
  },
  exampleList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  exampleItem: {
    backgroundColor: Colors.chipBg,
    borderColor: Colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: Colors.closeBg,
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 26,
    minHeight: 50,
  },
  closeButtonPressed: {
    backgroundColor: Colors.closeBgPressed,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
