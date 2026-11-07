import { PearlCatalogRow } from "./PearlCatalogRow";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from "react-native";
import Reanimated, { FadeInUp, LinearTransition } from "react-native-reanimated";

import { Badge } from "@/components/ui/Badge";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { CategoryChips, type CategoryChipOption } from "@/features/quickSale/components/CategoryChips";
import { EmptyState, ErrorState, SkeletonBlock } from "@/features/quickSale/components/StateViews";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { fetchCategoriesThunk, fetchServicesThunk } from "@/middleware/service/service.thunk";
import {
  selectServices,
  selectServicesError,
  selectServicesLoading,
  selectServicesLoadingMore,
  selectServicesPagination,
  selectCategoriesByType,
  selectServicesRefreshing,
} from "@/store/service/service.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type { ServiceListItem } from "@/types/service";

const SERVICE_PAGE_SIZE = 24;
const SERVICE_SKELETON_KEYS = [
  "service-skeleton-one",
  "service-skeleton-two",
  "service-skeleton-three",
  "service-skeleton-four",
  "service-skeleton-five",
  "service-skeleton-six",
];

type ServiceCatalogTabProps = {
  pearlStyle?: boolean;
  visible?: boolean;
  selectedServiceIds?: ReadonlySet<string>;
  search: string;
  onSelect?: (service: ServiceListItem) => void;
  onToggle?: (service: ServiceListItem) => void;
};

function ServiceCardComponent({
  onSelect,
  selected,
  service,
}: {
  onSelect: (service: ServiceListItem) => void;
  selected: boolean;
  service: ServiceListItem;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    // Same row layout as the product, package and membership catalogs.
    <Reanimated.View entering={FadeInUp.duration(200)} layout={LinearTransition.duration(200)} style={styles.rowWrap}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected }}
        activeOpacity={0.88}
        onPress={() => onSelect(service)}
        style={[styles.row, selected && styles.rowSelected]}
      >
        <View style={styles.rowIcon}>
          <Ionicons name="cut-outline" size={18} color={Colors.primaryText} />
        </View>
        <View style={styles.rowCopy}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {service.name}
          </Text>
          <View style={styles.rowMetaRow}>
            <Text style={styles.rowPrice}>{formatCurrency(service.price)}</Text>
            {service.durationMinutes ? (
              <Badge bg={Colors.bg2} color={Colors.text2} label={`${service.durationMinutes} min`} size="sm" />
            ) : null}
          </View>
        </View>
        <View style={[styles.addButton, selected && styles.addButtonSelected]}>
          <Ionicons
            name={selected ? "checkmark" : "add"}
            size={16}
            color={selected ? Colors.onPrimary : Colors.primaryText}
          />
        </View>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const ServiceCard = memo(ServiceCardComponent);

export function ServiceCatalogTab({ pearlStyle = false,
  onSelect,
  onToggle,
  selectedServiceIds,
  search,
  visible = true,
}: ServiceCatalogTabProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const salonId = useAppSelector(selectActiveBranchId);
  const services = useAppSelector(selectServices);
  const loading = useAppSelector(selectServicesLoading);
  const refreshing = useAppSelector(selectServicesRefreshing);
  const error = useAppSelector(selectServicesError);

  const categories = useAppSelector((state) => selectCategoriesByType(state, "service"));
  const loadingMore = useAppSelector(selectServicesLoadingMore);
  const pagination = useAppSelector(selectServicesPagination);
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300).trim();
  const requestGeneration = useRef(0);
  const readyGeneration = useRef(-1);
  const loadingMoreRef = useRef(false);
  const resetCategory = useCallback(() => setCategoryKey(null), []);
  useFocusEffect(resetCategory);
  useEffect(() => {
    if (visible) resetCategory();
  }, [resetCategory, visible]);
  useEffect(() => {
    if (visible) void dispatch(fetchCategoriesThunk({ type: "service" }));
  }, [dispatch, salonId, visible]);
  const categoryOptions = useMemo<CategoryChipOption[]>(() => {
    const groups = new Map<string, { label: string; ids: Set<string> }>();
    categories.forEach((category) => {
      const key = category.name.trim().toLowerCase();
      const group = groups.get(key) ?? { label: category.name, ids: new Set<string>() };
      group.ids.add(category.id);
      groups.set(key, group);
    });
    return [
      { id: null, label: pearlStyle ? "All" : "All Categories" },
      ...Array.from(groups, ([id, group]) => ({
        id, label: group.label, categoryId: group.ids.size === 1 ? [...group.ids][0] : null,
      })).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [categories, pearlStyle]);
  const selectedCategory = categoryOptions.find((category) => category.id === categoryKey);
  const selectedCategoryId = selectedCategory?.categoryId ?? "";
  const selectedCategoryName = categoryKey && !selectedCategoryId ? selectedCategory?.label ?? "" : "";
  const queryArgs = useMemo(() => ({
    category: selectedCategoryName,
    categoryId: selectedCategoryId,
    isActive: true,
    limit: SERVICE_PAGE_SIZE,
    search: debouncedSearch,
    sort_by: "name",
    sort_order: "asc" as const,
  }), [selectedCategoryId, selectedCategoryName, debouncedSearch]);
  const fetchFirstPage = useCallback((args?: { refresh?: boolean }) => {
    const generation = ++requestGeneration.current;
    readyGeneration.current = -1;
    loadingMoreRef.current = false;
    void dispatch(fetchServicesThunk({ ...queryArgs, offset: 0, reset: true, refresh: args?.refresh }))
      .then((result) => {
        if (generation === requestGeneration.current && fetchServicesThunk.fulfilled.match(result)) {
          readyGeneration.current = generation;
        }
      });
  }, [dispatch, queryArgs]);
  useEffect(() => {
    if (visible) fetchFirstPage();
    return () => { requestGeneration.current += 1; readyGeneration.current = -1; };
  }, [fetchFirstPage, salonId, visible]);
  const loadMore = useCallback((retry = false) => {
    if (!visible || loading || refreshing || loadingMore || loadingMoreRef.current ||
        readyGeneration.current !== requestGeneration.current || !pagination.hasMore ||
        (error && !retry)) return;
    const generation = requestGeneration.current;
    loadingMoreRef.current = true;
    void dispatch(fetchServicesThunk({ ...queryArgs, offset: pagination.nextOffset }))
      .finally(() => {
        if (generation === requestGeneration.current) loadingMoreRef.current = false;
      });
  }, [dispatch, error, loading, loadingMore, pagination, queryArgs, refreshing, visible]);
  const handleSelectCategory = useCallback((id: string | null) => setCategoryKey(id), []);
  const renderedServices = services;
  const handleSelect = useCallback(
    (service: ServiceListItem) => {
      if (onToggle) {
        onToggle(service);
        return;
      }

      onSelect?.(service);
    },
    [onSelect, onToggle],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ServiceListItem; index: number }) => pearlStyle ? <PearlCatalogRow name={item.name} detail={[item.category, item.durationMinutes ? `${item.durationMinutes} min` : ""].filter(Boolean).join(" \u00b7 ")} price={item.price} selected={selectedServiceIds?.has(item.id) ?? false} first={index === 0} last={index === renderedServices.length - 1} onPress={() => handleSelect(item)} /> : (
      <ServiceCard onSelect={handleSelect} selected={selectedServiceIds?.has(item.id) ?? false} service={item} />
    ),
    [handleSelect, selectedServiceIds, pearlStyle, renderedServices.length],
  );

  return (
    <View style={styles.wrap}>
      <CategoryChips pearlStyle={pearlStyle} onSelect={handleSelectCategory} options={categoryOptions} selectedId={categoryKey} />

      {error && renderedServices.length === 0 ? (
        <ErrorState message={error} onRetry={() => fetchFirstPage()} />
      ) : loading && renderedServices.length === 0 ? (
        <View style={styles.skeletonStack}>
          {SERVICE_SKELETON_KEYS.map((skeletonKey) => (
            <View key={skeletonKey} style={styles.skeletonRow}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonCopy}>
                <SkeletonBlock height={13} width="62%" />
                <SkeletonBlock height={11} width="38%" />
              </View>
            </View>
          ))}
        </View>
      ) : renderedServices.length === 0 ? (
        <EmptyState description="Try another search or category." icon="cut-outline" title="No services found" />
      ) : (
        <RefreshViewport><FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator
          contentContainerStyle={styles.listContent}
          data={renderedServices}
          initialNumToRender={12}
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.4}
          keyExtractor={(item) => `service-card-${item.id}`}
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator color={Colors.primaryText} style={styles.loadMoreWrap} />
          ) : error ? (
            <TouchableOpacity accessibilityRole="button" onPress={() => loadMore(true)} style={styles.loadMoreWrap}>
              <Text style={styles.loadMoreText}>Couldn?t load more services. Tap to retry.</Text>
            </TouchableOpacity>
          ) : null}
          refreshControl={
            <RefreshControl
              colors={[Colors.primary]}
              onRefresh={() => fetchFirstPage({ refresh: true })}
              refreshing={refreshing}
              tintColor={Colors.primary}
            />
          }
          removeClippedSubviews
          renderItem={renderItem}
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
  loadMoreWrap: {
    alignItems: "center",
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  loadMoreButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 1,
  },
  loadMoreText: {
    color: Colors.primaryText,
    fontSize: 12,
    fontWeight: "900",
  },
  loadMoreMeta: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
  },
});
