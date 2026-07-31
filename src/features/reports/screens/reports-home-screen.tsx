import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardSpacing as Spacing,
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import {
  REPORT_CONFIGS,
  REPORT_GROUPS,
  type ReportConfig,
} from "@/features/reports/report-config";
import { useThemeColors } from "@/theme/ThemeProvider";

const ReportCard = memo(function ReportCard({ config }: { config: ReportConfig }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <TouchableOpacity
      accessibilityHint={`Opens the ${config.title} report`}
      accessibilityRole="button"
      activeOpacity={0.84}
      onPress={() => router.push(`/reports/${config.slug}` as Href)}
      style={styles.reportCard}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={config.icon} size={21} color={Colors.primaryDark} />
      </View>
      <View style={styles.cardCopy}>
        <Text allowFontScaling style={styles.cardTitle}>{config.title}</Text>
        <Text allowFontScaling numberOfLines={2} style={styles.cardSubtitle}>
          {config.subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.hint} />
    </TouchableOpacity>
  );
});

export default function ReportsHomeScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <AppStatusBar />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.heading} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text allowFontScaling style={styles.eyebrow}>INSIGHTS</Text>
            <Text allowFontScaling style={styles.title}>Reports</Text>
            <Text allowFontScaling style={styles.subtitle}>
              Understand performance across every part of your salon.
            </Text>
          </View>
        </View>

        {REPORT_GROUPS.map((group) => (
          <View key={group} style={styles.section}>
            <Text allowFontScaling style={styles.sectionTitle}>{group.toUpperCase()}</Text>
            <View style={styles.cardGroup}>
              {REPORT_CONFIGS.filter((config) => config.group === group).map((config) => (
                <ReportCard config={config} key={config.slug} />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text allowFontScaling style={styles.sectionTitle}>UNAVAILABLE</Text>
          <View accessibilityState={{ disabled: true }} style={[styles.reportCard, styles.disabledCard]}>
            <View style={styles.iconWrap}>
              <Ionicons name="flask-outline" size={21} color={Colors.hint} />
            </View>
            <View style={styles.cardCopy}>
              <Text allowFontScaling style={styles.cardTitle}>Consumable Usage</Text>
              <Text allowFontScaling style={styles.cardSubtitle}>
                Detailed consumable reporting is coming soon.
              </Text>
            </View>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safe: { backgroundColor: Colors.bg, flex: 1 },
  content: {
    gap: Spacing.xxl, paddingBottom: 120,
    paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: Spacing.lg,
  },
  header: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.md },
  backButton: {
    alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border,
    borderRadius: AppRadius.control, borderWidth: 1, height: 48, justifyContent: "center", width: 48,
  },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: Colors.text2, fontSize: 10, fontWeight: "800", letterSpacing: 1.6 },
  title: {
    color: Colors.heading, fontFamily: Typography.fontFamilies.display,
    fontSize: 32, fontWeight: "700", lineHeight: 38,
  },
  subtitle: { color: Colors.text2, fontSize: 13, lineHeight: 20, maxWidth: 420 },
  section: { gap: Spacing.sm },
  sectionTitle: { color: Colors.text2, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  cardGroup: {
    backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card,
    borderWidth: 1, overflow: "hidden",
  },
  reportCard: {
    alignItems: "center", backgroundColor: Colors.card, borderBottomColor: Colors.divider,
    borderBottomWidth: 1, flexDirection: "row", gap: Spacing.md, minHeight: 82,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  disabledCard: {
    borderColor: Colors.border, borderRadius: AppRadius.card, borderWidth: 1, opacity: 0.72,
  },
  iconWrap: {
    alignItems: "center", backgroundColor: Colors.backgroundElement,
    borderRadius: AppRadius.control, height: 44, justifyContent: "center", width: 44,
  },
  cardCopy: { flex: 1, gap: 3 },
  cardTitle: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  cardSubtitle: { color: Colors.text2, fontSize: 11.5, lineHeight: 17 },
  comingSoonBadge: {
    backgroundColor: Colors.backgroundElement, borderRadius: AppRadius.pill,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  comingSoonText: { color: Colors.text2, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
});
