import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBackButton, AppBackButtonPlaceholder } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import {
  ConsumableFilterSheet,
  type ConsumableFilterValue,
} from "@/features/consumables/components/ConsumableFilterSheet";
import { fetchConsumablesThunk } from "@/middleware/consumable/consumable.thunk";
import { selectConsumableState } from "@/store/consumable/consumable.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ConsumableListItem } from "@/types/consumable";
import { canViewConsumableInventory } from "@/utils/permissions";

const money = (value: number) => `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const DEFAULT_FILTERS: ConsumableFilterValue = {
  productType: [],
  sortBy: "name",
  sortOrder: "asc",
  status: [],
};

export default function ConsumablesScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const currentUser = useAppSelector(selectCurrentUser);
  const canView = canViewConsumableInventory(currentUser);
  const state = useAppSelector(selectConsumableState);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<ConsumableFilterValue>(DEFAULT_FILTERS);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!canView) {
      return;
    }

    void dispatch(
      fetchConsumablesThunk({
        page: 1,
        productType: filters.productType.length ? filters.productType : undefined,
        reset: true,
        search: debouncedQuery,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        status: filters.status.length ? filters.status : undefined,
      }),
    );
  }, [canView, debouncedQuery, dispatch, filters]);

  const availableProductTypes = useMemo(
    () =>
      Array.from(
        new Set(state.consumables.map((item) => item.productType).filter((value): value is string => Boolean(value))),
      ).sort((a, b) => a.localeCompare(b)),
    [state.consumables],
  );

  const activeFilterCount = filters.status.length + filters.productType.length;

  const refresh = () =>
    void dispatch(
      fetchConsumablesThunk({
        page: 1,
        productType: filters.productType.length ? filters.productType : undefined,
        refresh: true,
        search: debouncedQuery,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        status: filters.status.length ? filters.status : undefined,
      }),
    );

  const loadMore = () => {
    if (!state.loading && !state.loadingMore && !state.refreshing && state.pagination.hasMore) {
      void dispatch(fetchConsumablesThunk({ page: state.pagination.page + 1 }));
    }
  };

  if (!canView) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <AppStatusBar />
        <View style={styles.header}>
          <AppBackButton fallbackHref="/more" />
          <Text style={styles.title}>Consumables</Text>
          <AppBackButtonPlaceholder />
        </View>
        <EmptyState
          accent="indigo"
          description="You don't have permission to view Consumable Inventory. Ask an owner or manager for access."
          icon="lock-closed-outline"
          title="Access restricted"
        />
      </SafeAreaView>
    );
  }

  const header = (
    <View>
      <View style={styles.header}>
        <AppBackButton fallbackHref="/more" />
        <Text style={styles.title}>Consumables</Text>
        <TouchableOpacity
          accessibilityLabel="Usage history"
          onPress={() => router.push("/consumables/usage-history" as Href)}
          style={styles.iconButton}
        >
          <Ionicons name="time-outline" size={19} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.kpiGrid}>
        <KpiCard label="Total" value={String(state.kpis.totalConsumables)} />
        <KpiCard label="Low Stock" value={String(state.kpis.lowStockCount)} warning={state.kpis.lowStockCount > 0} />
        <KpiCard
          label="Out of Stock"
          value={String(state.kpis.outOfStockCount)}
          warning={state.kpis.outOfStockCount > 0}
        />
        <KpiCard label="Available Stock" value={state.kpis.totalAvailableStock.toLocaleString("en-IN")} />
      </View>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={19} color={Colors.text2} />
        <TextInput
          onChangeText={setQuery}
          placeholder="Search consumables"
          placeholderTextColor={Colors.placeholder}
          style={styles.searchInput}
          value={query}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={Colors.placeholder} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => setIsFilterSheetVisible(true)}
        style={styles.filterButton}
      >
        <Ionicons name="options-outline" size={16} color={Colors.primaryDark} />
        <Text style={styles.filterButtonText}>Filters &amp; Sort</Text>
        {activeFilterCount > 0 ? (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <View style={styles.resultRow}>
        <Text style={styles.resultText}>
          {state.pagination.totalRecords || state.consumables.length} consumable
          {(state.pagination.totalRecords || state.consumables.length) === 1 ? "" : "s"}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={styles.content}
        data={state.consumables}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          state.loading ? (
            <LoadingCards />
          ) : (
            <Empty
              error={state.error}
              onRetry={refresh}
              searching={Boolean(query || activeFilterCount > 0)}
            />
          )
        }
        ListFooterComponent={
          <View style={{ paddingBottom: 40 + insets.bottom }}>
            {state.consumables.length > 0 ? (
              <PaginationControls
                currentPage={state.pagination.page}
                hasNextPage={state.pagination.hasMore}
                hasPreviousPage={false}
                loading={state.loadingMore}
                onNext={state.pagination.hasMore ? loadMore : undefined}
                totalItems={state.pagination.totalRecords || state.consumables.length}
                totalPages={Math.max(1, Math.ceil((state.pagination.totalRecords || state.consumables.length) / state.pagination.limit))}
                visibleItems={state.consumables.length}
              />
            ) : null}
          </View>
        }
        ListHeaderComponent={header}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl colors={[Colors.primary]} onRefresh={refresh} refreshing={state.refreshing} tintColor={Colors.primary} />
        }
        renderItem={({ item }) => <ConsumableCard item={item} />}
        showsVerticalScrollIndicator={false}
      />

      <ConsumableFilterSheet
        availableProductTypes={availableProductTypes}
        onApply={setFilters}
        onClose={() => setIsFilterSheetVisible(false)}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        value={filters}
        visible={isFilterSheetVisible}
      />
    </SafeAreaView>
  );
}

function KpiCard({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.kpiCard}>
      <Text numberOfLines={1} style={[styles.kpiValue, warning && styles.warning]}>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function ConsumableCard({ item }: { item: ConsumableListItem }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  // Prefer the backend-computed status ("healthy" / "low_stock" /
  // "out_of_stock") over re-deriving it from amount vs qtyAlert — only
  // falls back to a client guess when status is missing.
  const outOfStock = item.status ? item.status === "out_of_stock" : item.amount <= 0;
  const lowStock = item.status ? item.status === "low_stock" : !outOfStock && item.amount <= item.qtyAlert;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => router.push(`/consumables/${item.id}` as Href)}
      style={styles.card}
    >
      <View style={styles.productIcon}>
        <Ionicons name="flask-outline" size={21} color={Colors.primaryDark} />
      </View>
      <View style={styles.cardCopy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.productName}>
            {item.name}
          </Text>
          <View style={[styles.badge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.badgeText, !item.isActive && styles.inactiveText]}>
              {item.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={styles.meta}>
          {[item.brandName, item.categoryName, item.productType].filter(Boolean).join("  |  ") || "Uncategorized"}
        </Text>
        <View style={styles.cardBottom}>
          <Text style={styles.price}>{item.retailPrice != null ? money(item.retailPrice) : "—"}</Text>
          <Text style={[styles.stock, (lowStock || outOfStock) && styles.warning]}>
            {outOfStock ? "Out of stock" : lowStock ? "Low: " : "Stock: "}
            {outOfStock ? "" : `${item.amount} ${item.measureUnit ?? ""}`.trim()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function LoadingCards() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View>
      {[1, 2, 3, 4].map((key) => (
        <View key={key} style={styles.skeleton}>
          <SkeletonBlock height={46} width={46} />
          <View style={styles.skeletonCopy}>
            <SkeletonBlock height={14} width="58%" />
            <View style={{ height: 10 }} />
            <SkeletonBlock height={10} width="82%" />
          </View>
        </View>
      ))}
    </View>
  );
}

function Empty({ error, onRetry, searching }: { error: string | null; onRetry: () => void; searching: boolean }) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  return (
    <EmptyState
      accent="indigo"
      description={searching ? "Try changing your search or filters." : "No consumables found for this salon yet."}
      icon="flask-outline"
      title="No consumables found"
    />
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { backgroundColor: Colors.bg, flex: 1 },
    content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: Spacing.md,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.control,
      borderWidth: 1,
      height: AppLayout.headerActionSize,
      justifyContent: "center",
      width: AppLayout.headerActionSize,
    },
    title: { color: Colors.heading, fontSize: 24, fontWeight: "800" },
    kpiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    kpiCard: {
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      flexBasis: "48%",
      flexGrow: 1,
      padding: Spacing.md,
    },
    kpiValue: { color: Colors.heading, fontSize: 18, fontWeight: "800" },
    kpiLabel: { color: Colors.text2, fontSize: 11, fontWeight: "700", marginTop: 4 },
    search: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.search,
      borderWidth: 1,
      flexDirection: "row",
      gap: Spacing.sm,
      minHeight: 52,
      paddingHorizontal: Spacing.md,
    },
    searchInput: { color: Colors.heading, flex: 1, fontSize: 15, minHeight: 50 },
    filterButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.pill,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      marginTop: Spacing.md,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    filterButtonText: { color: Colors.primaryDark, fontSize: 12, fontWeight: "800" },
    filterBadge: {
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: Radius.full,
      height: 18,
      justifyContent: "center",
      minWidth: 18,
      paddingHorizontal: 4,
    },
    filterBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
    resultRow: { marginBottom: Spacing.sm, marginTop: Spacing.md },
    resultText: { color: Colors.text2, fontSize: 12 },
    card: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      flexDirection: "row",
      marginBottom: Spacing.sm,
      padding: Spacing.md,
    },
    productIcon: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderRadius: AppRadius.control,
      height: 46,
      justifyContent: "center",
      width: 46,
    },
    cardCopy: { flex: 1, marginLeft: Spacing.md, minWidth: 0 },
    nameRow: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
    productName: { color: Colors.heading, flex: 1, fontSize: 15, fontWeight: "800" },
    badge: { backgroundColor: Colors.successBg, borderRadius: AppRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
    activeBadge: { backgroundColor: Colors.successBg },
    inactiveBadge: { backgroundColor: Colors.errorBg },
    badgeText: { color: Colors.primaryDark, fontSize: 9, fontWeight: "800" },
    inactiveText: { color: Colors.error },
    meta: { color: Colors.text2, fontSize: 11, marginTop: 4 },
    cardBottom: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 7 },
    price: { color: Colors.heading, fontSize: 12, fontWeight: "700" },
    stock: { color: Colors.text2, fontSize: 11, fontWeight: "700" },
    warning: { color: Colors.warning },
    skeleton: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderRadius: AppRadius.card,
      flexDirection: "row",
      marginBottom: Spacing.sm,
      padding: Spacing.md,
    },
    skeletonCopy: { flex: 1, marginLeft: Spacing.md },
  });
