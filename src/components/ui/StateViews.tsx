import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type EmptyStateProps = {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

function EmptyStateComponent({ description, icon, title }: EmptyStateProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
    </View>
  );
}

export const EmptyState = memo(EmptyStateComponent);

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

function ErrorStateComponent({ message, onRetry }: ErrorStateProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.stateCard}>
      <View style={[styles.stateIcon, styles.stateIconError]}>
        <Ionicons name="cloud-offline-outline" size={22} color={Colors.error} />
      </View>
      <Text style={styles.stateTitle}>Something went wrong</Text>
      <Text style={styles.stateDescription}>{message}</Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

export const ErrorState = memo(ErrorStateComponent);

function InlineLoaderComponent({ label }: { label?: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.inlineLoader}>
      <ActivityIndicator color={Colors.primary} size="small" />
      {label ? <Text style={styles.inlineLoaderText}>{label}</Text> : null}
    </View>
  );
}

export const InlineLoader = memo(InlineLoaderComponent);

function SkeletonBlockComponent({ height, width }: { height: number; width: number | `${number}%` }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return <View style={[styles.skeletonBlock, { height, width }]} />;
}

export const SkeletonBlock = memo(SkeletonBlockComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  stateCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: Spacing.sm,
    minHeight: 172,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 3,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: Colors.backgroundElement,
    borderRadius: Radius.full,
    height: 52,
    justifyContent: "center",
    marginBottom: Spacing.sm,
    width: 52,
  },
  stateIconError: {
    backgroundColor: Colors.errorBg,
  },
  stateTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  stateDescription: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    justifyContent: "center",
    marginTop: Spacing.md,
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  inlineLoader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    paddingVertical: Spacing.lg,
  },
  inlineLoaderText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "600",
  },
  skeletonBlock: {
    backgroundColor: Colors.backgroundElement,
    borderRadius: Radius.md,
    opacity: 0.86,
  },
});
