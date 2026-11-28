import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import {
  pearlGradients,
  pearlTones,
} from "@/components/auth/pearl/tokens";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

export function MarketingHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <View style={m.header}>
      <AppBackButton fallbackHref="/dashboard" />
      <View style={m.fill}>
        <Text translate style={m.heading}>{title}</Text>
        <Text translate style={m.small}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );
}
export function MarketingChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[m.chip, selected && { borderColor: "transparent" }]}
    >
      {selected && (
        <LinearGradient
          colors={pearlGradients.primary}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text translate style={[m.chipText, selected && { color: "white" }]}>{label}</Text>
    </Pressable>
  );
}
export function MarketingStat({
  label,
  value,
  hint,
  icon,
  tone = "rose",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "rose" | "lilac" | "peach";
}) {
  return (
    <View style={[m.card, m.stat]}>
      <View style={[m.icon, { backgroundColor: pearlTones[tone].bg }]}>
        <Ionicons name={icon} size={18} color={pearlTones[tone].fg} />
      </View>
      <Text translate style={m.small}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={m.value}>
        {value}
      </Text>
      {!!hint && <Text style={m.small}>{hint}</Text>}
    </View>
  );
}
export const m = themedStyles((p) => ({
  root: { flex: 1, backgroundColor: "transparent" },
  content: { paddingHorizontal: 16, paddingBottom: 28, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heading: {
    color: p.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  fill: { flex: 1, minWidth: 0 },
  card: {
    backgroundColor: p.glass,
    borderColor: p.glassBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
  },
  title: { color: p.ink, fontSize: 14, fontWeight: "700" },
  small: { color: p.muted, fontSize: 11.5, lineHeight: 17 },
  body: { color: p.ink2, fontSize: 12.5, lineHeight: 19 },
  section: { color: p.ink2, fontSize: 13, fontWeight: "700" },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: pearlTones.rose.bg,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: p.glassStrong,
    borderWidth: 1,
    borderColor: p.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    overflow: "hidden",
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: p.glassBorder,
    backgroundColor: p.glass,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipText: { color: p.ink2, fontSize: 12, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { flex: 1, minWidth: 0, padding: 12, gap: 6, borderRadius: 20 },
  value: { color: p.ink, fontSize: 25, fontWeight: "800" },
  track: {
    height: 6,
    backgroundColor: "rgba(126,120,176,0.13)",
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 6,
  },
  bar: { height: "100%", backgroundColor: p.accent, borderRadius: 6 },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 100, gap: 3 },
  barSlot: { flex: 1, height: "100%", justifyContent: "flex-end" },
  note: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: p.warningBg,
    borderWidth: 1,
    borderColor: p.warningBorder,
  },
  badge: {
    color: p.successText,
    backgroundColor: p.successBg,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "700",
  },
  empty: {
    color: p.muted,
    fontSize: 13,
    lineHeight: 20,
    padding: 20,
    textAlign: "center",
  },
  error: { color: p.dangerText, fontSize: 13, lineHeight: 20 },
}));
