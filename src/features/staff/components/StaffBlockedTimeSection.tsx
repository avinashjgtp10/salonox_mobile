import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import {
  DashboardRadius as Radius,
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { StaffSectionCard } from "@/features/staff/components/StaffSectionCard";
import { StaffStateView } from "@/features/staff/components/StaffStateView";
import { StaffTextField } from "@/features/staff/components/StaffTextField";
import {
  createBlockedTimeThunk,
  deleteBlockedTimeThunk,
  fetchBlockedTimesThunk,
  updateBlockedTimeThunk,
} from "@/middleware/staff/staffBlockedTimes.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { formatAppDateTime } from "@/utils/dateTime";
import {
  selectBlockedTimeCreateError,
  selectBlockedTimeCreating,
  selectBlockedTimeDeleting,
  selectBlockedTimeUpdateError,
  selectBlockedTimeUpdating,
  selectBlockedTimes,
  selectBlockedTimesError,
  selectBlockedTimesLoaded,
  selectBlockedTimesLoading,
} from "@/store/staff/staffBlockedTimes.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { BlockedTimeEntry } from "@/types/staffBlockedTimes";
import { isValidStaffId } from "@/utils/staffIds";
import { canManageStaffLifecycle } from "@/utils/userProfile";

type StaffBlockedTimeSectionProps = {
  staffId?: string | null;
};

const EMPTY_FORM = {
  endAt: "",
  notes: "",
  reason: "",
  startAt: "",
};

type BlockedTimeRowProps = {
  blockedTime: BlockedTimeEntry;
  canManage: boolean;
  onDelete: (blockedTime: BlockedTimeEntry) => void;
  onEdit: (blockedTime: BlockedTimeEntry) => void;
  staffId?: string | null;
};

function BlockedTimeRow({ blockedTime, canManage, onDelete, onEdit, staffId }: BlockedTimeRowProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const deleting = useAppSelector((state) =>
    selectBlockedTimeDeleting(state, staffId, blockedTime.id),
  );

  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.reason}>{blockedTime.reason || "Blocked time"}</Text>
        <Text style={styles.dateRange}>
          {formatAppDateTime(blockedTime.startAt, "-")} — {formatAppDateTime(blockedTime.endAt, "-")}
        </Text>
        {blockedTime.notes ? <Text style={styles.meta}>{blockedTime.notes}</Text> : null}
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={deleting}
          onPress={() => onEdit(blockedTime)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={!canManage || deleting}
          onPress={() => onDelete(blockedTime)}
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

export function StaffBlockedTimeSection({ staffId }: StaffBlockedTimeSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const canManage = canManageStaffLifecycle(currentUser?.role);
  const blockedTimes = useAppSelector((state) => selectBlockedTimes(state, staffId));
  const loaded = useAppSelector((state) => selectBlockedTimesLoaded(state, staffId));
  const loading = useAppSelector((state) => selectBlockedTimesLoading(state, staffId));
  const listError = useAppSelector((state) => selectBlockedTimesError(state, staffId));
  const creating = useAppSelector((state) => selectBlockedTimeCreating(state, staffId));
  const createError = useAppSelector((state) => selectBlockedTimeCreateError(state, staffId));

  const [editingEntry, setEditingEntry] = useState<BlockedTimeEntry | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const updating = useAppSelector((state) =>
    selectBlockedTimeUpdating(state, staffId, editingEntry?.id),
  );
  const updateError = useAppSelector((state) =>
    selectBlockedTimeUpdateError(state, staffId, editingEntry?.id),
  );
  const saving = creating || updating;
  const error = editingEntry ? updateError : createError;
  const isValid = form.startAt.trim().length > 0 && form.endAt.trim().length > 0;

  useEffect(() => {
    if (staffId && isValidStaffId(staffId) && !loaded && !loading) {
      void dispatch(fetchBlockedTimesThunk(staffId));
    }
  }, [dispatch, loaded, loading, staffId]);

  const refresh = () => {
    if (staffId) {
      void dispatch(fetchBlockedTimesThunk(staffId));
    }
  };

  const openCreateForm = () => {
    setEditingEntry(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (entry: BlockedTimeEntry) => {
    setEditingEntry(entry);
    setForm({
      endAt: entry.endAt ?? "",
      notes: entry.notes ?? "",
      reason: entry.reason ?? "",
      startAt: entry.startAt ?? "",
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setEditingEntry(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(false);
  };

  const handleSave = async () => {
    if (!staffId || !isValid) {
      return;
    }

    const action = editingEntry
      ? await dispatch(
          updateBlockedTimeThunk({
            recordId: editingEntry.id,
            staffId,
            updates: {
              end_at: form.endAt.trim(),
              notes: form.notes.trim() || undefined,
              reason: form.reason.trim() || undefined,
              start_at: form.startAt.trim(),
            },
          }),
        )
      : await dispatch(
          createBlockedTimeThunk({
            payload: {
              end_at: form.endAt.trim(),
              notes: form.notes.trim() || undefined,
              reason: form.reason.trim() || undefined,
              start_at: form.startAt.trim(),
            },
            staffId,
          }),
        );

    const succeeded =
      createBlockedTimeThunk.fulfilled.match(action) || updateBlockedTimeThunk.fulfilled.match(action);

    if (succeeded) {
      closeForm();
    }
  };

  const handleDelete = (entry: BlockedTimeEntry) => {
    if (!canManage) {
      Alert.alert("Permission required", "You don't have permission to delete a blocked time.");
      return;
    }

    Alert.alert(
      "Delete Blocked Time",
      "Are you sure you want to delete this blocked time? This action cannot be undone.",
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void handleConfirmDelete(entry), style: "destructive", text: "Delete" },
      ],
    );
  };

  const handleConfirmDelete = async (entry: BlockedTimeEntry) => {
    if (!staffId) {
      return;
    }

    const resultAction = await dispatch(deleteBlockedTimeThunk({ recordId: entry.id, staffId }));

    if (deleteBlockedTimeThunk.rejected.match(resultAction)) {
      Alert.alert(
        "Unable to delete blocked time",
        resultAction.payload?.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    Alert.alert("Blocked time deleted", resultAction.payload.message ?? "The blocked time has been removed.");
  };

  const sortedEntries = useMemo(
    () => [...blockedTimes].sort((a, b) => (b.startAt ?? "").localeCompare(a.startAt ?? "")),
    [blockedTimes],
  );

  return (
    <StaffSectionCard
      action={
        <TouchableOpacity activeOpacity={0.84} onPress={openCreateForm} style={styles.addButton}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      }
      title="Blocked Times"
    >
      {listError ? (
        <StaffStateView
          actionLabel="Retry"
          description={listError}
          onAction={refresh}
          title="Unable to load blocked times"
          variant="error"
        />
      ) : null}
      {!listError && loading && !loaded ? (
        <StaffStateView description="Fetching blocked times." loading title="Loading blocked times" />
      ) : null}
      {!listError && loaded && sortedEntries.length === 0 ? (
        <StaffStateView
          description="No blocked times added yet. Block off time for breaks, training or personal appointments."
          title="No blocked times"
        />
      ) : null}
      {!listError && sortedEntries.length > 0 ? (
        <View style={styles.list}>
          {sortedEntries.map((entry) => (
            <BlockedTimeRow
              key={entry.id}
              blockedTime={entry}
              canManage={canManage}
              onDelete={handleDelete}
              onEdit={openEditForm}
              staffId={staffId}
            />
          ))}
        </View>
      ) : null}

      <StaffBottomSheet
        onClose={closeForm}
        subtitle="Start and end are required."
        title={editingEntry ? "Edit Blocked Time" : "Add Blocked Time"}
        visible={isFormOpen}
      >
        <StaffTextField
          label="Reason"
          onChangeText={(value) => setForm((current) => ({ ...current, reason: value }))}
          placeholder="Break, training, personal"
          value={form.reason}
        />
        <StaffTextField
          label="Start"
          onChangeText={(value) => setForm((current) => ({ ...current, startAt: value }))}
          placeholder="YYYY-MM-DD HH:MM"
          value={form.startAt}
        />
        <StaffTextField
          label="End"
          onChangeText={(value) => setForm((current) => ({ ...current, endAt: value }))}
          placeholder="YYYY-MM-DD HH:MM"
          value={form.endAt}
        />
        <StaffTextField
          label="Notes"
          multiline
          onChangeText={(value) => setForm((current) => ({ ...current, notes: value }))}
          placeholder="Optional notes"
          value={form.notes}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!isValid ? <Text style={styles.hintText}>Enter a start and end to continue.</Text> : null}

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
              <Text style={styles.saveButtonText}>{editingEntry ? "Update" : "Save"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </StaffBottomSheet>
    </StaffSectionCard>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
  reason: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "800",
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
