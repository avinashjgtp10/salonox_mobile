import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, { FadeInUp, LinearTransition } from "react-native-reanimated";

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

let rememberedServiceCategoryKey: string | null = null;

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
    { id: null, label: "All" },
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
    <Reanimated.View entering={FadeInUp.duration(200)} layout={LinearTransition.duration(200)} style={styles.tileWrap}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => onSelect(service)}
        style={[styles.tile, selected && styles.tileSelected]}
      >
        {selected ? (
          <View style={styles.tileCheck}>
            <Ionicons name="checkmark" size={13} color="#FFFFFF" />
          </View>
        ) : null}
        <Text numberOfLines={2} style={[styles.tileTitle, selected && styles.tileTitleSelected]}>
          {service.name}
        </Text>
        <Text numberOfLines={1} style={[styles.tileMeta, selected && styles.tileMetaSelected]}>
          {service.durationMinutes ? `${service.durationMinutes} min · ` : ""}
          {formatCurrency(service.price)}
        </Text>
        <Text style={[styles.tileHint, selected && styles.tileHintSelected]}>
          {selected ? "Added" : "Tap to add"}
        </Text>
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

  const [categoryKey, setCategoryKey] = useState<string | null>(rememberedServiceCategoryKey);
  const [catalogServices, setCatalogServices] = useState<ServiceListItem[]>([]);
  const [visibleServiceCount, setVisibleServiceCount] = useState(SERVICE_BATCH_SIZE);
  const debouncedSearch = useDebouncedValue(search, 300);
  const catalogRequestRef = useRef(0);
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
          category: !selectedCategoryId && selectedCategoryLabel ? selectedCategoryLabel : undefined,
          categoryId: selectedCategoryId ?? undefined,
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
    rememberedServiceCategoryKey = nextCategoryKey;
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
        <View style={styles.skeletonGrid}>
          {SERVICE_SKELETON_KEYS.map((skeletonKey) => (
            <View key={skeletonKey} style={styles.skeletonTile}>
              <SkeletonBlock height={13} width="72%" />
              <SkeletonBlock height={11} width="48%" />
            </View>
          ))}
        </View>
      ) : visibleServices.length === 0 ? (
        <EmptyState description="Try another search or category." icon="cut-outline" title="No services found" />
      ) : (
        <FlatList
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          data={renderedServices}
          initialNumToRender={SERVICE_BATCH_SIZE}
          keyExtractor={(item) => `service-card-${item.id}`}
          numColumns={2}
          ListFooterComponent={
            hasMoreLocalServices ? (
              <View style={styles.loadMoreWrap}>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => setVisibleServiceCount((current) => current + SERVICE_BATCH_SIZE)}
                  style={styles.loadMoreButton}
                >
                  <Text style={styles.loadMoreText}>View More</Text>
                  <Ionicons name="arrow-down" size={14} color={Colors.primaryDark} />
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
        />
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: {
    flex: 1,
    gap: Spacing.sm,
  },
  // MiniBillBar floats absolutely over this screen (bottom: 18, ~84 tall) —
  // without this, the last row and the "View More" footer button scroll up
  // underneath it and become unreachable.
  listContent: {
    paddingBottom: 132,
  },
  columnWrapper: {
    gap: Spacing.sm,
  },
  tileWrap: {
    flex: 1,
    marginBottom: Spacing.sm,
    maxWidth: "50%",
  },
  tile: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    minHeight: 104,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  tileSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  tileCheck: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: Radius.full,
    height: 20,
    justifyContent: "center",
    marginBottom: 4,
    width: 20,
  },
  tileTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  tileTitleSelected: {
    color: "#FFFFFF",
  },
  tileMeta: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  tileMetaSelected: {
    color: "rgba(255,255,255,0.78)",
  },
  tileHint: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
  tileHintSelected: {
    color: "rgba(255,255,255,0.9)",
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  skeletonTile: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 8,
    minHeight: 104,
    padding: Spacing.md,
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
    color: Colors.primaryDark,
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
