import { Text } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type QuickSaleHeaderProps = {
  /** Shows a close icon instead of a back arrow (Quick Sale inside the calendar modal). */
  embedded?: boolean;
  /**
   * "centered" keeps the title centred between the back button and the right
   * slot; "leading" left-aligns it next to the back button with room for a
   * subtitle.
   */
  layout?: "centered" | "leading";
  onBack: () => void;
  right?: ReactNode;
  subtitle?: string | null;
  title: string;
};

function QuickSaleHeaderComponent({
  embedded = false,
  layout = "centered",
  onBack,
  right,
  subtitle,
  title,
}: QuickSaleHeaderProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isLeading = layout === "leading";

  return (
    <View style={styles.header}>
      <TouchableOpacity
        activeOpacity={0.84}
        hitSlop={12}
        onPress={onBack}
        style={[styles.iconButton, embedded && styles.embeddedCloseButton]}
      >
        <Ionicons
          name={embedded ? "close" : "arrow-back"}
          size={isLeading ? 20 : 18}
          color={Colors.primary}
        />
      </TouchableOpacity>
      {isLeading ? (
        <View style={styles.leadingTitle}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
      {right ?? <View style={styles.spacer} />}
    </View>
  );
}

type QuickSaleHeaderActionProps = {
  accessibilityLabel?: string;
  badgeCount?: number;
  color?: string;
  disabled?: boolean;
  icon: ComponentProps<typeof Ionicons>["name"];
  isLoading?: boolean;
  onPress: () => void;
};

function QuickSaleHeaderActionComponent({
  accessibilityLabel,
  badgeCount = 0,
  color,
  disabled = false,
  icon,
  isLoading = false,
  onPress,
}: QuickSaleHeaderActionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const iconColor = color ?? Colors.primary;
  // A spinner means "busy", not "unavailable", so it keeps full opacity.
  const isDimmed = disabled && !isLoading;

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      activeOpacity={disabled ? 1 : 0.84}
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, isDimmed && styles.iconButtonDisabled]}
    >
      {isLoading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <Ionicons name={icon} size={17} color={iconColor} />
      )}
      {badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export const QuickSaleHeader = memo(QuickSaleHeaderComponent);
export const QuickSaleHeaderAction = memo(QuickSaleHeaderActionComponent);

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: AppLayout.contentHorizontalPadding,
    paddingTop: Spacing.sm,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    height: AppLayout.headerActionSize,
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    width: AppLayout.headerActionSize,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  embeddedCloseButton: {
    marginLeft: -8,
  },
  badge: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderColor: Colors.card,
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 17,
    justifyContent: "center",
    minWidth: 17,
    paddingHorizontal: 4,
    position: "absolute",
    right: -4,
    top: -4,
  },
  badgeText: {
    color: Colors.onPrimary,
    fontSize: 9,
    fontWeight: "900",
  },
  // Balances the back button so the title stays centered, but must stay
  // invisible — reusing iconButton's card background/border/shadow would
  // paint a blank white box on the header's right side.
  spacer: {
    height: AppLayout.headerActionSize,
    width: AppLayout.headerActionSize,
  },
  leadingTitle: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
  },
  title: {
    color: Colors.heading,
    fontSize: AppLayout.headerTitleFontSize,
    fontWeight: AppLayout.screenTitleFontWeight,
  },
  subtitle: {
    color: Colors.text2,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
