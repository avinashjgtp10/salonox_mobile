import { Text } from "@/components/ui/AppTypography";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { getAppointmentBillLabel, getAppointmentInvoiceLabel } from "@/utils/clientPrivacy";
import { ClientAvatar } from "@/features/appointments/components/shared/ClientAvatar";
import { MetaPill } from "@/features/appointments/components/shared/MetaPill";
import { StatusBadge } from "@/features/appointments/components/shared/StatusBadge";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatTimeLabel } from "@/features/appointments/utils/appointmentDateTime";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { getJobCardItems, getJobCardStatus } from "@/features/appointments/utils/jobCard";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem } from "@/types/appointment";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, { Layout } from "react-native-reanimated";

const JOB_STATUS_LABEL = { completed: "Completed", in_progress: "In Progress", pending: "Pending" } as const;

export function AppointmentCard({
  appointment,
  detailRoute,
  showJobCard = false,
  showPaymentStatus = false,
}: {
  appointment: AppointmentListItem;
  detailRoute?: (appointmentId: string) => Href;
  // Staff list: each service with its assigned staff and job card progress.
  showJobCard?: boolean;
  showPaymentStatus?: boolean;
}) {
  const { staffMode, clientName } = useClientPrivacy();
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const route = detailRoute?.(appointment.id) ?? (`/appointments/${appointment.id}` as Href);
  const jobCardItems = showJobCard ? getJobCardItems(appointment) : [];
  const status = showJobCard && appointment.status !== "Cancelled" && getJobCardStatus(appointment) === "Completed"
    ? "Completed"
    : appointment.status;

  return (
    <Animated.View layout={Layout.springify().damping(18).stiffness(160)}>
      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => router.push(route)}
        style={styles.card}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.clientBlock}>
            <ClientAvatar name={clientName(appointment.clientName)} />
            <View style={styles.clientCopy}>
              <Text numberOfLines={1} style={styles.cardTitle}>
                {staffMode ? getAppointmentBillLabel(appointment) : appointment.clientName}
              </Text>
              <Text numberOfLines={1} style={styles.cardSubtitle}>
                {staffMode && getAppointmentInvoiceLabel(appointment) ? `${clientName(appointment.clientName)} · ${appointment.serviceName}` : appointment.serviceName}
              </Text>
            </View>
          </View>
          <StatusBadge status={status} />
        </View>

        {jobCardItems.length > 1 ? (
          <View>
            {jobCardItems.map((item, index) => (
              <Text key={item.id ?? `${item.name}-${index}`} numberOfLines={1} style={styles.cardSubtitle}>
                {`${item.name} · ${item.staffName || "Unassigned"} · ${JOB_STATUS_LABEL[item.status ?? "pending"]}`}
              </Text>
            ))}
          </View>
        ) : null}

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
