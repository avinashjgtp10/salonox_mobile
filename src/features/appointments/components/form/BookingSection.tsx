import { Text } from "@/components/ui/AppTypography";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useMemo } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

export function BookingSection({
  action,
  children,
  stackIndex = 1,
  title,
  icon,
  subtitle,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  stackIndex?: number;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Animated.View entering={FadeIn.duration(180)} style={[styles.bookingSection, { zIndex: stackIndex }]}>
      {title || action ? (
        <View style={styles.bookingSectionHeader}>
          <View style={styles.bookingSectionHeading}>
            {icon ? <View style={styles.bookingSectionIcon}><Ionicons name={icon} size={19} color={Colors.primaryText} /></View> : null}
            <View style={styles.bookingSectionCopy}>
              <Text style={styles.bookingSectionTitle}>{title}</Text>
              {subtitle ? <Text style={styles.bookingSectionSubtitle}>{subtitle}</Text> : null}
            </View>
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}
