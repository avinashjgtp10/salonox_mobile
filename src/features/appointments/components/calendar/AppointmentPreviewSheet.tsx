import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { formatBusinessDate, formatBusinessTime, maskPhone } from "@/features/appointments/utils/appointmentScreenHelpers";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { AppointmentListItem } from "@/types/appointment";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

export function AppointmentPreviewSheet({
  appointment,
  onClose,
}: {
  appointment: AppointmentListItem | null;
  onClose: () => void;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [stage, setStage] = useState<"actions" | "details">("actions");
  const [detailsTab, setDetailsTab] = useState<"appointment" | "notes">("appointment");

  useEffect(() => {
    setStage("actions");
    setDetailsTab("appointment");
  }, [appointment?.id]);

  if (!appointment) return null;
  const isPaid = appointment.paymentStatus.toLowerCase() === "paid" || (appointment.total > 0 && appointment.paidAmount >= appointment.total);
  const start = formatBusinessTime(appointment.startTime || appointment.scheduledAt);
  const end = formatBusinessTime(appointment.endTime);

  const openNoteEditor = () => {
    onClose();
    requestAnimationFrame(() => router.push(`/appointments/${appointment.id}/edit` as Href));
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
      <Pressable onPress={onClose} style={styles.previewBackdrop}>
        {stage === "actions" ? (
          <Pressable style={styles.calendarActionsModal}>
            <View style={styles.calendarActionsHeader}>
              <Text style={styles.calendarActionsTitle}>Actions</Text>
              <TouchableOpacity accessibilityLabel="Close actions" onPress={onClose} style={styles.calendarActionsClose}>
                <Ionicons name="close-circle-outline" size={28} color={Colors.appointmentText} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.82} onPress={() => setStage("details")} style={styles.calendarActionPrimary}>
              <Text style={styles.calendarActionText}>View Appointment Details</Text>
            </TouchableOpacity>
          </Pressable>
        ) : (
          <Pressable style={styles.appointmentDetailsModal}>
            <View style={styles.appointmentModalHeader}>
              <View style={styles.appointmentModalHeading}>
                <Text numberOfLines={1} style={styles.appointmentModalTitle}>Appointment - {formatBusinessDate(appointment.scheduledAt)}</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Close appointment details" onPress={onClose}>
                <Ionicons name="close" size={28} color={Colors.appointmentTextSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.appointmentClientBand}>
              <View style={styles.appointmentClientAvatar}><Ionicons name="person-outline" size={26} color={Colors.appointmentAccent} /></View>
              <View style={styles.appointmentClientCopy}>
                <Text style={styles.appointmentClientName}>{appointment.clientName}</Text>
                <Text style={styles.appointmentClientPhone}>{maskPhone(appointment.phone)}</Text>
              </View>
              {appointment.status !== "Completed" ? <View style={styles.appointmentStatusControl}><View style={[styles.appointmentStatusDot, { backgroundColor: isPaid ? "#22C55E" : "#F59E0B" }]} /><Text numberOfLines={1} style={styles.appointmentStatusLabel}>{appointment.status}</Text></View> : null}
            </View>
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
            {detailsTab === "appointment" ? (
              <ScrollView contentContainerStyle={styles.appointmentModalContent}>
                <Text style={styles.appointmentServiceHeading}>Service (1)</Text>
                <View style={styles.appointmentServiceCard}>
                  <View style={styles.appointmentServiceTop}><Text numberOfLines={2} style={styles.appointmentServiceName}>{appointment.serviceName}</Text><Text style={styles.appointmentServiceTime}>at {start}-{end}</Text></View>
                  <View style={styles.appointmentServiceMeta}><Text style={styles.appointmentBookedBy}>Booked by - {appointment.staffName || "-"}</Text><Text style={styles.appointmentWith}>With {appointment.staffName || "-"}</Text></View>
                  <View style={styles.appointmentServiceStatus}><View style={[styles.appointmentStatusDot, { backgroundColor: isPaid ? "#22C55E" : "#F59E0B" }]} /><Text style={styles.appointmentServiceStatusText}>{appointment.status}</Text></View>
                </View>
              </ScrollView>
            ) : (
              <ScrollView contentContainerStyle={styles.appointmentModalContent}>
                <Text style={styles.appointmentNotesHeading}>Client Notes</Text>
                <Text style={[styles.appointmentNotesText, !appointment.notes.trim() && styles.appointmentNotesEmpty]}>
                  {appointment.notes.trim() || "No client notes added."}
                </Text>
                <TouchableOpacity activeOpacity={0.84} onPress={openNoteEditor} style={styles.appointmentNotesButton}>
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.appointmentNotesButtonText}>{appointment.notes.trim() ? "Edit Client Note" : "Add Client Note"}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
            <TouchableOpacity activeOpacity={0.88} disabled={!isPaid} onPress={handleViewInvoice} style={[styles.appointmentInvoiceButton, !isPaid && styles.appointmentInvoiceDisabled]}>
              <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
              <Text style={styles.appointmentInvoiceText}>{isPaid ? "View Invoice" : "Invoice available after payment"}</Text>
            </TouchableOpacity>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}
