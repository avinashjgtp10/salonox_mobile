import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import {
  fetchCommissionHistoryThunk,
  fetchCommissionSettingsThunk,
  fetchCommissionSlabsThunk,
  updateCommissionSettingsThunk,
  updateCommissionSlabsThunk,
} from "@/middleware/staff/staffCommissions.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectCommissionHistory,
  selectCommissionHistoryError,
  selectCommissionHistoryLoaded,
  selectCommissionHistoryLoading,
  selectCommissionSettings,
  selectCommissionSettingsError,
  selectCommissionSettingsLoaded,
  selectCommissionSettingsLoading,
  selectCommissionSettingsSaveError,
  selectCommissionSettingsSaving,
  selectCommissionSlabs,
  selectCommissionSlabsError,
  selectCommissionSlabsLoaded,
  selectCommissionSlabsLoading,
  selectCommissionSlabsSaveError,
  selectCommissionSlabsSaving,
} from "@/store/staff/staffCommissions.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { CommissionSlab } from "@/types/staffCommissions";
import { isValidStaffId } from "@/utils/staffIds";

type StaffCommissionSectionProps = {
  staffId?: string | null;
};

const COMMISSION_TYPES = ["percentage", "fixed"] as const;

function formatCurrency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

let localSlabIdCounter = 0;
function createLocalSlabId() {
  localSlabIdCounter += 1;
  return `new-slab-${localSlabIdCounter}`;
}

export function StaffCommissionSection({ staffId }: StaffCommissionSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();

  const commission = useAppSelector((state) => selectCommissionSettings(state, staffId));
  const settingsLoaded = useAppSelector((state) => selectCommissionSettingsLoaded(state, staffId));
  const settingsLoading = useAppSelector((state) => selectCommissionSettingsLoading(state, staffId));
  const settingsError = useAppSelector((state) => selectCommissionSettingsError(state, staffId));
  const settingsSaving = useAppSelector((state) => selectCommissionSettingsSaving(state, staffId));
  const settingsSaveError = useAppSelector((state) =>
    selectCommissionSettingsSaveError(state, staffId),
  );

  const slabs = useAppSelector((state) => selectCommissionSlabs(state, staffId));
  const slabsLoaded = useAppSelector((state) => selectCommissionSlabsLoaded(state, staffId));
  const slabsLoading = useAppSelector((state) => selectCommissionSlabsLoading(state, staffId));
  const slabsError = useAppSelector((state) => selectCommissionSlabsError(state, staffId));
  const slabsSaving = useAppSelector((state) => selectCommissionSlabsSaving(state, staffId));
  const slabsSaveError = useAppSelector((state) => selectCommissionSlabsSaveError(state, staffId));

  const history = useAppSelector((state) => selectCommissionHistory(state, staffId));
  const historyLoaded = useAppSelector((state) => selectCommissionHistoryLoaded(state, staffId));
  const historyLoading = useAppSelector((state) => selectCommissionHistoryLoading(state, staffId));
  const historyError = useAppSelector((state) => selectCommissionHistoryError(state, staffId));

  const [rate, setRate] = useState("");
  const [type, setType] = useState<string>("percentage");
  const [slabDrafts, setSlabDrafts] = useState<CommissionSlab[]>([]);

  // Track initialization per staffId to avoid re-syncing on every Redux update
  const initRef = useRef<{ staffId: string | null | undefined; commissionRate: number | undefined; commissionType: string | undefined; slabsLength: number }>({
    staffId: null,
    commissionRate: undefined,
    commissionType: undefined,
    slabsLength: -1,
  });

  useEffect(() => {
    if (staffId && isValidStaffId(staffId)) {
      if (!settingsLoaded && !settingsLoading) {
        void dispatch(fetchCommissionSettingsThunk(staffId));
      }
      if (!slabsLoaded && !slabsLoading) {
        void dispatch(fetchCommissionSlabsThunk(staffId));
      }
      if (!historyLoaded && !historyLoading) {
        void dispatch(fetchCommissionHistoryThunk(staffId));
      }
    }
  }, [dispatch, staffId, settingsLoaded, settingsLoading, slabsLoaded, slabsLoading, historyLoaded, historyLoading]);

  // Initialize/sync form state from Redux only when staffId changes or data first loads
  const commissionRate = commission?.rate;
  const commissionType = commission?.type;
  const slabsLength = slabs.length;

  // Store latest slabs array in ref for use in effect without adding to deps
  const slabsRef = useRef(slabs);
  if (slabsLength !== initRef.current.slabsLength) {
    slabsRef.current = slabs;
  }

  useEffect(() => {
    const current = initRef.current;
    const staffChanged = current.staffId !== staffId;

    if (staffChanged) {
      current.staffId = staffId;
      current.commissionRate = undefined;
      current.commissionType = undefined;
      current.slabsLength = -1;
    }

    // Sync commission settings when first loaded or when staff changes
    if (commissionRate !== undefined && (staffChanged || current.commissionRate !== commissionRate || current.commissionType !== commissionType)) {
      current.commissionRate = commissionRate;
      current.commissionType = commissionType;
      setRate(commissionRate ? String(commissionRate) : "");
      setType(commissionType || "percentage");
    }

    // Initialize slab drafts once per staffId when slabs first load
    if (slabsLength > 0 && (staffChanged || current.slabsLength !== slabsLength)) {
      current.slabsLength = slabsLength;
      setSlabDrafts(slabsRef.current);
    }
  }, [staffId, commissionRate, commissionType, slabsLength]);

  const rateNumber = Number(rate);
  const isRateValid =
    rate.trim().length > 0 &&
    Number.isFinite(rateNumber) &&
    rateNumber >= 0 &&
    (type !== "percentage" || rateNumber <= 100);

  const handleSaveSettings = async () => {
    if (!staffId || !isRateValid) {
      return;
    }

    const resultAction = await dispatch(
      updateCommissionSettingsThunk({
        staffId,
        updates: { rate: Number(rate), type },
      }),
    );

    if (updateCommissionSettingsThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to save commission settings",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    Alert.alert(
      "Commission settings updated",
      resultAction.payload.message ?? "Commission settings have been saved.",
    );
  };

  const addSlabRow = () => {
    setSlabDrafts((current) => [
      ...current,
      { id: createLocalSlabId(), maxAmount: null, minAmount: 0, rate: 0 },
    ]);
  };

  const removeSlabRow = (id: string) => {
    setSlabDrafts((current) => current.filter((slab) => slab.id !== id));
  };

  const updateSlabField = (id: string, field: "maxAmount" | "minAmount" | "rate", value: string) => {
    setSlabDrafts((current) =>
      current.map((slab) =>
        slab.id === id
          ? {
              ...slab,
              [field]: field === "maxAmount" && value.trim() === "" ? null : Number(value) || 0,
            }
          : slab,
      ),
    );
  };

  // Per-slab field checks (negative amounts, out-of-range rate, max <= min),
  // then a second pass across slabs sorted by minAmount to catch overlapping
  // ranges — both silently accepted before, with no gate on Save Slabs at all.
  const getSlabFieldError = (slab: CommissionSlab): string | null => {
    if (slab.minAmount < 0) {
      return "Min amount cannot be negative.";
    }

    if (slab.maxAmount !== null && slab.maxAmount < 0) {
      return "Max amount cannot be negative.";
    }

    if (slab.rate < 0 || slab.rate > 100) {
      return "Rate must be between 0 and 100.";
    }

    if (slab.maxAmount !== null && slab.maxAmount <= slab.minAmount) {
      return "Max amount must be greater than min amount.";
    }

    return null;
  };

  const slabErrorsById = useMemo(() => {
    const errorsById = new Map<string, string>();

    slabDrafts.forEach((slab) => {
      const fieldError = getSlabFieldError(slab);

      if (fieldError) {
        errorsById.set(slab.id, fieldError);
      }
    });

    const sortedByMin = [...slabDrafts].sort((a, b) => a.minAmount - b.minAmount);

    for (let index = 0; index < sortedByMin.length - 1; index += 1) {
      const current = sortedByMin[index];
      const next = sortedByMin[index + 1];

      if (errorsById.has(current.id) || errorsById.has(next.id)) {
        continue;
      }

      if (current.maxAmount === null || current.maxAmount > next.minAmount) {
        errorsById.set(next.id, "This slab's range overlaps with another slab.");
      }
    }

    return errorsById;
  }, [slabDrafts]);

  const hasSlabErrors = slabErrorsById.size > 0;

  const handleSaveSlabs = async () => {
    if (!staffId || hasSlabErrors) {
      return;
    }

    const resultAction = await dispatch(
      updateCommissionSlabsThunk({
        staffId,
        updates: {
          slabs: slabDrafts.map((slab) => ({
            ...(slab.maxAmount !== null ? { max_amount: slab.maxAmount } : {}),
            min_amount: slab.minAmount,
            rate: slab.rate,
          })),
        },
      }),
    );

    if (updateCommissionSlabsThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to save commission slabs",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    Alert.alert("Commission slabs updated", resultAction.payload.message ?? "Slabs have been saved.");
  };

  return (
    <>
      <StaffSectionCard title="Commission Settings">
        {settingsError ? (
          <StaffStateView
            actionLabel="Retry"
            description={settingsError}
            onAction={() => staffId && void dispatch(fetchCommissionSettingsThunk(staffId))}
            title="Unable to load commission settings"
            variant="error"
          />
        ) : settingsLoading && !settingsLoaded ? (
          <StaffStateView
            description="Fetching commission settings."
            loading
            title="Loading commission settings"
          />
        ) : (
          <>
            <View style={styles.typeGrid}>
              {COMMISSION_TYPES.map((commissionType) => {
                const isActive = commissionType === type;

                return (
                  <TouchableOpacity
                    key={commissionType}
                    activeOpacity={0.84}
                    onPress={() => setType(commissionType)}
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
              error={
                rate.trim().length > 0 && !isRateValid
                  ? type === "percentage"
                    ? "Rate must be between 0 and 100."
                    : "Rate cannot be negative."
                  : undefined
              }
              keyboardType="numeric"
              label={type === "percentage" ? "Rate (%)" : "Rate (Rs.)"}
              onChangeText={setRate}
              placeholder="e.g. 10"
              value={rate}
            />

            {settingsSaveError ? <Text style={styles.errorText}>{settingsSaveError}</Text> : null}

            <TouchableOpacity
              activeOpacity={0.84}
              disabled={!isRateValid || settingsSaving}
              onPress={() => void handleSaveSettings()}
              style={[
                styles.saveButton,
                (!isRateValid || settingsSaving) && styles.saveButtonDisabled,
              ]}
            >
              {settingsSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Commission Rate</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </StaffSectionCard>

      <StaffSectionCard
        action={
          <TouchableOpacity activeOpacity={0.84} onPress={addSlabRow} style={styles.addButton}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Slab</Text>
          </TouchableOpacity>
        }
        title="Commission Slabs"
      >
        {slabsError ? (
          <StaffStateView
            actionLabel="Retry"
            description={slabsError}
            onAction={() => staffId && void dispatch(fetchCommissionSlabsThunk(staffId))}
            title="Unable to load commission slabs"
            variant="error"
          />
        ) : null}
        {!slabsError && slabsLoading && !slabsLoaded ? (
          <StaffStateView description="Fetching commission slabs." loading title="Loading slabs" />
        ) : null}
        {!slabsError && slabsLoaded && slabDrafts.length === 0 ? (
          <StaffStateView
            description="Add tiered commission slabs based on revenue milestones."
            title="No slabs configured"
          />
        ) : null}
        {slabDrafts.length > 0 ? (
          <View style={styles.list}>
            {slabDrafts.map((slab) => {
              const slabError = slabErrorsById.get(slab.id);

              return (
                <View key={slab.id}>
                  <View style={styles.slabRow}>
                    <View style={styles.slabFields}>
                      <View style={styles.slabField}>
                        <StaffTextField
                          keyboardType="numeric"
                          label="Min"
                          onChangeText={(value) => updateSlabField(slab.id, "minAmount", value)}
                          value={String(slab.minAmount)}
                        />
                      </View>
                      <View style={styles.slabField}>
                        <StaffTextField
                          keyboardType="numeric"
                          label="Max"
                          onChangeText={(value) => updateSlabField(slab.id, "maxAmount", value)}
                          placeholder="No limit"
                          value={slab.maxAmount !== null ? String(slab.maxAmount) : ""}
                        />
                      </View>
                      <View style={styles.slabField}>
                        <StaffTextField
                          keyboardType="numeric"
                          label="Rate %"
                          onChangeText={(value) => updateSlabField(slab.id, "rate", value)}
                          value={String(slab.rate)}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() => removeSlabRow(slab.id)}
                      style={styles.removeSlabButton}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                  {slabError ? <Text style={styles.slabErrorText}>{slabError}</Text> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {slabsSaveError ? <Text style={styles.errorText}>{slabsSaveError}</Text> : null}

        <TouchableOpacity
          activeOpacity={0.84}
          disabled={slabsSaving || hasSlabErrors}
          onPress={() => void handleSaveSlabs()}
          style={[styles.saveButton, (slabsSaving || hasSlabErrors) && styles.saveButtonDisabled]}
        >
          {slabsSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Slabs</Text>
          )}
        </TouchableOpacity>
      </StaffSectionCard>

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
    </>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
  addButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  list: {
    gap: 10,
    marginBottom: Spacing.md,
  },
  slabRow: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  slabFields: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  slabField: {
    flex: 1,
  },
  slabErrorText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: -4,
  },
  removeSlabButton: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.full,
    height: 30,
    justifyContent: "center",
    width: 30,
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
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
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
