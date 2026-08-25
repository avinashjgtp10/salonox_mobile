import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { DateField } from "@/components/ui/DateField";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { EmptyState, ErrorState } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { fetchUsageHistoryThunk } from "@/middleware/consumable/consumable.thunk";
import { selectConsumableById } from "@/store/consumable/consumable.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ConsumableUsageDirection, ConsumableUsageHistoryItem } from "@/types/consumable";
import { formatAppDateTime } from "@/utils/dateTime";

const DIRECTION_OPTIONS: { label: string; value: ConsumableUsageDirection | "" }[] = [
  { label: "All", value: "" },
  { label: "Deducted", value: "deduct" },
  { label: "Returned", value: "return" },
];

export default function ConsumableUsageHistoryScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const state = useAppSelector((root) => root.consumable);
  const scopedConsumable = useAppSelector(selectConsumableById(productId ?? ""));
  const [direction, setDirection] = useState<ConsumableUsageDirection | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    void dispatch(
      fetchUsageHistoryThunk({
        direction: direction || undefined,
        from: from || undefined,
        page: 1,
        productId: productId || undefined,
        reset: true,
        to: to || undefined,
      }),
    );
  }, [direction, dispatch, from, productId, to]);

  const refresh = () =>
    void dispatch(
      fetchUsageHistoryThunk({
        direction: direction || undefined,
        from: from || undefined,
        page: 1,
        productId: productId || undefined,
        refresh: true,
        to: to || undefined,
      }),
    );

  const loadMore = () => {
    if (
      !state.usageHistoryLoading &&
      !state.usageHistoryLoadingMore &&
      !state.usageHistoryRefreshing &&
      state.usageHistoryPagination.hasMore
    ) {
      void dispatch(fetchUsageHistoryThunk({ page: state.usageHistoryPagination.page + 1 }));
    }
  };

  const header = (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/consumables" as Href))}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-back" size={19} color={Colors.primary} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.title}>
          {scopedConsumable ? `${scopedConsumable.name} — Usage` : "Usage History"}
        </Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.chipRow}>
        {DIRECTION_OPTIONS.map((option) => {
          const active = direction === option.value;
          return (
            <TouchableOpacity
              key={option.label}
              activeOpacity={0.84}
              onPress={() => setDirection(option.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <DateField label="From" onChange={setFrom} value={from} />
        </View>
        <View style={styles.dateField}>
          <DateField label="To" onChange={setTo} value={to} />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={styles.content}
        data={state.usageHistory}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          state.usageHistoryLoading ? (
            <ActivityIndicator color={Colors.primary} style={styles.loadingIndicator} />
          ) : state.usageHistoryError ? (
            <ErrorState message={state.usageHistoryError} onRetry={refresh} />
          ) : (
            <EmptyState
              accent="indigo"
              description="No consumable usage recorded yet for this filter."
              icon="time-outline"
              title="No usage history"
            />
          )
        }
        ListFooterComponent={
          <View style={{ height: 40 + insets.bottom }}>
            {state.usageHistoryLoadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
          </View>
        }
        ListHeaderComponent={header}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={refresh}
            refreshing={state.usageHistoryRefreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => <UsageHistoryRow item={item} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function UsageHistoryRow({ item }: { item: ConsumableUsageHistoryItem }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isReturn = item.direction === "return";

  return (
    <View style={styles.row}>
      <View style={[styles.directionIcon, isReturn ? styles.returnIcon : styles.deductIcon]}>
        <Ionicons
          name={isReturn ? "arrow-undo-outline" : "arrow-forward-outline"}
          size={16}
          color={isReturn ? Colors.success : Colors.error}
        />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleRow}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {item.productName}
          </Text>
          <Text style={[styles.rowQuantity, isReturn ? styles.returnText : styles.deductText]}>
            {isReturn ? "+" : "-"}
            {item.quantity} {item.unit}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.rowMeta}>
          {[item.serviceName, item.staffName, item.source].filter(Boolean).join("  |  ") || "—"}
        </Text>
        {item.date ? <Text style={styles.rowDate}>{formatAppDateTime(item.date, item.date)}</Text> : null}
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { backgroundColor: Colors.bg, flex: 1 },
    content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md },
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
    title: { color: Colors.heading, flex: 1, fontSize: 17, fontWeight: "800", marginHorizontal: Spacing.sm, textAlign: "center" },
    chipRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
    chip: {
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.pill,
      borderWidth: 1,
      paddingHorizontal: 13,
      paddingVertical: 8,
    },
    chipActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
    chipText: { color: Colors.text2, fontSize: 12, fontWeight: "700" },
    chipTextActive: { color: "#FFFFFF" },
    dateRow: { flexDirection: "row", gap: Spacing.sm },
    dateField: { flex: 1 },
    loadingIndicator: { marginTop: Spacing.xl },
    row: {
      alignItems: "flex-start",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: Spacing.md,
      marginBottom: Spacing.sm,
      padding: Spacing.md,
    },
    directionIcon: { alignItems: "center", borderRadius: Radius.full, height: 36, justifyContent: "center", width: 36 },
    deductIcon: { backgroundColor: Colors.errorBg },
    returnIcon: { backgroundColor: Colors.successBg },
    rowCopy: { flex: 1, minWidth: 0 },
    rowTitleRow: { alignItems: "center", flexDirection: "row", gap: Spacing.sm, justifyContent: "space-between" },
    rowTitle: { color: Colors.heading, flex: 1, fontSize: 13, fontWeight: "800" },
    rowQuantity: { fontSize: 12, fontWeight: "800" },
    deductText: { color: Colors.error },
    returnText: { color: Colors.success },
    rowMeta: { color: Colors.text2, fontSize: 11, marginTop: 3 },
    rowDate: { color: Colors.text2, fontSize: 10, marginTop: 3 },
  });
