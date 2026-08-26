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
import { useAppToast } from "@/hooks/useAppToast";
import { fetchStaffWageThunk, updateStaffWageThunk } from "@/middleware/staff/staffWages.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffWage,
  selectStaffWageError,
  selectStaffWageLoaded,
  selectStaffWageLoading,
  selectStaffWageSaveError,
  selectStaffWageSaving,
} from "@/store/staff/staffWages.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { isValidStaffId } from "@/utils/staffIds";

type StaffWageSectionProps = {
  staffId?: string | null;
};

const WAGE_TYPES = ["monthly", "hourly", "commission_only", "hybrid"] as const;

export function StaffWageSection({ staffId }: StaffWageSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const wage = useAppSelector((state) => selectStaffWage(state, staffId));
  const loaded = useAppSelector((state) => selectStaffWageLoaded(state, staffId));
  const loading = useAppSelector((state) => selectStaffWageLoading(state, staffId));
  const listError = useAppSelector((state) => selectStaffWageError(state, staffId));
  const saving = useAppSelector((state) => selectStaffWageSaving(state, staffId));
  const saveError = useAppSelector((state) => selectStaffWageSaveError(state, staffId));

  const [baseAmount, setBaseAmount] = useState("");
  const [type, setType] = useState<string>("monthly");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (staffId && isValidStaffId(staffId) && !loaded && !loading) {
      void dispatch(fetchStaffWageThunk(staffId));
    }
  }, [dispatch, loaded, loading, staffId]);

  useEffect(() => {
    if (wage) {
      setBaseAmount(wage.baseAmount ? String(wage.baseAmount) : "");
      setType(wage.type || "monthly");
      setNotes(wage.notes ?? "");
    }
  }, [wage]);

  const handleRetry = () => {
    if (staffId) {
      void dispatch(fetchStaffWageThunk(staffId));
    }
  };

  const isValid = Number(baseAmount) > 0;

  const handleSave = async () => {
    if (!staffId || !isValid) {
      return;
    }

    const resultAction = await dispatch(
      updateStaffWageThunk({
        staffId,
        updates: {
          base_amount: Number(baseAmount),
          notes: notes.trim() || undefined,
          type,
        },
      }),
    );

    if (updateStaffWageThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to save wage",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    toast.showSuccess("Wage updated successfully.");
  };

  if (listError) {
    return (
      <StaffSectionCard title="Wages">
        <StaffStateView
          actionLabel="Retry"
          description={listError}
          onAction={handleRetry}
          title="Unable to load wage"
          variant="error"
        />
      </StaffSectionCard>
    );
  }

  if (loading && !loaded) {
    return (
      <StaffSectionCard title="Wages">
        <StaffStateView description="Fetching wage details." loading title="Loading wages" />
      </StaffSectionCard>
    );
  }

  return (
    <StaffSectionCard title="Wages">
      <View style={styles.typeGrid}>
        {WAGE_TYPES.map((wageType) => {
          const isActive = wageType === type;

          return (
            <TouchableOpacity
              key={wageType}
              activeOpacity={0.84}
              onPress={() => setType(wageType)}
              style={[styles.typeChip, isActive && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                {wageType.replace(/_/g, " ")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <StaffTextField
        keyboardType="numeric"
        label="Base Amount"
        onChangeText={setBaseAmount}
        placeholder="e.g. 25000"
        value={baseAmount}
      />
      <StaffTextField
        label="Notes"
        multiline
        onChangeText={setNotes}
        placeholder="Optional notes"
        value={notes}
      />

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
      {!isValid ? (
        <Text style={styles.hintText}>Enter a base amount greater than 0 to save.</Text>
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
          <Text style={styles.saveButtonText}>Save Wage</Text>
        )}
      </TouchableOpacity>
    </StaffSectionCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.md,
  },
  typeChip: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
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
