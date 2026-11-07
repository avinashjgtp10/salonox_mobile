import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/AppTypography";
import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { Icon, type IconName } from "@/components/pearl/Icon";
import { Avatar, IconButton, StatusPill } from "@/components/pearl/ui";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { appAlert } from "@/services/appAlert";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { formatBusinessDate, formatBusinessTime, getAppointmentEndValue, getAppointmentGrandTotal, getAppointmentStaffNames, maskPhone } from "@/features/appointments/utils/appointmentScreenHelpers";
import type { AppointmentListItem } from "@/types/appointment";

export function BookingDetailsSheet({ appointment, onClose }: { appointment: AppointmentListItem | null; onClose: () => void }) {
 const insets = useSafeAreaInsets();
 const { clientName } = useClientPrivacy();
 if (!appointment) return null;
 const name = clientName(appointment.clientName);
 const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase();
 const go = (href: Href) => { onClose(); requestAnimationFrame(() => router.push(href)); };
 const call = () => {
  const phone = appointment.phone.replace(/[^+\d]/g, "");
  if (!phone) return appAlert.alert("Phone unavailable", "This client has no phone number.");
  void Linking.openURL(`tel:${phone}`).catch(() => appAlert.alert("Unable to call", "No phone app is available."));
 };
 const tone = appointment.status === "Cancelled" || appointment.status === "No Show" ? "danger" : appointment.status === "Completed" || appointment.status === "Confirmed" ? "success" : "warning";
 const actions: { label: string; icon: IconName; onPress: () => void }[] = [
  { label: "WhatsApp", icon: "phone", onPress: () => go("/inbox" as Href) },
  { label: "Call", icon: "phone", onPress: call },
  { label: "Reschedule", icon: "calendar", onPress: () => go(('/appointments/' + appointment.id + '/edit') as Href) },
  { label: "Profile", icon: "user", onPress: () => appointment.clientId ? go(('/clients/' + appointment.clientId) as Href) : appAlert.alert("Client profile unavailable", "This appointment has no linked client profile.") },
 ];
 return <Modal transparent animationType="slide" visible onRequestClose={onClose}>
  <View style={s.backdrop}>
   <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close appointment" onPress={onClose} />
   <View accessibilityViewIsModal style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12), maxHeight: "90%" }]}>
    <View style={s.handle} />
    <View style={s.header}><Text style={s.title}>Appointment</Text><IconButton icon="x" label="Close appointment" onPress={onClose} size={34} /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
     <View style={s.client}><Avatar initials={initials} size={48} tone="rose" /><View style={{ flex: 1 }}><Text style={s.title}>{name}</Text><Text style={s.muted}>{maskPhone(appointment.phone)}</Text></View></View>
     <View style={s.card}>
      {[["Service", appointment.serviceName], ["Staff", getAppointmentStaffNames(appointment).join(", ") || appointment.staffName], ["When", formatBusinessDate(appointment.scheduledAt) + " \u00b7 " + formatBusinessTime(appointment.startTime || appointment.scheduledAt) + "\u2013" + formatBusinessTime(getAppointmentEndValue(appointment))]].map(([label, value]) => <View key={label} style={s.kv}><Text style={s.muted}>{label}</Text><Text style={s.value}>{value}</Text></View>)}
      <View style={s.kv}><Text style={s.muted}>Status</Text><StatusPill tone={tone} label={appointment.status} /></View>
      <View style={[s.kv, { borderBottomWidth: 0 }]}><Text style={s.muted}>Estimate</Text><Text style={s.value}>{formatCurrency(getAppointmentGrandTotal(appointment))}</Text></View>
     </View>
     <View style={s.actions}>{actions.map(action => <Pressable key={action.label} accessibilityRole="button" onPress={action.onPress} style={s.action}><View style={s.actionIcon}>{action.label === "WhatsApp" ? <Ionicons name="logo-whatsapp" size={20} color={pearl.accentDeep} /> : <Icon name={action.icon} size={20} color={pearl.accentDeep} />}</View><Text style={s.actionText}>{action.label}</Text></Pressable>)}</View>
     <View style={s.buttons}>
      <Pressable accessibilityRole="button" onPress={() => appAlert.alert("Mark arrived unavailable", "The current appointment API does not support marking arrivals.")} style={s.secondary}><Text style={s.buttonText}>Mark arrived</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => go({ pathname: "/quick-sale", params: appointment.pendingSaleId ? { draftId: appointment.pendingSaleId } : { appointmentId: appointment.id } } as Href)} style={{ flex: 1 }}><LinearGradient colors={pearlGradients.primary} style={s.primary}><Icon name="bolt" color="#fff" size={18} /><Text style={[s.buttonText, { color: "#fff" }]}>Start sale</Text></LinearGradient></Pressable>
     </View>
     <Pressable accessibilityRole="button" onPress={() => go(('/appointments/' + appointment.id + '/cancel') as Href)} style={s.cancel}><Text style={s.cancelText}>Cancel appointment</Text></Pressable>
    </ScrollView>
   </View>
  </View>
 </Modal>;
}
const s = StyleSheet.create({
 backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(35,33,52,0.35)" },
 sheet: { backgroundColor: "#F7F6FA", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
 handle: { width: 36, height: 4, backgroundColor: pearl.divider, borderRadius: 2, alignSelf: "center", marginTop: 10 },
 header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 },
 title: { fontSize: 18, fontWeight: "800", color: pearl.ink },
 content: { paddingHorizontal: 18, gap: 16 },
 client: { flexDirection: "row", alignItems: "center", gap: 12 },
 muted: { fontSize: 13, color: pearl.muted },
 card: { backgroundColor: pearl.glass, borderRadius: 22, borderWidth: 1, borderColor: pearl.glassBorder, overflow: "hidden" },
 kv: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: pearl.divider },
 value: { flexShrink: 1, maxWidth: "74%", textAlign: "right", color: pearl.ink, fontSize: 13, fontWeight: "700" },
 actions: { flexDirection: "row", gap: 8 }, action: { flex: 1, alignItems: "center", gap: 7 },
 actionIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, alignItems: "center", justifyContent: "center" },
 actionText: { color: pearl.ink, fontSize: 11.5, fontWeight: "600" }, buttons: { flexDirection: "row", gap: 8 },
 secondary: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: pearl.glass, borderWidth: 1, borderColor: pearl.glassBorder, alignItems: "center", justifyContent: "center" },
 primary: { minHeight: 48, borderRadius: 16, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
 buttonText: { fontSize: 14, fontWeight: "700", color: pearl.accentDeep }, cancel: { alignItems: "center", paddingBottom: 10, paddingTop: 2 }, cancelText: { fontSize: 13, fontWeight: "600", color: pearl.muted },
});
