import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useAppToast } from "@/hooks/useAppToast";
import { deleteSaleThunk, exportSalesThunk, fetchSalesSummaryThunk, fetchSalesThunk } from "@/middleware/sales/sales.thunk";
import {
  selectSaleDeletingIds,
  selectSales,
  selectSalesExporting,
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
import { useThemeColors } from "@/theme/ThemeProvider";
import type { SaleListItem } from "@/types/sales";
import { formatInvoiceNumber } from "@/utils/receipt";

const SALE_FILTERS = ["All", "Draft", "Pending", "Completed", "Cancelled"] as const;
type SaleFilter = (typeof SALE_FILTERS)[number];

const SALE_SORT_OPTIONS = ["Newest", "Amount (High-Low)", "Amount (Low-High)"] as const;
type SaleSortOption = (typeof SALE_SORT_OPTIONS)[number];

function getSortQuery(sortOption: SaleSortOption) {
  switch (sortOption) {
    case "Amount (High-Low)":
      return { sort_by: "total", sort_order: "desc" as const };
    case "Amount (Low-High)":
      return { sort_by: "total", sort_order: "asc" as const };
    case "Newest":
    default:
      return { sort_by: "created_at", sort_order: "desc" as const };
  }
}

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
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

function getStatusStyle(status: string, styles: ReturnType<typeof createStyles>) {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return { badge: styles.statusBadgeActive, text: styles.statusBadgeTextActive };
  }

  if (normalized === "cancelled") {
    return { badge: styles.statusBadgeInactive, text: styles.statusBadgeTextInactive };
  }

  return { badge: styles.statusBadgePending, text: styles.statusBadgeTextPending };
}

function SaleCard({
  isDeleting,
  onDelete,
  sale,
}: {
  isDeleting: boolean;
  onDelete: () => void;
  sale: SaleListItem;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const statusStyle = getStatusStyle(sale.status, styles);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => router.push(`/sales/${sale.id}` as Href)}
      style={styles.saleCard}
    >
      <View style={styles.saleIcon}>
        <Ionicons name="receipt-outline" size={20} color={Colors.primaryDark} />
      </View>

      <View style={styles.saleCopy}>
        <View style={styles.nameRow}>
          <Text style={styles.saleReceipt}>
            {formatInvoiceNumber(sale.receiptNumber) ?? "—"}
          </Text>
          <View style={[styles.statusBadge, statusStyle.badge]}>
            <Text style={[styles.statusBadgeText, statusStyle.text]}>
              {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
            </Text>
          </View>
        </View>

        <Text style={styles.saleClientText}>{sale.clientName}</Text>

        <View style={styles.metaRow}>
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={12} color={Colors.text2} />
            <Text style={styles.infoText}>{formatCurrency(sale.total)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={12} color={Colors.text2} />
            <Text style={styles.infoText}>{sale.paymentMethod}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={12} color={Colors.text2} />
            <Text style={styles.infoText}>{sale.createdDateLabel}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        disabled={isDeleting}
        hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
        onPress={onDelete}
        style={styles.deleteButton}
      >
        {isDeleting ? (
          <ActivityIndicator color={Colors.error} size="small" />
        ) : (
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function SaleSkeletonCard() {
  const Colors = useThemeColors();
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
  const Colors = useThemeColors();
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
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyIllustrationHalo} />
        <View style={styles.emptyIllustrationCard}>
          <Ionicons name="receipt-outline" size={26} color={Colors.primary} />
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

export default function SalesHistoryScreen() {
  const Colors = useThemeColors();
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
  const isExporting = useAppSelector(selectSalesExporting);

  const [activeFilter, setActiveFilter] = useState<SaleFilter>("All");
  const [isSortVisible, setIsSortVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] = useState<SaleSortOption>("Newest");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">("csv");
  const sortQuery = useMemo(() => getSortQuery(sortOption), [sortOption]);
  const statusQuery = activeFilter === "All" ? undefined : activeFilter.toLowerCase();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    void dispatch(
      fetchSalesThunk({
        limit: 20,
        offset: 0,
        reset: true,
        search: debouncedQuery,
        sort_by: sortQuery.sort_by,
        sort_order: sortQuery.sort_order,
        status: statusQuery,
      }),
    );
  }, [debouncedQuery, dispatch, sortQuery.sort_by, sortQuery.sort_order, statusQuery]);

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
        status: statusQuery,
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
        status: statusQuery,
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
        status: statusQuery,
      }),
    );
  };

  const handleExport = () => {
    setIsExportModalVisible(true);
  };

  const handleConfirmExport = async () => {
    const resultAction = await dispatch(
      exportSalesThunk({ search: debouncedQuery, status: statusQuery, format: exportFormat }),
    );

    setIsExportModalVisible(false);

    if (exportSalesThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to export sales",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    if (!resultAction.payload.url) {
      Alert.alert("Export unavailable", resultAction.payload.message ?? "No export file was returned.");
      return;
    }

    try {
      await Linking.openURL(resultAction.payload.url);
    } catch {
      Alert.alert("Unable to open export", "The export link could not be opened on this device.");
    }
  };

  const isQueryActive = Boolean(query.trim()) || activeFilter !== "All";
  const showInitialLoading = salesLoading && sales.length === 0;
  const showErrorState = Boolean(salesError) && sales.length === 0 && !showInitialLoading;

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />

      <FlatList
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
            {salesLoadingMore ? (
              <View style={styles.loadingMoreWrap}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.loadingMoreText}>Loading more sales...</Text>
              </View>
            ) : null}
            <View style={{ height: 112 + insets.bottom }} />
          </View>
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <TouchableOpacity activeOpacity={0.8} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sales History</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isExporting}
                  onPress={() => void handleExport()}
                  style={styles.backButton}
                >
                  {isExporting ? (
                    <ActivityIndicator color={Colors.primary} size="small" />
                  ) : (
                    <Ionicons name="download-outline" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.summaryCard}>
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Total Sales</Text>
                  <Text style={styles.summaryValue}>
                    {(summary?.totalSales ?? totalCount).toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Total Revenue</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary?.totalRevenue ?? 0)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={20} color={Colors.text2} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Search by receipt or client name"
                placeholderTextColor={Colors.placeholder}
                style={styles.searchInput}
                value={query}
              />
              {query.trim().length > 0 ? (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={Colors.placeholder} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterRow}>
              {SALE_FILTERS.map((filter) => {
                const isActive = filter === activeFilter;

                return (
                  <TouchableOpacity
                    key={filter}
                    activeOpacity={0.82}
                    onPress={() => setActiveFilter(filter)}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sortRow}>
              <Text style={styles.sortMeta}>
                {sales.length} sale{sales.length === 1 ? "" : "s"}
              </Text>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setIsSortVisible(true)}
                style={styles.sortButton}
              >
                <Ionicons name="swap-vertical-outline" size={16} color={Colors.primary} />
                <Text style={styles.sortButtonText}>{sortOption}</Text>
              </TouchableOpacity>
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
        renderItem={({ item }) => (
          <SaleCard
            isDeleting={deletingSaleIds.includes(item.id)}
            onDelete={() => handleDeleteSale(item)}
            sale={item}
          />
        )}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        windowSize={8}
      />

      <View style={[styles.stickyButtonWrap, { bottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push("/quick-sale" as Href)}
          style={styles.stickyButton}
        >
          <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.stickyButtonText}>New Sale</Text>
        </TouchableOpacity>
      </View>

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
                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsExportModalVisible(false)}
        transparent
        visible={isExportModalVisible}
      >
        <Pressable onPress={() => setIsExportModalVisible(false)} style={styles.modalOverlay}>
          <Pressable style={styles.exportSheet}>
            <Text style={styles.exportSheetTitle}>Export Format</Text>
            {[
              { format: "csv" as const, label: "CSV", description: "Comma-separated values" },
              { format: "excel" as const, label: "Excel", description: "Microsoft Excel spreadsheet" },
              { format: "pdf" as const, label: "PDF", description: "Portable Document Format" },
            ].map((option, index) => (
              <TouchableOpacity
                key={option.format}
                activeOpacity={0.82}
                onPress={() => {
                  setExportFormat(option.format);
                  handleConfirmExport();
                }}
                style={[styles.exportOptionRow, index > 0 && styles.exportOptionRowBorder]}
              >
                <View style={styles.exportOptionContent}>
                  <Text style={[styles.exportOptionLabel, exportFormat === option.format && styles.exportOptionLabelActive]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.exportOptionDescription, exportFormat === option.format && styles.exportOptionDescriptionActive]}>
                    {option.description}
                  </Text>
                </View>
                {exportFormat === option.format ? (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 2,
  },
  filterChip: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
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
    color: Colors.primary,
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
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
    color: Colors.primaryDark,
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
    backgroundColor: Colors.bg2,
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  skeletonName: {
    backgroundColor: Colors.bg2,
    borderRadius: Radius.full,
    height: 16,
    width: "58%",
  },
  skeletonLine: {
    backgroundColor: Colors.bg2,
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
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  footerWrap: {
    paddingBottom: 0,
  },
  loadingMoreWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  loadingMoreText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  stickyButtonWrap: {
    left: AppLayout.floatingButtonRight,
    position: "absolute",
    right: AppLayout.floatingButtonRight,
  },
  stickyButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  stickyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
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
    color: Colors.primary,
  },
  exportSheet: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  exportSheetTitle: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  exportOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  exportOptionRowBorder: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  exportOptionContent: {
    flex: 1,
  },
  exportOptionLabel: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "600",
  },
  exportOptionLabelActive: {
    color: Colors.primary,
  },
  exportOptionDescription: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  exportOptionDescriptionActive: {
    color: Colors.primary,
  },
});
