import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";

export function InboxButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 48,
        borderRadius: 16,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        backgroundColor: secondary ? pearl.glass : pearl.accent,
        borderWidth: secondary ? 1 : 0,
        borderColor: "rgba(126,120,176,.4)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {!secondary && (
        <LinearGradient
          pointerEvents="none"
          colors={pearlGradients.primary}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text translate
        style={{
          color: secondary ? pearl.accentDeep : "white",
          fontSize: 14,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
