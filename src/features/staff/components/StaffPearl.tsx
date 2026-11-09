import type { ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/AppTypography";
import { AppBackButton } from "@/components/ui/AppBackButton";
import {
  pearl,
  pearlGradients,
  pearlTones,
} from "@/components/auth/pearl/tokens";
import { Image } from "expo-image";
export function StaffHeader({
  title,
  subtitle,
  right,
  onBack,
  centered = false,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  centered?: boolean;
}) {
  return (
    <View style={staffUi.header}>
      <AppBackButton onPress={onBack} fallbackHref="/team" />
      <View style={{ flex: 1, alignItems: centered ? "center" : "flex-start" }}>
        <Text style={[staffUi.title, centered && { fontSize: 18 }]}>
          {title}
        </Text>
        {subtitle ? <Text style={staffUi.muted}>{subtitle}</Text> : null}
      </View>
      {right ?? (centered ? <View style={{ width: 44 }} /> : null)}
    </View>
  );
}
export function StaffButton({
  label,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        staffUi.button,
        secondary && staffUi.secondary,
        danger && staffUi.danger,
        disabled && { opacity: 0.5 },
      ]}
    >
      {!secondary && !danger ? (
        <LinearGradient
          colors={pearlGradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Text
        style={{
          color: danger
            ? pearl.dangerText
            : secondary
              ? pearl.accentDeep
              : "#FFFFFF",
          fontWeight: "700",
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
export function StaffAvatar({
  initials,
  uri,
  size = 46,
}: {
  initials: string;
  uri?: string | null;
  size?: number;
}) {
  return (
    <LinearGradient
      colors={pearlTones.rose.avatar}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <Text
          style={{ color: "#FFFFFF", fontWeight: "700", fontSize: size * 0.32 }}
        >
          {initials}
        </Text>
      )}
    </LinearGradient>
  );
}
export function StaffMenuItem({
  label,
  icon,
  onPress,
  tone = "lilac",
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: "lilac" | "rose" | "peach";
}) {
  return (
    <TouchableOpacity onPress={onPress} style={staffUi.menuRow}>
      <View style={[staffUi.icon, { backgroundColor: pearlTones[tone].bg }]}>
        <Ionicons name={icon} size={19} color={pearlTones[tone].fg} />
      </View>
      <Text style={[staffUi.rowTitle, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={pearl.muted} />
    </TouchableOpacity>
  );
}
export const staffUi = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: pearl.ink },
  heading: { fontSize: 15, fontWeight: "700", color: pearl.ink },
  rowTitle: { fontSize: 14, fontWeight: "700", color: pearl.ink },
  muted: { fontSize: 12, lineHeight: 18, color: pearl.muted },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: pearl.ink2,
    marginBottom: 7,
  },
  card: {
    borderRadius: 22,
    backgroundColor: pearl.glass,
    borderWidth: 1,
    borderColor: pearl.glassBorder,
    overflow: "hidden",
  },
  formCard: {
    borderRadius: 22,
    backgroundColor: pearl.glass,
    borderWidth: 1,
    borderColor: pearl.glassBorder,
    padding: 16,
    gap: 14,
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: pearl.fieldBorder,
    backgroundColor: pearl.field,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: pearl.ink,
    fontSize: 14,
  },
  button: {
    minHeight: 50,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondary: {
    backgroundColor: pearl.glass,
    borderWidth: 1,
    borderColor: pearl.glassBorder,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: pearl.glass,
    borderWidth: 1,
    borderColor: pearl.glassBorder,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: pearl.divider,
  },
  error: { color: pearl.dangerText, fontSize: 12, lineHeight: 18 },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 17,
    padding: 4,
    backgroundColor: pearl.glass,
    borderWidth: 1,
    borderColor: pearl.glassBorder,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  danger: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: pearl.dangerBorder,
    backgroundColor: pearl.dangerBg,
    alignItems: "center",
  },
});
