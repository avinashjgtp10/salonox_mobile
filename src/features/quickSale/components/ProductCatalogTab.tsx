import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { Text } from "@/components/ui/AppTypography";
import { InfiniteScrollLoader } from "@/components/ui/InfiniteScrollLoader";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";

import { Badge } from "@/components/ui/Badge";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { CategoryChips, type CategoryChipOption } from "@/features/quickSale/components/CategoryChips";
import { EmptyState, ErrorState, SkeletonBlock } from "@/features/quickSale/components/StateViews";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { uniqueById } from "@/features/quickSale/utils/unique";
import { fetchProductsThunk } from "@/middleware/product/product.thunk";
import {
  selectProductState,
} from "@/store/product/product.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { Product } from "@/types/product";

const PRODUCT_SKELETON_KEYS = [
  "product-skeleton-one",
  "product-skeleton-two",
  "product-skeleton-three",
  "product-skeleton-four",
  "product-skeleton-five",
  "product-skeleton-six",
];

type ProductCatalogTabProps = {
  onSelect: (product: Product) => void;
  search: string;
  // Products already on the bill, shown ticked like selected services.
  selectedIds?: ReadonlySet<string>;
};

function ProductCardComponent({ onPress, product, selected }: { onPress: () => void; product: Product; selected: boolean }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  // A ticked product stays tappable so it can be removed even once out of stock.
  const outOfStock = product.stockQuantity <= 0 && !selected;
  const lowStock = !outOfStock && product.stockQuantity <= product.lowStockThreshold;
  const stockBg = outOfStock ? Colors.errorBg : lowStock ? Colors.warningBg : Colors.successBg;
  const stockColor = outOfStock ? Colors.error : lowStock ? Colors.warning : Colors.success;
  const stockLabel = product.stockQuantity <= 0 ? "Out of stock" : `${product.stockQuantity} in stock`;

  return (
    <Animated.View entering={FadeInUp.duration(200)} layout={LinearTransition.duration(200)} style={styles.rowWrap}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled: outOfStock, selected }}
        activeOpacity={outOfStock ? 1 : 0.88}
        disabled={outOfStock}
        onPress={onPress}
        style={[styles.row, selected && styles.rowSelected, outOfStock && styles.rowDisabled]}
      >
        <View style={styles.rowIcon}>
          <Ionicons name="cube-outline" size={18} color={Colors.goldDark} />
        </View>
        <View style={styles.rowCopy}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {product.name}
          </Text>
          <View style={styles.rowMetaRow}>
            <Text style={styles.rowPrice}>{formatCurrency(product.price)}</Text>
            <Badge bg={stockBg} color={stockColor} label={stockLabel} size="sm" />
          </View>
        </View>
        <View style={[styles.addButton, selected && styles.addButtonSelected, outOfStock && styles.addButtonDisabled]}>
          <Ionicons
            name={selected ? "checkmark" : "add"}
            size={16}
            color={selected ? Colors.onPrimary : outOfStock ? Colors.text2 : Colors.primaryText}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const ProductCard = memo(ProductCardComponent);

export function ProductCatalogTab({ onSelect, search, selectedIds }: ProductCatalogTabProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const { error, loading, loadingMore, pagination, products, refreshing } = useAppSelector(selectProductState);

  const [category, setCategory] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const categorySetRef = useRef(new Set<string>());
  const [categoryOptions, setCategoryOptions] = useState<CategoryChipOption[]>([{ id: null, label: "All" }]);

  const visibleProducts = useMemo(() => uniqueById(products), [products]);

  const fetchFirstPage = useCallback(
    (args?: { refresh?: boolean }) => {
      void dispatch(
        fetchProductsThunk({
          category: category ?? undefined,
          isActive: true,
          limit: 24,
          refresh: args?.refresh,
          reset: true,
          search: debouncedSearch.trim(),
          sort_by: "name",
          sort_order: "asc",
        }),
      );
    },
    [category, debouncedSearch, dispatch],
  );

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  useEffect(() => {
    let didAddCategory = false;

    visibleProducts.forEach((product) => {
      if (product.category && !categorySetRef.current.has(product.category)) {
        categorySetRef.current.add(product.category);
        didAddCategory = true;
      }
    });

    if (didAddCategory) {
      setCategoryOptions([
        { id: null, label: "All" },
        ...Array.from(categorySetRef.current).map((label) => ({ id: label, label })),
      ]);
    }
  }, [visibleProducts]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !pagination.hasMore) {
      return;
    }

    void dispatch(
      fetchProductsThunk({
        category: category ?? undefined,
        isActive: true,
        limit: pagination.limit,
        offset: pagination.nextOffset,
        search: debouncedSearch.trim(),
        sort_by: "name",
        sort_order: "asc",
      }),
    );
  };

  const handleSelect = (product: Product) => {
    if (product.stockQuantity <= 0 && !selectedIds?.has(product.id)) {
      return;
    }

    onSelect(product);
  };

  return (
    <View style={styles.wrap}>
      <CategoryChips onSelect={setCategory} options={categoryOptions} selectedId={category} />

      {error && visibleProducts.length === 0 ? (
        <ErrorState message={error} onRetry={() => fetchFirstPage()} />
      ) : loading && visibleProducts.length === 0 ? (
        <View style={styles.skeletonStack}>
          {PRODUCT_SKELETON_KEYS.map((skeletonKey) => (
            <View key={skeletonKey} style={styles.skeletonRow}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonCopy}>
                <SkeletonBlock height={13} width="62%" />
                <SkeletonBlock height={11} width="38%" />
              </View>
            </View>
          ))}
        </View>
      ) : visibleProducts.length === 0 ? (
        <EmptyState description="Try another search or category." icon="cube-outline" title="No products found" />
      ) : (
        <RefreshViewport><FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator
          contentContainerStyle={styles.listContent}
          data={visibleProducts}
          extraData={selectedIds}
          initialNumToRender={8}
          keyExtractor={(item) => `product-card-${item.id}`}
          ListFooterComponent={
            <InfiniteScrollLoader loading={loadingMore} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              colors={[Colors.primary]}
              onRefresh={() => fetchFirstPage({ refresh: true })}
              refreshing={refreshing}
              tintColor={Colors.primary}
            />
          }
          removeClippedSubviews
          renderItem={({ item }) => <ProductCard onPress={() => handleSelect(item)} product={item} selected={selectedIds?.has(item.id) ?? false} />}
          windowSize={7}
        /></RefreshViewport>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: {
    flex: 1,
    gap: Spacing.sm,
  },
  listContent: {
    paddingBottom: 132,
  },
  rowWrap: {
    marginBottom: Spacing.sm,
  },
  row: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  rowSelected: {
    borderColor: Colors.primaryText,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  rowMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 3,
  },
  rowPrice: {
    color: Colors.primaryText,
    fontSize: 13,
    fontWeight: "800",
  },
  addButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  addButtonSelected: {
    backgroundColor: Colors.primary,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  skeletonStack: {
    gap: Spacing.sm,
  },
  skeletonRow: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  skeletonIcon: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 44,
    width: 44,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
});
