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
import { useAppTheme, type ThemeMode } from "@/theme/ThemeProvider";

const OPTIONS: {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  mode: ThemeMode;
  title: string;
}[] = [
  {
    description: "Bright, high-contrast surfaces for daytime use.",
    icon: "sunny-outline",
    mode: "light",
    title: "Light",
  },
  {
    description: "Premium dark blue/slate surfaces, easier on the eyes at night.",
    icon: "moon-outline",
    mode: "dark",
    title: "Dark",
  },
  {
    description: "Automatically follow your device's appearance setting.",
    icon: "contrast-outline",
    mode: "system",
    title: "System Default",
  },
];

export default function AppearanceScreen() {
  const { colors: Colors, mode, setMode } = useAppTheme();
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
        <TouchableOpacity activeOpacity={0.84} hitSlop={AppLayout.headerActionHitSlop} onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionHint}>
          Choose how SalonOX looks on this device. Your choice is saved and applied everywhere.
        </Text>

        {OPTIONS.map((option) => {
          const isSelected = mode === option.mode;

          return (
            <TouchableOpacity
              accessibilityLabel={`Use ${option.title} theme`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.84}
              key={option.mode}
              onPress={() => setMode(option.mode)}
              style={[styles.row, isSelected && styles.rowSelected]}
            >
              <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                <Ionicons
                  color={isSelected ? Colors.onPrimary : Colors.text2}
                  name={option.icon}
                  size={20}
                />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{option.title}</Text>
                <Text style={styles.rowDescription}>{option.description}</Text>
              </View>
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected ? <View style={styles.radioInner} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
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
    sectionHint: {
      color: Colors.text2,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: Spacing.lg,
    },
    row: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: Spacing.md,
      marginBottom: Spacing.sm,
      padding: AppLayout.cardPadding,
    },
    rowSelected: {
      borderColor: Colors.primary,
    },
    iconWrap: {
      alignItems: "center",
      backgroundColor: Colors.backgroundElement,
      borderRadius: Radius.full,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    iconWrapSelected: {
      backgroundColor: Colors.primary,
    },
    rowCopy: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      color: Colors.heading,
      fontSize: 15,
      fontWeight: "800",
    },
    rowDescription: {
      color: Colors.text2,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    radioOuter: {
      alignItems: "center",
      borderColor: Colors.border,
      borderRadius: Radius.full,
      borderWidth: 2,
      height: 22,
      justifyContent: "center",
      width: 22,
    },
    radioOuterSelected: {
      borderColor: Colors.primary,
    },
    radioInner: {
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
      height: 12,
      width: 12,
    },
  });
