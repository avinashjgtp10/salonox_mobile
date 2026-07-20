import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { useEntitySearch, type EntitySearchPage } from "@/features/quickSale/hooks/useEntitySearch";
import { useRecentList } from "@/features/quickSale/hooks/useRecentList";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { uniqueById, uniqueByKey } from "@/features/quickSale/utils/unique";
import { clientService, matchesClientSearch } from "@/services/client.service";
import { productService } from "@/services/product.service";
import { serviceService } from "@/services/service.service";
import { selectClients } from "@/store/client/client.slice";
import { useAppSelector } from "@/store/hooks";
import { selectProducts } from "@/store/product/product.slice";
import { selectServices } from "@/store/service/service.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { ClientListItem } from "@/types/client";
import type { Product } from "@/types/product";
import type { ServiceListItem } from "@/types/service";

const SEARCH_PAGE_SIZE = 8;
const RECENT_SEARCHES_KEY = "quicksale.recentSearches";
const MAX_RECENT_SEARCHES = 6;
const MIN_CLIENT_API_SEARCH_LENGTH = 2;

type SearchResult =
  | { client: ClientListItem; id: string; type: "client" }
  | { id: string; service: ServiceListItem; type: "service" }
  | { id: string; product: Product; type: "product" };

type SearchSection = {
  data: SearchResult[];
  key: "services" | "products" | "clients";
  loadMore?: () => void;
  loadingMore?: boolean;
  title: string;
};

type QuickSaleSearchPanelProps = {
  onClear: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onSelectClient: (client: ClientListItem) => void;
  onSelectProduct: (product: Product) => void;
  onSelectService: (service: ServiceListItem) => void;
  query: string;
};

const normalizeSearchValue = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");

const getCachedSearchPage = <T,>(
  items: T[],
  term: string,
  offset: number,
  matcher: (item: T, normalizedTerm: string) => boolean,
  getKey: (item: T) => string,
): EntitySearchPage<T> => {
  const normalizedTerm = normalizeSearchValue(term);
  const matches = uniqueByKey(
    items.filter((item) => matcher(item, normalizedTerm)),
    getKey,
  );
  const pageItems = matches.slice(offset, offset + SEARCH_PAGE_SIZE);

  return {
    hasMore: offset + pageItems.length < matches.length,
    items: pageItems,
  };
};

const matchesServiceSearch = (service: ServiceListItem, normalizedTerm: string) =>
  normalizeSearchValue([service.name, service.category ?? ""].join(" ")).includes(normalizedTerm);

const matchesProductSearch = (product: Product, normalizedTerm: string) =>
  normalizeSearchValue([product.name, product.brandName ?? "", product.category ?? "", product.sku ?? ""].join(" ")).includes(
    normalizedTerm,
  );

export function QuickSaleSearchPanel({
  onClear,
  onLoadingChange,
  onSelectClient,
  onSelectProduct,
  onSelectService,
  query,
}: QuickSaleSearchPanelProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const currentUser = useAppSelector(selectCurrentUser);
  const salonId = currentUser?.salonId;
  const cachedClients = useAppSelector(selectClients);
  const cachedProducts = useAppSelector(selectProducts);
  const cachedServices = useAppSelector(selectServices);
  const cachedClientsRef = useRef(cachedClients);
  const cachedProductsRef = useRef(cachedProducts);
  const cachedServicesRef = useRef(cachedServices);
  cachedClientsRef.current = cachedClients;
  cachedProductsRef.current = cachedProducts;
  cachedServicesRef.current = cachedServices;

  const debouncedQuery = useDebouncedValue(query, 300);
  const trimmedQuery = debouncedQuery.trim();
  const { recordUsage: recordSearch } = useRecentList<string>(
    RECENT_SEARCHES_KEY,
    MAX_RECENT_SEARCHES,
    (term) => normalizeSearchValue(term),
  );

  const searchClientsPage = useCallback(
    async (term: string, offset: number): Promise<EntitySearchPage<ClientListItem>> => {
      const cachedPage = getCachedSearchPage(
        cachedClientsRef.current,
        term,
        offset,
        (client, normalizedTerm) => matchesClientSearch(client, normalizedTerm),
        (client) => client.id,
      );

      if (term.trim().length < MIN_CLIENT_API_SEARCH_LENGTH) {
        return cachedPage;
      }

      try {
        const result = await clientService.searchClients(
          {
            inactive: false,
            limit: SEARCH_PAGE_SIZE,
            offset,
            search: term,
            sort_by: "full_name",
            sort_order: "asc",
          },
          salonId,
        );

        return { hasMore: result.pagination.hasMore, items: result.clients };
      } catch (error) {
        if (cachedPage.items.length === 0) {
          throw error;
        }

        return cachedPage;
      }
    },
    [salonId],
  );

  const searchServicesPage = useCallback(
    async (term: string, offset: number): Promise<EntitySearchPage<ServiceListItem>> => {
      const cachedPage = getCachedSearchPage(
        cachedServicesRef.current.filter((service) => service.isActive),
        term,
        offset,
        matchesServiceSearch,
        (service) => service.id,
      );

      try {
        const result = await serviceService.getServices(
          {
            isActive: true,
            limit: SEARCH_PAGE_SIZE,
            offset,
            search: term,
            sort_by: "name",
            sort_order: "asc",
          },
          salonId,
        );

        return { hasMore: result.pagination.hasMore, items: result.services };
      } catch (error) {
        if (cachedPage.items.length === 0) {
          throw error;
        }

        return cachedPage;
      }
    },
    [salonId],
  );

  const searchProductsPage = useCallback(
    async (term: string, offset: number): Promise<EntitySearchPage<Product>> => {
      const cachedPage = getCachedSearchPage(
        cachedProductsRef.current.filter((product) => product.isActive),
        term,
        offset,
        matchesProductSearch,
        (product) => product.id,
      );

      try {
        const result = await productService.fetchProducts(
          {
            isActive: true,
            limit: SEARCH_PAGE_SIZE,
            offset,
            search: term,
            sort_by: "name",
            sort_order: "asc",
          },
          salonId,
        );

        return { hasMore: result.pagination.hasMore, items: result.products };
      } catch (error) {
        if (cachedPage.items.length === 0) {
          throw error;
        }

        return cachedPage;
      }
    },
    [salonId],
  );

  const serviceResults = useEntitySearch(searchServicesPage, debouncedQuery, SEARCH_PAGE_SIZE, (service) => service.id);
  const productResults = useEntitySearch(searchProductsPage, debouncedQuery, SEARCH_PAGE_SIZE, (product) => product.id);
  const clientResults = useEntitySearch(searchClientsPage, debouncedQuery, SEARCH_PAGE_SIZE, (client) => client.id);

  const isLoading = serviceResults.loading || productResults.loading || clientResults.loading;
  const hasAnyError = Boolean(serviceResults.error || productResults.error || clientResults.error);
  const services = useMemo(() => uniqueById(serviceResults.items), [serviceResults.items]);
  const products = useMemo(() => uniqueById(productResults.items), [productResults.items]);
  const clients = useMemo(() => uniqueById(clientResults.items), [clientResults.items]);
  const hasAnyResult = services.length > 0 || products.length > 0 || clients.length > 0;

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const sections = useMemo<SearchSection[]>(
    () =>
      [
        {
          data: services.map((service) => ({ id: service.id, service, type: "service" as const })),
          key: "services" as const,
          loadMore: serviceResults.hasMore ? serviceResults.loadMore : undefined,
          loadingMore: serviceResults.loadingMore,
          title: "Services",
        },
        {
          data: products.map((product) => ({ id: product.id, product, type: "product" as const })),
          key: "products" as const,
          loadMore: productResults.hasMore ? productResults.loadMore : undefined,
          loadingMore: productResults.loadingMore,
          title: "Products",
        },
        {
          data: clients.map((client) => ({ client, id: client.id, type: "client" as const })),
          key: "clients" as const,
          loadMore: clientResults.hasMore ? clientResults.loadMore : undefined,
          loadingMore: clientResults.loadingMore,
          title: "Clients",
        },
      ].filter((section) => section.data.length > 0),
    [
      clientResults.hasMore,
      clientResults.loadMore,
      clientResults.loadingMore,
      clients,
      productResults.hasMore,
      productResults.loadMore,
      productResults.loadingMore,
      products,
      serviceResults.hasMore,
      serviceResults.loadMore,
      serviceResults.loadingMore,
      services,
    ],
  );

  const commitSearch = () => {
    if (trimmedQuery) {
      recordSearch(trimmedQuery);
    }
  };

  const handleSelect = (item: SearchResult) => {
    commitSearch();

    if (item.type === "service") {
      onSelectService(item.service);
    } else if (item.type === "product") {
      onSelectProduct(item.product);
    } else {
      onSelectClient(item.client);
    }

    onClear();
  };

  const renderItem = ({ item }: { item: SearchResult }) => {
    if (item.type === "service") {
      return (
        <SearchRow
          icon="cut-outline"
          iconTone="service"
          onPress={() => handleSelect(item)}
          subtitle={[item.service.durationMinutes ? `${item.service.durationMinutes} min` : null, formatCurrency(item.service.price)]
            .filter(Boolean)
            .join(" - ")}
          title={item.service.name}
        />
      );
    }

    if (item.type === "product") {
      const outOfStock = item.product.stockQuantity <= 0;

      return (
        <SearchRow
          disabled={outOfStock}
          icon="cube-outline"
          iconTone="product"
          onPress={() => handleSelect(item)}
          subtitle={`${formatCurrency(item.product.price)} - ${outOfStock ? "Out of stock" : `${item.product.stockQuantity} in stock`}`}
          title={item.product.name}
        />
      );
    }

    return (
      <SearchRow
        avatarText={item.client.initials}
        onPress={() => handleSelect(item)}
        subtitle={item.client.phone}
        title={item.client.fullName}
      />
    );
  };

  return (
    <View style={styles.panel}>
      <SectionList
        contentContainerStyle={[styles.listContent, !hasAnyResult && styles.listContentEmpty]}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => `${item.type}-search-${item.id}`}
        ListFooterComponent={hasAnyResult ? <Pressable onPress={onClear} style={styles.outsideTapArea} /> : null}
        ListEmptyComponent={
          <Pressable onPress={onClear} style={styles.emptyWrap}>
            {isLoading ? (
              <>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.emptyTitle}>Searching...</Text>
                <Text style={styles.emptyDescription}>Looking through clients, services, and products.</Text>
              </>
            ) : hasAnyError ? (
              <>
                <Ionicons name="alert-circle-outline" size={22} color={Colors.error} />
                <Text style={styles.emptyTitle}>Search unavailable</Text>
                <Text style={styles.emptyDescription}>Tap here to close search and try again.</Text>
              </>
            ) : (
              <>
                <Ionicons name="search-outline" size={22} color={Colors.primary} />
                <Text style={styles.emptyTitle}>No matches for &quot;{trimmedQuery}&quot;</Text>
                <Text style={styles.emptyDescription}>Tap here to close search.</Text>
              </>
            )}
          </Pressable>
        }
        renderItem={renderItem}
        renderSectionFooter={({ section }) =>
          section.loadMore ? (
            <TouchableOpacity activeOpacity={0.84} onPress={section.loadMore} style={styles.loadMoreRow}>
              {section.loadingMore ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <Text style={styles.loadMoreText}>Load more {section.title.toLowerCase()}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.sectionGap} />
          )
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        sections={sections}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        style={styles.list}
      />
    </View>
  );
}

function SearchRow({
  avatarText,
  disabled,
  icon,
  iconTone,
  onPress,
  subtitle,
  title,
}: {
  avatarText?: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconTone?: "service" | "product";
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.82}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={[styles.avatar, iconTone === "service" && styles.avatarService, iconTone === "product" && styles.avatarProduct]}>
        {icon ? (
          <Ionicons name={icon} size={16} color={iconTone === "product" ? Colors.goldDark : Colors.primaryDark} />
        ) : (
          <Text style={styles.avatarText}>{avatarText}</Text>
        )}
      </View>
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.rowSubtitle}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.text2} />
    </TouchableOpacity>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  panel: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.055,
    shadowRadius: 18,
    elevation: 2,
  },
  list: {
    backgroundColor: Colors.card,
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  sectionTitle: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: Spacing.sm,
    marginTop: 2,
    textTransform: "uppercase",
  },
  row: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 58,
    paddingHorizontal: 6,
    paddingVertical: 9,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.md,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  avatarService: {
    backgroundColor: Colors.successBg,
  },
  avatarProduct: {
    backgroundColor: Colors.warningBg,
  },
  avatarText: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "900",
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  rowSubtitle: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 3,
  },
  loadMoreRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingTop: 6,
  },
  loadMoreText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  sectionGap: {
    height: Spacing.md,
  },
  emptyWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "900",
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  emptyDescription: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  outsideTapArea: {
    flex: 1,
    minHeight: 96,
  },
});
