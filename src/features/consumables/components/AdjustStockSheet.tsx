import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ConsumableAdjustDirection, ConsumableAdjustReason, ConsumableDetail } from "@/types/consumable";

export type AdjustStockSubmission = {
  direction: ConsumableAdjustDirection;
  note: string;
  qty: number;
  reason: ConsumableAdjustReason;
};

type AdjustStockSheetProps = {
  consumable: ConsumableDetail | null;
  error: string | null;
  onClose: () => void;
  onSubmit: (value: AdjustStockSubmission) => void;
  submitting: boolean;
  visible: boolean;
};

// Verified live against the real backend validator (2026-08-17): reason is
// a fixed enum — "reason must be one of: purchase, damage, expired,
// manual_correction" — not free text as an earlier phase assumed.
const REASON_OPTIONS: { label: string; value: ConsumableAdjustReason }[] = [
  { label: "Purchase", value: "purchase" },
  { label: "Damage", value: "damage" },
  { label: "Expired", value: "expired" },
  { label: "Manual Correction", value: "manual_correction" },
];

export function AdjustStockSheet({ consumable, error, onClose, onSubmit, submitting, visible }: AdjustStockSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [direction, setDirection] = useState<ConsumableAdjustDirection>("increase");
  const [qtyInput, setQtyInput] = useState("");
  const [reason, setReason] = useState<ConsumableAdjustReason | null>(null);
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDirection("increase");
      setQtyInput("");
      setReason(null);
      setNote("");
      setValidationError(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    const qty = Number(qtyInput);

    if (!qtyInput.trim() || !Number.isFinite(qty) || qty <= 0) {
      setValidationError("Enter a quantity greater than 0.");
      return;
    }

    if (!reason) {
      setValidationError("Select a reason.");
      return;
    }

    setValidationError(null);
    onSubmit({ direction, note: note.trim(), qty, reason });
  };

  return (
    <BottomSheet
      footer={
        <TouchableOpacity
          activeOpacity={submitting ? 1 : 0.84}
          disabled={submitting}
          onPress={handleSubmit}
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Save Adjustment</Text>
          )}
        </TouchableOpacity>
      }
      onClose={onClose}
      subtitle={consumable ? `${consumable.name} — currently ${consumable.amount} ${consumable.measureUnit ?? ""}`.trim() : undefined}
      title="Adjust Stock"
      visible={visible}
    >
      <Text style={styles.label}>Direction</Text>
      <View style={styles.directionRow}>
        {(["increase", "decrease"] as const).map((option) => {
          const active = direction === option;
          return (
            <TouchableOpacity
              key={option}
              activeOpacity={0.84}
              onPress={() => setDirection(option)}
              style={[styles.directionButton, active && styles.directionButtonActive]}
            >
              <Text style={[styles.directionButtonText, active && styles.directionButtonTextActive]}>
                {option === "increase" ? "Increase" : "Decrease"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Quantity{consumable?.measureUnit ? ` (${consumable.measureUnit})` : ""}</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={setQtyInput}
        placeholder="0"
        placeholderTextColor={Colors.placeholder}
        style={styles.input}
        value={qtyInput}
      />

      <Text style={styles.label}>Reason</Text>
      <View style={styles.reasonRow}>
        {REASON_OPTIONS.map((option) => {
          const active = reason === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.84}
              onPress={() => setReason(option.value)}
              style={[styles.reasonChip, active && styles.reasonChipActive]}
            >
              <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        multiline
        numberOfLines={3}
        onChangeText={setNote}
        placeholder="Additional details"
        placeholderTextColor={Colors.placeholder}
        style={[styles.input, styles.noteInput]}
        value={note}
      />

      {validationError || error ? <Text style={styles.errorText}>{validationError ?? error}</Text> : null}
    </BottomSheet>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    label: {
      color: Colors.heading,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 8,
      marginTop: Spacing.md,
    },
    directionRow: {
      flexDirection: "row",
      gap: Spacing.sm,
    },
    directionButton: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      flex: 1,
      paddingVertical: 12,
    },
    directionButtonActive: {
      backgroundColor: Colors.primaryDark,
      borderColor: Colors.primaryDark,
    },
    directionButtonText: {
      color: Colors.heading,
      fontSize: 13,
      fontWeight: "800",
    },
    directionButtonTextActive: {
      color: "#FFFFFF",
    },
    reasonRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
    },
    reasonChip: {
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.full,
      borderWidth: 1,
      paddingHorizontal: 13,
      paddingVertical: 9,
    },
    reasonChipActive: {
      backgroundColor: Colors.primaryDark,
      borderColor: Colors.primaryDark,
    },
    reasonChipText: {
      color: Colors.text2,
      fontSize: 12,
      fontWeight: "700",
    },
    reasonChipTextActive: {
      color: "#FFFFFF",
    },
    input: {
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      color: Colors.heading,
      fontSize: 14,
      minHeight: 48,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    noteInput: {
      minHeight: 78,
      textAlignVertical: "top",
    },
    errorText: {
      color: Colors.error,
      fontSize: 12,
      fontWeight: "700",
      marginTop: Spacing.md,
    },
    submitButton: {
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: Radius.md,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 14,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
  });
