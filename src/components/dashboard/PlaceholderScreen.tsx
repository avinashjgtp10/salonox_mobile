import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { AppLayout, AppRadius } from "@/constants/layout";

type PlaceholderScreenProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  showBack?: boolean;
  subtitle: string;
  title: string;
};

export default function PlaceholderScreen({
  icon = "construct-outline",
  showBack = false,
  subtitle,
  title,
}: PlaceholderScreenProps) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <View style={styles.container}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={28} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingVertical: AppLayout.contentBottomPadding,
  },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    left: AppLayout.contentHorizontalPadding,
    position: "absolute",
    top: AppLayout.headerMarginBottom,
  },
  backText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    padding: AppLayout.cardPadding + Spacing.sm,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    height: 58,
    justifyContent: "center",
    marginBottom: Spacing.lg,
    width: 58,
  },
  title: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.text2,
    fontSize: AppLayout.headerSubtitleFontSize,
    lineHeight: 20,
    marginTop: AppLayout.headerSubtitleMarginTop,
    textAlign: "center",
  },
});
