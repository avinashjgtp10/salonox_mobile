import type { ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";

export function CommissionButton({
  label,
  onPress,
  secondary = false,
  compact = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  compact?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        commissionUi.button,
        compact && commissionUi.smallButton,
        secondary && commissionUi.secondary,
        secondary &&
          compact && {
            backgroundColor: "rgba(255,255,255,0.65)",
            borderWidth: 1,
            borderColor: "#FFFFFF",
          },
        disabled && { opacity: 0.5 },
      ]}
    >
      {!secondary && (
        <LinearGradient
          colors={pearlGradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {icon && (
        <Ionicons
          name={icon}
          size={compact ? 14 : 18}
          color={secondary ? pearl.accentDeep : pearl.white}
        />
      )}
      <Text translate
        style={{
          color: secondary ? pearl.accentDeep : pearl.white,
          fontSize: compact ? 13 : 14,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CommissionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[commissionUi.chip, selected && commissionUi.chipSelected]}
    >
      {selected && (
        <LinearGradient
          colors={pearlGradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text translate
        style={{
          color: selected ? pearl.white : pearl.ink2,
          fontSize: 12.5,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CommissionNote({ children }: { children: ReactNode }) {
  return (
    <View style={commissionUi.note}>
      <Ionicons
        name="information-circle-outline"
        color={pearl.accentDeep}
        size={17}
      />
      <Text style={commissionUi.noteText}>{children}</Text>
    </View>
  );
}

export const commissionUi = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: pearl.glass,
    borderColor: pearl.glassBorder,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  formCard: { padding: 16, gap: 14 },
  statCard: { borderRadius: 20, padding: 12, flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    backgroundColor: pearl.glass,
    borderColor: pearl.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    minHeight: 34,
    justifyContent: "center",
    overflow: "hidden",
  },
  chipSelected: {
    backgroundColor: pearl.accent,
    borderColor: "transparent",
  },
  title: { color: pearl.ink, fontSize: 14, fontWeight: "700" },
  sectionTitle: { color: pearl.ink, fontSize: 15, fontWeight: "700" },
  muted: { color: pearl.muted, fontSize: 12, lineHeight: 18 },
  value: { color: pearl.ink, fontSize: 15, fontWeight: "700" },
  label: { color: pearl.ink, fontSize: 12, fontWeight: "600" },
  fieldGroup: { gap: 7 },
  input: {
    backgroundColor: pearl.field,
    borderWidth: 1,
    borderColor: pearl.fieldBorder,
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    color: pearl.ink,
    fontSize: 14,
  },
  inputError: { borderColor: pearl.dangerText },
  error: { color: pearl.dangerText, fontSize: 12, lineHeight: 18 },
  button: {
    minHeight: 52,
    borderRadius: 16,
    overflow: "hidden",
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  smallButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 12 },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderWidth: 1.5,
    borderColor: "rgba(126,120,176,0.45)",
  },
  note: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(126,120,176,0.08)",
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 19, color: pearl.ink2 },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
});
