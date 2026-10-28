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
import { fetchServicesThunk } from "@/middleware/service/service.thunk";
import { serviceService } from "@/services/service.service";
import {
  selectServices,
  selectServicesError,
  selectServicesLoading,
  selectServicesRefreshing,
} from "@/store/service/service.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { ServiceListItem } from "@/types/service";

const CATEGORY_DISCOVERY_LIMIT = 100;
const SERVICE_BATCH_SIZE = 6;
const MAX_CATEGORY_DISCOVERY_PAGES = 5;
const SERVICE_SKELETON_KEYS = [
  "service-skeleton-one",
  "service-skeleton-two",
  "service-skeleton-three",
  "service-skeleton-four",
  "service-skeleton-five",
  "service-skeleton-six",
];

const normalizeCategoryKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-");

const mergeUniqueServices = (serviceGroups: ServiceListItem[][]) => {
  const serviceMap = new Map<string, ServiceListItem>();

  serviceGroups.flat().forEach((service) => {
    if (service.id) {
      serviceMap.set(service.id, service);
    }
  });

  return Array.from(serviceMap.values());
};

const getServiceCategoryKey = (service: ServiceListItem) =>
  service.category ? normalizeCategoryKey(service.category) : null;

const matchesCategory = (service: ServiceListItem, categoryKey: string | null) =>
  !categoryKey || getServiceCategoryKey(service) === categoryKey;

const matchesSearch = (service: ServiceListItem, search: string) => {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [service.name, service.category ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
};

const buildCategoryOptions = (sourceServices: ServiceListItem[]): CategoryChipOption[] => {
  const categoryMap = new Map<string, { categoryIds: Set<string>; label: string }>();

  sourceServices.forEach((service) => {
    if (!service.category) {
      return;
    }

    const key = normalizeCategoryKey(service.category);
    const entry = categoryMap.get(key) ?? {
      categoryIds: new Set<string>(),
      label: service.category,
    };

    if (service.categoryId) {
      entry.categoryIds.add(service.categoryId);
    }

    categoryMap.set(key, entry);
  });

  return [
    { id: null, label: "All Categories" },
    ...Array.from(categoryMap.entries())
      .sort(([, first], [, second]) => first.label.localeCompare(second.label))
      .map(([id, entry]) => ({
        categoryId: entry.categoryIds.size === 1 ? Array.from(entry.categoryIds)[0] : null,
        id,
        label: entry.label,
      })),
  ];
};

type ServiceCatalogTabProps = {
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

export function ServiceCatalogTab({
  onSelect,
  onToggle,
  selectedServiceIds,
  search,
  visible = true,
}: ServiceCatalogTabProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const services = useAppSelector(selectServices);
  const loading = useAppSelector(selectServicesLoading);
  const refreshing = useAppSelector(selectServicesRefreshing);
  const error = useAppSelector(selectServicesError);
  const salonId = currentUser?.salonId;

  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [catalogServices, setCatalogServices] = useState<ServiceListItem[]>([]);
  const [visibleServiceCount, setVisibleServiceCount] = useState(SERVICE_BATCH_SIZE);
  const debouncedSearch = useDebouncedValue(search, 300);
  const catalogRequestRef = useRef(0);
  const resetCategory = useCallback(() => {
    setCategoryKey(null);
    setVisibleServiceCount(SERVICE_BATCH_SIZE);
  }, []);
  useFocusEffect(resetCategory);
  useEffect(() => {
    if (visible) resetCategory();
  }, [resetCategory, visible]);
  const categoryOptions = useMemo(
    () => buildCategoryOptions(mergeUniqueServices([catalogServices, services])),
    [catalogServices, services],
  );
  const selectedCategory = categoryKey
    ? categoryOptions.find((option) => option.id === categoryKey) ?? null
    : null;
  const selectedCategoryLabel = selectedCategory?.label ?? null;
  const selectedCategoryId = selectedCategory?.categoryId ?? null;
  const visibleServices = useMemo(() => {
    const sourceServices = mergeUniqueServices([services, catalogServices]);

    return sourceServices
      .filter((service) => matchesCategory(service, categoryKey))
      .filter((service) => matchesSearch(service, debouncedSearch))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [catalogServices, categoryKey, debouncedSearch, services]);
  const isSearching = debouncedSearch.trim().length > 0;
  const renderedServices = useMemo(
    () => (isSearching ? visibleServices : visibleServices.slice(0, visibleServiceCount)),
    [isSearching, visibleServiceCount, visibleServices],
  );
  const hasMoreLocalServices = !isSearching && visibleServiceCount < visibleServices.length;

  const fetchFirstPage = useCallback(
    (args?: { refresh?: boolean }) => {
      void dispatch(
        fetchServicesThunk({
          // Empty strings explicitly clear the shared service query's previous category.
          category: !selectedCategoryId && selectedCategoryLabel ? selectedCategoryLabel : "",
          categoryId: selectedCategoryId ?? "",
          offset: 0,
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
    [debouncedSearch, dispatch, selectedCategoryId, selectedCategoryLabel],
  );

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  useEffect(() => {
    const requestId = catalogRequestRef.current + 1;
    catalogRequestRef.current = requestId;

    const loadCategoryCatalog = async () => {
      const catalogPages: ServiceListItem[][] = [];
      let offset = 0;

      for (let page = 0; page < MAX_CATEGORY_DISCOVERY_PAGES; page += 1) {
        const result = await serviceService.getServices(
          {
            isActive: true,
            limit: CATEGORY_DISCOVERY_LIMIT,
            offset,
            search: "",
            sort_by: "name",
            sort_order: "asc",
          },
          salonId,
        );

        catalogPages.push(result.services);

        if (!result.pagination.hasMore || result.services.length === 0) {
          break;
        }

        offset = result.pagination.nextOffset;
      }

      if (catalogRequestRef.current === requestId) {
        setCatalogServices(mergeUniqueServices(catalogPages));
      }
    };

    void loadCategoryCatalog().catch(() => {
      if (catalogRequestRef.current === requestId) {
        setCatalogServices([]);
      }
    });
  }, [salonId]);

  const handleSelectCategory = useCallback((nextCategoryKey: string | null) => {
    setCategoryKey(nextCategoryKey);
    setVisibleServiceCount(SERVICE_BATCH_SIZE);
  }, []);

  useEffect(() => {
    setVisibleServiceCount(SERVICE_BATCH_SIZE);
  }, [categoryKey, debouncedSearch]);

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
    ({ item }: { item: ServiceListItem }) => (
      <ServiceCard onSelect={handleSelect} selected={selectedServiceIds?.has(item.id) ?? false} service={item} />
    ),
    [handleSelect, selectedServiceIds],
  );

  return (
    <View style={styles.wrap}>
      <CategoryChips onSelect={handleSelectCategory} options={categoryOptions} selectedId={categoryKey} />

      {error && visibleServices.length === 0 ? (
        <ErrorState message={error} onRetry={() => fetchFirstPage()} />
      ) : loading && visibleServices.length === 0 ? (
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
      ) : visibleServices.length === 0 ? (
        <EmptyState description="Try another search or category." icon="cut-outline" title="No services found" />
      ) : (
        <RefreshViewport><FlatList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          showsVerticalScrollIndicator
          contentContainerStyle={styles.listContent}
          data={renderedServices}
          initialNumToRender={SERVICE_BATCH_SIZE}
          keyExtractor={(item) => `service-card-${item.id}`}
          ListFooterComponent={
            hasMoreLocalServices ? (
              <View style={styles.loadMoreWrap}>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => setVisibleServiceCount((current) => current + SERVICE_BATCH_SIZE)}
                  style={styles.loadMoreButton}
                >
                  <Text style={styles.loadMoreText}>View More</Text>
                  <Ionicons name="arrow-down" size={14} color={Colors.primaryText} />
                </TouchableOpacity>
                <Text style={styles.loadMoreMeta}>
                  {Math.min(visibleServiceCount, visibleServices.length)} of {visibleServices.length}
                </Text>
              </View>
            ) : null
          }
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
