import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

export default function AppearanceScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/more" as Href);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />

      <View style={styles.headerRow}>
        <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons color={Colors.onPrimary} name="moon-outline" size={22} />
          </View>
          <Text style={styles.title}>Dark Mode Active</Text>
          <Text style={styles.description}>
            SalonOX now uses Dark Mode across the mobile app. Light Theme tokens remain available
            in the codebase for future use.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      backgroundColor: Colors.bg,
      flex: 1,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: Spacing.sm,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
    },
    backButton: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.control,
      borderWidth: 1,
      height: AppLayout.headerActionSize,
      justifyContent: "center",
      width: AppLayout.headerActionSize,
    },
    backButtonPlaceholder: {
      width: AppLayout.headerActionSize,
    },
    headerTitle: {
      color: Colors.heading,
      fontSize: AppLayout.headerTitleFontSize,
      fontWeight: AppLayout.screenTitleFontWeight,
    },
    content: {
      paddingBottom: AppLayout.contentBottomPadding,
      paddingHorizontal: AppLayout.contentHorizontalPadding,
      paddingTop: AppLayout.headerMarginBottom,
    },
    card: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      padding: AppLayout.cardPadding,
    },
    iconWrap: {
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
      height: 48,
      justifyContent: "center",
      width: 48,
    },
    title: {
      color: Colors.heading,
      fontSize: 18,
      fontWeight: "800",
      marginTop: Spacing.md,
      textAlign: "center",
    },
    description: {
      color: Colors.text2,
      fontSize: 13,
      lineHeight: 20,
      marginTop: Spacing.sm,
      textAlign: "center",
    },
  });
