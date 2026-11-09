import { useMemo, type ReactNode } from "react";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { AppBackButton } from "@/components/ui/AppBackButton";
import {
  pearlGradients,
  pearlTones,
  type PearlTone,
} from "@/components/auth/pearl/tokens";

export function SettingsHeader({
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
  const settingsUi = useSettingsStyles();
  return (
    <View style={settingsUi.header}>
      <AppBackButton fallbackHref="/dashboard" onPress={onBack} />
      <View style={{ flex: 1, alignItems: centered ? "center" : "flex-start" }}>
        <Text translate style={[settingsUi.heading, centered && { fontSize: 18 }]}>{title}</Text>
        {subtitle && <Text translate style={settingsUi.muted}>{subtitle}</Text>}
      </View>
      {right ?? (centered ? <View style={{ width: 42 }} /> : null)}
    </View>
  );
}
export function SettingsButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  loading?: boolean;
}) {
  const pearl = usePearlPalette();
  const settingsUi = useSettingsStyles();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        settingsUi.button,
        secondary && settingsUi.secondary,
        (disabled || loading) && { opacity: 0.5 },
      ]}
    >
      {!secondary && (
        <LinearGradient
          pointerEvents="none"
          colors={pearlGradients.primary}
          style={StyleSheet.absoluteFill}
        />
      )}
      {loading && (
        <ActivityIndicator
          color={secondary ? pearl.accentDeep : "white"}
          size={16}
        />
      )}
      <Text translate
        style={{
          color: secondary ? pearl.accentDeep : "white",
          fontWeight: "700",
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
export function SettingsRow({
  title,
  subtitle,
  icon,
  onPress,
  tone = "rose",
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: PearlTone;
  disabled?: boolean;
}) {
  const pearl = usePearlPalette();
  const settingsUi = useSettingsStyles();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[settingsUi.row, disabled && { opacity: 0.5 }]}
    >
      <View style={[settingsUi.icon, { backgroundColor: pearlTones[tone].bg }]}>
        <Ionicons name={icon} size={19} color={pearlTones[tone].fg} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text translate style={settingsUi.title}>{title}</Text>
        {!!subtitle && <Text translate style={settingsUi.muted}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={pearl.muted} />
    </TouchableOpacity>
  );
}
const createSettingsStyles = (pearl: ReturnType<typeof usePearlPalette>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: pearl.ink,
  },
  title: { fontSize: 14, fontWeight: "700", color: pearl.ink },
  muted: { fontSize: 12, lineHeight: 18, color: pearl.muted },
  body: { fontSize: 13, lineHeight: 20, color: pearl.ink2 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 },
  section: {
    color: pearl.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: pearl.glass,
    borderWidth: 1,
    borderColor: pearl.glassBorder,
    borderRadius: 22,
    overflow: "hidden",
  },
  formCard: {
    backgroundColor: pearl.glass,
    borderWidth: 1,
    borderColor: pearl.glassBorder,
    borderRadius: 22,
    padding: 16,
    gap: 14,
  },
  row: {
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    minHeight: 50,
    borderRadius: 16,
    overflow: "hidden",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondary: {
    borderWidth: 1,
    borderColor: "rgba(126,120,176,.4)",
    backgroundColor: pearl.glassStrong,
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: pearl.ink,
    fontSize: 14,
    backgroundColor: pearl.field,
    borderWidth: 1,
    borderColor: pearl.fieldBorder,
  },
  error: { color: pearl.dangerText, fontSize: 12, lineHeight: 18 },
});

export function useSettingsStyles() {
 const palette = usePearlPalette();
 return useMemo(() => createSettingsStyles(palette), [palette]);
}
