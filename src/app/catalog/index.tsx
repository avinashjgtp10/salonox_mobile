import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout } from "@/constants/layout";
import { type ThemeColors } from "@/constants/theme";
import { fetchMembershipsThunk } from "@/middleware/membership/membership.thunk";
import { fetchProductsThunk } from "@/middleware/product/product.thunk";
import { fetchServicesThunk } from "@/middleware/service/service.thunk";
import { packageService } from "@/services/package.service";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
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
import { useThemeColors } from "@/theme/ThemeProvider";
import type { Membership } from "@/types/membership";
import type { PackageListItem } from "@/types/package";
import type { Product } from "@/types/product";
import type { ServiceListItem } from "@/types/service";

type CatalogTab = "services" | "products" | "packages" | "memberships";
type CatalogView = "table" | "card";

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
  { icon: "albums-outline", key: "packages", label: "Packages" },
  { icon: "diamond-outline", key: "memberships", label: "Memberships" },
];

let rememberedCatalogView: CatalogView = "table";

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

function ViewToggle({ onChange, value }: { onChange: (view: CatalogView) => void; value: CatalogView }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View accessibilityLabel="Catalog view" style={styles.viewToggle}>
      <TouchableOpacity accessibilityLabel="Table view" onPress={() => onChange("table")} style={[styles.viewToggleButton, value === "table" && styles.viewToggleButtonActive]}>
        <Ionicons color={value === "table" ? Colors.primary : Colors.text2} name="list-outline" size={21} />
      </TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Card view" onPress={() => onChange("card")} style={[styles.viewToggleButton, value === "card" && styles.viewToggleButtonActive]}>
        <Ionicons color={value === "card" ? Colors.primary : Colors.text2} name="grid-outline" size={19} />
      </TouchableOpacity>
    </View>
  );
}

function CatalogCard({ item }: { item: CatalogItem }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity activeOpacity={item.route ? 0.82 : 1} disabled={!item.route} onPress={() => item.route && router.push(item.route)} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text numberOfLines={2} style={styles.cardTitle}>{item.name}</Text>
          <Text numberOfLines={1} style={styles.cardCategory}>{item.category}</Text>
        </View>
        <View style={[styles.statusBadge, !item.isActive && styles.statusBadgeInactive]}>
          <Text style={[styles.statusText, !item.isActive && styles.statusTextInactive]}>{item.isActive ? "Active" : "Inactive"}</Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardDetails}>
        <View style={styles.detailBlock}><Text style={styles.detailLabel}>PRICE</Text><Text style={styles.detailValue}>{formatMoney(item.price)}</Text></View>
        <View style={styles.detailBlock}><Text style={styles.detailLabel}>DETAILS</Text><Text numberOfLines={2} style={styles.detailValue}>{item.meta}</Text></View>
      </View>
    </TouchableOpacity>
  );
}

function CatalogTable({ items }: { items: CatalogItem[] }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}><Text style={[styles.tableHeaderText, styles.nameColumn]}>Name</Text><Text style={[styles.tableHeaderText, styles.categoryColumn]}>Category</Text><Text style={[styles.tableHeaderText, styles.priceColumn]}>Price</Text></View>
      {items.map((item) => (
        <TouchableOpacity activeOpacity={item.route ? 0.8 : 1} disabled={!item.route} key={item.id} onPress={() => item.route && router.push(item.route)} style={styles.tableRow}>
          <View style={styles.nameColumn}><Text numberOfLines={2} style={styles.tableName}>{item.name}</Text><Text style={[styles.tableStatus, !item.isActive && styles.tableStatusInactive]}>{item.isActive ? "Active" : "Inactive"}</Text></View>
          <Text numberOfLines={2} style={[styles.tableCell, styles.categoryColumn]}>{item.category}</Text>
          <Text numberOfLines={1} style={[styles.tablePrice, styles.priceColumn]}>{formatMoney(item.price)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function CatalogScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const services = useAppSelector(selectServices);
  const servicesLoading = useAppSelector(selectServicesLoading);
  const servicesError = useAppSelector(selectServicesError);
  const productState = useAppSelector(selectProductState);
  const memberships = useAppSelector(selectMemberships);
  const membershipsLoading = useAppSelector(selectMembershipsLoading);
  const membershipsError = useAppSelector(selectMembershipsError);
  const [activeTab, setActiveTab] = useState<CatalogTab>("services");
  const [view, setView] = useState<CatalogView>(rememberedCatalogView);
  const [query, setQuery] = useState("");
  const [packages, setPackages] = useState<PackageListItem[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      dispatch(fetchMembershipsThunk({ limit: 100, page: 1, refresh, reset: true })),
      loadPackages(),
    ]);
  }, [dispatch, loadPackages]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const changeView = (next: CatalogView) => {
    rememberedCatalogView = next;
    setView(next);
  };

  const itemsByTab = useMemo<Record<CatalogTab, CatalogItem[]>>(() => ({
    memberships: memberships.map(membershipToItem),
    packages: packages.map(packageToItem),
    products: productState.products.map(productToItem),
    services: services.map(serviceToItem),
  }), [memberships, packages, productState.products, services]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return itemsByTab[activeTab];
    return itemsByTab[activeTab].filter((item) => [item.name, item.category, item.meta].some((value) => value.toLowerCase().includes(normalized)));
  }, [activeTab, itemsByTab, query]);

  const loading = activeTab === "services" ? servicesLoading : activeTab === "products" ? productState.loading : activeTab === "memberships" ? membershipsLoading : packagesLoading;
  const error = activeTab === "services" ? servicesError : activeTab === "products" ? productState.error : activeTab === "memberships" ? membershipsError : packagesError;
  const activeCount = itemsByTab[activeTab].filter((item) => item.isActive).length;
  const totalValue = itemsByTab[activeTab].reduce((total, item) => total + item.price, 0);

  const refresh = async () => {
    setRefreshing(true);
    await loadCatalog(true);
    setRefreshing(false);
  };

  const goBack = () => router.canGoBack() ? router.back() : router.replace("/dashboard" as Href);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl colors={[Colors.primary]} onRefresh={() => void refresh()} refreshing={refreshing} tintColor={Colors.primary} />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity hitSlop={12} onPress={goBack} style={styles.headerButton}><Ionicons color={Colors.heading} name="arrow-back" size={26} /></TouchableOpacity>
          <Text style={styles.title}>Catalog</Text>
          <ViewToggle onChange={changeView} value={view} />
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

        {loading && itemsByTab[activeTab].length === 0 ? <View style={styles.state}><ActivityIndicator color={Colors.primary} size="large" /><Text style={styles.stateText}>Loading catalog...</Text></View> : null}
        {error && !loading ? <View style={styles.state}><Ionicons color={Colors.error} name="alert-circle-outline" size={32} /><Text style={styles.stateTitle}>Unable to load {activeTab}</Text><Text style={styles.stateText}>{error}</Text><TouchableOpacity onPress={() => void loadCatalog(true)} style={styles.retryButton}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : null}
        {!loading && !error && visibleItems.length === 0 ? <View style={styles.state}><Ionicons color={Colors.text2} name="file-tray-outline" size={34} /><Text style={styles.stateTitle}>No {activeTab} found</Text><Text style={styles.stateText}>Try another search or add an item from its management screen.</Text></View> : null}
        {!error && visibleItems.length > 0 ? view === "table" ? <CatalogTable items={visibleItems} /> : <View style={styles.cardList}>{visibleItems.map((item) => <CatalogCard item={item} key={item.id} />)}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  content: { paddingBottom: AppLayout.contentBottomPadding },
  header: { alignItems: "center", flexDirection: "row", minHeight: 66, paddingHorizontal: 16 },
  headerButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  title: { color: Colors.heading, flex: 1, fontFamily: "serif", fontSize: 29, fontWeight: "800", marginLeft: 4 },
  viewToggle: { borderColor: Colors.border, borderRadius: 8, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  viewToggleButton: { alignItems: "center", height: 40, justifyContent: "center", width: 42 },
  viewToggleButtonActive: { backgroundColor: Colors.backgroundSelected },
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
  table: { backgroundColor: Colors.card, borderBottomColor: Colors.border, borderTopColor: Colors.border, borderWidth: 0, borderBottomWidth: 1, borderTopWidth: 1 },
  tableHeader: { backgroundColor: Colors.primary, flexDirection: "row", paddingHorizontal: 16, paddingVertical: 15 },
  tableHeaderText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  tableRow: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", minHeight: 84, paddingHorizontal: 16, paddingVertical: 12 },
  nameColumn: { paddingRight: 8, width: "40%" },
  categoryColumn: { paddingRight: 8, width: "34%" },
  priceColumn: { textAlign: "right", width: "26%" },
  tableName: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  tableCell: { color: Colors.text2, fontSize: 13 },
  tablePrice: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
  tableStatus: { color: Colors.success, fontSize: 11, fontWeight: "700", marginTop: 5 },
  tableStatusInactive: { color: Colors.text2 },
  cardList: { gap: 14, paddingHorizontal: 16 },
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 8, borderWidth: 1, elevation: 2, overflow: "hidden", shadowColor: Colors.shadow, shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.08, shadowRadius: 7 },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10, padding: 16 },
  cardTitleWrap: { flex: 1 },
  cardTitle: { color: Colors.heading, fontSize: 17, fontWeight: "800" },
  cardCategory: { color: Colors.text2, fontSize: 13, marginTop: 5 },
  statusBadge: { backgroundColor: Colors.successBg, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  statusBadgeInactive: { backgroundColor: Colors.bg2 },
  statusText: { color: Colors.success, fontSize: 12, fontWeight: "700" },
  statusTextInactive: { color: Colors.text2 },
  cardDivider: { backgroundColor: Colors.border, height: 1 },
  cardDetails: { flexDirection: "row", gap: 12, padding: 16 },
  detailBlock: { flex: 1 },
  detailLabel: { color: Colors.text2, fontSize: 10, fontWeight: "700" },
  detailValue: { color: Colors.heading, fontSize: 14, fontWeight: "700", marginTop: 6 },
  state: { alignItems: "center", minHeight: 260, paddingHorizontal: 30, paddingTop: 55 },
  stateTitle: { color: Colors.heading, fontSize: 18, fontWeight: "800", marginTop: 14, textAlign: "center" },
  stateText: { color: Colors.text2, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: "center" },
  retryButton: { borderColor: Colors.primary, borderRadius: 8, borderWidth: 1, marginTop: 18, paddingHorizontal: 24, paddingVertical: 11 },
  retryText: { color: Colors.primary, fontSize: 14, fontWeight: "700" },
});
