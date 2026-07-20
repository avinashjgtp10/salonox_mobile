import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/network/network.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

export function OfflineBanner() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const isOnline = useAppSelector(selectIsOnline);

  if (isOnline) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.banner, { paddingTop: Math.max(insets.top, 8) }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={Colors.error} />
      <Text style={styles.text}>You are offline. We will retry loading when the connection returns.</Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    banner: {
      alignItems: "center",
      backgroundColor: Colors.errorBg,
      borderBottomColor: Colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: Spacing.sm,
      left: 0,
      paddingBottom: 9,
      paddingHorizontal: Spacing.md,
      position: "absolute",
      right: 0,
      top: 0,
      zIndex: 1000,
    },
    text: {
      color: Colors.error,
      flex: 1,
      fontSize: 12,
      fontWeight: "800",
    },
  });
