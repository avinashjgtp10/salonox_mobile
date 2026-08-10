import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { IconBadgeAccent } from "@/components/ui/IconBadge";
import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

const ACCENT_KEYS = {
  blue: ["accentBlue", "accentBlueSoft"],
  sky: ["accentSky", "accentSkySoft"],
  indigo: ["accentIndigo", "accentIndigoSoft"],
  green: ["accentGreen", "accentGreenSoft"],
} as const;

// Layered "illustration" badge (soft outer ring + solid inner circle + two
// floating accent dots) instead of a single flat icon circle — reused by
// EmptyState/ErrorState so every empty/error surface in the app gets the
// same premium treatment for free.
export function StateIllustration({
  icon,
  accent,
  Colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accent: IconBadgeAccent | "error";
  Colors: ThemeColors;
}) {
  const [color, soft] = accent === "error" ? [Colors.error, Colors.errorBg] : ACCENT_KEYS[accent].map((k) => Colors[k]);

  return (
    <View style={[illustrationStyles.ring, { backgroundColor: soft }]}>
      <View style={[illustrationStyles.dotFar, { backgroundColor: soft }]} />
      <View style={[illustrationStyles.dotNear, { backgroundColor: color, opacity: 0.35 }]} />
      <View style={[illustrationStyles.core, { backgroundColor: Colors.card }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
    </View>
  );
}

const illustrationStyles = StyleSheet.create({
  ring: {
    alignItems: "center",
    borderRadius: 999,
    height: 96,
    justifyContent: "center",
    marginBottom: Spacing.md,
    width: 96,
  },
  core: {
    alignItems: "center",
    borderRadius: 999,
    height: 60,
    justifyContent: "center",
    shadowColor: "#0f2942",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: 60,
    elevation: 2,
  },
  dotFar: {
    borderRadius: 999,
    height: 14,
    position: "absolute",
    right: 2,
    top: 6,
    width: 14,
  },
  dotNear: {
    borderRadius: 999,
    bottom: 8,
    height: 9,
    left: 0,
    position: "absolute",
    width: 9,
  },
});

type EmptyStateProps = {
  accent?: IconBadgeAccent;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

function EmptyStateComponent({ accent = "blue", description, icon, title }: EmptyStateProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.stateCard}>
      <StateIllustration Colors={Colors} accent={accent} icon={icon} />
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
      <StateIllustration Colors={Colors} accent="error" icon="cloud-offline-outline" />
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
