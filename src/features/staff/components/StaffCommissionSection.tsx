import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

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

// Commission rule creation/configuration (rate, type, slabs) is Web-only.
// This section only displays the staff member's past earned-commission
// transactions, read from the existing commission history API.
export function StaffCommissionSection({ staffId }: StaffCommissionSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();

  const history = useAppSelector((state) => selectCommissionHistory(state, staffId));
  const historyLoaded = useAppSelector((state) => selectCommissionHistoryLoaded(state, staffId));
  const historyLoading = useAppSelector((state) => selectCommissionHistoryLoading(state, staffId));
  const historyError = useAppSelector((state) => selectCommissionHistoryError(state, staffId));

  useEffect(() => {
    if (staffId && isValidStaffId(staffId) && !historyLoaded && !historyLoading) {
      void dispatch(fetchCommissionHistoryThunk(staffId));
    }
  }, [dispatch, staffId, historyLoaded, historyLoading]);

  return (
    <StaffSectionCard title="Commission History">
      {historyError ? (
        <StaffStateView
          actionLabel="Retry"
          description={historyError}
          onAction={() => staffId && void dispatch(fetchCommissionHistoryThunk(staffId))}
          title="Unable to load commission history"
          variant="error"
        />
      ) : null}
      {!historyError && historyLoading && !historyLoaded ? (
        <StaffStateView description="Fetching commission history." loading title="Loading history" />
      ) : null}
      {!historyError && historyLoaded && history.length === 0 ? (
        <StaffStateView description="No commissions earned yet." title="No commission history" />
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
