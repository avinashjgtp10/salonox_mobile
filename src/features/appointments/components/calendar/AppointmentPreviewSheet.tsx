import { Text } from "@/components/ui/AppTypography";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { getAppointmentBillLabel } from "@/utils/clientPrivacy";
import { appAlert as Alert } from "@/services/appAlert";
import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { formatBusinessDate, formatBusinessTime, formatItemTime, getAppointmentEndValue, getAppointmentPaymentStatus, getAppointmentSalesSummary, getAppointmentStaffNames, getPartialBillAmounts, getAppointmentWebStatus, getPaymentStatusStyles, maskPhone, toInvoiceSequence } from "@/features/appointments/utils/appointmentScreenHelpers";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentBilledItem, AppointmentListItem } from "@/types/appointment";
import { formatInvoiceNumber } from "@/utils/receipt";
import { isOwnBillingItem } from "@/utils/staffBilling";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

// Same item-type tags as the web's View Appointment cards.
const ITEM_TAGS: Record<AppointmentBilledItem["type"], { bg: string; color: string; label: string }> = {
  membership: { bg: "#F0FDF4", color: "#15803D", label: "MEMBERSHIP" },
  package: { bg: "#FEF3C7", color: "#92400E", label: "PACKAGE" },
  product: { bg: "#DBEAFE", color: "#1D4ED8", label: "PRODUCT" },
  service: { bg: "#EDE9FE", color: "#5B21B6", label: "SERVICE" },
};

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
  const { staffMode, clientName } = useClientPrivacy();
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [stage, setStage] = useState<"actions" | "details">("actions");
  const [detailsTab, setDetailsTab] = useState<"appointment" | "notes">("appointment");
  const currentStaff = useAppSelector(selectCurrentStaff);

  useEffect(() => {
    setStage("actions");
    setDetailsTab("appointment");
  }, [appointment?.id]);

  if (!appointment) return null;
  const paymentStatus = getAppointmentPaymentStatus(appointment);
  const paymentColors = getPaymentStatusStyles(Colors)[paymentStatus];
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
  const billedTotal = Number(appointment.raw.computed_grand_total) || appointment.total || appointment.amount;
  const partialBill = paymentStatus === "Partial" ? getPartialBillAmounts(appointment, billedTotal) : null;
  const grandTotal = partialBill?.total ?? billedTotal;
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

  const openEditor = () => {
    onClose();
    requestAnimationFrame(() => router.push(`/appointments/${appointment.id}/edit` as Href));
  };

  // A bill saved as pending from the Calendar's Quick Sale: reopen that draft
  // straight at its Payment screen.
  // Any unpaid booking can be billed: one without a pending sale yet gets it
  // created from its items when this is tapped (see useAppointmentPendingSale).
  const canContinueToPayment = Boolean(onContinueToPayment) && appointment.status !== "Cancelled";
  const handleContinueToPayment = () => {
    onClose();
    onContinueToPayment?.(appointment);
  };

  const handleViewInvoice = () => {
    if (!appointment.saleId) {
      Alert.alert("Invoice unavailable", "A receipt has not been created for this appointment yet.");
      return;
    }

    onClose();
    requestAnimationFrame(() => router.push({
      pathname: "/quick-sale/checkout",
      params: { openReceipt: "1", saleId: appointment.saleId },
    } as Href));
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.previewBackdrop}>
        {/* Tap-outside-to-close sits BEHIND the cards as a sibling. Wrapping the
            cards in a Pressable (to stop taps propagating) made it keep the touch
            once a press passed the long-press delay, so a press-and-drag never
            reached the ScrollView and the details wouldn't scroll. */}
        <Pressable accessibilityLabel="Close appointment" onPress={onClose} style={StyleSheet.absoluteFill} />
        {stage === "actions" ? (
          <View style={styles.calendarActionsModal}>
            <View style={styles.calendarActionsHeader}>
              <Text style={styles.calendarActionsTitle}>Actions</Text>
              <TouchableOpacity accessibilityLabel="Close actions" onPress={onClose} style={styles.calendarActionsClose}>
                <Ionicons name="close-circle-outline" size={28} color={Colors.appointmentText} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.82} onPress={() => setStage("details")} style={styles.calendarActionPrimary}>
              <Text style={styles.calendarActionText}>View Appointment Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.appointmentDetailsModal}>
            <View style={styles.appointmentModalHeader}>
              <View style={styles.appointmentModalHeading}>
                <Text numberOfLines={1} style={styles.appointmentModalTitle}>Appointment - {formatBusinessDate(appointment.scheduledAt)}</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Close appointment details" onPress={onClose}>
                <Ionicons name="close" size={28} color={Colors.appointmentTextSecondary} />
              </TouchableOpacity>
            </View>
            {/* One scroll area for everything under the title: with only the tab
                body scrolling, the client band + tabs ate half the card and a
                swipe anywhere there did nothing. Tabs (child 1) stay pinned; the
                sticky wrapper takes over its child's style, so the row style sits
                on an inner View to keep the tabs side by side. */}
            <ScrollView
              contentContainerStyle={[styles.appointmentModalScrollContent, !readOnly && styles.appointmentScrollFooterSpace]}
              stickyHeaderIndices={[1]}
              style={styles.appointmentModalScroll}
            >
            <View style={styles.appointmentClientBand}>
              <View style={styles.appointmentClientAvatar}><Ionicons name="person-outline" size={26} color={Colors.primaryText} /></View>
              <View style={styles.appointmentClientCopy}>
                <Text style={styles.appointmentClientName}>{staffMode ? getAppointmentBillLabel(appointment) : appointment.clientName}</Text>
                {staffMode ? <Text style={styles.appointmentClientPhone}>{clientName(appointment.clientName)}</Text> : null}
                <Text style={styles.appointmentClientPhone}>{maskPhone(appointment.phone)}</Text>
                {!staffMode && clientEmail ? <Text numberOfLines={1} style={styles.appointmentClientPhone}>{clientEmail}</Text> : null}
                {!readOnly ? (
                  <View style={[styles.appointmentPaymentBadge, { backgroundColor: paymentColors.bg }]}>
                    <Text style={[styles.appointmentPaymentBadgeText, { color: paymentColors.color }]}>{paymentStatus}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.appointmentStatusPill, { backgroundColor: webStatus.bg }]}>
                <Text numberOfLines={1} style={styles.appointmentStatusPillText}>{webStatus.label}</Text>
              </View>
            </View>
            <View>
            <View style={styles.appointmentTabs}>
              <TouchableOpacity
                accessibilityLabel="Open appointment information"
                accessibilityRole="tab"
                accessibilityState={{ selected: detailsTab === "appointment" }}
                activeOpacity={0.76}
                hitSlop={6}
                onPress={() => setDetailsTab("appointment")}
                style={styles.appointmentTabButton}
              >
                <Text style={detailsTab === "appointment" ? styles.appointmentTabActive : styles.appointmentTab}>Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Open appointment notes"
                accessibilityRole="tab"
                accessibilityState={{ selected: detailsTab === "notes" }}
                activeOpacity={0.76}
                hitSlop={6}
                onPress={() => setDetailsTab("notes")}
                style={styles.appointmentTabButton}
              >
                <Text style={detailsTab === "notes" ? styles.appointmentTabActive : styles.appointmentTab}>Notes</Text>
              </TouchableOpacity>
            </View>
            </View>
            {detailsTab === "appointment" ? (
              <View style={styles.appointmentModalContent}>
                <View style={styles.appointmentInfoCard}>
                  {infoRows.map(([label, value]) => (
                    <View key={label} style={styles.appointmentInfoRow}>
                      <Text style={styles.appointmentInfoLabel}>{label}</Text>
                      <Text style={styles.appointmentInfoValue}>{value}</Text>
                    </View>
                  ))}
                </View>
                {staffAlert ? (
                  <View style={styles.appointmentAlertCard}>
                    <Text style={styles.appointmentAlertLabel}>Staff Alert</Text>
                    <Text style={styles.appointmentNotesText}>{staffAlert}</Text>
                  </View>
                ) : null}
                <Text style={styles.appointmentServiceHeading}>Booking Details ({appointment.billedItems.length})</Text>
                {appointment.billedItems.map((item, index) => {
                  const tag = ITEM_TAGS[item.type];
                  const priced = showItemPrice(item);
                  return (
                    <View key={item.id ?? `${item.type}-${item.name}-${index}`} style={[styles.appointmentServiceCard, styles.appointmentItemCard]}>
                      <View style={styles.appointmentServiceTop}>
                        <Text numberOfLines={2} style={styles.appointmentServiceName}>{item.name}</Text>
                        {priced ? <Text style={styles.appointmentServiceTime}>{formatCurrency((item.totalAmount ?? item.price) + item.tax)}</Text> : null}
                      </View>
                      <View style={styles.appointmentItemSub}>
                        <View style={[styles.appointmentItemTag, { backgroundColor: tag.bg }]}>
                          <Text style={[styles.appointmentItemTagText, { color: tag.color }]}>{tag.label}</Text>
                        </View>
                        <Text style={styles.appointmentWith}>
                          {[item.staffName ?? (item.type === "service" ? appointment.staffName : null), formatItemTime(item.time)].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                      {priced ? (
                        <Text style={styles.appointmentItemPills}>
                          {`Qty: ${item.quantity} · Price: ${formatCurrency(item.price)} · Disc: ${formatCurrency(item.discount)} · Tax: ${formatCurrency(item.tax)}`}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
                {!staffMode ? (
                  <View style={[styles.appointmentInfoCard, styles.appointmentSalesCard]}>
                    <Text style={styles.appointmentSalesTitle}>Sales Summary</Text>
                    <SummaryRow label="Subtotal" styles={styles} value={formatCurrency(salesSummary.subtotal)} />
                    {salesSummary.discount > 0 ? <SummaryRow label="Discount" styles={styles} value={`-${formatCurrency(salesSummary.discount)}`} /> : null}
                    {salesSummary.couponDiscount > 0 ? (
                      <SummaryRow
                        label={salesSummary.couponCode ? `Coupon (${salesSummary.couponCode})` : "Coupon"}
                        styles={styles}
                        value={`-${formatCurrency(salesSummary.couponDiscount)}`}
                      />
                    ) : null}
                    {salesSummary.totalTax > 0 ? (
                      <>
                        <SummaryRow label={salesSummary.taxLabel} styles={styles} value={`+${formatCurrency(salesSummary.totalTax)}`} />
                        <SummaryRow label="Total Tax" styles={styles} value={formatCurrency(salesSummary.totalTax)} />
                      </>
                    ) : null}
                    <SummaryRow label="Extra Charges" styles={styles} value={`+${formatCurrency(salesSummary.exCharges)}`} />
                    <View style={styles.appointmentSalesDivider} />
                    <View style={styles.appointmentSummaryRow}>
                      <Text style={styles.appointmentSummaryTotal}>Grand Total</Text>
                      <Text style={styles.appointmentSummaryTotal}>{formatCurrency(grandTotal)}</Text>
                    </View>
                    <View style={styles.appointmentSummaryRow}>
                      <Text style={styles.appointmentSummaryPaid}>Paid</Text>
                      <Text style={styles.appointmentSummaryPaid}>{formatCurrency(appointment.paidAmount)}</Text>
                    </View>
                    {salesSummary.paymentMethods.length ? (
                      <>
                        <Text style={styles.appointmentSalesSection}>Payment Method</Text>
                        {salesSummary.paymentMethods.map((entry) => (
                          <View key={entry.method} style={[styles.appointmentSummaryRow, styles.appointmentSalesSubRow]}>
                            <Text style={styles.appointmentSalesMuted}>{entry.method}</Text>
                            <Text style={styles.appointmentSalesMuted}>{formatCurrency(entry.amount)}</Text>
                          </View>
                        ))}
                      </>
                    ) : null}
                    {partialBill ? (
                      <View style={styles.appointmentSummaryRow}>
                        <Text style={styles.appointmentSummaryDue}>Balance Due</Text>
                        <Text style={styles.appointmentSummaryDue}>{formatCurrency(partialBill.due)}</Text>
                      </View>
                    ) : null}
                    {salesSummary.tipAmount > 0 ? (
                      <SummaryRow label="Staff Tip (included above)" styles={styles} value={formatCurrency(salesSummary.tipAmount)} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.appointmentModalContent}>
                <Text style={styles.appointmentNotesHeading}>Client Notes</Text>
                <Text style={[styles.appointmentNotesText, !appointment.notes.trim() && styles.appointmentNotesEmpty]}>
                  {appointment.notes.trim() || "No client notes added."}
                </Text>
                {!readOnly && <TouchableOpacity activeOpacity={0.84} onPress={openEditor} style={styles.appointmentNotesButton}>
                  <Ionicons name="create-outline" size={18} color={Colors.onPrimary} />
                  <Text style={styles.appointmentNotesButtonText}>{appointment.notes.trim() ? "Edit Client Note" : "Add Client Note"}</Text>
                </TouchableOpacity>}
              </View>
            )}
            </ScrollView>
            {/* Buttons float over the scroll content — no strip behind them. */}
            {!readOnly && <View pointerEvents="box-none" style={styles.appointmentFloatingFooter}>{hasBill ? (
              <View style={styles.appointmentBillActions}>
                <TouchableOpacity accessibilityRole="button" activeOpacity={0.88} onPress={openEditor} style={[styles.appointmentInvoiceButton, styles.appointmentBillButton, styles.appointmentEditButton]}>
                  <Ionicons name="create-outline" size={20} color={Colors.appointmentText} />
                  <Text style={[styles.appointmentInvoiceText, styles.appointmentEditText]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" activeOpacity={0.88} onPress={handleViewInvoice} style={[styles.appointmentInvoiceButton, styles.appointmentBillButton]}>
                  <Ionicons name="print-outline" size={20} color={Colors.onPrimary} />
                  <Text style={styles.appointmentInvoiceText}>Print Bill</Text>
                </TouchableOpacity>
              </View>
            ) : canContinueToPayment ? (
              <TouchableOpacity accessibilityRole="button" activeOpacity={0.88} onPress={handleContinueToPayment} style={styles.appointmentInvoiceButton}>
                <Ionicons name="card-outline" size={20} color={Colors.onPrimary} />
                <Text style={styles.appointmentInvoiceText}>Continue to Payment</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.88} disabled style={[styles.appointmentInvoiceButton, styles.appointmentInvoiceDisabled]}>
                <Ionicons name="receipt-outline" size={20} color={Colors.onPrimary} />
                <Text style={styles.appointmentInvoiceText}>Invoice available after payment</Text>
              </TouchableOpacity>
            )}</View>}
          </View>
        )}
      </View>
    </Modal>
  );
}

function SummaryRow({ label, styles, value }: { label: string; styles: ReturnType<typeof createStyles>; value: string }) {
  return (
    <View style={styles.appointmentSummaryRow}>
      <Text style={styles.appointmentSalesMuted}>{label}</Text>
      <Text style={styles.appointmentSalesMuted}>{value}</Text>
    </View>
  );
}
