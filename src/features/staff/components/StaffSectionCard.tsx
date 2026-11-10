import { Text } from "@/components/ui/AppTypography";
import { useMemo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import {
  usePearlColors,
  type PearlColors as ThemeColors,
} from "@/components/auth/pearl/usePearlColors";
import { pearl } from "@/components/auth/pearl/tokens";

type StaffSectionCardProps = {
  action?: ReactNode;
  children: ReactNode;
  title: string;
  pearlStyle?: boolean;
};

export function StaffSectionCard({
  action,
  children,
  title,
  pearlStyle = false,
}: StaffSectionCardProps) {
  const Colors = usePearlColors(pearlStyle);
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View
      style={[
        styles.card,
        pearlStyle && {
          borderRadius: 24,
          backgroundColor: pearl.glass,
          borderColor: pearl.glassBorder,
          elevation: 0,
          shadowOpacity: 0,
        },
      ]}
    >
      <View style={styles.header}>
        <Text translate style={styles.title}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: AppRadius.card,
      borderWidth: 1,
      marginBottom: AppLayout.sectionGap,
      padding: AppLayout.cardPadding,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 18,
      elevation: 2,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: Spacing.md,
    },
    title: {
      color: Colors.heading,
      fontSize: 16,
      fontWeight: "800",
    },
  });
