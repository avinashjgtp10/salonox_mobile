import { ClientAvatar } from "@/features/appointments/components/shared/ClientAvatar";
import { MetaPill } from "@/features/appointments/components/shared/MetaPill";
import { StatusBadge } from "@/features/appointments/components/shared/StatusBadge";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatTimeLabel } from "@/features/appointments/utils/appointmentDateTime";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem } from "@/types/appointment";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { Layout } from "react-native-reanimated";

export function AppointmentCard({
  appointment,
  detailRoute,
  showPaymentStatus = false,
}: {
  appointment: AppointmentListItem;
  detailRoute?: (appointmentId: string) => Href;
  showPaymentStatus?: boolean;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const route = detailRoute?.(appointment.id) ?? (`/appointments/${appointment.id}` as Href);

  return (
    <Animated.View layout={Layout.springify().damping(18).stiffness(160)}>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => router.push(route)}
        style={styles.card}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.clientBlock}>
            <ClientAvatar name={appointment.clientName} />
            <View style={styles.clientCopy}>
              <Text numberOfLines={1} style={styles.cardTitle}>
                {appointment.clientName}
              </Text>
              <Text numberOfLines={1} style={styles.cardSubtitle}>
                {appointment.serviceName}
              </Text>
            </View>
          </View>
          <StatusBadge status={appointment.status} />
        </View>

        <View style={styles.metaGrid}>
          <MetaPill icon="person-outline" label={appointment.staffName} />
          <MetaPill icon="time-outline" label={formatTimeLabel(appointment.scheduledAt)} />
          <MetaPill icon="timer-outline" label={appointment.durationLabel} />
          <MetaPill icon="card-outline" label={showPaymentStatus ? appointment.paymentStatus : appointment.paymentMethod} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amountText}>{formatCurrency(appointment.total || appointment.amount)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
