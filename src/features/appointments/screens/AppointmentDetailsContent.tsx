import { maskPhone } from "@/utils/maskPhone";
import { maskClientName } from "@/utils/clientPrivacy";
import { Text } from "@/components/ui/AppTypography";
import { ActionButton } from "@/features/appointments/components/shared/ActionButton";
import { BilledItemRow } from "@/features/appointments/components/shared/BilledItemRow";
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
import { getStaffAppointmentBilling } from "@/utils/staffBilling";
import { fetchAppointmentByIdThunk } from "@/middleware/appointment/appointment.thunk";
import { fetchSaleByIdThunk, fetchSalesInitThunk } from "@/middleware/sales/sales.thunk";
import { selectAppointmentById, selectAppointmentDetailsState } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectSaleDetail, selectSalesInitData } from "@/store/sales/sales.slice";
import { selectCurrentStaff, selectCurrentStaffError, selectCurrentStaffLoading } from "@/store/staff/staff.slice";
import { formatInvoiceNumber } from "@/utils/receipt";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { View } from "react-native";

export function AppointmentDetailsScreen({ mode = "owner" }: { mode?: "owner" | "staff" } = {}) {
  const { styles } = useAppointmentStyles();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ id?: string }>();
  const appointmentId = params.id;
  const appointment = useAppSelector((state) => selectAppointmentById(state, appointmentId));
  const detailsState = useAppSelector((state) => selectAppointmentDetailsState(state, appointmentId));
  const saleDetail = useAppSelector(selectSaleDetail);
  const salesInitData = useAppSelector(selectSalesInitData);
  const currentStaff = useAppSelector(selectCurrentStaff);
  const currentStaffError = useAppSelector(selectCurrentStaffError);
  const currentStaffLoading = useAppSelector(selectCurrentStaffLoading);
  const isStaffMode = mode === "staff";
  const isStaffAppointment =
    !isStaffMode || !appointment || (currentStaff ? isAssignedToStaff(appointment, currentStaff) : false);

  useEffect(() => {
    if (appointmentId && (!isStaffMode || currentStaff?.id)) {
      void dispatch(fetchAppointmentByIdThunk(appointmentId));
    }
  }, [appointmentId, currentStaff?.id, dispatch, isStaffMode]);

  useEffect(() => {
    // Staff handoff workflow's "pick who to hand this off to" picker reuses
    // Quick Sale's staff roster (already staff-accessible, unlike the full
    // admin Staff list) — fetched once per visit to this screen in staff mode.
    if (isStaffMode) void dispatch(fetchSalesInitThunk());
  }, [dispatch, isStaffMode]);

  const staffRoster = useMemo(() => salesInitData?.staff ?? [], [salesInitData?.staff]);
  const canHandoff = useMemo(
    () => !!currentStaff && (appointment?.billedItems ?? []).some(
      (item) => item.staffId === currentStaff.id && item.status === "completed",
    ),
    [appointment?.billedItems, currentStaff],
  );

  const appointmentInvoiceNumber = formatInvoiceNumber(
    toInvoiceSequence(
      appointment?.raw.invoice_number ??
      appointment?.raw.invoiceNumber ??
      appointment?.raw.invoice_no ??
      appointment?.raw.invoiceNo,
    ),
  );

  useEffect(() => {
    // Product/membership/package line items bought alongside (or instead of)
    // a service live on the linked Sale, not on the appointment record — the
    // appointment's own total/service fields stay at 0 for a product-only
    // quick sale, so the sale has to be fetched whenever one is linked, not
    // only when the invoice number happens to be missing.
    if (!isStaffMode && appointment?.saleId) {
      void dispatch(fetchSaleByIdThunk(appointment.saleId));
    }
  }, [appointment?.saleId, dispatch, isStaffMode]);

  const saleForAppointment = !isStaffMode && saleDetail && saleDetail.id === appointment?.saleId ? saleDetail : null;

  const invoiceNumber =
    appointmentInvoiceNumber ??
    (saleForAppointment ? formatInvoiceNumber(saleForAppointment.receiptNumber) : null);

  const displayName = appointment?.clientName?.trim() ? appointment.clientName.trim() : "Walk-in Client";
  const staffBilling = isStaffMode && appointment ? getStaffAppointmentBilling(appointment, currentStaff) : null;
  const billedTotal = staffBilling ? staffBilling.total : appointment && appointment.total > 0 ? appointment.total : saleForAppointment?.total ?? appointment?.total ?? 0;
  const appointmentIsPaid = staffBilling ? staffBilling.paid : Boolean(appointment && (appointment.paymentStatus.toLowerCase() === "paid" || (billedTotal > 0 && appointment.paidAmount >= billedTotal)));
  const displayedPaidAmount = staffBilling ? staffBilling.amountPaid : appointment?.paidAmount ?? 0;
  const visibleBilledItems = staffBilling ? staffBilling.items : appointment?.billedItems ?? [];

  return (
    <ScreenShell
      onRefresh={() => {
        if (appointmentId) {
          void dispatch(fetchAppointmentByIdThunk(appointmentId));
        }
      }}
      refreshing={detailsState?.loading}
      showCreateAction={!isStaffMode}
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
            <DetailRow label="Client Name" value={isStaffMode ? maskClientName(displayName) : displayName} />
            <DetailRow label="Phone" value={maskPhone(appointment.phone)} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Appointment Details</Text>
            <DetailRow label="Date" value={formatBusinessDate(appointment.scheduledAt)} />
            <DetailRow label="Time" value={[formatBusinessTime(appointment.startTime || appointment.scheduledAt), formatBusinessTime(appointment.endTime)].filter((value) => value && value !== "-").join(" - ")} />
            <DetailRow label="Duration" value={appointment.durationLabel || (appointment.durationMinutes ? `${appointment.durationMinutes} mins` : null)} />
            <DetailRow label="Staff" value={isStaffMode ? currentStaff?.name : appointment.staffName} />
            <DetailRow label="Status" value={appointment.status} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Payment & Billing</Text>
            <DetailRow
              label="Payment Status"
              value={appointmentIsPaid ? "Paid successfully" : appointment.paymentStatus}
            />
            <DetailRow label="Payment Method" value={appointment.paymentMethod} />
            <DetailRow label={isStaffMode ? "Your Items Total" : "Total Amount"} value={formatCurrency(isStaffMode ? billedTotal : billedTotal || appointment.amount)} />
            <DetailRow label="Amount Paid" value={displayedPaidAmount === null ? "Not allocated by staff" : isStaffMode || displayedPaidAmount > 0 ? formatCurrency(displayedPaidAmount) : null} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>{isStaffMode ? "Your Services & Products" : "Services & Products"}</Text>
            {visibleBilledItems.length > 0 ? (
              visibleBilledItems.map((item, index) => (
                <BilledItemRow
                  appointmentId={appointment.id}
                  canHandoff={canHandoff}
                  currentStaffId={currentStaff?.id}
                  isStaffMode={isStaffMode}
                  item={item}
                  key={item.id ?? `${item.type}-${item.name}-${index}`}
                  staffRoster={staffRoster}
                />
              ))
            ) : saleForAppointment && saleForAppointment.lineItems.length > 0 ? (
              saleForAppointment.lineItems.map((item) => (
                <DetailRow
                  key={item.id}
                  label={`${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`}
                  value={formatCurrency(item.totalPrice)}
                />
              ))
            ) : isStaffMode ? (
              <Text style={styles.notesText}>No items assigned to you.</Text>
            ) : (
              <DetailRow label={appointment.serviceName || "Service"} value={formatCurrency(billedTotal || appointment.amount)} />
            )}
            <DetailRow label="Duration" value={appointment.durationLabel || (appointment.durationMinutes ? `${appointment.durationMinutes} mins` : null)} />
          </View>

          {!isStaffMode && appointment.notes && appointment.notes.trim() ? (
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{appointment.notes}</Text>
            </View>
          ) : null}

          <View style={styles.actionGrid}>
            {!isStaffMode && appointment.status === "Confirmed" ? <StartAppointmentAction appointment={appointment} /> : null}
            {!isStaffMode && appointment.status === "In Progress" ? <CompleteAppointmentAction appointment={appointment} /> : null}
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
