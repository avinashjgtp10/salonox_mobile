import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ConsumableSortBy, ConsumableStatusFilter } from "@/types/consumable";

export type ConsumableFilterValue = {
  productType: string[];
  sortBy: ConsumableSortBy;
  sortOrder: "asc" | "desc";
  status: ConsumableStatusFilter[];
};

const STATUS_OPTIONS: { label: string; value: ConsumableStatusFilter }[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Low stock", value: "low_stock" },
  { label: "Out of stock", value: "out_of_stock" },
];

const SORT_OPTIONS: { label: string; value: ConsumableSortBy }[] = [
  { label: "Name", value: "name" },
  { label: "Stock qty", value: "amount" },
  { label: "Low-stock alert", value: "qty_alert" },
  { label: "Recently added", value: "created_at" },
  { label: "Recently updated", value: "updated_at" },
];

type ConsumableFilterSheetProps = {
  availableProductTypes: string[];
  onApply: (value: ConsumableFilterValue) => void;
  onClose: () => void;
  onReset: () => void;
  value: ConsumableFilterValue;
  visible: boolean;
};

const toggleValue = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((candidate) => candidate !== item) : [...list, item];

export function ConsumableFilterSheet({
  availableProductTypes,
  onApply,
  onClose,
  onReset,
  value,
  visible,
}: ConsumableFilterSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [value, visible]);

  const footer = (
    <>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => {
          onReset();
          onClose();
        }}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>Reset</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => {
          onApply(draft);
          onClose();
        }}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Apply</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <BottomSheet footer={footer} onClose={onClose} title="Filter Consumables" visible={visible}>
      <Text style={styles.sectionTitle}>Status</Text>
      <View style={styles.chipRow}>
        {STATUS_OPTIONS.map((option) => {
          const active = draft.status.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.84}
              onPress={() => setDraft((current) => ({ ...current, status: toggleValue(current.status, option.value) }))}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {availableProductTypes.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Product type</Text>
          <View style={styles.chipRow}>
            {availableProductTypes.map((type) => {
              const active = draft.productType.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  activeOpacity={0.84}
                  onPress={() =>
                    setDraft((current) => ({ ...current, productType: toggleValue(current.productType, type) }))
                  }
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Sort by</Text>
      <View style={styles.chipRow}>
        {SORT_OPTIONS.map((option) => {
          const active = draft.sortBy === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              activeOpacity={0.84}
              onPress={() => setDraft((current) => ({ ...current, sortBy: option.value }))}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Order</Text>
      <View style={styles.chipRow}>
        {(["asc", "desc"] as const).map((order) => {
          const active = draft.sortOrder === order;
          return (
            <TouchableOpacity
              key={order}
              activeOpacity={0.84}
              onPress={() => setDraft((current) => ({ ...current, sortOrder: order }))}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {order === "asc" ? "Ascending" : "Descending"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    sectionTitle: {
      color: Colors.heading,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
    },
    chip: {
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: AppRadius.pill,
      borderWidth: 1,
      paddingHorizontal: 13,
      paddingVertical: 8,
    },
    chipActive: {
      backgroundColor: Colors.primaryDark,
      borderColor: Colors.primaryDark,
    },
    chipText: {
      color: Colors.text2,
      fontSize: 12,
      fontWeight: "700",
    },
    chipTextActive: {
      color: "#FFFFFF",
    },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 13,
    },
    secondaryButtonText: {
      color: Colors.heading,
      fontSize: 13,
      fontWeight: "800",
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: Radius.md,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 13,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },
  });
