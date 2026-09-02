import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout } from "@/constants/layout";
import { type ThemeColors } from "@/constants/theme";
import { fetchConsumablesThunk } from "@/middleware/consumable/consumable.thunk";
import { fetchMembershipsThunk } from "@/middleware/membership/membership.thunk";
import { deleteProductThunk, fetchProductsThunk } from "@/middleware/product/product.thunk";
import { deleteServiceThunk, fetchServicesThunk } from "@/middleware/service/service.thunk";
import { getApiErrorMessage } from "@/services/api";
import { consumableService } from "@/services/consumable.service";
import { packageService } from "@/services/package.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectConsumableState } from "@/store/consumable/consumable.slice";
import {
  selectMemberships,
  selectMembershipsError,
  selectMembershipsLoading,
} from "@/store/membership/membership.slice";
import { selectProductState } from "@/store/product/product.slice";
import {
  selectServices,
  selectServicesError,
  selectServicesLoading,
} from "@/store/service/service.slice";
import { useAppToast } from "@/hooks/useAppToast";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { Membership } from "@/types/membership";
import type { ConsumableListItem } from "@/types/consumable";
import type { PackageListItem } from "@/types/package";
import type { Product } from "@/types/product";
import type { ServiceListItem } from "@/types/service";

type CatalogTab = "services" | "products" | "packages" | "memberships" | "consumables";
type CatalogItem = {
  category: string;
  id: string;
  isActive: boolean;
  meta: string;
  name: string;
  price: number;
  route?: Href;
};

const TABS: { icon: keyof typeof Ionicons.glyphMap; key: CatalogTab; label: string }[] = [
  { icon: "cut-outline", key: "services", label: "Services" },
  { icon: "cube-outline", key: "products", label: "Products" },
  { icon: "flask-outline", key: "consumables", label: "Consumable Inventory" },
  { icon: "albums-outline", key: "packages", label: "Packages" },
  { icon: "diamond-outline", key: "memberships", label: "Memberships" },
];

const CATALOG_PAGE_SIZE = 10;

const formatMoney = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

const serviceToItem = (item: ServiceListItem): CatalogItem => ({
  category: item.category ?? "Uncategorized",
  id: item.id,
  isActive: item.isActive,
  meta: item.durationMinutes ? `${item.durationMinutes} min` : "Duration not set",
  name: item.name,
  price: item.price,
  route: `/services/${item.id}` as Href,
});

const productToItem = (item: Product): CatalogItem => ({
  category: item.category ?? item.brandName ?? "Uncategorized",
  id: item.id,
  isActive: item.isActive,
  meta: `${item.stockQuantity} in stock${item.sku ? ` · ${item.sku}` : ""}`,
  name: item.name,
  price: item.retailPrice ?? item.price,
  route: `/stock/${item.id}` as Href,
});

const consumableToItem = (item: ConsumableListItem): CatalogItem => ({
  category: item.categoryName ?? item.brandName ?? "Consumable Inventory",
  id: item.id,
  isActive: item.isActive,
  meta: `${item.amount} ${item.measureUnit ?? ""}${item.status ? ` · ${item.status.replace(/_/g, " ")}` : ""}`.trim(),
  name: item.name,
  price: item.supplyPrice ?? item.retailPrice ?? 0,
  route: `/consumables/${item.id}` as Href,
});

const packageToItem = (item: PackageListItem): CatalogItem => ({
  category: item.category ?? "Service package",
  id: item.id,
  isActive: item.status.toLowerCase() === "active",
  meta: `${item.serviceIds.length} service${item.serviceIds.length === 1 ? "" : "s"}`,
  name: item.name,
  price: Math.max(0, item.basePrice - item.discountValue),
});

const membershipToItem = (item: Membership): CatalogItem => ({
  category: `${item.sessionType} membership`,
  id: item.id,
  isActive: item.enableOnlineSales || item.enableOnlineRedemption,
  meta: item.validFor,
  name: item.name,
  price: item.price,
  route: `/memberships/${item.id}` as Href,
});

function CatalogTable({ deletingId, items, onDelete }: { deletingId?: string | null; items: CatalogItem[]; onDelete?: (item: CatalogItem) => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}><Text style={[styles.tableHeaderText, styles.nameColumn]}>Name</Text><Text style={[styles.tableHeaderText, styles.categoryColumn]}>Category</Text><Text style={[styles.tableHeaderText, styles.priceColumn]}>Price</Text>{onDelete ? <Text style={[styles.tableHeaderText, styles.actionColumn]}>Action</Text> : null}</View>
      {items.map((item) => (
        <TouchableOpacity activeOpacity={item.route ? 0.8 : 1} disabled={!item.route} key={item.id} onPress={() => item.route && router.push(item.route)} style={styles.tableRow}>
          <View style={styles.nameColumn}><Text numberOfLines={2} style={styles.tableName}>{item.name}</Text></View>
          <Text numberOfLines={2} style={[styles.tableCell, styles.categoryColumn]}>{item.category}</Text>
          <Text numberOfLines={1} style={[styles.tablePrice, styles.priceColumn]}>{formatMoney(item.price)}</Text>
          {onDelete ? (
            <TouchableOpacity accessibilityLabel={`Delete ${item.name}`} disabled={deletingId === item.id} hitSlop={10} onPress={() => onDelete(item)} style={styles.tableDeleteButton}>
              {deletingId === item.id ? <ActivityIndicator color={Colors.error} size="small" /> : <Ionicons color={Colors.error} name="trash-outline" size={18} />}
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function CatalogScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const services = useAppSelector(selectServices);
  const servicesLoading = useAppSelector(selectServicesLoading);
  const servicesError = useAppSelector(selectServicesError);
  const productState = useAppSelector(selectProductState);
  const consumableState = useAppSelector(selectConsumableState);
  const memberships = useAppSelector(selectMemberships);
  const membershipsLoading = useAppSelector(selectMembershipsLoading);
  const membershipsError = useAppSelector(selectMembershipsError);
  const [activeTab, setActiveTab] = useState<CatalogTab>("services");
  const [query, setQuery] = useState("");
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CATALOG_PAGE_SIZE);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    setPackagesLoading(true);
    setPackagesError(null);
    try {
      const response = await packageService.getPackages({ limit: 100 });
      setPackages(response.items);
    } catch (error) {
      setPackagesError(error instanceof Error ? error.message : "Unable to load packages.");
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async (refresh = false) => {
    await Promise.allSettled([
      dispatch(fetchServicesThunk({ limit: 100, offset: 0, refresh, reset: true, search: "" })),
      dispatch(fetchProductsThunk({ limit: 100, offset: 0, refresh, reset: true, search: "" })),
      dispatch(fetchConsumablesThunk({ limit: 100, page: 1, refresh, reset: true, search: "" })),
      dispatch(fetchMembershipsThunk({ limit: 100, page: 1, refresh, reset: true })),
      loadPackages(),
    ]);
  }, [dispatch, loadPackages]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const itemsByTab = useMemo<Record<CatalogTab, CatalogItem[]>>(() => ({
    consumables: consumableState.consumables.map(consumableToItem),
    memberships: memberships.map(membershipToItem),
    packages: packages.map(packageToItem),
    products: productState.products.map(productToItem),
    services: services.map(serviceToItem),
  }), [consumableState.consumables, memberships, packages, productState.products, services]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return itemsByTab[activeTab];
    return itemsByTab[activeTab].filter((item) => [item.name, item.category, item.meta].some((value) => value.toLowerCase().includes(normalized)));
  }, [activeTab, itemsByTab, query]);

  useEffect(() => {
    setVisibleCount(CATALOG_PAGE_SIZE);
  }, [activeTab, query]);

  const displayedItems = useMemo(
    () => visibleItems.slice(0, visibleCount),
    [visibleCount, visibleItems],
  );

  const loading = activeTab === "services" ? servicesLoading : activeTab === "products" ? productState.loading : activeTab === "consumables" ? consumableState.loading : activeTab === "memberships" ? membershipsLoading : packagesLoading;
  const error = activeTab === "services" ? servicesError : activeTab === "products" ? productState.error : activeTab === "consumables" ? consumableState.error : activeTab === "memberships" ? membershipsError : packagesError;
  const showCatalog = !error && visibleItems.length > 0;
  const activeCount = itemsByTab[activeTab].filter((item) => item.isActive).length;
  const totalValue = itemsByTab[activeTab].reduce((total, item) => total + item.price, 0);
  const addRoute = activeTab === "consumables" ? "/consumables/new" : null;
  const canDeleteActiveTab = activeTab === "services" || activeTab === "products" || activeTab === "packages" || activeTab === "consumables";

  const refresh = async () => {
    setRefreshing(true);
    await loadCatalog(true);
    setRefreshing(false);
  };

  const goBack = () => router.canGoBack() ? router.back() : router.replace("/dashboard" as Href);

  const deleteItem = async (item: CatalogItem) => {
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
      setVisibleCount((current) => Math.min(current, Math.max(CATALOG_PAGE_SIZE, visibleItems.length - 1)));
    } catch (error) {
      Alert.alert("Unable to delete", getApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (item: CatalogItem) => {
    const label = TABS.find((tab) => tab.key === activeTab)?.label ?? "item";

    Alert.alert(
      `Delete ${label}`,
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void deleteItem(item), style: "destructive", text: "Delete" },
      ],
    );
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={({ nativeEvent }) => {
          const distanceFromBottom = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;

          if (distanceFromBottom < 240 && visibleCount < visibleItems.length) {
            setVisibleCount((current) => Math.min(current + CATALOG_PAGE_SIZE, visibleItems.length));
          }
        }}
        refreshControl={<RefreshControl colors={[Colors.primary]} onRefresh={() => void refresh()} refreshing={refreshing} tintColor={Colors.primary} />}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppBackButton onPress={goBack} />
          <Text style={styles.title}>Catalog</Text>
        </View>

        <ScrollView contentContainerStyle={styles.tabsContent} horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroller}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab.key} onPress={() => { setActiveTab(tab.key); setQuery(""); }} style={[styles.tab, activeTab === tab.key && styles.tabActive]}>
              <Ionicons color={activeTab === tab.key ? Colors.primary : Colors.text2} name={tab.icon} size={17} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}><Text style={styles.summaryLabel}>Total {TABS.find((tab) => tab.key === activeTab)?.label}</Text><Text style={styles.summaryValue}>{itemsByTab[activeTab].length}</Text></View>
          <View style={styles.summaryTile}><Text style={styles.summaryLabel}>Catalog Value</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>{formatMoney(totalValue)}</Text></View>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchBox}><Ionicons color={Colors.text2} name="search-outline" size={20} /><TextInput onChangeText={setQuery} placeholder={`Search ${activeTab}`} placeholderTextColor={Colors.placeholder} style={styles.searchInput} value={query} /></View>
          <View style={styles.activeCount}><View style={styles.activeDot} /><Text style={styles.activeCountText}>{activeCount} active</Text></View>
        </View>

        {addRoute ? (
          <TouchableOpacity activeOpacity={0.86} onPress={() => router.push(addRoute as Href)} style={styles.addButton}>
            <Ionicons color="#FFFFFF" name="add" size={19} />
            <Text style={styles.addButtonText}>Add Consumable</Text>
          </TouchableOpacity>
        ) : null}

        {loading && itemsByTab[activeTab].length === 0 ? <View style={styles.state}><ActivityIndicator color={Colors.primary} size="large" /><Text style={styles.stateText}>Loading catalog...</Text></View> : null}
        {error && !loading ? <View style={styles.state}><Ionicons color={Colors.error} name="alert-circle-outline" size={32} /><Text style={styles.stateTitle}>Unable to load {activeTab}</Text><Text style={styles.stateText}>{error}</Text><TouchableOpacity onPress={() => void loadCatalog(true)} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : null}
        {!loading && !error && visibleItems.length === 0 ? <View style={styles.state}><Ionicons color={Colors.text2} name="file-tray-outline" size={34} /><Text style={styles.stateTitle}>No {activeTab} found</Text><Text style={styles.stateText}>Try another search or add an item from its management screen.</Text></View> : null}
        {showCatalog ? (
          <CatalogTable deletingId={deletingId} items={displayedItems} onDelete={canDeleteActiveTab ? confirmDelete : undefined} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  content: { paddingBottom: AppLayout.contentBottomPadding },
  header: { alignItems: "center", flexDirection: "row", minHeight: 66, paddingHorizontal: 16 },
  title: { color: Colors.heading, flex: 1, fontFamily: "serif", fontSize: 29, fontWeight: "800", marginLeft: 12 },
  tabsScroller: { borderBottomColor: Colors.border, borderBottomWidth: 1 },
  tabsContent: { paddingHorizontal: 12 },
  tab: { alignItems: "center", borderBottomColor: "transparent", borderBottomWidth: 3, flexDirection: "row", gap: 6, minHeight: 58, paddingHorizontal: 15 },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { color: Colors.text2, fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: Colors.primary, fontWeight: "800" },
  summaryRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 18 },
  summaryTile: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 94, padding: 15 },
  summaryLabel: { color: Colors.text2, fontSize: 13 },
  summaryValue: { color: Colors.heading, fontSize: 23, fontWeight: "800", marginTop: 9 },
  toolbar: { alignItems: "center", flexDirection: "row", gap: 10, padding: 16 },
  searchBox: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: "row", minHeight: 48, paddingHorizontal: 13 },
  searchInput: { color: Colors.heading, flex: 1, fontSize: 15, paddingHorizontal: 9, paddingVertical: 10 },
  activeCount: { alignItems: "center", borderColor: Colors.border, borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 48, paddingHorizontal: 11 },
  activeDot: { backgroundColor: Colors.success, borderRadius: 4, height: 8, width: 8 },
  activeCountText: { color: Colors.text2, fontSize: 12, fontWeight: "700" },
  addButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: Colors.primaryDark, borderRadius: 8, flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 16, marginHorizontal: 16, minHeight: 48, paddingHorizontal: 18 },
  addButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  table: { backgroundColor: Colors.card, borderBottomColor: Colors.border, borderTopColor: Colors.border, borderWidth: 0, borderBottomWidth: 1, borderTopWidth: 1 },
  tableHeader: { backgroundColor: Colors.primary, flexDirection: "row", paddingHorizontal: 16, paddingVertical: 15 },
  tableHeaderText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  tableRow: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", minHeight: 84, paddingHorizontal: 16, paddingVertical: 12 },
  nameColumn: { paddingRight: 8, width: "34%" },
  categoryColumn: { paddingRight: 8, width: "30%" },
  priceColumn: { textAlign: "right", width: "24%" },
  actionColumn: { textAlign: "right", width: "12%" },
  tableName: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  tableCell: { color: Colors.text2, fontSize: 13 },
  tablePrice: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
  tableDeleteButton: { alignItems: "flex-end", justifyContent: "center", minHeight: 44, width: "12%" },
  state: { alignItems: "center", minHeight: 260, paddingHorizontal: 30, paddingTop: 55 },
  stateTitle: { color: Colors.heading, fontSize: 18, fontWeight: "800", marginTop: 14, textAlign: "center" },
  stateText: { color: Colors.text2, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: "center" },
  retryButton: { borderColor: Colors.primary, borderRadius: 8, borderWidth: 1, marginTop: 18, paddingHorizontal: 24, paddingVertical: 11 },
  retryText: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
});
