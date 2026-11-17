import { pearl } from "@/components/auth/pearl/tokens";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

export const InfiniteScrollLoader = memo(function InfiniteScrollLoader({
  loading,
  label = "Loading more items",
}: { loading: boolean; label?: string }) {
  if (!loading) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={styles.container}>
      <ActivityIndicator color={pearl.accentDeep} size="small" />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", minHeight: 56, paddingVertical: 16 },
});
