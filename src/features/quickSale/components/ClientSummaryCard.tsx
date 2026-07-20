import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import type { QuickSaleClient } from "@/features/quickSale/types";
import { useThemeColors } from "@/theme/ThemeProvider";

type ClientSummaryCardProps = {
  client: QuickSaleClient;
  onPress: () => void;
};

export function ClientSummaryCard({ client, onPress }: ClientSummaryCardProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Pressable
      android_ripple={{ color: "rgba(28, 25, 23, 0.08)" }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.avatar, { backgroundColor: client.avatarBg }]}>
        <Text style={[styles.avatarText, { color: client.avatarColor }]}>{client.initials}</Text>
      </View>
      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {client.name}
          </Text>
          {client.membership ? (
            <View style={styles.membershipBadge}>
              <Text style={styles.membershipBadgeText}>{client.membership}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.phone}>
          {client.phone}
        </Text>
      </View>
      <View style={styles.changeButton}>
        <Text style={styles.changeButtonText}>Change</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
      </View>
    </Pressable>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minHeight: 76,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 16,
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.995 }],
  },
  avatar: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
  },
  copy: {
    flex: 1,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  name: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  membershipBadge: {
    backgroundColor: "#F2EFE9",
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  membershipBadgeText: {
    color: "#726A63",
    fontSize: 9,
    fontWeight: "800",
  },
  phone: {
    color: Colors.text2,
    fontSize: 12,
    marginTop: 2,
  },
  changeButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    minHeight: 40,
    paddingLeft: Spacing.sm,
  },
  changeButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
});
