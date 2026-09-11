import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { getAttendanceStatusConfig } from "@/features/attendance/utils/attendanceStatus";
import {
  fetchStaffAttendanceHistoryThunk,
  fetchStaffSaleHistoryThunk,
} from "@/middleware/staff/staffHistory.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffAttendanceHistory,
  selectStaffAttendanceHistoryError,
  selectStaffAttendanceHistoryLoaded,
  selectStaffAttendanceHistoryLoading,
  selectStaffSaleHistory,
  selectStaffSaleHistoryError,
  selectStaffSaleHistoryLoaded,
  selectStaffSaleHistoryLoading,
} from "@/store/staff/staffHistory.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { formatAppDate, formatAppTime } from "@/utils/dateTime";
import { isValidStaffId } from "@/utils/staffIds";

type StaffHistorySectionProps = {
  staffId?: string | null;
};

const TABS = [
  { key: "sales", label: "Sales" },
  { key: "attendance", label: "Attendance" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

// Both tabs read the current calendar month, matching the range the
// commission and tip screens report on.
export function StaffHistorySection({ staffId }: StaffHistorySectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabKey>("sales");

  const saleItems = useAppSelector((state) => selectStaffSaleHistory(state, staffId));
  const salesLoaded = useAppSelector((state) => selectStaffSaleHistoryLoaded(state, staffId));
  const salesLoading = useAppSelector((state) => selectStaffSaleHistoryLoading(state, staffId));
  const salesError = useAppSelector((state) => selectStaffSaleHistoryError(state, staffId));

  const attendance = useAppSelector((state) => selectStaffAttendanceHistory(state, staffId));
  const attendanceLoaded = useAppSelector((state) =>
    selectStaffAttendanceHistoryLoaded(state, staffId),
  );
  const attendanceLoading = useAppSelector((state) =>
    selectStaffAttendanceHistoryLoading(state, staffId),
  );
  const attendanceError = useAppSelector((state) =>
    selectStaffAttendanceHistoryError(state, staffId),
  );

  useEffect(() => {
    if (!staffId || !isValidStaffId(staffId)) {
      return;
    }

    if (activeTab === "sales" && !salesLoaded && !salesLoading) {
      void dispatch(fetchStaffSaleHistoryThunk(staffId));
    }

    if (activeTab === "attendance" && !attendanceLoaded && !attendanceLoading) {
      void dispatch(fetchStaffAttendanceHistoryThunk(staffId));
    }
  }, [
    activeTab,
    attendanceLoaded,
    attendanceLoading,
    dispatch,
    salesLoaded,
    salesLoading,
    staffId,
  ]);

  const isSales = activeTab === "sales";
  const error = isSales ? salesError : attendanceError;
  const loading = isSales ? salesLoading : attendanceLoading;
  const loaded = isSales ? salesLoaded : attendanceLoaded;
  const isEmpty = isSales ? saleItems.length === 0 : attendance.length === 0;

  const handleRetry = () => {
    if (!staffId) {
      return;
    }

    if (isSales) {
      void dispatch(fetchStaffSaleHistoryThunk(staffId));
      return;
    }

    void dispatch(fetchStaffAttendanceHistoryThunk(staffId));
  };

  return (
    <StaffSectionCard title="History">
      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.84}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <StaffStateView
          actionLabel="Retry"
          description={error}
          onAction={handleRetry}
          title={isSales ? "Unable to load sale history" : "Unable to load attendance history"}
          variant="error"
        />
      ) : null}

      {!error && loading && !loaded ? (
        <StaffStateView
          description={isSales ? "Fetching sale history." : "Fetching attendance history."}
          loading
          title="Loading history"
        />
      ) : null}

      {!error && loaded && isEmpty ? (
        <StaffStateView
          description={
            isSales
              ? "No services or products sold by this staff member this month."
              : "No attendance recorded for this staff member this month."
          }
          title={isSales ? "No sale history" : "No attendance history"}
        />
      ) : null}

      {!error && isSales && saleItems.length > 0 ? (
        <View style={styles.list}>
          {saleItems.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {item.clientName ?? "Walk-in"} · {item.saleCreatedDateLabel}
                </Text>
                <Text style={styles.rowMeta}>
                  {item.itemType.replace("_", " ")} · Qty {item.quantity} · {item.paymentSource}
                </Text>
              </View>
              <Text style={styles.rowAmount}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!error && !isSales && attendance.length > 0 ? (
        <View style={styles.list}>
          {attendance.map((record) => {
            const status = getAttendanceStatusConfig(record.statusKey, Colors);

            return (
              <View key={record.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{formatAppDate(record.date)}</Text>
                  <Text style={styles.rowMeta}>
                    In {formatAppTime(record.checkInTime)} · Out {formatAppTime(record.checkOutTime)}
                  </Text>
                  {record.hoursWorked === null ? null : (
                    <Text style={styles.rowMeta}>{record.hoursWorked} hrs worked</Text>
                  )}
                </View>
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </StaffSectionCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
  },
  tab: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  list: {
    gap: 10,
  },
  row: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
    padding: 14,
  },
  rowMain: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  rowMeta: {
    color: Colors.text2,
    fontSize: 11,
    textTransform: "capitalize",
  },
  rowAmount: {
    color: Colors.heading,
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
  },
});
