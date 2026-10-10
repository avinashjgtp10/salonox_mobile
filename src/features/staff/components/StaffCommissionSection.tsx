import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { DashboardRadius as Radius, type ThemeColors } from "@/constants/theme";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { fetchCommissionHistoryThunk } from "@/middleware/staff/staffCommissions.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectCommissionHistory,
  selectCommissionHistoryError,
  selectCommissionHistoryLoaded,
  selectCommissionHistoryLoading,
} from "@/store/staff/staffCommissions.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { isValidStaffId } from "@/utils/staffIds";

type StaffCommissionSectionProps = {
  staffId?: string | null;
};

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

const toMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const shiftMonth = (month: string, delta: number) => {
  const [year, monthIndex] = month.split("-").map(Number);
  return toMonthKey(new Date(year, monthIndex - 1 + delta, 1));
};

const formatMonthLabel = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export function StaffCommissionSection({ staffId }: StaffCommissionSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const currentMonth = toMonthKey(new Date());
  const [month, setMonth] = useState(currentMonth);
  const historyArgs = { month, staffId: staffId ?? undefined };

  const history = useAppSelector((state) => selectCommissionHistory(state, historyArgs));
  const historyLoaded = useAppSelector((state) => selectCommissionHistoryLoaded(state, historyArgs));
  const historyLoading = useAppSelector((state) => selectCommissionHistoryLoading(state, historyArgs));
  const historyError = useAppSelector((state) => selectCommissionHistoryError(state, historyArgs));
  const monthTotal = history.reduce((sum, entry) => sum + entry.amount, 0);

  useEffect(() => {
    if (staffId && isValidStaffId(staffId) && !historyLoaded && !historyLoading) {
      void dispatch(fetchCommissionHistoryThunk({ month, staffId }));
    }
  }, [dispatch, staffId, month, historyLoaded, historyLoading]);

  return (
    <StaffSectionCard title="Commission History">
      <View style={styles.monthBar}>
        <TouchableOpacity accessibilityLabel="Previous month" accessibilityRole="button" hitSlop={8} onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthButton}>
          <Ionicons color={Colors.heading} name="chevron-back" size={18} />
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text style={styles.monthLabel}>{formatMonthLabel(month)}</Text>
          {historyLoaded && history.length > 0 ? <Text style={styles.monthTotal}>Total {formatCurrency(monthTotal)}</Text> : null}
        </View>
        <TouchableOpacity
          accessibilityLabel="Next month"
          accessibilityRole="button"
          accessibilityState={{ disabled: month >= currentMonth }}
          disabled={month >= currentMonth}
          hitSlop={8}
          onPress={() => setMonth(shiftMonth(month, 1))}
          style={[styles.monthButton, month >= currentMonth && styles.monthButtonDisabled]}
        >
          <Ionicons color={Colors.heading} name="chevron-forward" size={18} />
        </TouchableOpacity>
      </View>
      {historyError ? (
        <StaffStateView
          actionLabel="Retry"
          description={historyError}
          onAction={() => staffId && void dispatch(fetchCommissionHistoryThunk({ month, staffId }))}
          title="Unable to load commission history"
          variant="error"
        />
      ) : null}
      {!historyError && historyLoading && !historyLoaded ? (
        <StaffStateView description="Fetching commission history." loading title="Loading history" />
      ) : null}
      {!historyError && historyLoaded && history.length === 0 ? (
        <StaffStateView description={`No commissions earned in ${formatMonthLabel(month)}.`} title="No commission history" />
      ) : null}
      {!historyError && history.length > 0 ? (
        <View style={styles.list}>
          {history.map((entry) => (
            <View key={entry.id} style={styles.historyRow}>
              <View>
                <Text style={styles.historyPeriod}>{entry.period ?? "-"}</Text>
                <Text style={styles.historyStatus}>{entry.status}</Text>
              </View>
              <Text style={styles.historyAmount}>{formatCurrency(entry.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </StaffSectionCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  monthBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthButton: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  monthButtonDisabled: {
    opacity: 0.35,
  },
  monthCenter: {
    alignItems: "center",
    flex: 1,
  },
  monthLabel: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
  monthTotal: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  list: {
    gap: 10,
  },
  historyRow: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  historyPeriod: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  historyStatus: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
    textTransform: "capitalize",
  },
  historyAmount: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
  },
});
