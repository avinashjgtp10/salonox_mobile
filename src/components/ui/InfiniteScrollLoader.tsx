import { memo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useThemeColors } from "@/theme/ThemeProvider";

export const InfiniteScrollLoader = memo(function InfiniteScrollLoader({
  loading,
  label = "Loading more items",
}: { loading: boolean; label?: string }) {
  const colors = useThemeColors();
  if (!loading) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={styles.container}>
      <ActivityIndicator color={colors.primary} size="small" />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", minHeight: 56, paddingVertical: 16 },
});
