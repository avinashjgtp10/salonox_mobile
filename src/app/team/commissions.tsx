import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { SettlementModal } from "@/components/ui/SettlementModal";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import {
  exportSalonCommissionsThunk,
  fetchSalonCommissionEarnedThunk,
  fetchSalonCommissionSummaryThunk,
  fetchSalonCommissionsThunk,
  settleCommissionThunk,
} from "@/middleware/staff/salonCommissions.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectCommissionSettling,
  selectSalonCommissionEarned,
  selectSalonCommissionEarnedError,
  selectSalonCommissionEarnedLoaded,
  selectSalonCommissionEarnedLoading,
  selectSalonCommissionExportError,
  selectSalonCommissionExporting,
  selectSalonCommissionListError,
  selectSalonCommissionListLoading,
  selectSalonCommissionListLoadingMore,
  selectSalonCommissionListRefreshing,
  selectSalonCommissionPagination,
  selectSalonCommissionRecords,
  selectSalonCommissionSummary,
  selectSalonCommissionSummaryError,
  selectSalonCommissionSummaryLoading,
} from "@/store/staff/salonCommissions.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { canSettleCommission } from "@/utils/userProfile";
import type { SalonCommissionRecord } from "@/types/salonCommissions";

const STATUS_FILTERS = ["All", "Pending", "Paid"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

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

function getStatusPalette(status: string, Colors: ThemeColors) {
  switch (status.toLowerCase()) {
    case "paid":
      return { backgroundColor: Colors.successBg, color: Colors.success };
    case "pending":
    default:
      return { backgroundColor: Colors.warningBg, color: Colors.warning };
  }
}

export default function SalonCommissionsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const currentUser = useAppSelector(selectCurrentUser);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const userRole = currentUser?.role ?? "";
  const userPermissions = (currentUser?.custom_permissions as string[]) ?? [];
  const hasSettlePermission = canSettleCommission(userRole, userPermissions);
  const isStaffUser = currentStaff && !hasSettlePermission;

  const records = useAppSelector(selectSalonCommissionRecords);
  const listError = useAppSelector(selectSalonCommissionListError);
  const listLoading = useAppSelector(selectSalonCommissionListLoading);
  const listLoadingMore = useAppSelector(selectSalonCommissionListLoadingMore);
  const listRefreshing = useAppSelector(selectSalonCommissionListRefreshing);
  const pagination = useAppSelector(selectSalonCommissionPagination);

  const filteredRecords = useMemo(() => {
    if (isStaffUser && currentStaff) {
      return records.filter((record) => record.staffId === currentStaff.id);
    }
    return records;
  }, [records, isStaffUser, currentStaff]);

  const summary = useAppSelector(selectSalonCommissionSummary);
  const summaryLoading = useAppSelector(selectSalonCommissionSummaryLoading);
  const summaryError = useAppSelector(selectSalonCommissionSummaryError);

  const earned = useAppSelector(selectSalonCommissionEarned);
  const earnedLoaded = useAppSelector(selectSalonCommissionEarnedLoaded);
  const earnedLoading = useAppSelector(selectSalonCommissionEarnedLoading);
  const earnedError = useAppSelector(selectSalonCommissionEarnedError);

  const exporting = useAppSelector(selectSalonCommissionExporting);
  const exportError = useAppSelector(selectSalonCommissionExportError);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [settlementRecord, setSettlementRecord] = useState<SalonCommissionRecord | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const settlementLoading = useAppSelector((state) =>
    settlementRecord ? selectCommissionSettling(state, settlementRecord.staffId) : false,
  );
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    void dispatch(fetchSalonCommissionSummaryThunk());
    void dispatch(fetchSalonCommissionEarnedThunk());
    void dispatch(fetchSalonCommissionsThunk({ reset: true }));
  }, [dispatch]);

  useEffect(() => {
    const statusParam = statusFilter === "All" ? undefined : statusFilter.toLowerCase();

    void dispatch(
      fetchSalonCommissionsThunk({
        offset: 0,
        reset: true,
        search: deferredSearch,
        status: statusParam,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredSearch, statusFilter]);

  const handleRefresh = () => {
    void dispatch(fetchSalonCommissionSummaryThunk());
    void dispatch(fetchSalonCommissionEarnedThunk());
    void dispatch(
      fetchSalonCommissionsThunk({
        refresh: true,
        search: deferredSearch,
        status: statusFilter === "All" ? undefined : statusFilter.toLowerCase(),
      }),
    );
  };

  const handleLoadMore = () => {
    if (listLoading || listLoadingMore || listRefreshing || !pagination.hasMore) {
      return;
    }

    void dispatch(
      fetchSalonCommissionsThunk({
        limit: pagination.limit,
        offset: pagination.nextOffset,
        search: deferredSearch,
        status: statusFilter === "All" ? undefined : statusFilter.toLowerCase(),
      }),
    );
  };

  const handleSettle = (record: SalonCommissionRecord) => {
    setSettlementRecord(record);
    setIsSettlementModalOpen(true);
  };

  const handleConfirmSettle = async (amount: number) => {
    if (!settlementRecord) {
      return;
    }

    const resultAction = await dispatch(settleCommissionThunk({ staffId: settlementRecord.staffId, amount }));

    if (settleCommissionThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to settle commission",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    Alert.alert("Commission settled", resultAction.payload.message ?? "Payment recorded successfully.");
  };

  const handleSettlementModalClose = () => {
    setSettlementRecord(null);
    setIsSettlementModalOpen(false);
  };

  const handleExport = async () => {
    const resultAction = await dispatch(exportSalonCommissionsThunk());

    if (exportSalonCommissionsThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Export failed",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    const { url } = resultAction.payload;

    if (!url) {
      Alert.alert("Export unavailable", "No export file was returned by the server.");
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open export", "The export link could not be opened on this device.");
    }
  };

  function CommissionRow({
    onSettle,
    record,
    canSettle,
  }: {
    onSettle: (record: SalonCommissionRecord) => void;
    record: SalonCommissionRecord;
    canSettle: boolean;
  }) {
    const styles = useMemo(() => createStyles(Colors), []);
    const settling = useAppSelector((state) => selectCommissionSettling(state, record.staffId));
    const palette = getStatusPalette(record.status, Colors);
    const unpaidAmount = record.unpaidAmount ?? record.amount;

    const isSettlable = canSettle && record.status.toLowerCase() === "pending" && unpaidAmount > 0;

    return (
      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={styles.staffName}>{record.staffName}</Text>
          <Text style={styles.period}>{record.period ?? "-"}</Text>
        </View>
        <View style={styles.rowRight}>
          <View style={styles.amountColumn}>
            <Text style={styles.amountLabel}>Commission</Text>
            <Text style={styles.amount}>{formatCurrency(record.amount)}</Text>
          </View>
          <View style={styles.amountColumn}>
            <Text style={styles.amountLabel}>Unpaid</Text>
            <Text style={styles.unpaidAmount}>{formatCurrency(unpaidAmount)}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: palette.backgroundColor }]}>
            <Text style={[styles.statusPillText, { color: palette.color }]}>{record.status}</Text>
          </View>
        </View>
        {isSettlable ? (
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={settling}
            onPress={() => onSettle(record)}
            style={[styles.settleButton, settling && styles.buttonDisabled]}
          >
            {settling ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.settleButtonText}>Settle</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const renderItem: ListRenderItem<SalonCommissionRecord> = ({ item }) => (
    <CommissionRow onSettle={handleSettle} record={item} canSettle={hasSettlePermission} />
  );

  const listHeader = (
    <View>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.84} onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commissions</Text>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={exporting}
          onPress={() => void handleExport()}
          style={styles.headerButton}
        >
          {exporting ? (
            <ActivityIndicator color={Colors.primaryDark} size="small" />
          ) : (
            <Ionicons name="download-outline" size={18} color={Colors.primaryDark} />
          )}
        </TouchableOpacity>
      </View>

      {exportError ? <Text style={styles.errorText}>{exportError}</Text> : null}

      {summaryError ? (
        <Text style={styles.errorText}>{summaryError}</Text>
      ) : (
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>
              {summaryLoading ? "-" : formatCurrency(summary?.totalAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <Text style={styles.summaryValue}>
              {summaryLoading ? "-" : formatCurrency(summary?.paidAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={styles.summaryValue}>
              {summaryLoading ? "-" : formatCurrency(summary?.pendingAmount ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Staff</Text>
            <Text style={styles.summaryValue}>{summaryLoading ? "-" : summary?.totalStaff ?? 0}</Text>
          </View>
        </View>
      )}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Earned This Period</Text>
        {earnedError ? (
          <Text style={styles.errorText}>{earnedError}</Text>
        ) : earnedLoading && !earnedLoaded ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : earned.length === 0 ? (
          <Text style={styles.emptyText}>No commissions earned this period yet.</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.earnedList}>
            {earned.map((entry) => (
              <View key={entry.id} style={styles.earnedRow}>
                <Text style={styles.earnedName}>{entry.staffName}</Text>
                <Text style={styles.earnedAmount}>{formatCurrency(entry.earnedAmount)}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.text2} />
        <TextInput
          onChangeText={setSearch}
          placeholder="Search staff..."
          placeholderTextColor={Colors.placeholder}
          style={styles.searchInput}
          value={search}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.filterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {STATUS_FILTERS.map((filter) => {
          const isActive = filter === statusFilter;

          return (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.84}
              onPress={() => setStatusFilter(filter)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {listError ? <Text style={styles.errorText}>{listError}</Text> : null}
      {listLoading && records.length === 0 ? (
        <ActivityIndicator color={Colors.primary} size="large" style={styles.listLoading} />
      ) : null}
      {!listLoading && !listError && filteredRecords.length === 0 ? (
        <Text style={styles.emptyText}>No commission records found.</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        ListFooterComponent={
          listLoadingMore ? (
            <ActivityIndicator color={Colors.primary} size="small" style={styles.footerLoading} />
          ) : null
        }
        ListHeaderComponent={listHeader}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={handleRefresh}
            refreshing={listRefreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />

      <SettlementModal
        visible={isSettlementModalOpen}
        onClose={handleSettlementModalClose}
        onSettle={handleConfirmSettle}
        staffName={settlementRecord?.staffName ?? ""}
        totalUnpaidCommission={settlementRecord?.unpaidAmount ?? settlementRecord?.amount ?? 0}
        isLoading={settlementLoading}
      />
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingBottom: 120,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
    marginTop: Spacing.md,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    width: AppLayout.headerActionSize,
  },
  headerTitle: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: AppLayout.sectionGap,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    minWidth: "48%",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryLabel: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "700",
  },
  summaryValue: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 6,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
  },
  earnedList: {
    maxHeight: 180,
  },
  earnedRow: {
    alignItems: "center",
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  earnedName: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  earnedAmount: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  searchWrap: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: AppLayout.searchBarHeight,
    paddingHorizontal: AppLayout.searchBarPaddingX,
  },
  searchInput: {
    color: Colors.heading,
    flex: 1,
    fontSize: 14,
    minHeight: AppLayout.searchBarHeight,
  },
  filterRow: {
    gap: 8,
    paddingBottom: Spacing.md,
  },
  filterChip: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  listLoading: {
    marginVertical: Spacing.xl,
  },
  footerLoading: {
    marginVertical: Spacing.lg,
  },
  row: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    padding: 14,
  },
  rowInfo: {
    marginBottom: 8,
  },
  staffName: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  period: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  amountColumn: {
    alignItems: "flex-end",
  },
  amountLabel: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  amount: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
  },
  unpaidAmount: {
    color: Colors.warning,
    fontSize: 14,
    fontWeight: "800",
  },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  settleButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 40,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  settleButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});