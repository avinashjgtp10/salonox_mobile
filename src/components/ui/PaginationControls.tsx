import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type PaginationControlsProps = {
  currentPage: number;
  disabled?: boolean;
  hasNextPage: boolean;
  hasPreviousPage?: boolean;
  loading?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  totalItems?: number;
  totalPages?: number;
  visibleItems?: number;
};

export const PaginationControls = memo(function PaginationControls({
  currentPage,
  disabled = false,
  hasNextPage,
  hasPreviousPage,
  loading = false,
  onNext,
  onPrevious,
  totalItems,
  totalPages,
  visibleItems,
}: PaginationControlsProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const previousEnabled = Boolean(onPrevious && hasPreviousPage && !loading && !disabled);
  const nextEnabled = Boolean(onNext && hasNextPage && !loading && !disabled);
  const totalLabel = totalPages && totalPages > 0 ? ` of ${totalPages}` : "";
  const countLabel = typeof visibleItems === "number" && typeof totalItems === "number"
    ? `Showing ${Math.min(visibleItems, totalItems)} of ${totalItems}`
    : undefined;

  return (
    <View accessibilityLiveRegion="polite" style={styles.wrap}>
      {countLabel ? <Text style={styles.countText}>{countLabel}</Text> : null}
      <View style={styles.controls}>
        <TouchableOpacity
          accessibilityLabel="Previous page"
          accessibilityRole="button"
          activeOpacity={0.84}
          disabled={!previousEnabled}
          onPress={onPrevious}
          style={[styles.navButton, !previousEnabled && styles.disabledButton]}
        >
          <Ionicons name="chevron-back" size={18} color={previousEnabled ? Colors.primary : Colors.text2} />
          <Text style={[styles.navText, !previousEnabled && styles.disabledText]}>Prev</Text>
        </TouchableOpacity>

        <View style={styles.pagePill}>
          {loading ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
          <Text style={styles.pageText}>Page {currentPage}{totalLabel}</Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="Next page"
          accessibilityRole="button"
          activeOpacity={0.84}
          disabled={!nextEnabled}
          onPress={onNext}
          style={[styles.navButton, styles.nextButton, !nextEnabled && styles.disabledButton]}
        >
          <Text style={[styles.navText, nextEnabled && styles.nextText, !nextEnabled && styles.disabledText]}>Next</Text>
          <Ionicons name="chevron-forward" size={18} color={nextEnabled ? "#FFFFFF" : Colors.text2} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: { gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg },
  countText: { color: Colors.text2, fontSize: 12, fontWeight: "700", textAlign: "center" },
  controls: { alignItems: "center", flexDirection: "row", gap: Spacing.sm, justifyContent: "center" },
  navButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 42,
    minWidth: 94,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  nextButton: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  disabledButton: { opacity: 0.5 },
  navText: { color: Colors.primary, fontSize: 13, fontWeight: "800" },
  nextText: { color: "#FFFFFF" },
  disabledText: { color: Colors.text2 },
  pagePill: {
    alignItems: "center",
    backgroundColor: Colors.backgroundSelected,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.xs,
    minHeight: 42,
    paddingHorizontal: Spacing.md,
  },
  pageText: { color: Colors.heading, fontSize: 13, fontWeight: "800" },
});
