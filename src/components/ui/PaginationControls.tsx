import { memo, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

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
  loading = false,
}: PaginationControlsProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  if (!loading) {
    return null;
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.wrap}>
      <ActivityIndicator color={Colors.primary} size="small" />
    </View>
  );
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg },
});
