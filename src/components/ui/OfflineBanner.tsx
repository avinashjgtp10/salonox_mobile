import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useThemeColors } from "@/theme/ThemeProvider";

export function OfflineBanner() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { isAuthenticated } = useAuth();
  const { isOnline } = useNetworkStatus();

  if (isOnline || !isAuthenticated) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.bannerWrap}>
      <View style={styles.banner}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-offline-outline" size={18} color={Colors.info} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Offline mode</Text>
          <Text style={styles.message}>
            You can view your current data. Changes will sync later.
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    banner: {
      alignItems: "flex-start",
      backgroundColor: Colors.infoBg,
      borderColor: Colors.border,
      borderRadius: Radius.xl,
      borderWidth: 1,
      flexDirection: "row",
      gap: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4,
    },
    bannerWrap: {
      alignItems: "center",
      bottom: 0,
      justifyContent: "center",
      left: 0,
      paddingHorizontal: Spacing.lg,
      position: "absolute",
      right: 0,
      top: 0,
      zIndex: 1000,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    iconWrap: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: Radius.full,
      borderWidth: 1,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    message: {
      color: Colors.text2,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 17,
      marginTop: 2,
    },
    title: {
      color: Colors.heading,
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 18,
    },
  });
