import { ActionButton } from "@/features/appointments/components/shared/ActionButton";
import { CompleteAppointmentAction } from "@/features/appointments/components/shared/CompleteAppointmentAction";
import { DetailRow } from "@/features/appointments/components/shared/DetailRow";
import { ScreenShell } from "@/features/appointments/components/shared/ScreenShell";
import { SkeletonList } from "@/features/appointments/components/shared/SkeletonList";
import { StartAppointmentAction } from "@/features/appointments/components/shared/StartAppointmentAction";
import { StateCard } from "@/features/appointments/components/shared/StateCard";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { formatBusinessDate, formatBusinessTime, toInvoiceSequence } from "@/features/appointments/utils/appointmentScreenHelpers";
import { isAssignedToStaff } from "@/features/appointments/utils/staffAssignment";
import { fetchAppointmentByIdThunk } from "@/middleware/appointment/appointment.thunk";
import { fetchSaleByIdThunk } from "@/middleware/sales/sales.thunk";
import { selectAppointmentById, selectAppointmentDetailsState } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSaleDetail } from "@/store/sales/sales.slice";
import { selectCurrentStaff, selectCurrentStaffError, selectCurrentStaffLoading } from "@/store/staff/staff.slice";
import { formatInvoiceNumber } from "@/utils/receipt";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";

export function AppointmentDetailsScreen({ mode = "owner" }: { mode?: "owner" | "staff" } = {}) {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const appointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const detailsState = useAppSelector((state) => selectAppointmentDetailsState(state, appointmentId));
  const saleDetail = useAppSelector(selectSaleDetail);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const isStaffMode = mode === "staff";
  const isStaffAppointment =
    !isStaffMode || !appointment || (currentStaff ? isAssignedToStaff(appointment, currentStaff) : false);

  useEffect(() => {
    if (appointmentId) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointmentId, dispatch]);

  const appointmentInvoiceNumber = formatInvoiceNumber(
    toInvoiceSequence(
      appointment?.raw.invoice_number ??
      appointment?.raw.invoiceNumber ??
      appointment?.raw.invoice_no ??
      appointment?.raw.invoiceNo,
    ),
  );

  useEffect(() => {
    if (appointment?.saleId && !appointmentInvoiceNumber) {
      void dispatch(fetchSaleByIdThunk(appointment.saleId));
    }
  }, [appointment?.saleId, appointmentInvoiceNumber, dispatch]);

  const invoiceNumber =
    appointmentInvoiceNumber ??
    (saleDetail && saleDetail.id === appointment?.saleId
      ? formatInvoiceNumber(saleDetail.receiptNumber)
      : null);

  const displayName = appointment?.clientName?.trim() ? appointment.clientName.trim() : "Walk-in Client";
  const appointmentIsPaid = Boolean(appointment && (appointment.paymentStatus.toLowerCase() === "paid" || (appointment.total > 0 && appointment.paidAmount >= appointment.total)));

  return (
    <ScreenShell
      onRefresh={() => {
        if (appointmentId) {
          void dispatch(fetchAppointmentByIdThunk(appointmentId));
        }
      }}
      refreshing={detailsState?.loading}
      title={isStaffMode ? "My Appointment" : "Appointment Details"}
    >
      {(detailsState?.loading || (isStaffMode && currentStaffLoading)) && !appointment ? <SkeletonList /> : null}
      {isStaffMode && currentStaffError && !appointment ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={currentStaffError}
          onAction={() => appointmentId && void dispatch(fetchAppointmentByIdThunk(appointmentId))}
          title="Unable to resolve staff profile"
          tone="error"
        />
      ) : null}
      {detailsState?.error && !appointment ? (
        <StateCard
          actionLabel="Retry"
          icon="cloud-offline-outline"
          message={detailsState.error}
          onAction={() => appointmentId && void dispatch(fetchAppointmentByIdThunk(appointmentId))}
          title="Unable to load appointment"
          tone="error"
        />
      ) : null}
      {!detailsState?.loading && !appointment ? (
        <StateCard
          icon="calendar-clear-outline"
          message="This appointment could not be found in the API response."
          title="Appointment not found"
        />
      ) : null}
      {appointment && !isStaffAppointment ? (
        <StateCard
          icon="lock-closed-outline"
          message="This appointment is not assigned to your staff profile."
          title="Appointment unavailable"
          tone="error"
        />
      ) : null}
      {appointment && isStaffAppointment ? (
        <>
          <View style={styles.detailInvoiceRow}>
            <View>
              <Text style={styles.detailInvoiceLabel}>Invoice Number</Text>
              <Text style={styles.detailInvoiceNumber}>{invoiceNumber ?? "Not generated"}</Text>
            </View>
            <View style={[styles.previewStatusBadge, appointmentIsPaid ? styles.previewPaidBadge : styles.previewUnpaidBadge]}>
              <Text style={[styles.previewStatusText, !appointmentIsPaid && styles.previewUnpaidText]}>{appointmentIsPaid ? "PAID" : appointment.paymentStatus}</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Client Details</Text>
            <DetailRow label="Client Name" value={displayName} />
            <DetailRow label="Phone" value={appointment.phone} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Appointment Details</Text>
            <DetailRow label="Date" value={formatBusinessDate(appointment.scheduledAt)} />
            <DetailRow label="Time" value={[formatBusinessTime(appointment.startTime || appointment.scheduledAt), formatBusinessTime(appointment.endTime)].filter((value) => value && value !== "-").join(" - ")} />
            <DetailRow label="Duration" value={appointment.durationLabel || (appointment.durationMinutes ? `${appointment.durationMinutes} mins` : null)} />
            <DetailRow label="Staff" value={appointment.staffName} />
            <DetailRow label="Status" value={appointment.status} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Payment & Billing</Text>
            <DetailRow
              label="Payment Status"
              value={appointment.paymentStatus.toLowerCase() === "paid" || (appointment.total > 0 && appointment.paidAmount >= appointment.total) ? "Paid successfully" : appointment.paymentStatus}
            />
            <DetailRow label="Payment Method" value={appointment.paymentMethod} />
            <DetailRow label="Total Amount" value={formatCurrency(appointment.total || appointment.amount)} />
            <DetailRow label="Amount Paid" value={appointment.paidAmount > 0 ? formatCurrency(appointment.paidAmount) : null} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Services</Text>
            <DetailRow label={appointment.serviceName || "Service"} value={formatCurrency(appointment.total || appointment.amount)} />
            <DetailRow label="Duration" value={appointment.durationLabel || (appointment.durationMinutes ? `${appointment.durationMinutes} mins` : null)} />
          </View>

          {appointment.notes && appointment.notes.trim() ? (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          ) : null}

          <View style={styles.actionGrid}>
            {appointment.status === "Confirmed" ? <StartAppointmentAction appointment={appointment} /> : null}
            {appointment.status === "In Progress" ? <CompleteAppointmentAction appointment={appointment} /> : null}
            {!isStaffMode ? (
              <>
                <ActionButton icon="calendar-outline" label="Reschedule" route={`/appointments/${appointment.id}/reschedule`} />
                <ActionButton icon="close-circle-outline" label="Cancel" route={`/appointments/${appointment.id}/cancel`} danger />
              </>
            ) : null}
          </View>
        </>
      ) : null}
    </ScreenShell>
  );
}
