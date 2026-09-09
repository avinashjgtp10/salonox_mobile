import { StateIllustration } from "@/components/ui/StateViews";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Text, TouchableOpacity } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

export function StateCard({
  actionLabel,
  icon,
  message,
  onAction,
  title,
  tone = "default",
}: {
  actionLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  onAction?: () => void;
  title: string;
  tone?: "default" | "error";
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.stateCard}>
      <StateIllustration Colors={Colors} accent={tone === "error" ? "error" : "blue"} icon={icon} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onAction} style={styles.primaryButtonSmall}>
          <Text style={styles.primaryButtonSmallText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}
