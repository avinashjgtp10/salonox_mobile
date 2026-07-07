import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardColors as Colors,
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
} from "@/constants/theme";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import {
  createLeaveThunk,
  deleteLeaveThunk,
  fetchLeavesThunk,
  updateLeaveThunk,
} from "@/middleware/staff/staffLeaves.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectLeaveCreateError,
  selectLeaveCreating,
  selectLeaveDeleting,
  selectLeaveUpdateError,
  selectLeaveUpdating,
  selectLeaves,
  selectLeavesError,
  selectLeavesLoaded,
  selectLeavesLoading,
} from "@/store/staff/staffLeaves.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import type { LeaveEntry } from "@/types/staffLeaves";
import { isValidStaffId } from "@/utils/staffIds";
import { canManageStaffLifecycle } from "@/utils/userProfile";

type StaffLeaveSectionProps = {
  staffId?: string | null;
};

const STATUS_OPTIONS = ["pending", "approved", "rejected"] as const;

const EMPTY_FORM = {
  endDate: "",
  notes: "",
  reason: "",
  startDate: "",
  type: "",
};

function getStatusPalette(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
      return { backgroundColor: "#EAF5EF", color: Colors.success };
    case "rejected":
      return { backgroundColor: "#FEECEC", color: Colors.error };
    case "pending":
    default:
      return { backgroundColor: "#FFF4E3", color: Colors.warning };
  }
}

type LeaveRowProps = {
  canManage: boolean;
  leave: LeaveEntry;
  onDelete: (leave: LeaveEntry) => void;
  onEdit: (leave: LeaveEntry) => void;
  staffId?: string | null;
};

function LeaveRow({ canManage, leave, onDelete, onEdit, staffId }: LeaveRowProps) {
  const deleting = useAppSelector((state) => selectLeaveDeleting(state, staffId, leave.id));
  const palette = getStatusPalette(leave.status);

  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <View style={styles.rowHeader}>
          <Text style={styles.leaveType}>{leave.type}</Text>
          <View style={[styles.statusPill, { backgroundColor: palette.backgroundColor }]}>
            <Text style={[styles.statusPillText, { color: palette.color }]}>{leave.status}</Text>
          </View>
        </View>
        <Text style={styles.dateRange}>
          {leave.startDate ?? "-"} — {leave.endDate ?? "-"}
        </Text>
        {leave.reason ? <Text style={styles.meta}>{leave.reason}</Text> : null}
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={deleting}
          onPress={() => onEdit(leave)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={!canManage || deleting}
          onPress={() => onDelete(leave)}
          style={[styles.deleteButton, (!canManage || deleting) && styles.buttonDisabled]}
        >
          {deleting ? (
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function StaffLeaveSection({ staffId }: StaffLeaveSectionProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const canManage = canManageStaffLifecycle(currentUser?.role);
  const leaves = useAppSelector((state) => selectLeaves(state, staffId));
  const loaded = useAppSelector((state) => selectLeavesLoaded(state, staffId));
  const loading = useAppSelector((state) => selectLeavesLoading(state, staffId));
  const listError = useAppSelector((state) => selectLeavesError(state, staffId));
  const creating = useAppSelector((state) => selectLeaveCreating(state, staffId));
  const createError = useAppSelector((state) => selectLeaveCreateError(state, staffId));

  const [editingLeave, setEditingLeave] = useState<LeaveEntry | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [status, setStatus] = useState<string>("pending");
  const [form, setForm] = useState(EMPTY_FORM);

  const updating = useAppSelector((state) =>
    selectLeaveUpdating(state, staffId, editingLeave?.id),
  );
  const updateError = useAppSelector((state) =>
    selectLeaveUpdateError(state, staffId, editingLeave?.id),
  );
  const saving = creating || updating;
  const error = editingLeave ? updateError : createError;
  const isValid = form.startDate.trim().length > 0 && form.endDate.trim().length > 0;

  useEffect(() => {
    if (staffId && isValidStaffId(staffId) && !loaded && !loading) {
      void dispatch(fetchLeavesThunk(staffId));
    }
  }, [dispatch, loaded, loading, staffId]);

  const refresh = () => {
    if (staffId) {
      void dispatch(fetchLeavesThunk(staffId));
    }
  };

  const openCreateForm = () => {
    setEditingLeave(null);
    setForm(EMPTY_FORM);
    setStatus("pending");
    setIsFormOpen(true);
  };

  const openEditForm = (leave: LeaveEntry) => {
    setEditingLeave(leave);
    setForm({
      endDate: leave.endDate ?? "",
      notes: leave.notes ?? "",
      reason: leave.reason ?? "",
      startDate: leave.startDate ?? "",
      type: leave.type ?? "",
    });
    setStatus(leave.status || "pending");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setEditingLeave(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(false);
  };

  const handleSave = async () => {
    if (!staffId || !isValid) {
      return;
    }

    const action = editingLeave
      ? await dispatch(
          updateLeaveThunk({
            recordId: editingLeave.id,
            staffId,
            updates: {
              end_date: form.endDate.trim(),
              notes: form.notes.trim() || undefined,
              reason: form.reason.trim() || undefined,
              start_date: form.startDate.trim(),
              status,
              type: form.type.trim() || undefined,
            },
          }),
        )
      : await dispatch(
          createLeaveThunk({
            payload: {
              end_date: form.endDate.trim(),
              notes: form.notes.trim() || undefined,
              reason: form.reason.trim() || undefined,
              start_date: form.startDate.trim(),
              type: form.type.trim() || undefined,
            },
            staffId,
          }),
        );

    const succeeded = createLeaveThunk.fulfilled.match(action) || updateLeaveThunk.fulfilled.match(action);

    if (succeeded) {
      closeForm();
    }
  };

  const handleDelete = (leave: LeaveEntry) => {
    if (!canManage) {
      Alert.alert("Permission required", "You don't have permission to delete a leave request.");
      return;
    }

    Alert.alert(
      "Delete Leave",
      "Are you sure you want to delete this leave request? This action cannot be undone.",
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void handleConfirmDelete(leave), style: "destructive", text: "Delete" },
      ],
    );
  };

  const handleConfirmDelete = async (leave: LeaveEntry) => {
    if (!staffId) {
      return;
    }

    const resultAction = await dispatch(deleteLeaveThunk({ recordId: leave.id, staffId }));

    if (deleteLeaveThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to delete leave",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    Alert.alert("Leave deleted", resultAction.payload.message ?? "The leave request has been removed.");
  };

  const sortedLeaves = useMemo(
    () => [...leaves].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")),
    [leaves],
  );

  return (
    <StaffSectionCard
      action={
        <TouchableOpacity activeOpacity={0.84} onPress={openCreateForm} style={styles.addButton}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      }
      title="Leaves"
    >
      {listError ? (
        <StaffStateView
          actionLabel="Retry"
          description={listError}
          onAction={refresh}
          title="Unable to load leaves"
          variant="error"
        />
      ) : null}
      {!listError && loading && !loaded ? (
        <StaffStateView description="Fetching leave requests." loading title="Loading leaves" />
      ) : null}
      {!listError && loaded && sortedLeaves.length === 0 ? (
        <StaffStateView description="No leave requests recorded yet." title="No leaves" />
      ) : null}
      {!listError && sortedLeaves.length > 0 ? (
        <View style={styles.list}>
          {sortedLeaves.map((leave) => (
            <LeaveRow
              key={leave.id}
              canManage={canManage}
              leave={leave}
              onDelete={handleDelete}
              onEdit={openEditForm}
              staffId={staffId}
            />
          ))}
        </View>
      ) : null}

      <StaffBottomSheet
        onClose={closeForm}
        subtitle="Start date and end date are required."
        title={editingLeave ? "Edit Leave" : "Request Leave"}
        visible={isFormOpen}
      >
        <StaffTextField
          label="Type"
          onChangeText={(value) => setForm((current) => ({ ...current, type: value }))}
          placeholder="Sick, Casual, Paid"
          value={form.type}
        />
        <StaffTextField
          label="Start Date"
          onChangeText={(value) => setForm((current) => ({ ...current, startDate: value }))}
          placeholder="YYYY-MM-DD"
          value={form.startDate}
        />
        <StaffTextField
          label="End Date"
          onChangeText={(value) => setForm((current) => ({ ...current, endDate: value }))}
          placeholder="YYYY-MM-DD"
          value={form.endDate}
        />
        <StaffTextField
          label="Reason"
          multiline
          onChangeText={(value) => setForm((current) => ({ ...current, reason: value }))}
          placeholder="Optional reason"
          value={form.reason}
        />

        {editingLeave ? (
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map((option) => {
              const isActive = option === status;

              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.84}
                  onPress={() => setStatus(option)}
                  style={[styles.statusChip, isActive && styles.statusChipActive]}
                >
                  <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!isValid ? (
          <Text style={styles.hintText}>Enter a start date and end date to continue.</Text>
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={saving}
            onPress={closeForm}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={!isValid || saving}
            onPress={() => void handleSave()}
            style={[styles.saveButton, (!isValid || saving) && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{editingLeave ? "Update" : "Save"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </StaffBottomSheet>
    </StaffSectionCard>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flexDirection: "row",
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  list: {
    gap: 10,
  },
  row: {
    alignItems: "flex-start",
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  rowInfo: {
    flex: 1,
  },
  rowActions: {
    gap: 8,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  leaveType: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
  },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  dateRange: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  meta: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
  },
  editButtonText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "800",
  },
  statusGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
  },
  statusChip: {
    backgroundColor: Colors.bg2,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statusChipText: {
    color: Colors.text2,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  hintText: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
