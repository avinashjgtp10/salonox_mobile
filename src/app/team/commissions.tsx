import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useDeferredValue, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import {
  bulkConfigureCommissionsThunk,
  exportSalonCommissionsThunk,
  fetchSalonCommissionEarnedThunk,
  fetchSalonCommissionSummaryThunk,
  fetchSalonCommissionsThunk,
  markCommissionPaidThunk,
} from "@/middleware/staff/salonCommissions.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectBulkConfigureError,
  selectBulkConfiguring,
  selectCommissionMarkingPaid,
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
import type { SalonCommissionRecord } from "@/types/salonCommissions";

const STATUS_FILTERS = ["All", "Pending", "Paid"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const COMMISSION_TYPES = ["percentage", "fixed"] as const;

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

function getStatusPalette(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
      return { backgroundColor: "#EAF5EF", color: Colors.success };
    case "pending":
    default:
      return { backgroundColor: "#FFF4E3", color: Colors.warning };
  }
}

function CommissionRow({
  onMarkPaid,
  record,
}: {
  onMarkPaid: (record: SalonCommissionRecord) => void;
  record: SalonCommissionRecord;
}) {
  const marking = useAppSelector((state) => selectCommissionMarkingPaid(state, record.staffId));
  const palette = getStatusPalette(record.status);

  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.staffName}>{record.staffName}</Text>
        <Text style={styles.period}>{record.period ?? "-"}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.amount}>{formatCurrency(record.amount)}</Text>
        <View style={[styles.statusPill, { backgroundColor: palette.backgroundColor }]}>
          <Text style={[styles.statusPillText, { color: palette.color }]}>{record.status}</Text>
        </View>
      </View>
      {record.status.toLowerCase() === "pending" ? (
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={marking}
          onPress={() => onMarkPaid(record)}
          style={[styles.markPaidButton, marking && styles.buttonDisabled]}
        >
          {marking ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.markPaidButtonText}>Mark Paid</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function SalonCommissionsScreen() {
  const dispatch = useAppDispatch();

  const summary = useAppSelector(selectSalonCommissionSummary);
  const summaryLoading = useAppSelector(selectSalonCommissionSummaryLoading);
  const summaryError = useAppSelector(selectSalonCommissionSummaryError);

  const earned = useAppSelector(selectSalonCommissionEarned);
  const earnedLoaded = useAppSelector(selectSalonCommissionEarnedLoaded);
  const earnedLoading = useAppSelector(selectSalonCommissionEarnedLoading);
  const earnedError = useAppSelector(selectSalonCommissionEarnedError);

  const records = useAppSelector(selectSalonCommissionRecords);
  const listError = useAppSelector(selectSalonCommissionListError);
  const listLoading = useAppSelector(selectSalonCommissionListLoading);
  const listLoadingMore = useAppSelector(selectSalonCommissionListLoadingMore);
  const listRefreshing = useAppSelector(selectSalonCommissionListRefreshing);
  const pagination = useAppSelector(selectSalonCommissionPagination);

  const exporting = useAppSelector(selectSalonCommissionExporting);
  const exportError = useAppSelector(selectSalonCommissionExportError);

  const bulkConfiguring = useAppSelector(selectBulkConfiguring);
  const bulkConfigureError = useAppSelector(selectBulkConfigureError);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [isBulkSheetOpen, setIsBulkSheetOpen] = useState(false);
  const [bulkRate, setBulkRate] = useState("");
  const [bulkType, setBulkType] = useState<string>("percentage");
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

  const handleMarkPaid = (record: SalonCommissionRecord) => {
    Alert.alert(
      "Mark Commission Paid",
      `Mark ${record.staffName}'s commission of ${formatCurrency(record.amount)} as paid?`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void handleConfirmMarkPaid(record), text: "Mark Paid" },
      ],
    );
  };

  const handleConfirmMarkPaid = async (record: SalonCommissionRecord) => {
    const resultAction = await dispatch(markCommissionPaidThunk(record.staffId));

    if (markCommissionPaidThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to mark as paid",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    Alert.alert("Commission marked as paid", resultAction.payload.message ?? "Payment recorded.");
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

  const isBulkRateValid = bulkRate.trim().length > 0 && Number(bulkRate) >= 0;

  const handleBulkConfigure = async () => {
    if (!isBulkRateValid) {
      return;
    }

    const resultAction = await dispatch(
      bulkConfigureCommissionsThunk({ rate: Number(bulkRate), type: bulkType }),
    );

    if (bulkConfigureCommissionsThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to bulk configure",
        getRejectedMessage(resultAction.payload, "Something went wrong. Please try again."),
      );
      return;
    }

    setIsBulkSheetOpen(false);
    setBulkRate("");
    Alert.alert(
      "Commissions configured",
      resultAction.payload.message ??
        `Updated commission settings for ${resultAction.payload.affectedCount} staff members.`,
    );
  };

  const renderItem: ListRenderItem<SalonCommissionRecord> = ({ item }) => (
    <CommissionRow onMarkPaid={handleMarkPaid} record={item} />
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
      {!listLoading && !listError && records.length === 0 ? (
        <Text style={styles.emptyText}>No commission records found.</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <FlatList
        contentContainerStyle={styles.content}
        data={records}
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

      <View style={styles.stickyFooter}>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => setIsBulkSheetOpen(true)}
          style={styles.bulkButton}
        >
          <Ionicons name="options-outline" size={18} color="#FFFFFF" />
          <Text style={styles.bulkButtonText}>Bulk Configure</Text>
        </TouchableOpacity>
      </View>

      <StaffBottomSheet
        onClose={() => setIsBulkSheetOpen(false)}
        subtitle="Applies a default commission rate across all staff."
        title="Bulk Configure Commissions"
        visible={isBulkSheetOpen}
      >
        <View style={styles.typeGrid}>
          {COMMISSION_TYPES.map((commissionType) => {
            const isActive = commissionType === bulkType;

            return (
              <TouchableOpacity
                key={commissionType}
                activeOpacity={0.84}
                onPress={() => setBulkType(commissionType)}
                style={[styles.typeChip, isActive && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                  {commissionType}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <StaffTextField
          keyboardType="numeric"
          label={bulkType === "percentage" ? "Rate (%)" : "Rate (Rs.)"}
          onChangeText={setBulkRate}
          placeholder="e.g. 10"
          value={bulkRate}
        />

        {bulkConfigureError ? <Text style={styles.errorText}>{bulkConfigureError}</Text> : null}

        <TouchableOpacity
          activeOpacity={0.84}
          disabled={!isBulkRateValid || bulkConfiguring}
          onPress={() => void handleBulkConfigure()}
          style={[
            styles.saveButton,
            (!isBulkRateValid || bulkConfiguring) && styles.buttonDisabled,
          ]}
        >
          {bulkConfiguring ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Apply to All Staff</Text>
          )}
        </TouchableOpacity>
      </StaffBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: "space-between",
  },
  amount: {
    color: Colors.heading,
    fontSize: 15,
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
  markPaidButton: {
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
  markPaidButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  stickyFooter: {
    bottom: 0,
    left: 0,
    paddingBottom: Spacing.lg,
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
    position: "absolute",
    right: 0,
  },
  bulkButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  bulkButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  typeGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
  },
  typeChip: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 48,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
