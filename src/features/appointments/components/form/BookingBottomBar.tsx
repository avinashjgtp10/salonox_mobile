import { useRegionalPreferences } from "@/localization/preferences";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text } from "@/components/ui/AppTypography";
import { DashboardSpacing as Spacing } from "@/constants/theme";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { pearlGradients } from "@/components/auth/pearl/tokens";
import { PearlActionFooter } from "@/components/ui/PearlActionFooter";

type BookingBottomBarProps = { serviceCount: number; totalServiceDuration: number; totalServicePrice: number; mutating: boolean; mode: 'create' | 'edit'; onSubmit: () => void; };

export function BookingBottomBar({ serviceCount, totalServiceDuration, totalServicePrice, mutating, mode, onSubmit }: BookingBottomBarProps) {
  "use no memo";
  useRegionalPreferences();
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  return (<PearlActionFooter contentStyle={{ paddingBottom: Math.max(insets.bottom, Spacing.md) }}>
    <View accessibilityLabel={`${serviceCount} items, ${totalServiceDuration} minutes, estimated total ${formatCurrency(totalServicePrice)}`}>
      <Text style={styles.bookingBottomLabel}>{totalServiceDuration} min · est.</Text>
      <Text style={styles.bookingBottomTotal}>{formatCurrency(totalServicePrice)}</Text>
    </View>
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={mutating}
      onPress={onSubmit}
      style={[{ flex: 1 }, mutating && styles.disabledButton]}
    >
      <LinearGradient colors={pearlGradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bookingPrimaryButton}>
      {mutating ? <ActivityIndicator color="#fff" /> : null}
      <Text translate style={[styles.bookingPrimaryButtonText, { color: "#fff", fontSize: 14 }]}>
        {mutating ? "Booking..." : mode === "create" ? "Book appointment" : "Save changes"}
      </Text>
      </LinearGradient>
    </TouchableOpacity>
  </PearlActionFooter>);
}
