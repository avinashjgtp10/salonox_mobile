import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";

type StaffStateViewProps = {
  actionLabel?: string;
  description: string;
  loading?: boolean;
  onAction?: () => void;
  title: string;
  variant?: "empty" | "error";
};

export function StaffStateView({
  actionLabel,
  description,
  loading,
  onAction,
  title,
  variant = "empty",
}: StaffStateViewProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons
            name={variant === "error" ? "alert-circle-outline" : "file-tray-outline"}
            size={24}
            color={variant === "error" ? Colors.error : Colors.primary}
          />
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  title: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
    marginTop: Spacing.sm,
  },
  description: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  action: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
