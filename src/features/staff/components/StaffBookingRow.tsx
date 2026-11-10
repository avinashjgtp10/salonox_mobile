import { TouchableOpacity, View } from "react-native";
import { router, type Href } from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { useSettingsStyles } from "@/features/settings/SettingsUI";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { formatAppTime } from "@/utils/dateTime";
import type { AppointmentListItem } from "@/types/appointment";
import { getAppointmentInvoiceLabel } from "@/utils/clientPrivacy";
import { isStaffAppointmentCompleted } from "@/features/appointments/utils/staffAppointmentRows";

export function StaffBookingRow({ appointment, next = false, embedded = false, upcoming = false }: { appointment: AppointmentListItem; next?: boolean; embedded?: boolean; upcoming?: boolean }) {
  const ui = useSettingsStyles(), p = usePearlPalette();
  const { clientName } = useClientPrivacy();
  return <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/(staff)/appointment-details/${appointment.id}` as Href)}
    style={[!embedded && ui.formCard, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }]}>
    <View style={{ minWidth: 54, gap: 4 }}><Text style={ui.title}>{formatAppTime(appointment.startTime ?? appointment.scheduledAt)}</Text><Text style={ui.muted}>{appointment.durationLabel}</Text></View>
    <View style={{ flex: 1, gap: 4 }}><Text style={ui.title}>{clientName(appointment.clientName)}</Text><Text style={ui.muted}>{appointment.serviceName}{!embedded ? ` · ${getAppointmentInvoiceLabel(appointment) ?? "Invoice on checkout"}` : ""}</Text></View>
    <View style={{ backgroundColor: next ? p.accentWash : p.glassStrong, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 }}><Text translate style={{ fontSize: 11, fontWeight: "700", color: p.accentDeep }}>{isStaffAppointmentCompleted(appointment) ? "Done" : appointment.status === "No Show" ? "No-show" : upcoming ? appointment.status : next ? "Next" : "Later"}</Text></View>
  </TouchableOpacity>;
}
