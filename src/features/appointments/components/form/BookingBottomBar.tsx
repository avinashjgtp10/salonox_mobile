import { DashboardSpacing as Spacing } from "@/constants/theme";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { useThemeColors } from "@/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BookingBottomBarProps = { serviceCount: number; totalServiceDuration: number; totalServicePrice: number; mutating: boolean; mode: 'create' | 'edit'; onSubmit: () => void; };

export function BookingBottomBar({ serviceCount, totalServiceDuration, totalServicePrice, mutating, mode, onSubmit }: BookingBottomBarProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  return (<View style={[styles.bookingBottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
    <View style={styles.bookingBottomSummary}>
      <View>
        <Text style={styles.bookingBottomLabel}>
          {serviceCount} {serviceCount === 1 ? "service" : "services"}
        </Text>
        <Text style={styles.bookingBottomMeta}>{totalServiceDuration} min</Text>
      </View>
      <View style={styles.bookingBottomTotalWrap}>
        <Text style={styles.bookingBottomLabel}>Estimated total</Text>
        <Text style={styles.bookingBottomTotal}>{formatCurrency(totalServicePrice)}</Text>
      </View>
    </View>
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={mutating}
      onPress={onSubmit}
      style={[styles.bookingPrimaryButton, mutating && styles.disabledButton]}
    >
      {mutating ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />}
      <Text style={styles.bookingPrimaryButtonText}>
        {mutating ? "Booking..." : mode === "create" ? "Book Appointment" : "Save Changes"}
      </Text>
    </TouchableOpacity>
  </View>);
}
