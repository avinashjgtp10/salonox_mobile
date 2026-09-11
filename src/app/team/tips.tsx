import { Ionicons } from "@expo/vector-icons";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

import { AppBackButton, AppBackButtonPlaceholder } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SettlementModal } from "@/components/ui/SettlementModal";
import { EmptyState, ErrorState, InlineLoader } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useAppToast } from "@/hooks/useAppToast";
import {
  fetchSalonTipEarnedThunk,
  fetchSalonTipSummaryThunk,
  fetchTipSettlementsThunk,
  settleTipThunk,
} from "@/middleware/staff/salonTips.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectSalonTipEarnedError,
  selectSalonTipEarnedLoaded,
  selectSalonTipEarnedLoading,
  selectSalonTipRecords,
  selectSalonTipSummary,
  selectSalonTipSummaryError,
  selectSalonTipSummaryLoading,
  selectTipSettlements,
  selectTipSettlementsError,
  selectTipSettlementsLoaded,
  selectTipSettlementsLoading,
  selectTipSettling,
} from "@/store/staff/salonTips.slice";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { SalonTipRecord } from "@/types/salonTips";
import { formatAppDateTime } from "@/utils/dateTime";
import { canSettleTip } from "@/utils/userProfile";

const STATUS_FILTERS = ["All", "Pending", "Partial", "Paid"] as const;
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
    case "partial":
    case "pending":
    default:
      return { backgroundColor: Colors.warningBg, color: Colors.warning };
  }
}

export default function SalonTipsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useAppToast();

  const currentUser = useAppSelector(selectCurrentUser);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const hasSettlePermission = canSettleTip(currentUser?.role);
  const isStaffUser = currentStaff && !hasSettlePermission;

  const records = useAppSelector(selectSalonTipRecords);
  const listError = useAppSelector(selectSalonTipEarnedError);
  const listLoading = useAppSelector(selectSalonTipEarnedLoading);
  const listLoaded = useAppSelector(selectSalonTipEarnedLoaded);
  const summary = useAppSelector(selectSalonTipSummary);
  const summaryLoading = useAppSelector(selectSalonTipSummaryLoading);
  const summaryError = useAppSelector(selectSalonTipSummaryError);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [settlementRecord, setSettlementRecord] = useState<SalonTipRecord | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<SalonTipRecord | null>(null);
  const historyStaffId = historyRecord?.staffId ?? null;
  const settlements = useAppSelector((state) => selectTipSettlements(state, historyStaffId));
  const settlementsLoaded = useAppSelector((state) =>
    selectTipSettlementsLoaded(state, historyStaffId),
  );
  const settlementsLoading = useAppSelector((state) =>
    selectTipSettlementsLoading(state, historyStaffId),
  );
  const settlementsError = useAppSelector((state) =>
    selectTipSettlementsError(state, historyStaffId),
  );
  const settlementLoading = useAppSelector((state) =>
    settlementRecord ? selectTipSettling(state, settlementRecord.staffId) : false,
  );
  const deferredSearch = useDeferredValue(search);

  useFocusEffect(
    useCallback(() => {
      if (!hasSettlePermission) {
        return;
      }

      void dispatch(fetchSalonTipSummaryThunk());
      void dispatch(fetchSalonTipEarnedThunk());
    }, [dispatch, hasSettlePermission]),
  );

  const filteredRecords = useMemo(() => {
    const staffScoped =
      isStaffUser && currentStaff
        ? records.filter((record) => record.staffId === currentStaff.id)
        : records;
    const statusMatched =
      statusFilter === "All"
        ? staffScoped
        : staffScoped.filter((record) => record.status.toLowerCase() === statusFilter.toLowerCase());
    const query = deferredSearch.trim().toLowerCase();

    return query
      ? statusMatched.filter((record) => record.staffName.toLowerCase().includes(query))
      : statusMatched;
  }, [currentStaff, deferredSearch, isStaffUser, records, statusFilter]);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing || !hasSettlePermission) {
      return;
    }

    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchSalonTipSummaryThunk()),
        dispatch(fetchSalonTipEarnedThunk()),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    if (!hasSettlePermission) {
      return;
    }

    void dispatch(fetchSalonTipSummaryThunk());
    void dispatch(fetchSalonTipEarnedThunk());
  };

  const handleOpenHistory = (record: SalonTipRecord) => {
    setHistoryRecord(record);
    void dispatch(fetchTipSettlementsThunk(record.staffId));
  };

  const handleConfirmSettle = async (amount: number, paymentMethod?: string) => {
    if (!settlementRecord) {
      return;
    }

    const resultAction = await dispatch(
      settleTipThunk({ amount, paymentMethod, staffId: settlementRecord.staffId }),
    );

    if (settleTipThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to settle tip",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    setSettlementRecord(null);
    setIsSettlementModalOpen(false);
    toast.showSuccess("Tip settled successfully.");
  };

  function TipRow({ record }: { record: SalonTipRecord }) {
    const settling = useAppSelector((state) => selectTipSettling(state, record.staffId));
    const palette = getStatusPalette(record.status, Colors);
    const unpaidAmount = record.unpaidAmount ?? 0;
    const isSettlable = hasSettlePermission && unpaidAmount > 0;

    return (
      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={styles.staffName}>{record.staffName}</Text>
          <Text style={styles.period}>{record.period ?? "-"}</Text>
        </View>
        <View style={styles.rowRight}>
          <View style={styles.amountColumn}>
            <Text style={styles.amountLabel}>Tips</Text>
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
        <View style={styles.rowActions}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => handleOpenHistory(record)}
            style={styles.historyButton}
          >
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
          {isSettlable ? (
            <TouchableOpacity
              activeOpacity={0.84}
              disabled={settling}
              onPress={() => {
                setSettlementRecord(record);
                setIsSettlementModalOpen(true);
              }}
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
      </View>
    );
  }

  const renderItem: ListRenderItem<SalonTipRecord> = ({ item }) => <TipRow record={item} />;

  const listHeader = (
    <View>
      <View style={styles.header}>
        <AppBackButton fallbackHref="/team" />
        <Text style={styles.headerTitle}>Tips</Text>
        <AppBackButtonPlaceholder />
      </View>

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
            <Text style={styles.summaryValue}>{listLoading && !listLoaded ? "-" : records.length}</Text>
          </View>
        </View>
      )}

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

      <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = filter === statusFilter;

          return (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.84}
              onPress={() => setStatusFilter(filter)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{filter}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {listLoading && !listLoaded ? <InlineLoader label="Loading current-month tips..." /> : null}
      {!listLoading && listError ? <ErrorState message={listError} onRetry={handleRetry} /> : null}
      {!listLoading && !listError && filteredRecords.length === 0 ? (
        <EmptyState
          accent="indigo"
          description={
            records.length > 0
              ? "No tip records match the selected search or status."
              : "Tip records will appear here after eligible current-month checkouts."
          }
          icon="wallet-outline"
          title={records.length > 0 ? "No matching tips" : "No tips this month"}
        />
      ) : null}
    </View>
  );

  if (!hasSettlePermission) {
    return <Redirect href="/more" />;
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            colors={[Colors.primary]}
            onRefresh={() => void handleRefresh()}
            refreshing={refreshing}
            tintColor={Colors.primary}
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />

      <SettlementModal
        visible={isSettlementModalOpen}
        onClose={() => {
          setSettlementRecord(null);
          setIsSettlementModalOpen(false);
        }}
        onSettle={handleConfirmSettle}
        settlementLabel="Tip"
        staffName={settlementRecord?.staffName ?? ""}
        totalLabel="Total Unpaid Tips"
        totalUnpaidCommission={settlementRecord?.unpaidAmount ?? 0}
        isLoading={settlementLoading}
      />

      <BottomSheet
        onClose={() => setHistoryRecord(null)}
        scrollable
        subtitle={historyRecord?.staffName}
        title="Tip Settlements"
        visible={historyRecord !== null}
      >
        {settlementsLoading && !settlementsLoaded ? (
          <InlineLoader label="Loading settlements..." />
        ) : null}
        {!settlementsLoading && settlementsError ? (
          <ErrorState
            message={settlementsError}
            onRetry={() => historyStaffId && void dispatch(fetchTipSettlementsThunk(historyStaffId))}
          />
        ) : null}
        {!settlementsLoading && !settlementsError && settlements.length === 0 ? (
          <EmptyState
            accent="indigo"
            description="No tips have been paid out to this staff member yet."
            icon="wallet-outline"
            title="No settlements yet"
          />
        ) : null}
        {!settlementsError && settlements.length > 0 ? (
          <View style={styles.settlementList}>
            {settlements.map((settlement) => (
              <View key={settlement.id} style={styles.settlementRow}>
                <View style={styles.settlementInfo}>
                  <Text style={styles.settlementDate}>
                    {formatAppDateTime(settlement.settledAt)}
                  </Text>
                  <Text style={styles.settlementMeta}>
                    {settlement.paymentMethod ?? "-"} · {settlement.status}
                  </Text>
                  {settlement.notes ? (
                    <Text style={styles.settlementMeta}>{settlement.notes}</Text>
                  ) : null}
                </View>
                <Text style={styles.settlementAmount}>{formatCurrency(settlement.amount)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  content: {
    paddingHorizontal: AppLayout.contentHorizontalPadding,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: AppLayout.headerMarginBottom,
    marginTop: Spacing.md,
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
  rowActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  historyButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 18,
  },
  historyButtonText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
  },
  settleButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
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
  settlementList: {
    gap: 10,
  },
  settlementRow: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
    padding: 14,
  },
  settlementInfo: {
    flex: 1,
    gap: 4,
  },
  settlementDate: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  settlementMeta: {
    color: Colors.text2,
    fontSize: 11,
    textTransform: "capitalize",
  },
  settlementAmount: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
});
