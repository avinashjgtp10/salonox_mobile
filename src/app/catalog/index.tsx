import { useRegionalPreferences } from "@/localization/preferences";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SearchableFilterDropdown } from "@/components/ui/SearchableFilterDropdown";
import { useCatalogCollection } from "@/features/catalog/hooks/useCatalogCollection";
import { loadAllPages } from "@/utils/loadAllPages";
import { productService } from "@/services/product.service";
import { membershipService } from "@/services/membership.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { appAlert as Alert } from "@/services/appAlert";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InfiniteScrollLoader } from "@/components/ui/InfiniteScrollLoader";
import { FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, type ListRenderItemInfo } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout } from "@/constants/layout";
import { usePearlColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl, pearlGradients, pearlTones } from "@/components/auth/pearl/tokens";
import { LinearGradient } from "expo-linear-gradient";
import { LunoxHeaderButton } from "@/components/lunox/LunoxHeaderButton";


import { deleteProductThunk } from "@/middleware/product/product.thunk";
import { deleteServiceThunk } from "@/middleware/service/service.thunk";
import { CatalogFilterSheet } from "@/features/catalog/components/CatalogFilterSheet";
import {
  catalogCategoryLabel,
  catalogStatusLabel,
  countCatalogFilters,
  emptyCatalogFilterForTab,
  emptyCatalogFiltersByTab,
  matchesCatalogFilters,
  type CatalogFilterValue,
  type CatalogTab,
  type FilterableCatalogItem,
  type ServiceCatalogFilters,
} from "@/features/catalog/utils/catalogFilters";
import { useCatalogServices } from "@/features/services/hooks/useCatalogServices";
import { getApiErrorMessage } from "@/services/api";
import { consumableService } from "@/services/consumable.service";
import { serviceService } from "@/services/service.service";
import { packageService } from "@/services/package.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";



import { useAppToast } from "@/hooks/useAppToast";
import type { Membership } from "@/types/membership";
import type { ConsumableListItem } from "@/types/consumable";
import type { PackageListItem } from "@/types/package";
import type { Product } from "@/types/product";
import type { ServiceListItem } from "@/types/service";
import { formatCurrency as formatMoney } from "@/utils/currency";

type CatalogItem = FilterableCatalogItem & {
  id: string;
  meta: string;
  name: string;
  route?: Href;
};

const TABS: { icon: keyof typeof Ionicons.glyphMap; key: CatalogTab; label: string }[] = [
  { icon: "cut-outline", key: "services", label: "Services" },
  { icon: "cube-outline", key: "products", label: "Products" },
  { icon: "albums-outline", key: "packages", label: "Packages" },
  { icon: "diamond-outline", key: "memberships", label: "Memberships" },
  { icon: "flask-outline", key: "consumables", label: "Consumables" },
];

const CATALOG_PAGE_SIZE = 10;

const serviceToItem = (item: ServiceListItem): CatalogItem => ({
  category: catalogCategoryLabel(item.category),
  durationMinutes: item.durationMinutes,
  id: item.id,
  isActive: item.isActive,
  isOnlineBooking: item.isOnlineBooking,
  meta: item.durationMinutes ? `${item.durationMinutes} min` : "Duration not set",
  name: item.name,
  price: item.price,
  route: `/services/${item.id}` as Href,
});

const productToItem = (item: Product): CatalogItem => ({
  brand: item.brandName,
  category: item.category ?? item.brandName ?? "Uncategorized",
  id: item.id,
  isActive: item.isActive,
  lowStockThreshold: item.lowStockThresholdBaseUnits ?? item.lowStockThreshold,
  meta: `${item.stockQuantity} in stock${item.sku ? ` · ${item.sku}` : ""}`,
  name: item.name,
  price: item.retailPrice ?? item.price,
  productType: item.productType,
  route: `/stock/${item.id}` as Href,
  stockQuantity: item.stockQuantity,
});

const consumableToItem = (item: ConsumableListItem, assignedServicesByConsumable: Map<string, string[]>): CatalogItem => ({
  assignedServices: assignedServicesByConsumable.get(item.id) ?? [],
  brand: item.brandName,
  category: item.categoryName ?? item.brandName ?? "Consumable Inventory",
  id: item.id,
  isActive: item.isActive,
  lowStockThreshold: item.qtyAlert,
  meta: `${item.amount} ${item.measureUnit ?? ""}${item.status ? ` · ${item.status.replace(/_/g, " ")}` : ""}`.trim(),
  name: item.name,
  price: item.supplyPrice ?? item.retailPrice ?? 0,
  productType: item.productType,
  rawStatus: item.status,
  route: `/consumables/${item.id}` as Href,
  stockQuantity: item.amount,
  supplier: item.supplierName,
  unit: item.measureUnit,
});

const packageToItem = (item: PackageListItem): CatalogItem => ({
  category: item.category ?? "Service package",
  id: item.id,
  isActive: item.status.toLowerCase() === "active",
  meta: `${item.serviceIds.length} service${item.serviceIds.length === 1 ? "" : "s"}`,
  name: item.name,
  price: Math.max(0, item.basePrice - (item.discountType === "percentage" ? item.basePrice * item.discountValue / 100 : item.discountValue)),
  serviceCount: item.serviceIds.length,
  status: item.status,
});

const membershipToItem = (item: Membership): CatalogItem => ({
  appliesTo: item.appliesTo,
  category: `${item.sessionType} membership`,
  id: item.id,
  isActive: item.enableOnlineSales,
  meta: item.validFor,
  name: item.name,
  price: item.price,
  pricingType: item.pricingType,
  route: `/memberships/${item.id}` as Href,
  validFor: item.validFor,
});

type CatalogStyles = ReturnType<typeof createStyles>;

type CatalogRowProps = {
  colors: ThemeColors;
  isDeleting: boolean;
  item: CatalogItem;
  onDelete?: (item: CatalogItem) => void;
  onOpen: (item: CatalogItem) => void;
  styles: CatalogStyles;
};


const CatalogTableRow = memo(function CatalogTableRow({ colors, isDeleting, item, onDelete, onOpen, styles }: CatalogRowProps) {
  "use no memo";
  useRegionalPreferences();
  const tone = item.stockQuantity !== undefined ? pearlTones.peach : pearlTones.rose;
  const stock = item.stockQuantity;
  const low = stock != null && stock <= (item.lowStockThreshold ?? 0);
  return (
    <TouchableOpacity activeOpacity={0.8} disabled={!item.route && item.serviceCount === undefined} onPress={() => onOpen(item)} style={styles.tableRow}>
      <View style={[styles.itemIcon, { backgroundColor: tone.bg }]}><Ionicons name={stock != null ? "cube-outline" : item.serviceCount != null ? "albums-outline" : item.validFor ? "diamond-outline" : "cut-outline"} size={20} color={tone.fg} /></View>
      <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={styles.tableName}>{item.name}</Text><Text numberOfLines={2} style={styles.tableCell}>{item.category} · {item.meta}</Text></View>
      <View style={{ alignItems: "flex-end", gap: 5 }}><Text style={styles.tablePrice}>{formatMoney(item.price)}</Text>
        {stock != null ? <Text style={[styles.stockPill, { color: stock <= 0 ? pearl.dangerText : low ? pearl.warningText : pearl.successText, backgroundColor: stock <= 0 ? pearl.dangerBg : low ? pearl.warningBg : pearl.successBg }]}>{stock <= 0 ? "Out of stock" : low ? `${stock} left` : `${stock} in stock`}</Text> : !item.isActive ? <Text translate style={styles.tableCell}>Inactive</Text> : null}
      </View>
      {onDelete ? (
        <TouchableOpacity accessibilityLabel={`Actions for ${item.name}`} disabled={isDeleting} hitSlop={8} onPress={() => onDelete(item)} style={styles.tableDeleteButton}>
          {isDeleting ? <ActivityIndicator color={colors.error} size="small" /> : <Ionicons color={pearl.muted} name="ellipsis-vertical" size={16} />}
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
});

const CatalogGridCard = memo(function CatalogGridCard({ colors, isDeleting, item, onDelete, onOpen, statusLabel, styles }: CatalogRowProps & { statusLabel: string }) {
  "use no memo";
  useRegionalPreferences();
  return (
    <View style={styles.catalogGridCard}>
      <TouchableOpacity accessibilityRole="button" disabled={!item.route && item.serviceCount === undefined} onPress={() => onOpen(item)} style={styles.catalogGridCopy}>
        <Text numberOfLines={2} style={styles.tableName}>{item.name}</Text>
        <Text style={styles.tableCell}>{item.category}</Text>
        <Text style={styles.tableCell}>{item.meta}</Text>
        <Text style={styles.tablePrice}>{formatMoney(item.price)}</Text>
        <Text style={[styles.tableCell, { color: item.isActive ? colors.success : colors.text2 }]}>{statusLabel}</Text>
      </TouchableOpacity>
      {onDelete ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Actions for ${item.name}`} disabled={isDeleting} onPress={() => onDelete(item)} style={styles.viewButton}>
          {isDeleting ? <ActivityIndicator size="small" color={colors.error} /> : <Ionicons name="ellipsis-horizontal" size={18} color={colors.text2} />}
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const keyExtractor = (item: CatalogItem) => item.id;

export default function CatalogScreen() {
  "use no memo";
  useRegionalPreferences();
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const { services, loading: servicesLoading, error: servicesError, load: loadServices } = useCatalogServices();
  const [filtersByTab, setFiltersByTab] = useState(emptyCatalogFiltersByTab);
  const [filterVisible, setFilterVisible] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [addVisible, setAddVisible] = useState(false);
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [actionItem, setActionItem] = useState<CatalogItem | null>(null);
  const branchId = useAppSelector(selectActiveBranchId);
  const [activeTab, setActiveTab] = useState<CatalogTab>("services");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageListItem | null>(null);
  const [consumableSort, setConsumableSort] = useState("Newest");
  const fetchCatalogProducts = useCallback(async () => {
    // The product list API only returns category_id/brand_id, so resolve the names here.
    const [products, categories, brands] = await Promise.all([
      loadAllPages(async (page) => {
        const result = await productService.fetchProducts({ limit: 100, offset: (page - 1) * 100, search: "", sort_by: "name", sort_order: "asc" }, branchId);
        return { items: result.products, hasMore: result.pagination.hasMore };
      }),
      serviceService.getCategories("product").catch(() => []),
      productService.fetchBrands(branchId).catch(() => []),
    ]);
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
    const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));
    return products.map((product) => ({
      ...product,
      brandName: product.brandName ?? (product.brandId ? brandNames.get(product.brandId) ?? null : null),
      category: product.category ?? (product.categoryId ? categoryNames.get(product.categoryId) ?? null : null),
    }));
  }, [branchId]);
  const fetchCatalogConsumables = useCallback(() => loadAllPages(async (page) => {
    const sort = ({ Newest: "newest", "Lowest Stock": "lowest_stock", "Most Used": "most_used", "A-Z": "a_z" } as const)[consumableSort as "Newest" | "Lowest Stock" | "Most Used" | "A-Z"];
    const result = await consumableService.getCatalogPage(page, sort, branchId);
    return { items: result.consumables, hasMore: result.pagination.hasMore };
  }), [branchId, consumableSort]);
  const fetchCatalogMemberships = useCallback(() => loadAllPages(async (page) => {
    const result = await membershipService.getMemberships({ limit: 100, page, search: "" }, branchId);
    return { items: result.items, hasMore: page * 100 < result.total };
  }), [branchId]);
  const fetchCatalogPackages = useCallback(() => packageService.getManagementPackages(branchId), [branchId]);
  const productCatalog = useCatalogCollection(fetchCatalogProducts, branchId);
  const consumableCatalog = useCatalogCollection(fetchCatalogConsumables, branchId);
  const membershipCatalog = useCatalogCollection(fetchCatalogMemberships, branchId);
  const packageCatalog = useCatalogCollection(fetchCatalogPackages, branchId);
  const productState = { products: productCatalog.items, loading: productCatalog.loading, error: productCatalog.error };
  const consumableState = { consumables: consumableCatalog.items, loading: consumableCatalog.loading, error: consumableCatalog.error };
  const memberships = membershipCatalog.items;
  const membershipsLoading = membershipCatalog.loading;
  const membershipsError = membershipCatalog.error;
  const packages = packageCatalog.items;
  const packagesLoading = packageCatalog.loading;
  const packagesError = packageCatalog.error;
  const { load: loadProducts } = productCatalog;
  const { load: loadConsumables } = consumableCatalog;
  const { load: loadMemberships } = membershipCatalog;
  const { load: loadPackages } = packageCatalog;
  const loadCatalog = useCallback(async (_refresh = false) => {
    await Promise.allSettled([loadServices(_refresh), loadProducts(), loadConsumables(), loadMemberships(), loadPackages()]);
  }, [loadServices, loadProducts, loadConsumables, loadMemberships, loadPackages]);
  useEffect(() => { void loadServices(); }, [loadServices]);
  const latestLoadCatalog = useRef(loadCatalog);
  latestLoadCatalog.current = loadCatalog;
  const hasFocused = useRef(false);
  useFocusEffect(useCallback(() => {
    if (hasFocused.current) void latestLoadCatalog.current(true);
    else hasFocused.current = true;
  }, []));
  useEffect(() => { setSelectedPackage(null); }, [branchId]);

  // Services' consumablesUsed recipe, inverted into consumableId -> service
  // names, so the consumables tab can offer an "Assigned Service" filter
  // without a dedicated endpoint — the data's already loaded for the catalog.
  const consumableAssignedServices = useMemo(() => {
    const map = new Map<string, string[]>();
    services.forEach((service) => {
      (service.consumablesUsed ?? []).forEach((recipe) => {
        const list = map.get(recipe.productId) ?? [];
        list.push(service.name);
        map.set(recipe.productId, list);
      });
    });
    return map;
  }, [services]);

  const itemsByTab = useMemo<Record<CatalogTab, CatalogItem[]>>(() => ({
    consumables: consumableState.consumables.map((item) => consumableToItem(item, consumableAssignedServices)),
    memberships: memberships.map(membershipToItem),
    packages: packages.map(packageToItem),
    products: productState.products.map(productToItem),
    services: services.map(serviceToItem),
  }), [consumableAssignedServices, consumableState.consumables, memberships, packages, productState.products, services]);

  const activeFilters = filtersByTab[activeTab];
  const filterCount = countCatalogFilters(activeTab, activeFilters);
  const activeTabLabel = TABS.find((tab) => tab.key === activeTab)?.label ?? "Items";
  const categories = useMemo(
    () => [...new Set(itemsByTab[activeTab].map((item) => catalogCategoryLabel(item.category)))],
    [activeTab, itemsByTab],
  );
  const brands = useMemo(
    () => [...new Set(itemsByTab[activeTab].map((item) => item.brand).filter((name): name is string => Boolean(name)))],
    [activeTab, itemsByTab],
  );
  const suppliers = useMemo(
    () => [...new Set(consumableState.consumables.map((item) => item.supplierName).filter((name): name is string => Boolean(name)))],
    [consumableState.consumables],
  );
  const serviceOptions = useMemo(() => [...new Set(services.map((item) => item.name))], [services]);
  const validForOptions = useMemo(
    () => [...new Set(memberships.map((item) => item.validFor).filter(Boolean))],
    [memberships],
  );

  const applyFilters = useCallback((value: CatalogFilterValue) => {
    setFiltersByTab((current) => ({ ...current, [activeTab]: value }));
  }, [activeTab]);

  const clearFilters = useCallback(() => { applyFilters(emptyCatalogFilterForTab(activeTab)); setInactiveOnly(false); }, [activeTab, applyFilters]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return itemsByTab[activeTab].filter((item) =>
      matchesCatalogFilters(activeTab, item, activeFilters) && (!inactiveOnly || !item.isActive) &&
      (!normalized || [item.name, item.category, item.meta].some((value) => value.toLowerCase().includes(normalized))),
    );
  }, [activeFilters, activeTab, inactiveOnly, itemsByTab, query]);

  const loading = activeTab === "services" ? servicesLoading : activeTab === "products" ? productState.loading : activeTab === "consumables" ? consumableState.loading : activeTab === "memberships" ? membershipsLoading : packagesLoading;
  const error = activeTab === "services" ? servicesError : activeTab === "products" ? productState.error : activeTab === "consumables" ? consumableState.error : activeTab === "memberships" ? membershipsError : packagesError;
  const showCatalog = !error && visibleItems.length > 0;
  const activeCount = itemsByTab[activeTab].filter((item) => item.isActive).length;
  const averagePrice = activeCount ? itemsByTab[activeTab].filter((item) => item.isActive).reduce((sum, item) => sum + item.price, 0) / activeCount : null;
  const stockValue = productState.products.reduce((sum, item) => sum + item.stockQuantity * (item.supplyPrice ?? 0), 0);
  const lowStockCount = itemsByTab[activeTab].filter((item) => item.stockQuantity != null && item.stockQuantity > 0 && item.stockQuantity <= (item.lowStockThreshold ?? 0)).length;
  const canDeleteActiveTab = activeTab === "services" || activeTab === "products" || activeTab === "packages" || activeTab === "consumables";
  const activeStatusLabel = catalogStatusLabel(activeTab, "active");
  const inactiveStatusLabel = catalogStatusLabel(activeTab, "inactive");

  const refresh = async () => {
    setRefreshing(true);
    await loadCatalog(true);
    setRefreshing(false);
  };

  const goBack = () => router.canGoBack() ? router.back() : router.replace("/dashboard" as Href);

  const deleteItem = useCallback(async (item: CatalogItem) => {
    setDeletingId(item.id);

    try {
      if (activeTab === "services") {
        const action = await dispatch(deleteServiceThunk(item.id));
        if (deleteServiceThunk.rejected.match(action)) throw new Error(action.payload?.message ?? "Unable to delete service.");
        toast.showSuccess("Service deleted successfully.");
      } else if (activeTab === "products") {
        const action = await dispatch(deleteProductThunk(item.id));
        if (deleteProductThunk.rejected.match(action)) throw new Error(action.payload?.message ?? "Unable to delete product.");

        toast.showSuccess("Product deleted successfully.");
      } else if (activeTab === "consumables") {
        await consumableService.deleteConsumable(item.id);
        toast.showSuccess("Consumable deleted successfully.");
      } else if (activeTab === "packages") {
        await packageService.deletePackage(item.id);
        toast.showSuccess("Package deleted successfully.");
      }

      await loadCatalog(true);
    } catch (error) {
      Alert.alert("Unable to delete", getApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  }, [activeTab, dispatch, loadCatalog, toast]);

  const confirmDelete = useCallback((item: CatalogItem) => {
    const label = TABS.find((tab) => tab.key === activeTab)?.label ?? "item";

    Alert.alert(
      `Delete ${label}`,
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void deleteItem(item), style: "destructive", text: "Delete" },
      ],
    );
  }, [activeTab, deleteItem]);

  const onDelete = canDeleteActiveTab ? setActionItem : undefined;
  const onOpen = useCallback((item: CatalogItem) => {
    if (activeTab === "packages") setSelectedPackage(packages.find((pkg) => pkg.id === item.id) ?? null);
    else if (item.route) router.push(item.route);
  }, [activeTab, packages]);
  const isGrid = viewMode === "grid";

  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<CatalogItem>) => (
    isGrid ? (
      <CatalogGridCard
        colors={Colors}
        isDeleting={deletingId === item.id}
        item={item}
        onDelete={onDelete}
        onOpen={onOpen}
        statusLabel={item.isActive ? activeStatusLabel : inactiveStatusLabel}
        styles={styles}
      />
    ) : (
      <View style={[{ overflow: "hidden" }, index === 0 && { borderTopLeftRadius: 22, borderTopRightRadius: 22 }, index === visibleItems.length - 1 && { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }]}><CatalogTableRow colors={Colors} isDeleting={deletingId === item.id} item={item} onDelete={onDelete} onOpen={onOpen} styles={styles} /></View>
    )
  ), [Colors, activeStatusLabel, deletingId, inactiveStatusLabel, isGrid, onDelete, onOpen, styles, visibleItems.length]);

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <AppBackButton onPress={goBack} /><View style={{ flex: 1 }}><Text translate style={styles.title}>Catalog</Text><Text translate style={styles.subtitle}>Services & products</Text></View><LunoxHeaderButton />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroller} contentContainerStyle={styles.tabsContent}>
        {TABS.map((tab) => <TouchableOpacity key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab.key }} onPress={() => { setActiveTab(tab.key); setQuery(""); setInactiveOnly(false); }} style={[styles.tab, activeTab === tab.key && styles.tabActive]}><Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label} {itemsByTab[tab.key].length}</Text></TouchableOpacity>)}
      </ScrollView>
      <View style={styles.summaryRow}>
        {activeTab === "products" ? <>
          <View style={styles.summaryTile}><Text translate style={styles.summaryLabel}>Stock value</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>{formatMoney(stockValue)}</Text><Text translate style={styles.tableCell}>At supply price</Text></View>
          <TouchableOpacity accessibilityLabel="Filter low stock products" onPress={() => applyFilters({ ...activeFilters, stock: "low" })} style={styles.summaryTile}><Text translate style={styles.summaryLabel}>Low stock</Text><Text style={[styles.summaryValue, { color: pearlTones.peach.fg }]}>{lowStockCount} items</Text><Text translate style={styles.tableCell}>Tap to filter</Text></TouchableOpacity>
        </> : <>
          <View style={styles.summaryTile}><Text style={styles.summaryLabel}>{activeTab === "memberships" ? "Online memberships" : "Active " + activeTab}</Text><Text style={styles.summaryValue}>{activeCount} / {itemsByTab[activeTab].length}</Text></View>
          <View style={styles.summaryTile}><Text translate style={styles.summaryLabel}>Avg price</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>{averagePrice === null ? "—" : formatMoney(averagePrice)}</Text><Text style={styles.tableCell}>{activeTab === "memberships" ? "Across online memberships" : "Across active " + activeTab}</Text></View>
        </>}
      </View>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}><Ionicons color={pearl.muted} name="search-outline" size={19} /><TextInput accessibilityLabel={"Search " + activeTab} onChangeText={setQuery} placeholder={"Search " + activeTab} placeholderTextColor={pearl.muted} style={styles.searchInput} value={query} /></View>
        <TouchableOpacity accessibilityLabel={isGrid ? "List view" : "Grid view"} onPress={() => setViewMode(isGrid ? "list" : "grid")} style={styles.viewButton}><Ionicons name={isGrid ? "list-outline" : "grid-outline"} size={20} color={pearl.ink2} /></TouchableOpacity>
      </View>
      {activeTab === "services" ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {["All", ...categories, "Inactive " + (itemsByTab.services.length - activeCount)].map((label, index) => {
          const selected = index === 0 ? !inactiveOnly && !(activeFilters as { category: string[] }).category.length : index === categories.length + 1 ? inactiveOnly : !inactiveOnly && (activeFilters as { category: string[] }).category.includes(label);
          return <TouchableOpacity key={label} onPress={() => { setInactiveOnly(index === categories.length + 1); applyFilters({ ...(activeFilters as ServiceCatalogFilters), category: index === 0 || index === categories.length + 1 ? [] : [label] }); }} style={[styles.chip, selected && styles.chipActive]}><Text translate style={[styles.chipText, selected && { color: pearl.accentDeep }]}>{label}</Text></TouchableOpacity>;
        })}
      </ScrollView> : null}
      {activeTab === "consumables" ? <SearchableFilterDropdown pearlStyle multi={false} options={["Newest", "Lowest Stock", "Most Used", "A-Z"]} placeholder="Sort consumables" selected={[consumableSort]} onToggle={setConsumableSort} /> : null}
      <View style={styles.filterToolbar}>
        <TouchableOpacity accessibilityRole="button" onPress={() => setFilterVisible(true)} style={styles.filterButton}><Ionicons name="options-outline" size={17} color={pearl.accentDeep} /><Text style={styles.filterButtonText}>Filters{filterCount ? " · " + filterCount : ""}</Text></TouchableOpacity>
        <Text style={styles.resultCount}>{visibleItems.length} results</Text>
        {filterCount || inactiveOnly ? <TouchableOpacity onPress={() => { clearFilters(); setInactiveOnly(false); }}><Text translate style={styles.clearFilterText}>Clear</Text></TouchableOpacity> : null}
      </View>
    </View>
  );

  const listEmpty = loading && itemsByTab[activeTab].length === 0
    ? <View style={styles.state}><ActivityIndicator color={Colors.primaryText} size="large" /><Text translate style={styles.stateText}>Loading catalog...</Text></View>
    : error && !loading
      ? <View style={styles.state}><Ionicons color={Colors.error} name="alert-circle-outline" size={32} /><Text style={styles.stateTitle}>Unable to load {activeTab}</Text><Text translate style={styles.stateText}>{error}</Text><TouchableOpacity onPress={() => void loadCatalog(true)} style={styles.retryButton}><Text translate style={styles.retryText}>Retry</Text></TouchableOpacity></View>
      : !loading && !error
        ? <View style={styles.state}><Ionicons color={Colors.text2} name="file-tray-outline" size={34} /><Text style={styles.stateTitle}>No {activeTab} found</Text><Text style={styles.stateText}>{filterCount > 0 ? `No ${activeTab} match the applied filters. Clear or change them to see more.` : "Try another search or add an item from its management screen."}</Text>{filterCount > 0 ? <TouchableOpacity accessibilityRole="button" onPress={clearFilters} style={styles.retryButton}><Text translate style={styles.retryText}>Clear filters</Text></TouchableOpacity> : null}</View>
        : null;

  return (
    <PearlBackground><SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <RefreshViewport><FlatList
        key={viewMode}
        columnWrapperStyle={isGrid ? styles.catalogGridRow : undefined}
        contentContainerStyle={styles.content}
        data={showCatalog ? visibleItems : []}
        extraData={deletingId}
        initialNumToRender={CATALOG_PAGE_SIZE}
        keyboardShouldPersistTaps="handled"
        keyExtractor={keyExtractor}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={<InfiniteScrollLoader loading={loading && itemsByTab[activeTab].length > 0 && !refreshing} label={`Loading ${activeTab}`} />}
        ListHeaderComponent={listHeader}
        maxToRenderPerBatch={CATALOG_PAGE_SIZE}
        numColumns={isGrid ? 2 : 1}
        refreshControl={<RefreshControl colors={[Colors.primary]} onRefresh={() => void refresh()} refreshing={refreshing} tintColor={Colors.primary} />}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      /></RefreshViewport>
      <BottomSheet pearlStyle centered={false} title={selectedPackage?.name ?? "Package details"} visible={!!selectedPackage} onClose={() => setSelectedPackage(null)}>
        {selectedPackage ? <View style={{ gap: 12 }}>
          <Text style={styles.tableCell}>{selectedPackage.description || "No description"}</Text>
          <Text style={styles.tablePrice}>{formatMoney(packageToItem(selectedPackage).price)}</Text>
          <Text style={styles.tableCell}>{selectedPackage.category || "Uncategorized"} · {selectedPackage.status}</Text>
          <Text style={styles.tableCell}>Duration: {selectedPackage.durationMinutes} min</Text>
          <Text translate style={styles.tableName}>Included services</Text>
          {selectedPackage.serviceIds.map((id) => <Text key={id} style={styles.tableCell}>{services.find((service) => service.id === id)?.name ?? "Service unavailable"}</Text>)}
          {!selectedPackage.serviceIds.length ? <Text translate style={styles.tableCell}>No services assigned</Text> : null}
        </View> : null}
      </BottomSheet>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add to catalog" onPress={() => setAddVisible(true)} style={styles.fab}><LinearGradient pointerEvents="none" colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /><Ionicons name="add" size={21} color="#FFFFFF" /><Text translate style={styles.addButtonText}>Add</Text></TouchableOpacity>
      <BottomSheet pearlStyle centered={false} title="Add to catalog" visible={addVisible} onClose={() => setAddVisible(false)}>
        <View style={styles.choices}>{([
          { label: "Service", hint: "Haircut, facial, spa…", icon: "cut-outline", route: "/services/new" },
          { label: "Product", hint: "Retail or salon-use stock", icon: "cube-outline", route: "/stock/new" },
          { label: "Membership", hint: "Wallet, discounts or loyalty", icon: "diamond-outline", route: "/memberships/new" },
          { label: "Consumable", hint: "Stock used during services", icon: "flask-outline", route: "/consumables/new" },
        ] as const).map((choice) => <TouchableOpacity key={choice.label} style={styles.choice} onPress={() => { setAddVisible(false); router.push(choice.route as Href); }}><View style={[styles.itemIcon, { backgroundColor: pearlTones.rose.bg }]}><Ionicons name={choice.icon} size={20} color={pearl.accentDeep} /></View><View style={{ flex: 1 }}><Text translate style={styles.tableName}>{choice.label}</Text><Text style={styles.tableCell}>{choice.hint}</Text></View><Ionicons name="chevron-forward" size={18} color={pearl.muted} /></TouchableOpacity>)}</View>
      </BottomSheet>
      <BottomSheet pearlStyle centered={false} title={actionItem?.name ?? "Item actions"} visible={!!actionItem} onClose={() => setActionItem(null)}>
        {actionItem ? <View style={{ gap: 12 }}><TouchableOpacity style={styles.choice} onPress={() => { const item = actionItem; setActionItem(null); onOpen(item); }}><Text translate style={styles.tableName}>View details</Text></TouchableOpacity><TouchableOpacity style={styles.choice} onPress={() => { const item = actionItem; setActionItem(null); confirmDelete(item); }}><Ionicons name="trash-outline" size={18} color={Colors.error} /><Text translate style={{ color: Colors.error }}>Delete</Text></TouchableOpacity></View> : null}
      </BottomSheet>
      <CatalogFilterSheet brands={brands} categories={categories} label={activeTabLabel} onApply={applyFilters} onClose={() => setFilterVisible(false)} onReset={clearFilters} serviceOptions={serviceOptions} suppliers={suppliers} tab={activeTab} validForOptions={validForOptions} value={activeFilters} visible={filterVisible} />
    </SafeAreaView></PearlBackground>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1 }, content: { paddingBottom: AppLayout.contentBottomPadding + 80, paddingHorizontal: 16 },
  listHeader: { gap: 14, paddingTop: 8, paddingBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 4 },
  title: { color: pearl.ink, fontSize: 23, fontWeight: "800" }, subtitle: { color: pearl.muted, fontSize: 12, marginTop: 2 },
  tabsScroller: { backgroundColor: pearl.glass, borderColor: pearl.glassBorder, borderWidth: 1, borderRadius: 17 },
  tabsContent: { padding: 4, gap: 4 }, tab: { minHeight: 42, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderRadius: 13 },
  tabActive: { backgroundColor: pearl.glassStrong }, tabText: { fontSize: 13, fontWeight: "600", color: pearl.muted }, tabTextActive: { color: pearl.ink, fontWeight: "700" },
  summaryRow: { flexDirection: "row", gap: 10 }, summaryTile: { flex: 1, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, borderRadius: 22, padding: 14, gap: 6 },
  summaryLabel: { color: pearl.muted, fontSize: 12 }, summaryValue: { color: pearl.ink, fontSize: 23, fontWeight: "800" },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8 }, searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: pearl.glass, borderColor: pearl.glassBorder, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: pearl.ink }, viewButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder },
  chips: { flexDirection: "row", gap: 8 }, chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: pearl.glass, borderColor: pearl.glassBorder, borderWidth: 1 }, chipActive: { backgroundColor: pearl.accentWash, borderColor: pearl.accentTint }, chipText: { color: pearl.ink2, fontSize: 12, fontWeight: "600" },
  filterToolbar: { flexDirection: "row", alignItems: "center", gap: 10 }, filterButton: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: pearl.glass, borderColor: pearl.glassBorder, borderWidth: 1 },
  filterButtonText: { color: pearl.accentDeep, fontSize: 12, fontWeight: "600" }, clearFilterText: { color: pearl.accentDeep, fontSize: 12, fontWeight: "700" }, resultCount: { flex: 1, color: pearl.muted, fontSize: 11 },
  tableRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 82, padding: 12, backgroundColor: pearl.glass, borderBottomWidth: 1, borderColor: pearl.divider },
  itemIcon: { width: 40, height: 40, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  tableName: { color: pearl.ink, fontSize: 14, fontWeight: "700" }, tableCell: { color: pearl.muted, fontSize: 12, lineHeight: 18 }, tablePrice: { color: pearl.ink, fontSize: 13, fontWeight: "700" },
  stockPill: { borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, fontWeight: "600" }, tableDeleteButton: { width: 22, minHeight: 44, alignItems: "center", justifyContent: "center" },
  catalogGridRow: { gap: 10, marginBottom: 10 }, catalogGridCard: { flexBasis: "46%", flexGrow: 1, minWidth: 120, backgroundColor: pearl.glass, borderColor: pearl.glassBorder, borderWidth: 1, borderRadius: 22, padding: 14 }, catalogGridCopy: { gap: 7, flex: 1 },
  fab: { position: "absolute", right: 20, bottom: 28, borderRadius: 18, overflow: "hidden", minHeight: 52, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, addButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  choices: { borderRadius: 22, overflow: "hidden", backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder }, choice: { flexDirection: "row", gap: 12, alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: pearl.divider },
  state: { alignItems: "center", minHeight: 240, padding: 24, gap: 10 }, stateTitle: { color: pearl.ink, fontSize: 17, fontWeight: "700", textAlign: "center" }, stateText: { color: pearl.muted, fontSize: 13, lineHeight: 20, textAlign: "center" }, retryButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: Colors.primary }, retryText: { color: pearl.accentDeep, fontSize: 14, fontWeight: "700" },
});
