import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Text, View } from "react-native";

export function MetaPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={14} color={Colors.text2} />
      <Text numberOfLines={1} style={styles.metaPillText}>
        {label || "-"}
      </Text>
    </View>
  );
}
