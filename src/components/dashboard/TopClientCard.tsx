import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { useThemeColors } from "@/theme/ThemeProvider";

export default function TopClientCard() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Loyalty</Text>
          <Text style={styles.sectionTitle}>Top client</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="sparkles-outline" size={22} color={Colors.primaryDark} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>Coming Soon</Text>
          <Text style={styles.meta}>Top client insights will be available here soon.</Text>
        </View>
      </View>
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
  card: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.warningBg,
    borderColor: "rgba(175,167,157,0.3)",
    borderRadius: Radius.lg,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  copy: {
    flex: 1,
  },
  name: {
    color: Colors.heading,
    fontSize: 14,
    fontWeight: "700",
  },
  meta: {
    color: Colors.text2,
    fontSize: 11,
    marginTop: 4,
  },
});
