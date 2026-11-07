import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";
import { dateRangeLabel } from "@/utils/dateRangePresets";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { StatusPill, Tile } from "@/components/pearl/ui";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import type { PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { appAlert as Alert } from "@/services/appAlert";
import { TourFlatList, TourView, TourButton, withScreenTour } from "@/features/userGuide/DashboardTour";
import { screenTours } from "@/features/userGuide/screenTours";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, RefreshControl, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { useAppToast } from "@/hooks/useAppToast";
import { deleteSaleThunk, fetchSalesSummaryThunk, fetchSalesThunk } from "@/middleware/sales/sales.thunk";
import {
  selectSaleDeletingIds,
  selectSales,
  selectSalesListError,
  selectSalesListLoading,
  selectSalesListLoadingMore,
  selectSalesListRefreshing,
  selectSalesPagination,
  selectSalesQuery,
  selectSalesSummary,
  selectSalesTotalCount,
} from "@/store/sales/sales.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import type { SaleListItem } from "@/types/sales";
import { formatInvoiceNumber } from "@/utils/receipt";
import { formatCurrency } from "@/utils/currency";
import { SALES_LIST_SCREEN, useActiveScreen } from "@/utils/activeScreens";

const SALE_SORT_OPTIONS = ["Amount (High-Low)", "Amount (Low-High)"] as const;
type SaleSortOption = (typeof SALE_SORT_OPTIONS)[number];

function getSortQuery(sortOption: SaleSortOption) {
  switch (sortOption) {
    case "Amount (Low-High)":
      return { sort_by: "total", sort_order: "asc" as const };
    case "Amount (High-Low)":
    default:
      return { sort_by: "total", sort_order: "desc" as const };
  }
}

function getRejectedMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function SaleCard({ isDeleting, onDelete, sale, first, last }: { isDeleting: boolean; onDelete: () => void; sale: SaleListItem; first: boolean; last: boolean }) {
 const { clientName } = useClientPrivacy();
 return <TouchableOpacity accessibilityRole="button" accessibilityHint="Opens invoice details. Long press for delete options." activeOpacity={0.84} onPress={() => router.push(('/sales/' + sale.id) as Href)} onLongPress={onDelete} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: pearl.glass, borderBottomWidth: last ? 0 : 1, borderBottomColor: pearl.divider, borderTopLeftRadius: first ? 22 : 0, borderTopRightRadius: first ? 22 : 0, borderBottomLeftRadius: last ? 22 : 0, borderBottomRightRadius: last ? 22 : 0 }}>
  <Tile icon="note" tone="rose" size={40} /><View style={{ flex: 1, minWidth: 0 }}><Text style={{ fontSize: 14, fontWeight: "700", color: pearl.ink }}>{formatInvoiceNumber(sale.receiptNumber) ?? "Invoice"} {"\u00b7"} {clientName(sale.clientName)}</Text><Text style={{ fontSize: 12, color: pearl.muted, marginTop: 3 }}>{sale.paymentMethod} {"\u00b7"} {sale.createdDateLabel}</Text></View>
  <View style={{ alignItems: "flex-end", gap: 4 }}>{isDeleting ? <ActivityIndicator color={pearl.accent} /> : <><Text style={{ color: pearl.ink, fontSize: 14, fontWeight: "700" }}>{formatCurrency(sale.total)}</Text><StatusPill label={sale.status === "completed" ? "Paid" : sale.status} tone={sale.status === "completed" ? "success" : sale.status === "cancelled" ? "danger" : "warning"} /></>}</View>
 </TouchableOpacity>;
}

function SaleSkeletonCard() {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.saleCard}>
      <View style={styles.skeletonIcon} />
      <View style={styles.saleCopy}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonLine} />
      </View>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="cloud-offline-outline" size={26} color={Colors.error} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Unable to load sales</Text>
      <Text style={styles.emptySubtitle}>{message}</Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ queryActive }: { queryActive: boolean }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="receipt-outline" size={26} color={Colors.primaryText} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No Sales Found</Text>
      <Text style={styles.emptySubtitle}>
        {queryActive
          ? "Try a different search, filter, or sort to find the right sale."
          : "Sales completed through Quick Sale will show up here."}
      </Text>
    </View>
  );
}

function SalesHistoryScreenContent() {
  useActiveScreen(SALES_LIST_SCREEN);
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const insets = useSafeAreaInsets();
  const sales = useAppSelector(selectSales);
  const salesError = useAppSelector(selectSalesListError);
  const salesLoading = useAppSelector(selectSalesListLoading);
  const salesLoadingMore = useAppSelector(selectSalesListLoadingMore);
  const salesPagination = useAppSelector(selectSalesPagination);
  const salesQuery = useAppSelector(selectSalesQuery);
  const salesRefreshing = useAppSelector(selectSalesListRefreshing);
  const totalCount = useAppSelector(selectSalesTotalCount);
  const deletingSaleIds = useAppSelector(selectSaleDeletingIds);
  const summary = useAppSelector(selectSalesSummary);

  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });
  const [datesOpen, setDatesOpen] = useState(false);
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<SaleSortOption>("Amount (High-Low)");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const sortQuery = useMemo(() => getSortQuery(sortOption), [sortOption]);


  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // The API returns the full history; search, dates and sorting reuse that download.
  const hasLoadedListRef = useRef(false);

  useEffect(() => {
    const reuseList = hasLoadedListRef.current;
    hasLoadedListRef.current = true;
    void dispatch(
      fetchSalesThunk({
        limit: 10,
        offset: 0,
        reset: true,
        reuseList,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
        status: undefined,
        ...dateRange,
      }),
    );
  }, [dateRange, debouncedQuery, dispatch, sortQuery.sort_by, sortQuery.sort_order]);

  useEffect(() => {
    void dispatch(fetchSalesSummaryThunk());
  }, [dispatch]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/more" as Href);
  };

  const handleRefresh = () => {
    void dispatch(
      fetchSalesThunk({
        limit: salesQuery.limit,
        refresh: true,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
        status: undefined,
        ...dateRange,
      }),
    );
    void dispatch(fetchSalesSummaryThunk());
  };

  const handleConfirmDelete = async (sale: SaleListItem) => {
    const resultAction = await dispatch(deleteSaleThunk(sale.id));

    if (deleteSaleThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to delete sale",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    toast.showSuccess("Sale deleted successfully.");

    void dispatch(
      fetchSalesThunk({
        limit: salesQuery.limit,
        offset: 0,
        reset: true,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
        status: undefined,
        ...dateRange,
      }),
    );
  };

  const handleDeleteSale = (sale: SaleListItem) => {
    Alert.alert(
      "Delete Sale",
      `Are you sure you want to delete "${formatInvoiceNumber(sale.receiptNumber) ?? "this sale"}"? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => void handleConfirmDelete(sale),
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  };

  const handleLoadMore = () => {
    if (salesLoading || salesLoadingMore || salesRefreshing || !salesPagination.hasMore) {
      return;
    }

    void dispatch(
      fetchSalesThunk({
        limit: salesPagination.limit,
        offset: salesPagination.nextOffset,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
        status: undefined,
        ...dateRange,
      }),
    );
  };

  const isQueryActive = Boolean(query.trim() || dateRange.startDate || dateRange.endDate);
  const showInitialLoading = salesLoading && sales.length === 0;
  const showErrorState = Boolean(salesError) && sales.length === 0 && !showInitialLoading;

  return (
    <PearlBackground><SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: "transparent" }]}>
      <AppStatusBar />

      <RefreshViewport><TourFlatList
        ListEmptyComponent={
          showInitialLoading ? (
            <View>
              {Array.from({ length: 5 }).map((_, index) => (
                <SaleSkeletonCard key={`sale-skeleton-${index}`} />
              ))}
            </View>
          ) : showErrorState ? (
            <ErrorState message={salesError ?? "Please try again in a moment."} onRetry={handleRefresh} />
          ) : (
            <EmptyState queryActive={isQueryActive} />
          )
        }
        ListFooterComponent={
          <View style={styles.footerWrap}>
            {sales.length > 0 ? (
              <PaginationControls
                currentPage={Math.max(1, Math.ceil(sales.length / salesPagination.limit))}
                hasNextPage={salesPagination.hasMore}
                hasPreviousPage={false}
                loading={salesLoadingMore}
                onNext={salesPagination.hasMore ? handleLoadMore : undefined}
                totalItems={totalCount}
                totalPages={Math.max(1, Math.ceil(totalCount / salesPagination.limit))}
                visibleItems={sales.length}
              />
            ) : null}
            <View style={{ height: 112 + insets.bottom }} />
          </View>
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <AppBackButton activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} />
                <Text style={styles.headerTitle}>Sales</Text>
                <View style={styles.backButtonPlaceholder} />
              </View>
              <TourView tourId="summary" style={styles.summaryCard}>
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Invoices</Text>
                  <Text style={styles.summaryValue}>
                    {(summary?.totalSales ?? totalCount).toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Revenue</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary?.totalRevenue ?? 0)}</Text>
                </View>
              </TourView>
            </View>

            <TourView tourId="search" style={styles.searchWrap}>
              <Ionicons name="search-outline" size={20} color={Colors.text2} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Receipt no. or client"
                placeholderTextColor={Colors.placeholder}
                style={styles.searchInput}
                value={query}
              />
              {query.trim().length > 0 ? (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={Colors.placeholder} />
                </TouchableOpacity>
              ) : null}
            </TourView>

            <TourButton tourId="filters" accessibilityRole="button" accessibilityLabel="Choose sales date range" onPress={() => setDatesOpen(true)} style={styles.dateRangeButton}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primaryText} />
              <Text style={styles.dateRangeText}>{dateRange.startDate && dateRange.endDate ? dateRangeLabel(dateRange.startDate, dateRange.endDate) : "All time"}</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.primaryText} />
            </TourButton>

            <View style={styles.sortRow}>
              <Text style={styles.sortMeta}>
                {sales.length} sale{sales.length === 1 ? "" : "s"}
              </Text>
              <TourButton tourId="sort"
                activeOpacity={0.82}
                onPress={() => setIsSortVisible(true)}
                style={styles.sortButton}
              >
                <Ionicons name="swap-vertical-outline" size={16} color={Colors.primaryText} />
                <Text style={styles.sortButtonText}>{sortOption}</Text>
              </TourButton>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        data={sales}
        initialNumToRender={8}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={handleRefresh}
            refreshing={salesRefreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item, index }) => (
          <SaleCard first={index === 0} last={index === sales.length - 1}
            isDeleting={deletingSaleIds.includes(item.id)}
            onDelete={() => handleDeleteSale(item)}
            sale={item}
          />
        )}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        windowSize={8}
      /></RefreshViewport>


      <DateRangePickerSheet pearlStyle visible={datesOpen} title="Sales date range" allowAllTime
        startDate={dateRange.startDate} endDate={dateRange.endDate} maximumDate={new Date()}
        onClose={() => setDatesOpen(false)} onApply={(startDate, endDate) => { setDateRange({ startDate, endDate }); setDatesOpen(false); }} />

      <Modal
        animationType="fade"
        onRequestClose={() => setIsSortVisible(false)}
        transparent
        visible={isSortVisible}
      >
        <Pressable onPress={() => setIsSortVisible(false)} style={styles.modalOverlay}>
          <Pressable style={styles.sortSheet}>
            <Text style={styles.sortSheetTitle}>Sort Sales</Text>
            {SALE_SORT_OPTIONS.map((option, index) => {
              const isActive = option === sortOption;

              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.82}
                  onPress={() => {
                    setSortOption(option);
                    setIsSortVisible(false);
                  }}
                  style={[styles.sortOptionRow, index > 0 && styles.sortOptionRowBorder]}
                >
                  <Text style={[styles.sortOptionText, isActive && styles.sortOptionTextActive]}>
                    {option}
                  </Text>
                  {isActive ? (
                    <Ionicons name="checkmark-circle" size={18} color={Colors.primaryText} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView></PearlBackground>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  header: {
    marginBottom: AppLayout.sectionGap,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.sectionGap,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    width: AppLayout.headerActionSize,
  },
  backButtonPlaceholder: {
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: AppLayout.cardPadding,
    paddingVertical: Spacing.md,
    elevation: 0,
  },
  summaryMetric: {
    flex: 1,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  summaryDivider: {
    backgroundColor: Colors.border,
    height: 36,
    marginHorizontal: Spacing.md,
    width: 1,
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.search,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: AppLayout.sectionGap,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: AppLayout.searchBarPaddingX,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 14,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    minHeight: AppLayout.searchBarHeight,
  },
  dateRangeButton: {
    flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48,
    paddingHorizontal: 14, borderRadius: 16, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.card,
  },
  dateRangeText: { flex: 1, color: Colors.primaryText, fontSize: 14, fontWeight: "600" },
  sortRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.sectionGap,
    marginTop: AppLayout.sectionGap,
  },
  sortMeta: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  sortButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  sortButtonText: {
    color: Colors.primaryText,
    fontSize: 12,
    fontWeight: "700",
  },
  saleCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: Spacing.sm,
    padding: AppLayout.cardPadding,
    elevation: 0,
  },
  saleIcon: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  saleCopy: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
    width: 24,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  saleReceipt: {
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    marginRight: Spacing.sm,
  },
  saleClientText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeActive: {
    backgroundColor: Colors.successBg,
  },
  statusBadgeInactive: {
    backgroundColor: Colors.errorBg,
  },
  statusBadgePending: {
    backgroundColor: Colors.warningBg,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusBadgeTextActive: {
    color: Colors.primaryText,
  },
  statusBadgeTextInactive: {
    color: Colors.error,
  },
  statusBadgeTextPending: {
    color: Colors.goldDark,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 8,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  infoText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  skeletonIcon: {
    backgroundColor: pearl.accentTint,
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  skeletonName: {
    backgroundColor: pearl.accentTint,
    borderRadius: Radius.full,
    height: 16,
    width: "58%",
  },
  skeletonLine: {
    backgroundColor: pearl.accentTint,
    borderRadius: Radius.full,
    height: 12,
    marginTop: 8,
    width: "74%",
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: AppLayout.sectionGap,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyIllustration: {
    alignItems: "center",
    height: 96,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 96,
  },
  emptyIllustrationHalo: {
    backgroundColor: Colors.bg2,
    borderRadius: 48,
    height: 96,
    opacity: 0.9,
    position: "absolute",
    width: 96,
  },
  emptyIllustrationCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    transform: [{ rotate: "-7deg" }],
    width: 54,
  },
  emptyTitle: {
    color: Colors.heading,
    fontSize: 20,
    fontWeight: "800",
  },
  emptySubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  emptyButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: Spacing.lg,
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
  },
  emptyButtonText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  footerWrap: {
    paddingBottom: 0,
  },
  modalOverlay: {
    backgroundColor: "rgba(15, 23, 32, 0.12)",
    flex: 1,
    justifyContent: "flex-end",
    padding: Spacing.lg,
  },
  sortSheet: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sortSheetTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  sortOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  sortOptionRowBorder: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  sortOptionText: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "600",
  },
  sortOptionTextActive: {
    color: Colors.primaryText,
  },
});

export default withScreenTour(SalesHistoryScreenContent, screenTours.sales);
