import { Ionicons } from "@expo/vector-icons";
import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

type IconName = keyof typeof Ionicons.glyphMap;

/** A titled card with an icon badge, used for each profile section. */
export function ProfileCard({
  children,
  icon,
  iconTone = "blue",
  rightAction,
  subtitle,
  title,
}: {
  children: ReactNode;
  icon: IconName;
  iconTone?: "blue" | "purple";
  rightAction?: ReactNode;
  subtitle: string;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconBadge, iconTone === "purple" && styles.iconBadgePurple]}>
            <Ionicons color={iconTone === "purple" ? Colors.purple : Colors.accentBlue} name={icon} size={18} />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
        </View>
        {rightAction}
      </View>
      {children}
    </View>
  );
}

export function ProfileSubsection({ children, title }: { children: ReactNode; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>{title}</Text>
      <View style={styles.subsectionRule} />
      {children}
    </View>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return <View style={styles.fieldGrid}>{children}</View>;
}

/** A read-only labelled value. `empty` renders the value as a muted placeholder. */
export function FieldBox({
  badge,
  empty,
  icon,
  label,
  value,
}: {
  badge?: string;
  empty?: boolean;
  icon: IconName;
  label: string;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueRow}>
        <Ionicons color={Colors.hint} name={icon} size={17} />
        <Text
          numberOfLines={2}
          style={[styles.fieldValue, empty && styles.fieldValueEmpty]}
        >
          {value}
        </Text>
        {badge ? (
          <View style={styles.systemBadge}>
            <Text style={styles.systemBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 1,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  cardHeaderLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: Colors.accentBlueSoft,
    borderRadius: Radius.lg,
    height: 50,
    justifyContent: "center",
    marginRight: Spacing.md,
    width: 50,
  },
  iconBadgePurple: {
    backgroundColor: Colors.purpleBg,
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: Colors.heading,
    fontSize: 18,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: Colors.text2,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  field: {
    flexBasis: "47%",
    flexGrow: 1,
    minWidth: 250,
  },
  fieldLabel: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: Spacing.sm,
  },
  fieldValueRow: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 54,
    paddingHorizontal: Spacing.md,
  },
  fieldValue: {
    color: Colors.heading,
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    marginLeft: Spacing.sm,
  },
  fieldValueEmpty: {
    color: Colors.placeholder,
    fontStyle: "italic",
  },
  systemBadge: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  systemBadgeText: {
    color: Colors.hint,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  subsection: {
    marginTop: Spacing.sm,
  },
  subsectionTitle: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  subsectionRule: {
    backgroundColor: Colors.border,
    height: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
});
