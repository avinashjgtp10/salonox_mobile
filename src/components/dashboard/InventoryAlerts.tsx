import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useAppSelector } from "@/store/hooks";
import {
  selectDashboardInventoryAlerts,
  selectDashboardIsLoading,
} from "@/store/dashboard/dashboard.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

const getLevelStyles = (
  Colors: ThemeColors,
): Record<"warning" | "error", { actionColor: string; iconBg: string; iconColor: string }> => ({
  error: { actionColor: Colors.error, iconBg: Colors.errorBg, iconColor: Colors.error },
  warning: { actionColor: Colors.primaryDark, iconBg: Colors.warningBg, iconColor: Colors.warning },
});

export default function InventoryAlerts() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const levelStyles = useMemo(() => getLevelStyles(Colors), [Colors]);
  const inventoryAlerts = useAppSelector(selectDashboardInventoryAlerts);
  const isLoading = useAppSelector(selectDashboardIsLoading);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Inventory</Text>
          <Text style={styles.sectionTitle}>Stock alerts</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/stock" as Href)}>
          <Text style={styles.link}>View stock</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={Colors.primary} size="small" />
        </View>
      ) : inventoryAlerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No stock alerts.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {inventoryAlerts.map((item, index) => {
            const levelStyle = levelStyles[item.level];

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                onPress={() => router.push(`/stock/${item.id}` as Href)}
                style={[styles.alertRow, index > 0 && styles.alertBorder]}
              >
                <View style={[styles.alertIcon, { backgroundColor: levelStyle.iconBg }]}>
                  <Ionicons
                    name={item.level === "error" ? "alert-circle-outline" : "warning-outline"}
                    size={19}
                    color={levelStyle.iconColor}
                  />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.alertTitle}>{item.name}</Text>
                  <Text style={styles.alertSub}>{item.sub}</Text>
                </View>
                <Text style={[styles.action, { color: levelStyle.actionColor }]}>{item.action}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  eyebrow: {
    color: Colors.text2,
    fontSize: 9,
    fontWeight: "500",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: Colors.heading,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  link: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  card: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  alertRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  alertBorder: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  alertIcon: {
    alignItems: "center",
    borderRadius: Radius.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  copy: {
    flex: 1,
  },
  alertTitle: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "700",
  },
  alertSub: {
    color: Colors.text2,
    fontSize: 10,
    marginTop: 3,
  },
  action: {
    fontSize: 11,
    fontWeight: "800",
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 88,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 88,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
