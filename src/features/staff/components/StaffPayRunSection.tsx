import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import { fetchPayRunsThunk, upsertPayRunThunk } from "@/middleware/staff/staffPayRuns.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { formatAppDate } from "@/utils/dateTime";
import {
  selectPayRunSaveError,
  selectPayRunSaving,
  selectPayRuns,
  selectPayRunsError,
  selectPayRunsLoaded,
  selectPayRunsLoading,
} from "@/store/staff/staffPayRuns.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { isValidStaffId } from "@/utils/staffIds";

type StaffPayRunSectionProps = {
  staffId?: string | null;
};

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

export function StaffPayRunSection({ staffId }: StaffPayRunSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const payRuns = useAppSelector((state) => selectPayRuns(state, staffId));
  const loaded = useAppSelector((state) => selectPayRunsLoaded(state, staffId));
  const loading = useAppSelector((state) => selectPayRunsLoading(state, staffId));
  const listError = useAppSelector((state) => selectPayRunsError(state, staffId));
  const saving = useAppSelector((state) => selectPayRunSaving(state, staffId));
  const saveError = useAppSelector((state) => selectPayRunSaveError(state, staffId));

  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  useEffect(() => {
    if (staffId && isValidStaffId(staffId) && !loaded && !loading) {
      void dispatch(fetchPayRunsThunk(staffId));
    }
  }, [dispatch, loaded, loading, staffId]);

  const handleRetry = () => {
    if (staffId) {
      void dispatch(fetchPayRunsThunk(staffId));
    }
  };

  const isValid = Number(amount) > 0 && periodStart.trim().length > 0 && periodEnd.trim().length > 0;

  const handleSave = async () => {
    if (!staffId || !isValid) {
      return;
    }

    const resultAction = await dispatch(
      upsertPayRunThunk({
        staffId,
        updates: {
          amount: Number(amount),
          period_end: periodEnd.trim(),
          period_start: periodStart.trim(),
          status: "pending",
        },
      }),
    );

    if (upsertPayRunThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to save pay run",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    Alert.alert("Pay run saved", resultAction.payload.message ?? "The pay run has been recorded.");
    setAmount("");
    setPeriodStart("");
    setPeriodEnd("");
  };

  return (
    <StaffSectionCard title="Pay Runs">
      {listError ? (
        <StaffStateView
          actionLabel="Retry"
          description={listError}
          onAction={handleRetry}
          title="Unable to load pay runs"
          variant="error"
        />
      ) : null}
      {!listError && loading && !loaded ? (
        <StaffStateView description="Fetching pay run history." loading title="Loading pay runs" />
      ) : null}
      {!listError && loaded && payRuns.length === 0 ? (
        <StaffStateView
          description="No pay runs recorded yet for this staff member."
          title="No pay runs"
        />
      ) : null}
      {!listError && payRuns.length > 0 ? (
        <View style={styles.list}>
          {payRuns.map((payRun) => (
            <View key={payRun.id} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.period}>
                  {formatAppDate(payRun.periodStart, "-")} — {formatAppDate(payRun.periodEnd, "-")}
                </Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{payRun.status}</Text>
                </View>
              </View>
              <Text style={styles.amount}>{formatCurrency(payRun.amount)}</Text>
              {payRun.netAmount !== null ? (
                <Text style={styles.meta}>Net: {formatCurrency(payRun.netAmount)}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.formWrap}>
        <Text style={styles.formTitle}>Record Pay Run</Text>
        <StaffTextField
          keyboardType="numeric"
          label="Amount"
          onChangeText={setAmount}
          placeholder="e.g. 30000"
          value={amount}
        />
        <StaffTextField
          label="Period Start"
          onChangeText={setPeriodStart}
          placeholder="YYYY-MM-DD"
          value={periodStart}
        />
        <StaffTextField
          label="Period End"
          onChangeText={setPeriodEnd}
          placeholder="YYYY-MM-DD"
          value={periodEnd}
        />

        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
        {!isValid ? (
          <Text style={styles.hintText}>Enter amount, period start and period end to save.</Text>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.84}
          disabled={!isValid || saving}
          onPress={() => void handleSave()}
          style={[styles.saveButton, (!isValid || saving) && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Pay Run</Text>
          )}
        </TouchableOpacity>
      </View>
    </StaffSectionCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  list: {
    gap: 10,
    marginBottom: Spacing.md,
  },
  row: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 14,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  period: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  amount: {
    color: Colors.heading,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  meta: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 4,
  },
  formWrap: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  formTitle: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  hintText: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    justifyContent: "center",
    minHeight: 48,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
