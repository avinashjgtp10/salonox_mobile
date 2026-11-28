import { useRegionalPreferences } from "@/localization/preferences";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { getAppointmentInvoiceLabel } from "@/utils/clientPrivacy";
import { appAlert as Alert } from "@/services/appAlert";
import { salesService } from "@/services/sales.service";
import { pearlGradients, pearlTones, type PearlTone } from "@/components/auth/pearl/tokens";
import { pearl } from "@/components/auth/pearl/themedPearl";
import { Icon, type IconName } from "@/components/pearl/Icon";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, IconButton, StatusPill, type PillTone } from "@/components/pearl/ui";
import { LinearGradient } from "expo-linear-gradient";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { formatBusinessDate, formatBusinessTime, formatItemTime, getAppointmentEndValue, getAppointmentGrandTotal, getAppointmentPaymentStatus, getAppointmentSalesSummary, getAppointmentStaffNames, getPartialBillAmounts, getAppointmentWebStatus, maskPhone, toInvoiceSequence } from "@/features/appointments/utils/appointmentScreenHelpers";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import type { AppointmentBilledItem, AppointmentListItem } from "@/types/appointment";
import { formatInvoiceNumber } from "@/utils/receipt";
import { isOwnBillingItem } from "@/utils/staffBilling";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

// Same item-type tags as the web's View Appointment cards, in the pearl tones.
const ITEM_TONES: Record<AppointmentBilledItem["type"], PearlTone> = {
  membership: "success",
  package: "warning",
  product: "sky",
  service: "lavender",
};
const ITEM_LABELS: Record<AppointmentBilledItem["type"], string> = {
  membership: "MEMBERSHIP",
  package: "PACKAGE",
  product: "PRODUCT",
  service: "SERVICE",
};

const AVATAR_TONES: PearlTone[] = ["rose", "lilac", "peach"];
const avatarTone = (id: string) =>
  AVATAR_TONES[Array.from(id).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % AVATAR_TONES.length];
const initialsOf = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";

export function AppointmentPreviewSheet({
  appointment,
  onClose,
  onContinueToPayment,
  readOnly = false,
}: {
  appointment: AppointmentListItem | null;
  onClose: () => void;
  /** Opens the appointment's pending bill at the Payment screen. */
  onContinueToPayment?: (appointment: AppointmentListItem) => void;
  readOnly?: boolean;
}) {
  "use no memo";
  useRegionalPreferences();
  const { staffMode, clientName, billLabel } = useClientPrivacy();
  const insets = useSafeAreaInsets();
  const [findingSale, setFindingSale] = useState(false);
  const currentStaff = useAppSelector(selectCurrentStaff);

  if (!appointment) return null;
  const paymentStatus = getAppointmentPaymentStatus(appointment);
  // Paid and partially-paid bills can be edited and printed, as on the web.
  const hasBill = paymentStatus !== "Unpaid" && appointment.status !== "Cancelled";
  const start = formatBusinessTime(appointment.startTime || appointment.scheduledAt);
  const end = formatBusinessTime(getAppointmentEndValue(appointment));
  const salesSummary = getAppointmentSalesSummary(appointment);
  const paymentMode = appointment.paymentMethod && appointment.paymentMethod !== "-" ? appointment.paymentMethod : "";
  const webStatus = getAppointmentWebStatus(appointment);
  const staffNames = getAppointmentStaffNames(appointment).join(", ") || "-";
  const staffAlert = typeof appointment.raw.staff_alert === "string" ? appointment.raw.staff_alert.trim() : "";
  const clientEmail = appointment.clientEmail || (typeof appointment.raw.client_email === "string" ? appointment.raw.client_email : "");
  const invoiceNumber = formatInvoiceNumber(toInvoiceSequence(appointment.raw.invoice_number));
  const billedTotal = getAppointmentGrandTotal(appointment);
  const partialBill = paymentStatus === "Partial" ? getPartialBillAmounts(appointment, billedTotal) : null;
  const grandTotal = partialBill?.total ?? billedTotal;
  const displayName = staffMode ? billLabel(appointment) : appointment.clientName;
  const statusTone: PillTone = appointment.status === "Cancelled" || appointment.status === "No Show"
    ? "danger"
    : appointment.status === "Completed" || appointment.status === "Confirmed" ? "success" : "warning";
  const paymentTone: PillTone = paymentStatus === "Paid" ? "success" : paymentStatus === "Partial" ? "warning" : "neutral";
  // Staff only ever see prices on their own rows; the bill summary stays owner-side.
  const showItemPrice = (item: AppointmentBilledItem) =>
    !staffMode || isOwnBillingItem(currentStaff, item.staffId ?? (item.type === "service" ? appointment.staffId : null));
  const infoRows: [string, string][] = [
    ["Date", formatBusinessDate(appointment.scheduledAt)],
    ["Time", [start, end].filter((value) => value && value !== "-").join(" – ") || "-"],
    ["Staff", staffNames],
    ...(!staffMode && paymentMode ? [["Payment Mode", paymentMode] as [string, string]] : []),
    ...(!staffMode ? [["Invoice", invoiceNumber ?? "Not billed yet"] as [string, string]] : []),
  ];

  const go = (href: Href) => { onClose(); requestAnimationFrame(() => router.push(href)); };
  const openEditor = () => go(`/appointments/${appointment.id}/edit` as Href);

  const call = () => {
    const phone = appointment.phone.replace(/[^+\d]/g, "");
    if (!phone) return Alert.alert("Phone unavailable", "This client has no phone number.");
    void Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Unable to call", "No phone app is available."));
  };

  // A bill saved as pending from the Calendar's Quick Sale: reopen that draft
  // straight at its Payment screen.
  const canContinueToPayment = Boolean(onContinueToPayment) && appointment.status !== "Cancelled";
  // A partially-paid bill can settle its balance straight from the Calendar:
  // the footer offers "Pay Due" instead of "Print Bill", which moves up into the
  // quick actions so the receipt is still one tap away.
  const payDue = Boolean(partialBill && partialBill.due > 0 && canContinueToPayment);
  const handleContinueToPayment = () => {
    // Keep the appointment details sheet open underneath; the Quick Sale screen
    // opens as an overlay on top of it rather than replacing it.
    onContinueToPayment?.(appointment);
  };

  const handleViewInvoice = async () => {
    if (findingSale) return;
    let saleId = appointment.saleId;
    if (!saleId) {
      // Partial bills (and a few paid ones) have no sale_id on the appointment.
      setFindingSale(true);
      saleId = await salesService.findSaleIdForAppointment(appointment).catch(() => null) ?? "";
      setFindingSale(false);
    }
    if (!saleId) {
      Alert.alert("Invoice unavailable", "A receipt has not been created for this appointment yet.");
      return;
    }

    go({ pathname: "/quick-sale/checkout", params: { openReceipt: "1", saleId } } as Href);
  };

  const quickActions: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: "WhatsApp", icon: "chat", onPress: () => go("/inbox" as Href) },
    { label: "Call", icon: "phone", onPress: call },
    ...(payDue ? [{ label: "Print Bill", icon: "receipt" as IconName, onPress: () => void handleViewInvoice() }] : []),
    ...(readOnly ? [] : [{ label: "Reschedule", icon: "calendar" as IconName, onPress: openEditor }]),
    {
      label: "Profile",
      icon: "user",
      onPress: () => appointment.clientId
        ? go(`/clients/${appointment.clientId}` as Href)
        : Alert.alert("Client profile unavailable", "This appointment has no linked client profile."),
    },
  ];

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={s.backdrop}>
        <Pressable accessibilityLabel="Close appointment" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[s.sheet, { paddingBottom: readOnly ? Math.max(insets.bottom, 12) : 0 }]}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text translate style={s.title}>Appointment</Text>
            <IconButton icon="x" label="Close appointment" onPress={onClose} size={36} />
          </View>

          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={s.clientRow}>
              <Avatar initials={initialsOf(displayName)} size={48} tone={avatarTone(appointment.clientId || appointment.id)} />
              <View style={s.clientCopy}>
                <Text numberOfLines={1} style={s.clientName}>{displayName}</Text>
                {staffMode && getAppointmentInvoiceLabel(appointment) ? <Text numberOfLines={1} style={s.muted}>{clientName(appointment.clientName)}</Text> : null}
                <Text style={s.muted}>{maskPhone(appointment.phone)}</Text>
                {!staffMode && clientEmail ? <Text numberOfLines={1} style={s.muted}>{clientEmail}</Text> : null}
              </View>
              <StatusPill tone={statusTone} label={webStatus.label} />
            </View>

            <View style={s.card}>
              {infoRows.map(([label, value], index) => (
                <View key={label} style={[s.kv, index > 0 && s.kvDivided]}>
                  <Text translate style={s.kvLabel}>{label}</Text>
                  <Text style={s.kvValue}>{value}</Text>
                </View>
              ))}
              {!readOnly ? (
                <View style={[s.kv, s.kvDivided]}>
                  <Text translate style={s.kvLabel}>Payment</Text>
                  <StatusPill tone={paymentTone} label={paymentStatus} />
                </View>
              ) : null}
              {!staffMode ? (
                <View style={[s.kv, s.kvDivided]}>
                  <Text translate style={s.kvLabel}>Estimate</Text>
                  <Text style={s.kvValue}>{formatCurrency(grandTotal)}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.quickActions}>
              {quickActions.map((action) => (
                <Pressable accessibilityRole="button" key={action.label} onPress={action.onPress} style={s.quickAction}>
                  <View style={s.quickIcon}>
                    {/* WhatsApp keeps its own brand mark; the rest use the pearl icon set. */}
                    {action.label === "WhatsApp"
                      ? <Ionicons name="logo-whatsapp" size={21} color="#25D366" />
                      : <Icon name={action.icon} size={20} color={pearl.accentDeep} />}
                  </View>
                  <Text translate style={s.quickLabel}>{action.label}</Text>
                </Pressable>
              ))}
            </View>

            {staffAlert ? (
              <View style={s.alertCard}>
                <Text translate style={s.alertLabel}>Staff Alert</Text>
                <Text style={s.body}>{staffAlert}</Text>
              </View>
            ) : null}

            <Text translate style={s.sectionTitle}>Booking details ({appointment.billedItems.length})</Text>
            {appointment.billedItems.map((item, index) => {
              const priced = showItemPrice(item);
              const tone = pearlTones[ITEM_TONES[item.type]];
              return (
                <View key={item.id ?? `${item.type}-${item.name}-${index}`} style={s.card}>
                  <View style={s.itemBody}>
                    <View style={s.itemTop}>
                      <Text numberOfLines={2} style={s.itemName}>{item.name}</Text>
                      {priced ? <Text style={s.itemPrice}>{formatCurrency((item.totalAmount ?? item.price) + item.tax)}</Text> : null}
                    </View>
                    <View style={s.itemMeta}>
                      <View style={[s.tag, { backgroundColor: tone.bg }]}>
                        <Text translate style={[s.tagText, { color: tone.fg }]}>{ITEM_LABELS[item.type]}</Text>
                      </View>
                      <Text style={s.muted}>
                        {[item.staffName ?? (item.type === "service" ? appointment.staffName : null), formatItemTime(item.time)].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    {priced ? (
                      <Text style={s.itemBreakdown}>
                        {`Qty: ${item.quantity} · Price: ${formatCurrency(item.price)} · Disc: ${formatCurrency(item.discount)} · Tax: ${formatCurrency(item.tax)}`}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {!staffMode ? (
              <>
                <Text translate style={s.sectionTitle}>Sales summary</Text>
                <View style={s.card}>
                  <SummaryRow label="Subtotal" value={formatCurrency(salesSummary.subtotal)} />
                  {salesSummary.discount > 0 ? <SummaryRow divided label="Discount" value={`-${formatCurrency(salesSummary.discount)}`} /> : null}
                  {salesSummary.couponDiscount > 0 ? (
                    <SummaryRow divided label={salesSummary.couponCode ? `Coupon (${salesSummary.couponCode})` : "Coupon"} value={`-${formatCurrency(salesSummary.couponDiscount)}`} />
                  ) : null}
                  {salesSummary.totalTax > 0 ? (
                    <>
                      <SummaryRow divided label={salesSummary.taxLabel} value={`+${formatCurrency(salesSummary.totalTax)}`} />
                      <SummaryRow divided label="Total Tax" value={formatCurrency(salesSummary.totalTax)} />
                    </>
                  ) : null}
                  <SummaryRow divided label="Extra Charges" value={`+${formatCurrency(salesSummary.exCharges)}`} />
                  <View style={[s.kv, s.kvDivided]}>
                    <Text translate style={s.totalLabel}>Grand Total</Text>
                    <Text style={s.totalLabel}>{formatCurrency(grandTotal)}</Text>
                  </View>
                  <View style={[s.kv, s.kvDivided]}>
                    <Text translate style={s.paidLabel}>Paid</Text>
                    <Text style={s.paidLabel}>{formatCurrency(appointment.paidAmount)}</Text>
                  </View>
                  {salesSummary.paymentMethods.map((entry) => (
                    <SummaryRow divided key={entry.method} label={entry.method} value={formatCurrency(entry.amount)} />
                  ))}
                  {partialBill ? (
                    <View style={[s.kv, s.kvDivided]}>
                      <Text translate style={s.dueLabel}>Balance Due</Text>
                      <Text style={s.dueLabel}>{formatCurrency(partialBill.due)}</Text>
                    </View>
                  ) : null}
                  {salesSummary.tipAmount > 0 ? (
                    <SummaryRow divided label="Staff Tip (included above)" value={formatCurrency(salesSummary.tipAmount)} />
                  ) : null}
                </View>
              </>
            ) : null}

            <Text translate style={s.sectionTitle}>Client notes</Text>
            <View style={s.card}>
              <View style={s.itemBody}>
                <Text style={[s.body, !appointment.notes.trim() && s.muted]}>
                  {appointment.notes.trim() || "No client notes added."}
                </Text>
                {!readOnly ? (
                  <Pressable accessibilityRole="button" onPress={openEditor} style={s.noteButton}>
                    <Icon name="edit" size={16} color={pearl.accentDeep} />
                    <Text translate style={s.noteButtonText}>{appointment.notes.trim() ? "Edit Client Note" : "Add Client Note"}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </ScrollView>

          {readOnly ? null : (
            <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
              <Pressable accessibilityRole="button" onPress={openEditor} style={s.secondary}>
                <Icon name="edit" size={18} color={pearl.accentDeep} />
                <Text translate style={s.secondaryText}>Edit</Text>
              </Pressable>
              {payDue ? (
                <Pressable accessibilityLabel={`Pay due ${formatCurrency(partialBill!.due)}`} accessibilityRole="button" onPress={handleContinueToPayment} style={s.primaryWrap}>
                  <LinearGradient colors={pearlGradients.primary} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={s.primary}>
                    <Icon name="wallet" size={18} color="#fff" />
                    <Text style={s.primaryText}>{`Pay Due · ${formatCurrency(partialBill!.due)}`}</Text>
                  </LinearGradient>
                </Pressable>
              ) : hasBill ? (
                <Pressable accessibilityRole="button" accessibilityState={{ busy: findingSale }} disabled={findingSale} onPress={() => void handleViewInvoice()} style={s.primaryWrap}>
                  <LinearGradient colors={pearlGradients.primary} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={s.primary}>
                    {findingSale ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="receipt" size={18} color="#fff" />}
                    <Text translate style={s.primaryText}>Print Bill</Text>
                  </LinearGradient>
                </Pressable>
              ) : canContinueToPayment ? (
                <Pressable accessibilityLabel="Continue to Payment" accessibilityRole="button" onPress={handleContinueToPayment} style={s.primaryWrap}>
                  <LinearGradient colors={pearlGradients.primary} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={s.primary}>
                    <Icon name="bolt" size={18} color="#fff" />
                    <Text translate style={s.primaryText}>Start sale</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <View style={[s.primaryWrap, s.primaryDisabled]}>
                  <View style={s.primary}>
                    <Icon name="receipt" size={18} color={pearl.muted} />
                    <Text translate style={[s.primaryText, { color: pearl.muted }]}>Invoice after payment</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ divided, label, value }: { divided?: boolean; label: string; value: string }) {
  "use no memo";
  useRegionalPreferences();
  return (
    <View style={[s.kv, divided && s.kvDivided]}>
      <Text translate style={s.kvLabel}>{label}</Text>
      <Text style={s.kvValue}>{value}</Text>
    </View>
  );
}

const s = themedStyles((p) => ({
  backdrop: { backgroundColor: "rgba(35,33,52,0.35)", flex: 1, justifyContent: "flex-end", paddingBottom: 8 },
  // Floats clear of the screen edge so the bottom corners (and the footer behind
  // the buttons) read as rounded, like the prototype's sheet panel.
  sheet: { backgroundColor: p.bgBottom, borderRadius: 28, marginHorizontal: 8, maxHeight: "90%", overflow: "hidden" },
  handle: { alignSelf: "center", backgroundColor: p.divider, borderRadius: 2, height: 4, marginTop: 10, width: 36 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 },
  title: { color: p.ink, fontSize: 18, fontWeight: "800" },
  content: { gap: 14, paddingBottom: 18, paddingHorizontal: 18 },
  clientRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  clientCopy: { flex: 1, minWidth: 0 },
  clientName: { color: p.ink, fontSize: 18, fontWeight: "800" },
  muted: { color: p.muted, fontSize: 13, marginTop: 2 },
  body: { color: p.ink, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: p.glass, borderColor: p.glassBorder, borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  kv: { alignItems: "center", flexDirection: "row", gap: 14, justifyContent: "space-between", minHeight: 46, paddingHorizontal: 16, paddingVertical: 11 },
  kvDivided: { borderTopColor: p.divider, borderTopWidth: 1 },
  kvLabel: { color: p.muted, flexShrink: 1, fontSize: 13 },
  kvValue: { color: p.ink, flexShrink: 1, fontSize: 13, fontWeight: "700", maxWidth: "70%", textAlign: "right" },
  totalLabel: { color: p.ink, fontSize: 15, fontWeight: "800" },
  paidLabel: { color: p.successText, fontSize: 13, fontWeight: "700" },
  dueLabel: { color: p.dangerText, fontSize: 13, fontWeight: "700" },
  quickActions: { flexDirection: "row", gap: 8 },
  quickAction: { alignItems: "center", flex: 1, gap: 7 },
  quickIcon: { alignItems: "center", backgroundColor: p.glass, borderColor: p.glassBorder, borderRadius: 16, borderWidth: 1, height: 46, justifyContent: "center", width: 46 },
  quickLabel: { color: p.ink, fontSize: 11.5, fontWeight: "600" },
  alertCard: { backgroundColor: p.warningBg, borderColor: p.warningBorder, borderRadius: 18, borderWidth: 1, gap: 4, padding: 14 },
  alertLabel: { color: p.warningText, fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  sectionTitle: { color: p.ink, fontSize: 15, fontWeight: "800", marginBottom: -4, marginTop: 2 },
  itemBody: { gap: 8, padding: 16 },
  itemTop: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  itemName: { color: p.ink, flex: 1, fontSize: 15, fontWeight: "700" },
  itemPrice: { color: p.ink, fontSize: 14, fontWeight: "800" },
  itemMeta: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.2 },
  itemBreakdown: { color: p.muted, fontSize: 12 },
  noteButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: p.glassStrong, borderColor: p.glassBorder, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 7, marginTop: 6, minHeight: 38, paddingHorizontal: 12 },
  noteButtonText: { color: p.accentDeep, fontSize: 13, fontWeight: "700" },
  footer: { backgroundColor: p.bgBottom, borderTopColor: p.divider, borderTopWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 12 },
  secondary: { alignItems: "center", backgroundColor: p.glass, borderColor: p.glassBorder, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50, paddingHorizontal: 18 },
  secondaryText: { color: p.accentDeep, fontSize: 14, fontWeight: "700" },
  primaryWrap: { flex: 1 },
  primaryDisabled: { backgroundColor: p.glass, borderColor: p.glassBorder, borderRadius: 16, borderWidth: 1 },
  primary: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 50 },
  primaryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
}));
