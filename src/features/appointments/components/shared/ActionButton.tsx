import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { Text, TouchableOpacity } from "react-native";

export function ActionButton({
  danger,
  icon,
  label,
  route,
}: {
  danger?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}) {
  const { Colors, styles } = useAppointmentStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => router.push(route as Href)}
      style={[styles.actionButton, danger && styles.actionButtonDanger]}
    >
      <Ionicons name={icon} size={18} color={danger ? Colors.error : Colors.primary} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        numberOfLines={1}
        style={[styles.actionButtonText, danger && styles.actionButtonTextDanger]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
