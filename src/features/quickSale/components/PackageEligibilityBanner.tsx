import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type PackageEligibilityBannerProps = {
  error: string | null;
  onRetry: () => void;
};

function PackageEligibilityBannerComponent({ error, onRetry }: PackageEligibilityBannerProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View accessibilityLiveRegion="polite" style={styles.banner}>
      <Ionicons color={Colors.error} name="alert-circle-outline" size={18} />
      <View style={styles.copy}>
        <Text style={styles.title}>Package eligibility unavailable</Text>
        <Text style={styles.message}>
          Package pricing could not be verified. You can continue checkout or retry package loading.
        </Text>
        {error ? (
          <Text numberOfLines={2} style={styles.detail}>
            {error}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        accessibilityLabel="Retry package verification"
        activeOpacity={0.84}
        onPress={onRetry}
        style={styles.retryButton}
      >
        <Ionicons color={Colors.onPrimary} name="refresh" size={15} />
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

export const PackageEligibilityBanner = memo(PackageEligibilityBannerComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: AppLayout.contentHorizontalPadding,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "900",
  },
  message: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
    marginTop: 2,
  },
  detail: {
    color: Colors.text2,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
    marginTop: 3,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  retryText: {
    color: Colors.onPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
});
