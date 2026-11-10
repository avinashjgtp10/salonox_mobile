import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/AppTypography";
import { pearl } from "@/components/auth/pearl/tokens";
import { StatusPill } from "@/components/pearl/ui";
import { formatTimeLabel } from "@/features/appointments/utils/appointmentDateTime";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import type { AppointmentListItem } from "@/types/appointment";

/** Rows share one rounded card, with dividers only between appointments. */
export function BookingListRow({ appointment, first, last, onPress }: { appointment: AppointmentListItem; first: boolean; last: boolean; onPress: () => void }) {
  const { clientName } = useClientPrivacy();
  const tone = appointment.status === "Cancelled" || appointment.status === "No Show" ? "danger"
    : appointment.status === "Completed" || appointment.status === "Confirmed" ? "success"
      : appointment.status === "Waiting" || appointment.status === "Upcoming" ? "warning" : "neutral";
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, first && s.first, last && s.last, pressed && { opacity: 0.75 }]}>
    <View style={s.time}><Text style={s.hour}>{formatTimeLabel(appointment.scheduledAt)}</Text><Text style={s.duration}>{appointment.durationLabel}</Text></View>
    <View style={s.copy}><Text numberOfLines={1} style={s.name}>{clientName(appointment.clientName)}</Text><Text numberOfLines={2} style={s.detail}>{appointment.serviceName} · {appointment.staffName}</Text></View>
    <StatusPill tone={tone} label={appointment.status} />
  </Pressable>;
}
const s = StyleSheet.create({
  first: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  last: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderBottomWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: pearl.glass, borderBottomWidth: 1, borderColor: pearl.divider },
  time: { minWidth: 50, minHeight: 46, paddingHorizontal: 4, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  hour: { fontSize: 12, fontWeight: "700", color: pearl.ink }, duration: { fontSize: 10.5, color: pearl.muted },
  copy: { flex: 1, minWidth: 0 }, name: { fontSize: 14.5, fontWeight: "700", color: pearl.ink }, detail: { fontSize: 12.5, color: pearl.muted, marginTop: 2 },
});
