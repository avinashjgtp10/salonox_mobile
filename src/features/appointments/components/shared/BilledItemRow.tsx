import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ui/AppTypography";
import { StaffPickerSheet } from "@/features/quickSale/components/StaffPickerSheet";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { appAlert } from "@/services/appAlert";
import { getApiErrorMessage } from "@/services/api";
import { handoffItemThunk, updateItemStatusThunk } from "@/middleware/appointment/appointment.thunk";
import { useAppDispatch } from "@/store/hooks";
import type { AppointmentBilledItem } from "@/types/appointment";
import type { PosStaffMember } from "@/types/sales";

const STATUS_META: Record<"pending" | "in_progress" | "completed", { color: string; label: string }> = {
  pending: { color: "#8A8F98", label: "Pending" },
  in_progress: { color: "#D97706", label: "In Progress" },
  completed: { color: "#238A32", label: "Completed" },
};

// Staff handoff workflow only applies to services/packages/memberships (per
// AppointmentBilledItem.status) — plain products stay read-only rows.
const HANDOFF_ELIGIBLE_TYPES = new Set<AppointmentBilledItem["type"]>(["service", "package", "membership"]);

export function BilledItemRow({
  appointmentId,
  canHandoff,
  currentStaffId,
  isStaffMode,
  item,
  staffRoster,
}: {
  appointmentId: string;
  // True once the current staff member has at least one COMPLETED row of
  // their own in this appointment — the backend enforces the same rule, so
  // this is purely to avoid showing a button that would just 403.
  canHandoff: boolean;
  currentStaffId?: string | null;
  isStaffMode: boolean;
  item: AppointmentBilledItem;
  staffRoster: PosStaffMember[];
}) {
  const dispatch = useAppDispatch();
  const { Colors, styles } = useAppointmentStyles();
  const localStyles = useMemo(() => createLocalStyles(), []);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const eligible = isStaffMode && HANDOFF_ELIGIBLE_TYPES.has(item.type) && !!item.id;
  const status = item.status ?? "pending";
  const isOwnRow = eligible && !!currentStaffId && item.staffId === currentStaffId;
  const canOffer = eligible && !isOwnRow && status === "pending" && canHandoff;

  const runStatusChange = async (nextStatus: "in_progress" | "completed") => {
    if (!item.id || busy) return;
    setBusy(true);
    try {
      await dispatch(updateItemStatusThunk({ appointmentId, itemId: item.id, status: nextStatus })).unwrap();
    } catch (err) {
      appAlert.alert("Couldn't update status", getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handoff = async (toStaffId: string) => {
    if (!item.id) return;
    setBusy(true);
    try {
      await dispatch(handoffItemThunk({ appointmentId, itemId: item.id, toStaffId })).unwrap();
      setPickerOpen(false);
    } catch (err) {
      appAlert.alert("Couldn't hand off", getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{`${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`}</Text>
        <Text style={styles.detailValue}>{formatCurrency(isStaffMode ? item.totalAmount ?? item.price : item.price)}</Text>
      </View>
      {eligible ? (
        <View style={localStyles.controlsRow}>
          <View style={[localStyles.statusBadge, { backgroundColor: `${STATUS_META[status].color}20` }]}>
            <Text style={[localStyles.statusText, { color: STATUS_META[status].color }]}>{STATUS_META[status].label}</Text>
          </View>
          {item.staffName ? <Text style={localStyles.staffName} numberOfLines={1}>{item.staffName}</Text> : null}
          <View style={localStyles.buttonRow}>
            {isOwnRow && status === "pending" ? (
              <TouchableOpacity disabled={busy} onPress={() => void runStatusChange("in_progress")} style={localStyles.smallButton}>
                {busy ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={[localStyles.smallButtonText, { color: Colors.primary }]}>Start</Text>}
              </TouchableOpacity>
            ) : null}
            {isOwnRow && status === "in_progress" ? (
              <TouchableOpacity disabled={busy} onPress={() => void runStatusChange("completed")} style={localStyles.smallButton}>
                {busy ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={[localStyles.smallButtonText, { color: Colors.primary }]}>Mark Complete</Text>}
              </TouchableOpacity>
            ) : null}
            {canOffer ? (
              <TouchableOpacity disabled={busy} onPress={() => setPickerOpen(true)} style={localStyles.smallButton}>
                {busy ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={[localStyles.smallButtonText, { color: Colors.primary }]}>Hand Off</Text>}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
      {canOffer ? (
        <StaffPickerSheet
          onClose={() => setPickerOpen(false)}
          onSelect={(staffId) => void handoff(staffId)}
          selectedStaffId={item.staffId}
          staff={staffRoster}
          subtitle={`Who should continue "${item.name}"?`}
          title="Hand Off Service"
          visible={pickerOpen}
        />
      ) : null}
    </View>
  );
}

const createLocalStyles = () =>
  StyleSheet.create({
    controlsRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingBottom: 10,
      paddingTop: 2,
    },
    statusBadge: {
      borderRadius: 4,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
    },
    staffName: {
      color: "#8A8F98",
      flex: 1,
      fontSize: 11,
      fontWeight: "700",
    },
    buttonRow: {
      flexDirection: "row",
      gap: 8,
    },
    smallButton: {
      alignItems: "center",
      borderColor: "#D1D5DB",
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 32,
      paddingHorizontal: 10,
    },
    smallButtonText: {
      fontSize: 12,
      fontWeight: "800",
    },
  });
