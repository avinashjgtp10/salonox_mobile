import { useRegionalPreferences } from "@/localization/preferences";
import { RefreshViewport } from "@/components/ui/RefreshViewport";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { appAlert as Alert } from "@/services/appAlert";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useFocusEffect, type Href } from "expo-router";
import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { DateRangePickerSheet } from "@/components/ui/DateRangePickerSheet";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { pearl } from "@/components/auth/pearl/tokens";
import { usePearlColors } from "@/components/auth/pearl/usePearlColors";
import {
  StaffHeader,
  StaffAvatar,
  staffUi,
} from "@/features/staff/components/StaffPearl";
import {
  CommissionButton,
  CommissionChip,
  commissionUi as ui,
} from "@/features/staff/components/CommissionPearl";
import { CommissionSettlementSheet } from "@/features/staff/components/CommissionSettlementSheet";
import {
  formatExportMonth,
  shareCommissionExport,
  type CommissionExportFormat,
} from "@/features/staff/utils/commissionExport";
import { getApiErrorMessage } from "@/services/api";
import {
  getCalendarMonthRange,
  salonCommissionsService,
} from "@/services/salonCommissions.service";
import { formatAppDate } from "@/utils/dateTime";
import {
  EmptyState,
  ErrorState,
  InlineLoader,
} from "@/components/ui/StateViews";
import { useAppToast } from "@/hooks/useAppToast";
import {
  fetchSalonCommissionEarnedThunk,
  fetchSalonCommissionSummaryThunk,
  settleCommissionThunk,
} from "@/middleware/staff/salonCommissions.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectCommissionSettling,
  selectSalonCommissionEarnedError,
  selectSalonCommissionEarnedLoaded,
  selectSalonCommissionEarnedLoading,
  selectSalonCommissionRecords,
  selectSalonCommissionSummary,
  selectSalonCommissionSummaryError,
  selectSalonCommissionSummaryLoading,
} from "@/store/staff/salonCommissions.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { canSettleCommission } from "@/utils/userProfile";
import type {
  CommissionDateRange,
  SalonCommissionRecord,
} from "@/types/salonCommissions";
import { formatCurrency } from "@/utils/currency";

const STATUS_FILTERS = ["All", "Pending", "Paid"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const RANGE_PRESETS = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom" },
] as const;
type RangePreset = (typeof RANGE_PRESETS)[number]["key"];

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatRangeDate = (iso: string) => formatAppDate(iso);

function getRejectedMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export default function SalonCommissionsScreen() {
  "use no memo";
  useRegionalPreferences();
  const Colors = usePearlColors(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useAppToast();

  const currentUser = useAppSelector(selectCurrentUser);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const userRole = currentUser?.role ?? "";
  const hasSettlePermission = canSettleCommission(userRole);
  const isStaffUser = currentStaff && !hasSettlePermission;

  const records = useAppSelector(selectSalonCommissionRecords);
  const listError = useAppSelector(selectSalonCommissionEarnedError);
  const listLoading = useAppSelector(selectSalonCommissionEarnedLoading);
  const listLoaded = useAppSelector(selectSalonCommissionEarnedLoaded);

  const summary = useAppSelector(selectSalonCommissionSummary);
  const summaryLoading = useAppSelector(selectSalonCommissionSummaryLoading);
  const summaryError = useAppSelector(selectSalonCommissionSummaryError);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [settlementRecord, setSettlementRecord] =
    useState<SalonCommissionRecord | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementBalance, setSettlementBalance] = useState<number | null>(
    null,
  );
  const [settlementBalanceLoading, setSettlementBalanceLoading] =
    useState(false);
  const settlementBalanceRequest = useRef(0);
  const settlementLoading = useAppSelector((state) =>
    settlementRecord
      ? selectCommissionSettling(state, settlementRecord.staffId)
      : false,
  );
  const deferredSearch = useDeferredValue(search);
  const [rangePreset, setRangePreset] = useState<RangePreset>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [exporting, setExporting] = useState<CommissionExportFormat | null>(
    null,
  );
  const customRangeInvalid = Boolean(
    customStart && customEnd && customStart > customEnd,
  );
  // Custom waits for both dates (and a valid order) before replacing the shown data.
  const range = useMemo<CommissionDateRange | null>(() => {
    if (rangePreset === "this_month") return getCalendarMonthRange(0);
    if (rangePreset === "last_month") return getCalendarMonthRange(-1);
    return customStart && customEnd && customStart <= customEnd
      ? { end_date: customEnd, start_date: customStart }
      : null;
  }, [rangePreset, customStart, customEnd]);
  const rangeLabel = range
    ? `${formatRangeDate(range.start_date)} – ${formatRangeDate(range.end_date)}`
    : "";
  // Export is monthly on the backend (same as the web): it uses the month the range starts in.
  const exportMonth = (
    range?.start_date ?? getCalendarMonthRange(0).start_date
  ).slice(0, 7);

  const loadCommissions = useCallback(() => {
    if (!hasSettlePermission || !range) {
      return Promise.resolve();
    }

    return Promise.all([
      dispatch(fetchSalonCommissionSummaryThunk(range)),
      dispatch(fetchSalonCommissionEarnedThunk(range)),
    ]);
  }, [dispatch, hasSettlePermission, range]);

  useFocusEffect(
    useCallback(() => {
      void loadCommissions();
      return () => {
        settlementBalanceRequest.current += 1;
        setSettlementBalanceLoading(false);
        setIsSettlementModalOpen(false);
        setSettlementRecord(null);
      };
    }, [loadCommissions]),
  );

  const selectPreset = (preset: RangePreset) => {
    setRangePreset(preset);
    if (preset === "custom" && !customStart && !customEnd) {
      const current = getCalendarMonthRange(0);
      setCustomStart(current.start_date);
      setCustomEnd(todayIso());
    }
  };

  const runExport = async (format: CommissionExportFormat) => {
    setExporting(format);
    try {
      await shareCommissionExport(exportMonth, format);
    } catch (error) {
      Alert.alert("Unable to export commissions", getApiErrorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  const handleExport = () => {
    Alert.alert(
      "Export commissions",
      `Exports are monthly. This exports ${formatExportMonth(exportMonth)}.`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void runExport("csv"), text: "CSV" },
        { onPress: () => void runExport("excel"), text: "Excel" },
        { onPress: () => void runExport("pdf"), text: "PDF" },
      ],
    );
  };

  const filteredRecords = useMemo(() => {
    const staffScoped =
      isStaffUser && currentStaff
        ? records.filter((record) => record.staffId === currentStaff.id)
        : records;

    const statusMatched =
      statusFilter === "All"
        ? staffScoped
        : staffScoped.filter((record) =>
            statusFilter === "Pending"
              ? (record.unpaidAmount ?? 0) > 0
              : record.status.toLowerCase() === statusFilter.toLowerCase(),
          );

    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return statusMatched;
    }

    return statusMatched.filter((record) =>
      record.staffName.toLowerCase().includes(query),
    );
  }, [records, isStaffUser, currentStaff, statusFilter, deferredSearch]);

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing || !hasSettlePermission) {
      return;
    }

    setRefreshing(true);
    try {
      await loadCommissions();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetry = () => {
    void loadCommissions();
  };

  const handleSettle = async (record: SalonCommissionRecord) => {
    if (settlementBalanceLoading) return;
    const request = ++settlementBalanceRequest.current;
    setSettlementRecord(record);
    setSettlementBalance(null);
    setSettlementBalanceLoading(true);
    try {
      const balance = await salonCommissionsService.getStaffUnpaidCommission(
        record.staffId,
      );
      if (request !== settlementBalanceRequest.current) return;
      if (balance <= 0) {
        setSettlementRecord(null);
        Alert.alert(
          "No unpaid commission",
          "This staff member has no commission left to settle.",
        );
        void loadCommissions();
        return;
      }
      setSettlementBalance(balance);
      setIsSettlementModalOpen(true);
    } catch (error) {
      if (request === settlementBalanceRequest.current) {
        setSettlementRecord(null);
        Alert.alert(
          "Unable to load unpaid commission",
          getApiErrorMessage(error),
        );
      }
    } finally {
      if (request === settlementBalanceRequest.current)
        setSettlementBalanceLoading(false);
    }
  };

  const handleConfirmSettle = async (amount: number) => {
    if (!settlementRecord) {
      return;
    }

    if (
      settlementLoading ||
      settlementBalance === null ||
      amount > settlementBalance
    )
      return;
    const resultAction = await dispatch(
      settleCommissionThunk({ staffId: settlementRecord.staffId, amount }),
    );

    if (settleCommissionThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to settle commission",
        getRejectedMessage(
          resultAction.payload,
          "Something went wrong. Please try again.",
        ),
      );
      return;
    }

    setSettlementRecord(null);
    setSettlementBalance(null);
    setIsSettlementModalOpen(false);
    if (
      settleCommissionThunk.fulfilled.match(resultAction) &&
      resultAction.payload.refreshFailed
    ) {
      Alert.alert(
        "Settlement saved",
        "The settlement was saved, but balances could not refresh. Pull down to update them; do not submit the same settlement again.",
      );
    } else {
      const remaining = settleCommissionThunk.fulfilled.match(resultAction)
        ? resultAction.payload.remainingBalance
        : undefined;
      toast.showSuccess(
        `${formatCurrency(amount)} settled.${remaining === undefined ? "" : remaining > 0 ? ` ${formatCurrency(remaining)} remains unpaid across all dates.` : " No unpaid commission remains."}`,
      );
    }
  };

  const handleSettlementModalClose = () => {
    settlementBalanceRequest.current += 1;
    setSettlementRecord(null);
    setSettlementBalance(null);
    setSettlementBalanceLoading(false);
    setIsSettlementModalOpen(false);
  };

  const unpaidCount = records.filter(
    (record) => (record.unpaidAmount ?? 0) > 0,
  ).length;
  const paidCount = records.filter(
    (record) => record.status.toLowerCase() === "paid",
  ).length;
  const monthLabel =
    rangePreset === "custom"
      ? rangeLabel
      : new Date(
          (range?.start_date ?? todayIso()) + "T12:00:00",
        ).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const renderItem: ListRenderItem<SalonCommissionRecord> = ({
    item: record,
  }) => {
    const unpaid = record.unpaidAmount ?? 0;
    const paid = record.status.toLowerCase() === "paid";
    const opening =
      settlementBalanceLoading && settlementRecord?.staffId === record.staffId;
    return (
      <View style={ui.card}>
        <View style={ui.row}>
          <StaffAvatar
            size={40}
            initials={record.staffName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((word) => word[0])
              .join("")
              .toUpperCase()}
          />
          <Text style={[ui.title, { flex: 1 }]}>{record.staffName}</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              borderRadius: 100,
              paddingHorizontal: 9,
              paddingVertical: 5,
              backgroundColor: paid ? pearl.successBg : pearl.warningBg,
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: paid ? pearl.successText : pearl.warningText,
              }}
            />
            <Text translate
              style={{
                color: paid ? pearl.successText : pearl.warningText,
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              {paid ? "Paid" : "Unpaid"}
            </Text>
          </View>
        </View>
        <View style={ui.between}>
          <View style={[ui.row, { gap: 18 }]}>
            <View>
              <Text translate style={ui.muted}>Earned</Text>
              <Text style={ui.value}>{formatCurrency(record.amount)}</Text>
            </View>
            <View>
              <Text translate style={ui.muted}>Unpaid</Text>
              <Text style={ui.value}>{formatCurrency(unpaid)}</Text>
            </View>
          </View>
          {hasSettlePermission && unpaid > 0 ? (
            <CommissionButton
              compact
              label={opening ? "Loading…" : "Settle"}
              disabled={
                opening || settlementBalanceLoading || settlementLoading
              }
              onPress={() => void handleSettle(record)}
            />
          ) : paid ? (
            <Text translate style={ui.muted}>All paid ✓</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const listHeader = (
    <View style={{ gap: 14 }}>
      <StaffHeader
        title="Commissions"
        subtitle={monthLabel}
        right={
          <View style={ui.row}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Rules"
              onPress={() => router.push("/team/commission-rules" as Href)}
              style={staffUi.icon}
            >
              <Ionicons name="list-outline" color={pearl.ink} size={19} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Export commissions"
              disabled={exporting !== null}
              onPress={handleExport}
              style={staffUi.icon}
            >
              {exporting ? (
                <ActivityIndicator color={pearl.accentDeep} />
              ) : (
                <Ionicons name="download-outline" color={pearl.ink} size={19} />
              )}
            </TouchableOpacity>
          </View>
        }
      />
      <View style={ui.chips}>
        {RANGE_PRESETS.map((preset) => (
          <CommissionChip
            key={preset.key}
            label={preset.label}
            selected={preset.key === rangePreset}
            onPress={() => {
              selectPreset(preset.key);
              if (preset.key === "custom") setDatePickerOpen(true);
            }}
          />
        ))}
      </View>
      {rangePreset === "custom" && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setDatePickerOpen(true)}
          style={[ui.input, ui.between]}
        >
          <Text style={ui.label}>{rangeLabel || "Choose dates"}</Text>
          <Ionicons
            name="calendar-outline"
            color={pearl.accentDeep}
            size={18}
          />
        </TouchableOpacity>
      )}
      {customRangeInvalid && rangePreset === "custom" && (
        <Text translate style={ui.error}>
          The start date must be on or before the end date.
        </Text>
      )}
      {summaryError ? (
        <Text style={ui.error}>{summaryError}</Text>
      ) : (
        <View style={[ui.row, { alignItems: "stretch" }]}>
          <View style={[ui.card, ui.statCard]}>
            <Text translate style={ui.muted}>Total earned</Text>
            <Text style={{ color: pearl.ink, fontSize: 24, fontWeight: "700" }}>
              {summaryLoading ? "—" : formatCurrency(summary?.totalAmount ?? 0)}
            </Text>
          </View>
          <View style={[ui.card, ui.statCard]}>
            <Text translate style={ui.muted}>Still to pay</Text>
            <Text style={{ color: "#4F7896", fontSize: 24, fontWeight: "700" }}>
              {summaryLoading
                ? "—"
                : formatCurrency(summary?.pendingAmount ?? 0)}
            </Text>
            <Text style={ui.muted}>
              {listLoading && !listLoaded
                ? "—"
                : unpaidCount + " of " + records.length + " staff"}
            </Text>
          </View>
        </View>
      )}
      <View style={ui.chips}>
        {STATUS_FILTERS.map((filter) => (
          <CommissionChip
            key={filter}
            selected={filter === statusFilter}
            label={
              filter === "Pending"
                ? "Unpaid " + unpaidCount
                : filter === "Paid"
                  ? "Paid " + paidCount
                  : "All"
            }
            onPress={() => setStatusFilter(filter)}
          />
        ))}
      </View>
      <View style={[ui.input, ui.row]}>
        <Ionicons name="search-outline" color={pearl.muted} size={18} />
        <TextInput
          style={{
            flex: 1,
            minHeight: 48,
            color: pearl.ink,
            backgroundColor: "transparent",
          }}
          placeholder="Search staff"
          placeholderTextColor={pearl.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {listLoading && !listLoaded && (
        <InlineLoader label="Loading commissions..." />
      )}
      {!listLoading && listError && (
        <ErrorState message={listError} onRetry={handleRetry} />
      )}
      {!listLoading && !listError && !filteredRecords.length && (
        <EmptyState
          accent="indigo"
          description={
            records.length
              ? "No commission records match the selected search or status."
              : "Commission records will appear here after eligible checkouts in the selected dates."
          }
          icon="cash-outline"
          title={
            records.length
              ? "No matching commissions"
              : "No commissions in this period"
          }
        />
      )}
    </View>
  );

  if (!hasSettlePermission) return <Redirect href="/more" />;
  return (
    <PearlBackground>
      <SafeAreaView edges={["top"]} style={ui.screen}>
        <AppStatusBar />
        <RefreshViewport>
          <FlatList
            contentContainerStyle={[
              ui.content,
              { paddingBottom: insets.bottom + 24 },
            ]}
            data={filteredRecords}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeader}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                colors={[Colors.primary]}
                tintColor={Colors.primary}
                onRefresh={() => void handleRefresh()}
                refreshing={refreshing}
              />
            }
          />
        </RefreshViewport>
        <DateRangePickerSheet
          pearlStyle
          centered={false}
          title="Date range"
          visible={datePickerOpen}
          startDate={customStart || null}
          endDate={customEnd || null}
          maximumDate={new Date()}
          onClose={() => setDatePickerOpen(false)}
          onApply={(start, end) => {
            if (start && end) {
              setCustomStart(start);
              setCustomEnd(end);
              setDatePickerOpen(false);
            }
          }}
        />
        <CommissionSettlementSheet
          visible={isSettlementModalOpen}
          onClose={handleSettlementModalClose}
          onSettle={handleConfirmSettle}
          staffName={settlementRecord?.staffName ?? ""}
          totalUnpaidCommission={settlementBalance ?? 0}
          isLoading={settlementLoading}
        />
      </SafeAreaView>
    </PearlBackground>
  );
}
