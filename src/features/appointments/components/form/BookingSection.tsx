import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useMemo } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

export function BookingSection({
  action,
  children,
  stackIndex = 1,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  stackIndex?: number;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View entering={FadeIn.duration(180)} style={[styles.bookingSection, { zIndex: stackIndex }]}>
      {title || action ? (
        <View style={styles.bookingSectionHeader}>
          <Text style={styles.bookingSectionTitle}>{title}</Text>
          {action}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}
