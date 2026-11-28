import { pearl } from "@/components/auth/pearl/themedPearl";
import { useRegionalPreferences } from "@/localization/preferences";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";

import { Text } from "@/components/ui/AppTypography";
import { StaffPickerSheet } from "@/features/quickSale/components/StaffPickerSheet";
import { useAppointmentStyles } from "@/features/appointments/styles/useAppointmentStyles";
import { formatCurrency } from "@/features/appointments/utils/appointmentForm";
import { formatBusinessTime, formatItemTime } from "@/features/appointments/utils/appointmentScreenHelpers";
import { appAlert } from "@/services/appAlert";
import { getApiErrorMessage } from "@/services/api";
import { handoffItemThunk, updateItemStatusThunk } from "@/middleware/appointment/appointment.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import type { AppointmentBilledItem } from "@/types/appointment";
import type { PosStaffMember } from "@/types/sales";
import { themedStyles } from "@/components/auth/pearl/themedStyles";

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
  blocker = null,
  canHandoff,
  currentStaffId,
  hidePrice = false,
  isStaffMode,
  item,
  last = false,
  staffRoster,
}: {
  appointmentId: string;
  // Job card: the earlier, unfinished row (someone else's) this row waits on.
  blocker?: AppointmentBilledItem | null;
  // Job card rows show other staff members' services, so no prices there.
  hidePrice?: boolean;
  // True once the current staff member has at least one COMPLETED row of
  // their own in this appointment — the backend enforces the same rule, so
  // this is purely to avoid showing a button that would just 403.
  canHandoff: boolean;
  currentStaffId?: string | null;
  isStaffMode: boolean;
  item: AppointmentBilledItem;
  // The final visible row in its card: drop the divider so it does not draw a
  // stray line just above the card's own rounded bottom edge.
  last?: boolean;
  staffRoster: PosStaffMember[];
}) {
  "use no memo";
  useRegionalPreferences();
  const dispatch = useAppDispatch();
  const currentStaff = useAppSelector(selectCurrentStaff);
  const { Colors, styles } = useAppointmentStyles();
  const localStyles = useMemo(() => createLocalStyles(), []);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const eligible = isStaffMode && HANDOFF_ELIGIBLE_TYPES.has(item.type) && !!item.id;
  const status = item.status ?? "pending";
  const isOwnRow = eligible && !!currentStaffId && item.staffId === currentStaffId;
  // Services run in parallel: a staff member may start their own row at any
  // time, and reassign any row (to self or another staff) while it is pending.
  const canReassign = eligible && status === "pending";
  void blocker; void canHandoff;
  const timing = [
    item.startedAt ? `Started ${formatBusinessTime(item.startedAt)}` : null,
    item.completedAt ? `Finished ${formatBusinessTime(item.completedAt)}` : null,
  ].filter(Boolean).join(" · ");
  // Owner bill view: who performs the row and when, as on the web's booking cards.
  const assignment = !isStaffMode ? [item.staffName, formatItemTime(item.time)].filter(Boolean).join(" · ") : "";

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
      // Picking self on an already-own row just starts the service in place —
      // no reassignment is needed and the handoff endpoint's extra guards
      // would reject it, so take the direct in-progress path instead.
      if (toStaffId === currentStaffId && item.staffId === currentStaffId) {
        await dispatch(updateItemStatusThunk({ appointmentId, itemId: item.id, status: "in_progress" })).unwrap();
      } else {
        await dispatch(handoffItemThunk({ appointmentId, itemId: item.id, toStaffId })).unwrap();
      }
      setPickerOpen(false);
    } catch (err) {
      appAlert.alert("Couldn't assign service", getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={[styles.detailRow, last && styles.detailRowLast]}>
        <Text style={styles.detailLabel}>{`${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`}</Text>
        {!hidePrice ? <Text style={styles.detailValue}>{formatCurrency(isStaffMode ? item.totalAmount ?? item.price : item.price)}</Text> : null}
      </View>
      {assignment ? <Text style={localStyles.timing}>{assignment}</Text> : null}
      {eligible ? (
        <View style={localStyles.controlsRow}>
          <View style={[localStyles.statusBadge, { backgroundColor: `${STATUS_META[status].color}20` }]}>
            <Text translate style={[localStyles.statusText, { color: STATUS_META[status].color }]}>{STATUS_META[status].label}</Text>
          </View>
          {item.staffName ? <Text style={localStyles.staffName} numberOfLines={1}>{item.staffName}</Text> : null}
          <View style={localStyles.buttonRow}>
            {isOwnRow && status === "pending" ? (
              <TouchableOpacity disabled={busy} onPress={() => void runStatusChange("in_progress")} style={localStyles.smallButton}>
                {busy ? <ActivityIndicator color={pearl.accentDeep} size="small" /> : <Text translate style={[localStyles.smallButtonText, { color: Colors.primaryText }]}>Start Service</Text>}
              </TouchableOpacity>
            ) : null}
            {isOwnRow && status === "in_progress" ? (
              <TouchableOpacity disabled={busy} onPress={() => void runStatusChange("completed")} style={localStyles.smallButton}>
                {busy ? <ActivityIndicator color={pearl.accentDeep} size="small" /> : <Text translate style={[localStyles.smallButtonText, { color: Colors.primaryText }]}>Finish</Text>}
              </TouchableOpacity>
            ) : null}
            {canReassign ? (
              <TouchableOpacity disabled={busy} onPress={() => setPickerOpen(true)} style={localStyles.smallButton}>
                {busy ? <ActivityIndicator color={pearl.accentDeep} size="small" /> : <Text translate style={[localStyles.smallButtonText, { color: Colors.primaryText }]}>{isOwnRow ? "Reassign" : "Assign"}</Text>}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
      {eligible && timing ? (
        <Text style={localStyles.timing}>{timing}</Text>
      ) : null}
      {canReassign ? (
        <StaffPickerSheet
          onClose={() => setPickerOpen(false)}
          onSelect={(staffId) => void handoff(staffId)}
          selectedStaffId={item.staffId}
          staff={staffRoster.length ? staffRoster : (currentStaff ? [{ id: currentStaff.id, name: currentStaff.name, initials: currentStaff.name.slice(0, 2).toUpperCase(), role: null, status: "Active", avatarBg: pearl.accentWash, avatarColor: pearl.accentDeep }] : [])}
          subtitle={`Who should perform "${item.name}"?`}
          title="Assign Service"
          visible={pickerOpen}
        />
      ) : null}
    </View>
  );
}

const createLocalStyles = () =>
  themedStyles((p) => ({
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
      color: p.ink2,
      flex: 1,
      fontSize: 12.5,
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
    disabledButton: {
      opacity: 0.45,
    },
    timing: {
      color: p.ink2,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 2,
      paddingBottom: 10,
    },
  }));
