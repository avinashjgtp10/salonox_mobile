import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useDebouncedValue } from "@/features/quickSale/hooks/useDebouncedValue";
import { ReportFilterSheet } from "@/features/reports/components/report-filter-sheet";
import {
  ReportPaginationFooter,
  ReportRowCard,
  ReportSkeleton,
  ReportState,
  ReportSummaryCards,
} from "@/features/reports/components/report-widgets";
import { SalesSummaryDetailSheet } from "@/features/reports/components/sales-summary-detail-sheet";
import {
  createDefaultReportFilters,
  type ReportConfig,
  type ReportFilters,
} from "@/features/reports/report-config";
import {
  getReportPagination,
  getReportRowKey,
  getReportRows,
  getReportSummary,
  type ReportRow,
} from "@/features/reports/report-data";
import { fetchReportThunk } from "@/middleware/report/report.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { rememberReportFilters, selectReportEntry } from "@/store/report/report.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatAppDate } from "@/utils/dateTime";

const getInvoiceDetailSaleId = (row: ReportRow, slug: ReportConfig["slug"]) => {
  const saleId = row.saleId ?? row.id;
  const invoiceNumber = row.invoiceNumber ?? row.invoiceNo ?? row.ticketNo;
  const isUnbilled = row.isUnbilled === true || row.is_unbilled === true;

  if (slug === "staff-sales" && !isUnbilled) {
    if (typeof saleId === "string" || typeof saleId === "number") return String(saleId);
  }

  const hasBill = invoiceNumber !== null &&
    invoiceNumber !== undefined &&
    String(invoiceNumber).trim() !== "" &&
    String(invoiceNumber).toLowerCase() !== "not billed yet";

  if (!hasBill) return null;
  if (typeof saleId === "string" || typeof saleId === "number") return String(saleId);
  return null;
};

export default function ReportScreen({ config }: { config: ReportConfig }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const entry = useAppSelector((state) => selectReportEntry(state, config.slug));
  const filters = entry?.filters ?? createDefaultReportFilters(config.slug);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [search, setSearch] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const searchInitialized = useRef(false);

  const rows = useMemo(() => getReportRows(config.slug, entry?.data ?? null), [config.slug, entry?.data]);
  const summary = useMemo(() => getReportSummary(config.slug, entry?.data ?? null), [config.slug, entry?.data]);
  const pagination = useMemo(() => getReportPagination(entry?.data ?? null), [entry?.data]);
  const dateRangeLabel = useMemo(() => {
    const rangeStart = filters.date ?? filters.from ?? filters.start_date;
    const rangeEnd = filters.to ?? filters.end_date;

    if (!rangeStart) {
      return "All time";
    }

    const formattedStart = formatAppDate(rangeStart, rangeStart);

    return rangeEnd ? `${formattedStart}  –  ${formatAppDate(rangeEnd, rangeEnd)}` : formattedStart;
  }, [filters.date, filters.from, filters.start_date, filters.to, filters.end_date]);
  const hasMore = Boolean(config.paginated && pagination && pagination.page < pagination.totalPages);
  const supportsSearch = config.filters.includes("search");
  const isUnavailable = config.status !== "available";
  const campaignOptions = useMemo(() => {
    const campaigns = entry?.data?.campaigns;
    if (!Array.isArray(campaigns)) return [];
    return campaigns.flatMap((campaign) => {
      if (!campaign || typeof campaign !== "object") return [];
      const record = campaign as Record<string, unknown>;
      return typeof record.id === "string"
        ? [{ label: typeof record.name === "string" ? record.name : "Campaign", value: record.id }]
        : [];
    });
  }, [entry?.data?.campaigns]);

  const load = useCallback((nextFilters: ReportFilters, options?: { append?: boolean; refresh?: boolean }) => {
    void dispatch(fetchReportThunk({
      append: options?.append,
      filters: nextFilters,
      refresh: options?.refresh,
      slug: config.slug,
    }));
  }, [config.slug, dispatch]);

  useEffect(() => {
    if (isUnavailable) return;
    if (!entry?.data && !entry?.loading && !entry?.error) load(filters);
  }, [entry?.data, entry?.error, entry?.loading, filters, isUnavailable, load]);

  useEffect(() => {
    if (isUnavailable) return;
    if (!supportsSearch) return;
    if (!searchInitialized.current) {
      searchInitialized.current = true;
      return;
    }
    if ((filters.search ?? "") === debouncedSearch) return;
    const nextFilters = { ...filters, search: debouncedSearch, page: 1 };
    dispatch(rememberReportFilters({ filters: nextFilters, slug: config.slug }));
    load(nextFilters);
    // Filter changes are intentionally excluded: this effect owns search changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.slug, debouncedSearch, dispatch, isUnavailable, load, supportsSearch]);

  const refresh = useCallback(() => load({ ...filters, page: 1 }, { refresh: true }), [filters, load]);
  const loadMore = useCallback(() => {
    if (!hasMore || entry?.loadingMore || entry?.loading || entry?.refreshing || !pagination) return;
    load({ ...filters, page: pagination.page + 1 }, { append: true });
  }, [entry?.loading, entry?.loadingMore, entry?.refreshing, filters, hasMore, load, pagination]);
  const applyFilters = useCallback((nextFilters: ReportFilters) => {
    const applied = { ...nextFilters, search, page: 1 };
    dispatch(rememberReportFilters({ filters: applied, slug: config.slug }));
    setFilterSheetVisible(false);
    load(applied);
  }, [config.slug, dispatch, load, search]);
  const resetFilters = useCallback(() => {
    const defaults = createDefaultReportFilters(config.slug);
    setSearch("");
    dispatch(rememberReportFilters({ filters: defaults, slug: config.slug }));
    setFilterSheetVisible(false);
    load(defaults);
  }, [config.slug, dispatch, load]);

  const handleRowPress = useCallback((row: ReportRow) => {
    const saleId = getInvoiceDetailSaleId(row, config.slug);
    if (saleId) {
      setSelectedSaleId(String(saleId));
    }
  }, [config.slug]);

  const renderItem = useCallback(({ item }: { item: ReportRow }) => (
    <ReportRowCard
      fields={config.primaryFields}
      onPress={getInvoiceDetailSaleId(item, config.slug) ? handleRowPress : undefined}
      row={item}
    />
  ), [config.primaryFields, config.slug, handleRowPress]);

  const activeFilterCount = config.filters.filter((key) =>
    key !== "search" && key !== "branch_id" && Boolean(filters[key])).length;

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          activeOpacity={0.8}
          hitSlop={AppLayout.headerActionHitSlop}
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text allowFontScaling style={styles.title}>{config.title}</Text>
          <Text allowFontScaling style={styles.subtitle}>{config.subtitle}</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel={`Filters, ${activeFilterCount} active`}
          accessibilityRole="button"
          disabled={isUnavailable}
          onPress={() => setFilterSheetVisible(true)}
          style={[styles.filterButton, isUnavailable && styles.disabledButton]}
        >
          <Ionicons name="options-outline" size={19} color={Colors.heading} />
          {activeFilterCount ? <Text style={styles.filterCount}>{activeFilterCount}</Text> : null}
        </TouchableOpacity>
      </View>

      {supportsSearch && !isUnavailable ? (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.text2} />
          <TextInput
            accessibilityLabel={`Search ${config.title}`}
            onChangeText={setSearch}
            placeholder={`Search ${config.title.toLowerCase()}`}
            placeholderTextColor={Colors.placeholder}
            returnKeyType="search"
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch("")} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={Colors.hint} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity
        accessibilityHint="Opens report date and filter options"
        accessibilityRole="button"
        disabled={isUnavailable}
        onPress={() => setFilterSheetVisible(true)}
        style={[styles.dateSelector, isUnavailable && styles.disabledButton]}
      >
        <View style={styles.dateIcon}>
          <Ionicons name="calendar-outline" size={17} color={Colors.primaryDark} />
        </View>
        <View style={styles.dateCopy}>
          <Text style={styles.dateLabel}>REPORT RANGE</Text>
          <Text style={styles.dateValue}>{dateRangeLabel}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={Colors.hint} />
      </TouchableOpacity>

      {isUnavailable ? (
        <View style={styles.unavailableCard}>
          <Ionicons name="construct-outline" size={24} color={Colors.hint} />
          <Text style={styles.unavailableTitle}>Backend unavailable</Text>
          <Text style={styles.unavailableText}>
            {config.statusReason ?? "This report does not have a verified current Reports API endpoint."}
          </Text>
        </View>
      ) : (
        <ReportSummaryCards summary={summary} />
      )}
      {rows.length ? (
        <View style={styles.resultsHeading}>
          <Text style={styles.resultsTitle}>RESULTS</Text>
          <Text style={styles.resultsCount}>
            {pagination?.total ?? rows.length} {pagination?.total === 1 ? "record" : "records"}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (isUnavailable) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <AppStatusBar />
        {listHeader}
      </SafeAreaView>
    );
  }

  if (entry?.loading && !entry.data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <AppStatusBar />
        {listHeader}
        <ReportSkeleton />
        <ReportFilterSheet
          campaignOptions={campaignOptions}
          filters={filters}
          onApply={applyFilters}
          onClose={() => setFilterSheetVisible(false)}
          onReset={resetFilters}
          supportedFilters={config.filters}
          visible={filterSheetVisible}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        initialNumToRender={10}
        keyExtractor={getReportRowKey}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={entry?.error ? (
          <ReportState
            description="We couldn’t load this report. Check your connection and try again."
            error
            onRetry={refresh}
            title="Report unavailable"
          />
        ) : (
          <ReportState
            description={`${config.emptyMessage}. Adjust the filters or refresh to check again.`}
            onRetry={refresh}
            title={config.emptyMessage}
          />
        )}
        ListFooterComponent={
          <ReportPaginationFooter
            currentPage={pagination?.page ?? 1}
            hasMore={hasMore}
            loading={Boolean(entry?.loadingMore)}
            noMore={rows.length > 0 && config.paginated && !hasMore}
            onLoadMore={hasMore ? loadMore : undefined}
            totalItems={pagination?.total}
            totalPages={pagination?.totalPages}
            visibleItems={rows.length}
          />
        }
        ListHeaderComponent={listHeader}
        maxToRenderPerBatch={10}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={refresh}
            refreshing={Boolean(entry?.refreshing)}
            tintColor={Colors.primary}
          />
        }
        removeClippedSubviews
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={50}
        windowSize={7}
      />
      <ReportFilterSheet
        campaignOptions={campaignOptions}
        filters={filters}
        onApply={applyFilters}
        onClose={() => setFilterSheetVisible(false)}
        onReset={resetFilters}
        supportedFilters={config.filters}
        visible={filterSheetVisible}
      />
      <SalesSummaryDetailSheet
        onClose={() => setSelectedSaleId(null)}
        saleId={selectedSaleId}
      />
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: Colors.bg, flex: 1 },
  listContent: {
    gap: Spacing.md, paddingBottom: 120,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  listHeader: { gap: Spacing.lg, paddingBottom: Spacing.sm, paddingTop: Spacing.lg },
  header: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.md },
  headerButton: {
    alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border,
    borderRadius: AppRadius.control, borderWidth: 1, height: AppLayout.headerActionSize,
    justifyContent: "center", width: AppLayout.headerActionSize,
  },
  headerCopy: { flex: 1, gap: 3 },
  title: { color: Colors.heading, fontSize: 26, fontWeight: "800", lineHeight: 32 },
  subtitle: { color: Colors.text2, fontSize: 12, lineHeight: 18 },
  filterButton: {
    alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border,
    borderRadius: AppRadius.control, borderWidth: 1, height: 48, justifyContent: "center", width: 48,
  },
  disabledButton: { opacity: 0.62 },
  filterCount: {
    backgroundColor: Colors.primaryDark, borderRadius: 999, color: "#FFFFFF", fontSize: 8,
    fontWeight: "800", minWidth: 16, overflow: "hidden", paddingHorizontal: 4,
    paddingVertical: 2, position: "absolute", right: 3, textAlign: "center", top: 3,
  },
  searchBar: {
    alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border,
    borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row",
    gap: Spacing.sm, minHeight: 50, paddingHorizontal: Spacing.md,
  },
  searchInput: { color: Colors.heading, flex: 1, fontSize: 13, minHeight: 48, paddingVertical: 0 },
  clearButton: { alignItems: "center", height: 44, justifyContent: "center", width: 36 },
  dateSelector: {
    alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border,
    borderRadius: AppRadius.card, borderWidth: 1, flexDirection: "row",
    gap: Spacing.md, minHeight: 66, padding: Spacing.md,
  },
  dateIcon: {
    alignItems: "center", backgroundColor: Colors.backgroundElement,
    borderRadius: AppRadius.control, height: 40, justifyContent: "center", width: 40,
  },
  dateCopy: { flex: 1, gap: 3 },
  dateLabel: { color: Colors.text2, fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  dateValue: { color: Colors.heading, fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "700" },
  resultsHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: Spacing.sm },
  resultsTitle: { color: Colors.text2, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  resultsCount: { color: Colors.text2, fontSize: 11, fontVariant: ["tabular-nums"], fontWeight: "600" },
  unavailableCard: {
    alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border,
    borderRadius: AppRadius.card, borderWidth: 1, gap: Spacing.sm, padding: Spacing.lg,
  },
  unavailableText: { color: Colors.text2, fontSize: 12, lineHeight: 18, textAlign: "center" },
  unavailableTitle: { color: Colors.heading, fontSize: 15, fontWeight: "900" },
});
