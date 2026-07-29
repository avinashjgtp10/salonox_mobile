import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { SkeletonBlock } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardSpacing as Spacing,
  DashboardTypography as Typography,
  type ThemeColors,
} from "@/constants/theme";
import {
  formatReportValue,
  humanizeReportKey,
  type ReportRow,
} from "@/features/reports/report-data";
import { useThemeColors } from "@/theme/ThemeProvider";

export const ReportSummaryCards = memo(function ReportSummaryCards({
  summary,
}: {
  summary: ReportRow | null;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const entries = useMemo(() => Object.entries(summary ?? {}).slice(0, 8), [summary]);
  if (!entries.length) return null;

  return (
    <View accessibilityRole="summary" style={styles.summaryGrid}>
      {entries.map(([key, value]) => (
        <View key={key} style={styles.summaryCard}>
          <Text allowFontScaling numberOfLines={1} style={styles.summaryLabel}>
            {humanizeReportKey(key)}
          </Text>
          <Text allowFontScaling selectable numberOfLines={1} style={styles.summaryValue}>
            {formatReportValue(key, value)}
          </Text>
        </View>
      ))}
    </View>
  );
});

export const ReportRowCard = memo(function ReportRowCard({
  fields,
  row,
}: {
  fields: string[];
  row: ReportRow;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const visible = fields.filter((field) => row[field] !== undefined);
  const titleField = visible[0];

  return (
    <View accessible accessibilityLabel={visible.map((key) =>
      `${humanizeReportKey(key)} ${formatReportValue(key, row[key])}`).join(", ")}
      style={styles.rowCard}
    >
      <View style={styles.rowAccent} />
      <View style={styles.rowBody}>
        <Text allowFontScaling selectable numberOfLines={2} style={styles.rowTitle}>
          {titleField ? formatReportValue(titleField, row[titleField]) : "Report item"}
        </Text>
        <View style={styles.rowMetaGrid}>
          {visible.slice(1).map((key) => (
            <View key={key} style={styles.rowMeta}>
              <Text allowFontScaling numberOfLines={1} style={styles.rowLabel}>
                {humanizeReportKey(key)}
              </Text>
              <Text allowFontScaling selectable numberOfLines={2} style={styles.rowValue}>
                {formatReportValue(key, row[key])}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

export const ReportSkeleton = memo(function ReportSkeleton() {
  const styles = useMemo(() => skeletonStyles, []);
  return (
    <View accessibilityLabel="Loading report" style={styles.container}>
      <View style={styles.summary}>
        <SkeletonBlock height={86} width="48%" />
        <SkeletonBlock height={86} width="48%" />
      </View>
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.card}>
          <SkeletonBlock height={18} width="54%" />
          <SkeletonBlock height={13} width="82%" />
          <SkeletonBlock height={13} width="66%" />
        </View>
      ))}
    </View>
  );
});

export const ReportState = memo(function ReportState({
  description,
  error = false,
  onRetry,
  title,
}: {
  description: string;
  error?: boolean;
  onRetry: () => void;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.stateCard}>
      <View style={[styles.stateIcon, error && styles.errorIcon]}>
        <Ionicons
          name={error ? "cloud-offline-outline" : "file-tray-outline"}
          size={25}
          color={error ? Colors.error : Colors.primary}
        />
      </View>
      <Text allowFontScaling style={styles.stateTitle}>{title}</Text>
      <Text allowFontScaling style={styles.stateDescription}>{description}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.84}
        onPress={onRetry}
        style={styles.retryButton}
      >
        <Ionicons name="refresh" size={16} color="#FFFFFF" />
        <Text allowFontScaling style={styles.retryText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
});

export const ReportPaginationFooter = memo(function ReportPaginationFooter({
  loading,
  noMore,
}: {
  loading: boolean;
  noMore: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  if (!loading && !noMore) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.footer}>
      {loading ? (
        <>
          <View style={styles.footerSkeleton} />
          <Text style={styles.footerText}>Loading more</Text>
        </>
      ) : (
        <Text style={styles.footerText}>You’ve reached the end</Text>
      )}
    </View>
  );
});

const skeletonStyles = StyleSheet.create({
  container: { gap: Spacing.md, paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: Spacing.lg },
  summary: { flexDirection: "row", gap: Spacing.sm, justifyContent: "space-between" },
  card: { gap: Spacing.sm, paddingVertical: Spacing.lg },
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  summaryCard: {
    backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card,
    borderWidth: 1, flexBasis: "47%", flexGrow: 1, minHeight: 86, padding: Spacing.md,
  },
  summaryLabel: { color: Colors.text2, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  summaryValue: {
    color: Colors.heading, fontFamily: Typography.fontFamilies.display, fontSize: 20,
    fontVariant: ["tabular-nums"], fontWeight: "700", paddingTop: Spacing.sm,
  },
  rowCard: {
    backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.card,
    borderWidth: 1, flexDirection: "row", minHeight: 112, overflow: "hidden",
  },
  rowAccent: { backgroundColor: Colors.primary, width: 3 },
  rowBody: { flex: 1, gap: Spacing.md, padding: Spacing.lg },
  rowTitle: { color: Colors.heading, fontSize: 15, fontWeight: "800" },
  rowMetaGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  rowMeta: { flexBasis: "28%", flexGrow: 1, minWidth: 76 },
  rowLabel: { color: Colors.text2, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  rowValue: { color: Colors.text, fontSize: 12, fontVariant: ["tabular-nums"], fontWeight: "600", paddingTop: 3 },
  stateCard: { alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: 48 },
  stateIcon: {
    alignItems: "center", backgroundColor: Colors.backgroundElement, borderRadius: 999,
    height: 58, justifyContent: "center", width: 58,
  },
  errorIcon: { backgroundColor: Colors.errorBg },
  stateTitle: { color: Colors.heading, fontSize: 17, fontWeight: "800", paddingTop: Spacing.sm },
  stateDescription: { color: Colors.text2, fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: {
    alignItems: "center", backgroundColor: Colors.primaryDark, borderRadius: AppRadius.pill,
    flexDirection: "row", gap: Spacing.sm, minHeight: 48, paddingHorizontal: Spacing.xl,
  },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  footer: { alignItems: "center", flexDirection: "row", gap: Spacing.sm, justifyContent: "center", minHeight: 64 },
  footerSkeleton: { backgroundColor: Colors.backgroundElement, borderRadius: 999, height: 12, width: 12 },
  footerText: { color: Colors.text2, fontSize: 12, fontWeight: "600" },
});
