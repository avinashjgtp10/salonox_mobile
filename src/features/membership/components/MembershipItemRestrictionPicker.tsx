// Narrows a membership benefit to specific services/products within a category,
// not just the whole category — e.g. 4 services out of a 30-service category.
// The app-side twin of the web's catalog/components/ItemRestrictionPicker.tsx,
// with the same selection semantics so a plan edited on either client means the
// same thing.
//
// Fully controlled: all selection state (categoryIds / itemIds) lives in the
// parent form. The only state kept here is which categories are expanded and
// whether the panel itself is open — both purely display concerns.
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { usePearlColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { Text } from "@/components/ui/AppTypography";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing } from "@/constants/theme";

export type PickerCategory = {
  id: string;
  name: string;
};

export type PickerItem = {
  categoryId: string | null;
  id: string;
  name: string;
};

type MembershipItemRestrictionPickerProps = {
  categories: PickerCategory[];
  categoryIds: string[];
  itemIds: string[];
  items: PickerItem[];
  /** "Services" or "Products" — used in the summary copy. */
  label: string;
  onChangeCategoryIds: (ids: string[]) => void;
  onChangeItemIds: (ids: string[]) => void;
};

export function MembershipItemRestrictionPicker({
  categories,
  categoryIds,
  itemIds,
  items,
  label,
  onChangeCategoryIds,
  onChangeItemIds,
}: MembershipItemRestrictionPickerProps) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, PickerItem[]>();

    items.forEach((item) => {
      if (!item.categoryId) return;
      const bucket = map.get(item.categoryId);
      if (bucket) bucket.push(item);
      else map.set(item.categoryId, [item]);
    });

    return map;
  }, [items]);

  const toggleExpanded = (categoryId: string) => {
    setExpandedIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId],
    );
  };

  // Checking "Select all" for a category supersedes any individually-picked
  // items in it — those are cleared so coverage is never ambiguous about
  // whether the category counts because of "Select all" or a pile of picks.
  const toggleSelectAll = (categoryId: string) => {
    if (categoryIds.includes(categoryId)) {
      onChangeCategoryIds(categoryIds.filter((id) => id !== categoryId));
      return;
    }

    onChangeCategoryIds([...categoryIds, categoryId]);
    const idsInCategory = new Set((itemsByCategory.get(categoryId) ?? []).map((item) => item.id));
    onChangeItemIds(itemIds.filter((id) => !idsInCategory.has(id)));
  };

  const toggleItem = (itemId: string) => {
    onChangeItemIds(itemIds.includes(itemId) ? itemIds.filter((id) => id !== itemId) : [...itemIds, itemId]);
  };

  const selectedCount = categoryIds.length + itemIds.length;
  const lowerLabel = label.toLowerCase();
  const triggerLabel =
    selectedCount === 0
      ? `All ${lowerLabel}`
      : `${categoryIds.length} ${categoryIds.length === 1 ? "category" : "categories"}, ${itemIds.length} ${itemIds.length === 1 ? "item" : "items"}`;

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => setPanelOpen((open) => !open)}
        style={[styles.trigger, panelOpen && styles.triggerOpen]}
      >
        <Text numberOfLines={1} style={styles.triggerText}>{triggerLabel}</Text>
        <Ionicons color={Colors.text2} name={panelOpen ? "chevron-up" : "chevron-down"} size={15} />
      </TouchableOpacity>

      <View style={styles.hintRow}>
        <Text style={styles.hint}>
          {selectedCount === 0
            ? `None selected — the benefit applies to every ${lowerLabel} category.`
            : `${categoryIds.length} whole ${categoryIds.length === 1 ? "category" : "categories"}, ${itemIds.length} individual ${itemIds.length === 1 ? "item" : "items"} selected.`}
        </Text>
        {selectedCount > 0 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              onChangeCategoryIds([]);
              onChangeItemIds([]);
            }}
          >
            <Text translate style={styles.clearAll}>Clear all</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {panelOpen ? (
        <View style={styles.panel}>
          {categories.length === 0 ? (
            <Text translate style={styles.empty}>No categories available.</Text>
          ) : (
            categories.map((category) => {
              const isExpanded = expandedIds.includes(category.id);
              const isWholeCategory = categoryIds.includes(category.id);
              const categoryItems = itemsByCategory.get(category.id) ?? [];
              const pickedCount = categoryItems.filter((item) => itemIds.includes(item.id)).length;

              return (
                <View key={category.id} style={styles.category}>
                  <View style={styles.categoryHead}>
                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() => toggleExpanded(category.id)}
                      style={styles.categoryNameWrap}
                    >
                      <Ionicons
                        color={Colors.text2}
                        name={isExpanded ? "chevron-down" : "chevron-forward"}
                        size={14}
                      />
                      <Text numberOfLines={1} style={styles.categoryName}>{category.name}</Text>
                      {isWholeCategory ? (
                        <Text translate style={styles.categoryCount}>all</Text>
                      ) : pickedCount > 0 ? (
                        <Text style={styles.categoryCount}>{String(pickedCount)}</Text>
                      ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() => toggleSelectAll(category.id)}
                      style={styles.selectAll}
                    >
                      <Ionicons
                        color={isWholeCategory ? Colors.primary : Colors.text2}
                        name={isWholeCategory ? "checkbox" : "square-outline"}
                        size={16}
                      />
                      <Text translate style={styles.selectAllText}>Select all</Text>
                    </TouchableOpacity>
                  </View>

                  {isExpanded ? (
                    <View style={styles.itemList}>
                      {categoryItems.length === 0 ? (
                        <Text translate style={styles.empty}>No items in this category.</Text>
                      ) : (
                        categoryItems.map((item) => {
                          const checked = isWholeCategory || itemIds.includes(item.id);

                          return (
                            <TouchableOpacity
                              activeOpacity={0.84}
                              disabled={isWholeCategory}
                              key={item.id}
                              onPress={() => toggleItem(item.id)}
                              style={[styles.item, isWholeCategory && styles.itemDisabled]}
                            >
                              <Ionicons
                                color={checked ? Colors.primary : Colors.text2}
                                name={checked ? "checkbox" : "square-outline"}
                                size={16}
                              />
                              <Text numberOfLines={1} style={styles.itemText}>{item.name}</Text>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  trigger: { alignItems: "center", backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 50, paddingHorizontal: Spacing.md },
  triggerOpen: { borderColor: Colors.primary },
  triggerText: { color: Colors.heading, flex: 1, fontSize: 14, fontWeight: "700", marginRight: Spacing.sm },
  hintRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  hint: { color: Colors.text2, flexShrink: 1, fontSize: 11, fontWeight: "600" },
  clearAll: { color: Colors.primaryText, fontSize: 11, fontWeight: "800", textDecorationLine: "underline" },
  panel: { backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, marginTop: Spacing.sm, overflow: "hidden" },
  category: { borderBottomColor: Colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  categoryHead: { alignItems: "center", flexDirection: "row", gap: Spacing.sm, justifyContent: "space-between", paddingHorizontal: Spacing.md, paddingVertical: 10 },
  categoryNameWrap: { alignItems: "center", flex: 1, flexDirection: "row", gap: 6 },
  categoryName: { color: Colors.heading, flexShrink: 1, fontSize: 13, fontWeight: "700" },
  categoryCount: { color: Colors.primaryText, fontSize: 11, fontWeight: "800" },
  selectAll: { alignItems: "center", flexDirection: "row", gap: 5 },
  selectAllText: { color: Colors.text2, fontSize: 11, fontWeight: "700" },
  itemList: { backgroundColor: Colors.card, paddingBottom: 8, paddingHorizontal: Spacing.md, paddingTop: 2 },
  item: { alignItems: "center", borderRadius: Radius.md, flexDirection: "row", gap: 8, paddingVertical: 8 },
  itemDisabled: { opacity: 0.55 },
  itemText: { color: Colors.heading, flexShrink: 1, fontSize: 13, fontWeight: "600" },
  empty: { color: Colors.text2, fontSize: 12, fontWeight: "600", padding: Spacing.md },
});
