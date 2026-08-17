import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import {
  ReportPaginationFooter,
  ReportRowCard,
  ReportSkeleton,
  ReportState,
} from "@/features/reports/components/report-widgets";
import type { ReportConfig } from "@/features/reports/report-config";
import { getReportRowKey, getReportRows, type ReportRow } from "@/features/reports/report-data";
import { fetchReportThunk } from "@/middleware/report/report.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectReportEntry } from "@/store/report/report.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

// Web-parity legacy report (see report-config.ts / types/report.ts): the
// backend returns the entire dataset in one call — no date range, no
// server-side search/category filter, no server pagination — so this
// screen owns local search/category filtering and reveals more of the
// already-loaded array as the user scrolls, instead of using the generic
// ReportScreen (which re-fetches from the network on every filter change).
const PAGE_SIZE = 20;
const ALL_CATEGORY = "__all__";

export default function ConsumableUsageReportScreen({ config }: { config: ReportConfig }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const entry = useAppSelector((state) => selectReportEntry(state, config.slug));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const load = useCallback(
    (options?: { refresh?: boolean }) => {
      void dispatch(fetchReportThunk({ filters: {}, refresh: options?.refresh, slug: config.slug }));
    },
    [config.slug, dispatch],
  );

  useEffect(() => {
    if (!entry?.data && !entry?.loading && !entry?.error) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.data, entry?.error, entry?.loading]);

  const allRows = useMemo(() => getReportRows(config.slug, entry?.data ?? null), [config.slug, entry?.data]);

  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    allRows.forEach((row) => {
      const value = row.categoryName;
      if (typeof value === "string" && value.trim()) names.add(value.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase();

    return allRows.filter((row) => {
      if (category !== ALL_CATEGORY && row.categoryName !== category) {
        return false;
      }

      if (!trimmedSearch) {
        return true;
      }

      const itemName = typeof row.itemName === "string" ? row.itemName.toLowerCase() : "";
      return itemName.includes(trimmedSearch);
    });
  }, [allRows, category, search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, category]);

  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);
  const hasMore = visibleCount < filteredRows.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((current) => Math.min(filteredRows.length, current + PAGE_SIZE));
    }
  }, [filteredRows.length, hasMore]);

  const refresh = useCallback(() => load({ refresh: true }), [load]);

  const renderItem = useCallback(
    ({ item }: { item: ReportRow }) => <ReportRowCard fields={config.primaryFields} row={item} />,
    [config.primaryFields],
  );

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
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text allowFontScaling style={styles.title}>{config.title}</Text>
          <Text allowFontScaling style={styles.subtitle}>{config.subtitle}</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.text2} />
        <TextInput
          accessibilityLabel={`Search ${config.title}`}
          onChangeText={setSearch}
          placeholder="Search by product name"
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

      {categoryOptions.length > 0 ? (
        <FlatList
          contentContainerStyle={styles.categoryRow}
          data={[ALL_CATEGORY, ...categoryOptions]}
          horizontal
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const active = category === item;
            return (
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setCategory(item)}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {item === ALL_CATEGORY ? "All Categories" : item}
                </Text>
              </TouchableOpacity>
            );
          }}
          showsHorizontalScrollIndicator={false}
        />
      ) : null}

      {allRows.length ? (
        <View style={styles.resultsHeading}>
          <Text style={styles.resultsTitle}>RESULTS</Text>
          <Text style={styles.resultsCount}>
            {filteredRows.length} {filteredRows.length === 1 ? "record" : "records"}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (entry?.loading && !entry.data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <AppStatusBar />
        {listHeader}
        <ReportSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        data={visibleRows}
        initialNumToRender={10}
        keyExtractor={getReportRowKey}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          entry?.error ? (
            <ReportState
              description="We couldn’t load this report. Check your connection and try again."
              error
              onRetry={refresh}
              title="Report unavailable"
            />
          ) : (
            <ReportState
              description={`${config.emptyMessage}. Adjust the search or category filter to check again.`}
              onRetry={refresh}
              title={config.emptyMessage}
            />
          )
        }
        ListFooterComponent={<ReportPaginationFooter loading={false} noMore={visibleRows.length > 0 && !hasMore} />}
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
  searchBar: {
    alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border,
    borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row",
    gap: Spacing.sm, minHeight: 50, paddingHorizontal: Spacing.md,
  },
  searchInput: { color: Colors.heading, flex: 1, fontSize: 13, minHeight: 48, paddingVertical: 0 },
  clearButton: { alignItems: "center", height: 44, justifyContent: "center", width: 36 },
  categoryRow: { gap: Spacing.sm, paddingRight: Spacing.sm },
  categoryChip: {
    backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.pill,
    borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9,
  },
  categoryChipActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  categoryChipText: { color: Colors.text2, fontSize: 12, fontWeight: "700" },
  categoryChipTextActive: { color: "#FFFFFF" },
  resultsHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: Spacing.sm },
  resultsTitle: { color: Colors.text2, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  resultsCount: { color: Colors.text2, fontSize: 11, fontVariant: ["tabular-nums"], fontWeight: "600" },
});
