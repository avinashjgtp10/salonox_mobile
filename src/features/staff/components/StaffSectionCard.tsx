import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardColors as Colors,
  DashboardSpacing as Spacing,
} from "@/constants/theme";

type StaffSectionCardProps = {
  action?: ReactNode;
  children: ReactNode;
  title: string;
};

export function StaffSectionCard({ action, children, title }: StaffSectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    marginBottom: AppLayout.sectionGap,
    padding: AppLayout.cardPadding,
    shadowColor: Colors.primaryDark,
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
