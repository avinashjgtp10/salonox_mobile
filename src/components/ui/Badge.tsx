import { Text } from "@/components/ui/AppTypography";
import { StyleSheet, View } from "react-native";

import { DashboardRadius as Radius } from "@/constants/theme";

type BadgeProps = {
  bg: string;
  color: string;
  label: string;
  size?: "sm" | "md";
};

export function Badge({ bg, color, label, size = "md" }: BadgeProps) {
  return (
    <View style={[styles.badge, size === "sm" ? styles.badgeSm : styles.badgeMd, { backgroundColor: bg }]}>
      <Text numberOfLines={1} style={[styles.text, size === "sm" ? styles.textSm : styles.textMd, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    justifyContent: "center",
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontWeight: "800",
    letterSpacing: 0,
  },
  textSm: {
    fontSize: 10,
  },
  textMd: {
    fontSize: 11,
  },
});
