import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { useAppToast } from "@/hooks/useAppToast";
import { fetchPayRunsThunk, upsertPayRunThunk } from "@/middleware/staff/staffPayRuns.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPayRunSaveError, selectPayRunSaving, selectPayRuns, selectPayRunsError, selectPayRunsLoaded, selectPayRunsLoading } from "@/store/staff/staffPayRuns.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { UpsertPayRunRequest } from "@/types/staffPayRuns";
import { isValidStaffId } from "@/utils/staffIds";

const DEFAULTS: Required<UpsertPayRunRequest> = {
  pay_runs_enabled: false, payment_method: "pay_manually", calculation_type: "automatic",
  deduct_payment_processing_fees: false, deduct_new_client_fees: false, record_cash_advances: false,
};
const TOGGLES = [
  ["pay_runs_enabled", "Enable pay runs"],
  ["deduct_payment_processing_fees", "Deduct payment processing fees"],
  ["deduct_new_client_fees", "Deduct new client fees"],
  ["record_cash_advances", "Record cash advances"],
] as const;

export function StaffPayRunSection({ staffId }: { staffId?: string | null }) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8 },
    label: { flex: 1, color: colors.text },
    choices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
    choice: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
    button: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 12 },
  }), [colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const settings = useAppSelector((state) => selectPayRuns(state, staffId))[0];
  const loaded = useAppSelector((state) => selectPayRunsLoaded(state, staffId));
  const loading = useAppSelector((state) => selectPayRunsLoading(state, staffId));
  const error = useAppSelector((state) => selectPayRunsError(state, staffId));
  const saving = useAppSelector((state) => selectPayRunSaving(state, staffId));
  const saveError = useAppSelector((state) => selectPayRunSaveError(state, staffId));
  const [form, setForm] = useState(DEFAULTS);
  useEffect(() => {
    if (staffId && isValidStaffId(staffId) && !loaded && !loading && !error) void dispatch(fetchPayRunsThunk(staffId));
  }, [dispatch, staffId, loaded, loading, error]);
  useEffect(() => {
    setForm(settings ? {
      pay_runs_enabled: settings.pay_runs_enabled, payment_method: settings.payment_method,
      calculation_type: settings.calculation_type, deduct_payment_processing_fees: settings.deduct_payment_processing_fees,
      deduct_new_client_fees: settings.deduct_new_client_fees, record_cash_advances: settings.record_cash_advances,
    } : DEFAULTS);
  }, [settings, staffId]);
  const save = async () => {
    if (!staffId || saving) return;
    const action = await dispatch(upsertPayRunThunk({ staffId, updates: form }));
    if (upsertPayRunThunk.fulfilled.match(action)) toast.showSuccess("Pay run settings saved.");
  };
  return (
    <StaffSectionCard title="Pay Run Settings">
      {error ? (
        <StaffStateView
          title="Unable to load settings"
          description={error}
          variant="error"
          actionLabel="Retry"
          onAction={() => { if (staffId) void dispatch(fetchPayRunsThunk(staffId)); }}
        />
      ) : loading && !loaded ? (
        <ActivityIndicator color={colors.primaryText} />
      ) : (
        <>
          {TOGGLES.map(([key, label]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Switch
                disabled={saving}
                value={form[key]}
                onValueChange={(value) => setForm((current) => ({ ...current, [key]: value }))}
              />
            </View>
          ))}
          <Text style={styles.label}>Payment method</Text>
          <View style={styles.choices}>
            {(["pay_manually", "bank_transfer"] as const).map((value) => (
              <TouchableOpacity
                key={value}
                disabled={saving}
                accessibilityRole="radio"
                accessibilityState={{ checked: form.payment_method === value }}
                style={[styles.choice, { backgroundColor: form.payment_method === value ? colors.primary : "transparent" }]}
                onPress={() => setForm((current) => ({ ...current, payment_method: value }))}
              >
                <Text style={{ color: form.payment_method === value ? "#FFFFFF" : colors.text }}>
                  {value === "pay_manually" ? "Pay manually" : "Bank transfer"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Calculation</Text>
          <View style={styles.choices}>
            {(["automatic", "manual"] as const).map((value) => (
              <TouchableOpacity
                key={value}
                disabled={saving}
                accessibilityRole="radio"
                accessibilityState={{ checked: form.calculation_type === value }}
                style={[styles.choice, { backgroundColor: form.calculation_type === value ? colors.primary : "transparent" }]}
                onPress={() => setForm((current) => ({ ...current, calculation_type: value }))}
              >
                <Text style={{ color: form.calculation_type === value ? "#FFFFFF" : colors.text }}>
                  {value === "automatic" ? "Automatic" : "Manual"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {saveError ? <Text style={{ color: colors.error }}>{saveError}</Text> : null}
          <TouchableOpacity disabled={saving || !loaded} style={styles.button} onPress={() => void save()}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: "#FFFFFF" }}>Save Settings</Text>}
          </TouchableOpacity>
        </>
      )}
    </StaffSectionCard>
  );
}
