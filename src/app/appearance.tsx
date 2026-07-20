import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useAppTheme, type ThemeMode } from "@/theme/ThemeProvider";

const THEME_OPTIONS: {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  mode: ThemeMode;
  title: string;
}[] = [
  {
    description: "Always use the light appearance.",
    icon: "sunny-outline",
    mode: "light",
    title: "Light",
  },
  {
    description: "Always use the dark appearance.",
    icon: "moon-outline",
    mode: "dark",
    title: "Dark",
  },
  {
    description: "Automatically match this device's system setting.",
    icon: "phone-portrait-outline",
    mode: "system",
    title: "Use Device Theme",
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
        <TouchableOpacity activeOpacity={0.84} onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Choose how SalonOX looks on this device.</Text>

        <View accessibilityRole="radiogroup">
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = option.mode === mode;

            return (
              <TouchableOpacity
                key={option.mode}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                activeOpacity={0.84}
                onPress={() => setMode(option.mode)}
                style={[styles.optionRow, index > 0 && styles.optionRowSpaced]}
              >
                <View style={[styles.optionIcon, isSelected && styles.optionIconActive]}>
                  <Ionicons
                    color={isSelected ? Colors.onPrimary : Colors.primary}
                    name={option.icon}
                    size={20}
                  />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.selection} />
                ) : (
                  <View style={styles.radioOuter} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
    subtitle: {
      color: Colors.text2,
      fontSize: AppLayout.headerSubtitleFontSize,
      lineHeight: 20,
      marginBottom: AppLayout.headerMarginBottom,
    },
    optionRow: {
      alignItems: "center",
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      flexDirection: "row",
      padding: AppLayout.cardPadding,
    },
    optionRowSpaced: {
      marginTop: AppLayout.sectionGap,
    },
    optionIcon: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderRadius: Radius.lg,
      height: 42,
      justifyContent: "center",
      width: 42,
    },
    optionIconActive: {
      backgroundColor: Colors.primary,
    },
    optionCopy: {
      flex: 1,
      marginLeft: Spacing.md,
      marginRight: Spacing.md,
    },
    optionTitle: {
      color: Colors.heading,
      fontSize: 16,
      fontWeight: "800",
    },
    optionDescription: {
      color: Colors.text2,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    radioOuter: {
      borderColor: Colors.border,
      borderRadius: Radius.full,
      borderWidth: 2,
      height: 22,
      width: 22,
    },
  });
