import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ConsumableUnitConversion, ConsumableUnitConversionRequestItem } from "@/types/consumable";

type DraftRow = {
  conversionToBase: string;
  key: string;
  unitName: string;
};

let rowKeyCounter = 0;
const nextRowKey = () => {
  rowKeyCounter += 1;
  return `unit-conversion-${rowKeyCounter}`;
};

const toDraftRows = (conversions: ConsumableUnitConversion[]): DraftRow[] =>
  conversions.map((item) => ({
    conversionToBase: String(item.conversionToBase),
    key: nextRowKey(),
    unitName: item.unitName,
  }));

type UnitConversionsSheetProps = {
  baseUnit: string | null;
  conversions: ConsumableUnitConversion[];
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onSave: (items: ConsumableUnitConversionRequestItem[]) => void;
  saving: boolean;
  visible: boolean;
};

export function UnitConversionsSheet({
  baseUnit,
  conversions,
  error,
  loading,
  onClose,
  onSave,
  saving,
  visible,
}: UnitConversionsSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [rows, setRows] = useState<DraftRow[]>(() => toDraftRows(conversions));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setRows(toDraftRows(conversions));
      setValidationError(null);
    }
  }, [visible, conversions]);

  const addRow = () => {
    setRows((current) => [...current, { conversionToBase: "", key: nextRowKey(), unitName: "" }]);
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const updateRow = (key: string, patch: Partial<DraftRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const handleSave = () => {
    const items: ConsumableUnitConversionRequestItem[] = [];

    for (const row of rows) {
      const unitName = row.unitName.trim();
      const conversionToBase = Number(row.conversionToBase);

      if (!unitName && !row.conversionToBase.trim()) {
        continue;
      }

      if (!unitName || !Number.isFinite(conversionToBase) || conversionToBase <= 0) {
        setValidationError("Each row needs a unit name and a conversion ratio greater than 0.");
        return;
      }

      items.push({ conversion_to_base: conversionToBase, unit_name: unitName });
    }

    setValidationError(null);
    onSave(items);
  };

  return (
    <BottomSheet
      footer={
        <TouchableOpacity
          activeOpacity={saving ? 1 : 0.84}
          disabled={saving}
          onPress={handleSave}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>Save</Text>}
        </TouchableOpacity>
      }
      onClose={onClose}
      subtitle={baseUnit ? `1 unit = this many base units (${baseUnit})` : undefined}
      title="Unit Conversions"
      visible={visible}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <>
          {rows.map((row) => (
            <View key={row.key} style={styles.row}>
              <TextInput
                onChangeText={(value) => updateRow(row.key, { unitName: value })}
                placeholder="Unit name (e.g. bottle)"
                placeholderTextColor={Colors.placeholder}
                style={[styles.input, styles.unitInput]}
                value={row.unitName}
              />
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) => updateRow(row.key, { conversionToBase: value })}
                placeholder="Ratio"
                placeholderTextColor={Colors.placeholder}
                style={[styles.input, styles.ratioInput]}
                value={row.conversionToBase}
              />
              <TouchableOpacity
                accessibilityLabel="Remove conversion row"
                onPress={() => removeRow(row.key)}
                style={styles.removeButton}
              >
                <Ionicons color={Colors.error} name="trash-outline" size={16} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity activeOpacity={0.84} onPress={addRow} style={styles.addButton}>
            <Ionicons color={Colors.primaryDark} name="add" size={16} />
            <Text style={styles.addButtonText}>Add conversion</Text>
          </TouchableOpacity>

          {rows.length === 0 ? (
            <Text style={styles.emptyText}>No unit conversions yet. Add one above.</Text>
          ) : null}
        </>
      )}

      {validationError || error ? <Text style={styles.errorText}>{validationError ?? error}</Text> : null}
    </BottomSheet>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    input: {
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      color: Colors.heading,
      fontSize: 13,
      height: 44,
      paddingHorizontal: 12,
    },
    unitInput: {
      flex: 1.4,
    },
    ratioInput: {
      flex: 1,
    },
    removeButton: {
      alignItems: "center",
      backgroundColor: Colors.errorBg,
      borderRadius: AppRadius.control,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    addButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      flexDirection: "row",
      gap: 6,
      marginTop: Spacing.sm,
    },
    addButtonText: {
      color: Colors.primaryDark,
      fontSize: 13,
      fontWeight: "800",
    },
    emptyText: {
      color: Colors.text2,
      fontSize: 12,
      marginTop: Spacing.sm,
    },
    errorText: {
      color: Colors.error,
      fontSize: 12,
      fontWeight: "700",
      marginTop: Spacing.md,
    },
    saveButton: {
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: Radius.md,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 14,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
  });
