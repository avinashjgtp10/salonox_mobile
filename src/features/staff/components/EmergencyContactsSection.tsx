import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
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
import { useStaffEmergencyContacts } from "@/features/staff/hooks/useStaffEmergencyContacts";
import { useAppToast } from "@/hooks/useAppToast";
import { selectEmergencyContactDeleting } from "@/store/staff/staff.slice";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { StaffEmergencyContactListItem } from "@/types/staff";
import { canManageStaffLifecycle } from "@/utils/userProfile";
import { PHONE_DIGIT_COUNT, sanitizePhoneDigits } from "@/utils/validation";

type EmergencyContactsSectionProps = {
  readOnly?: boolean;
  staffId?: string | null;
};

type ContactRowProps = {
  canDelete: boolean;
  contact: StaffEmergencyContactListItem;
  onDelete: (contact: StaffEmergencyContactListItem) => void;
  onEdit: (contact: StaffEmergencyContactListItem) => void;
  staffId?: string | null;
};

function ContactRow({ canDelete, contact, onDelete, onEdit, staffId }: ContactRowProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const deleting = useAppSelector((state) =>
    selectEmergencyContactDeleting(state, staffId, contact.id),
  );

  return (
    <View style={styles.row}>
      <View style={styles.contactInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{contact.fullName}</Text>
          {contact.isPrimary ? (
            <View style={styles.primaryPill}>
              <Text style={styles.primaryPillText}>Primary</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta}>{contact.relationship || "Relationship not set"}</Text>
        <Text style={styles.phone}>{contact.phone || "Phone not set"}</Text>
        {contact.email ? <Text style={styles.subtle}>{contact.email}</Text> : null}
        {contact.address ? <Text style={styles.subtle}>{contact.address}</Text> : null}
      </View>
      {canDelete ? (
      <View style={styles.rowActions}>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={!canDelete || deleting}
          onPress={() => onEdit(contact)}
          style={[styles.editButton, (!canDelete || deleting) && styles.deleteButtonDisabled]}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={!canDelete || deleting}
          onPress={() => onDelete(contact)}
          style={[styles.deleteButton, (!canDelete || deleting) && styles.deleteButtonDisabled]}
        >
          {deleting ? (
            <ActivityIndicator color={Colors.error} size="small" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete</Text>
          )}
        </TouchableOpacity>
      </View>
      ) : null}
    </View>
  );
}

export function EmergencyContactsSection({ readOnly = false, staffId }: EmergencyContactsSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const controller = useStaffEmergencyContacts(staffId);
  const toast = useAppToast();
  const currentUser = useAppSelector(selectCurrentUser);
  const canManageContacts = canManageStaffLifecycle(currentUser?.role);

  const handleDelete = (contact: StaffEmergencyContactListItem) => {
    if (!canManageContacts) {
      Alert.alert("Permission required", "You don't have permission to delete an emergency contact.");
      return;
    }

    Alert.alert(
      "Delete Emergency Contact",
      `Are you sure you want to delete ${contact.fullName}? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => void handleConfirmDelete(contact),
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  };

  const handleConfirmDelete = async (contact: StaffEmergencyContactListItem) => {
    const result = await controller.deleteContact(contact.id);

    if (!result.success) {
      Alert.alert(
        "Unable to delete contact",
        result.message ?? "Something went wrong. Please try again.",
      );
      return;
    }

    toast.showSuccess("Emergency contact deleted successfully.");
  };

  return (
    <StaffSectionCard
      action={
        readOnly ? null :
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={controller.openCreateForm}
          style={styles.addButton}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      }
      title="Emergency Contacts"
    >
      {controller.listError ? (
        <StaffStateView
          actionLabel="Retry"
          description={controller.listError}
          onAction={controller.refresh}
          title="Unable to load emergency contacts"
          variant="error"
        />
      ) : null}
      {!controller.listError && controller.listLoading ? (
        <StaffStateView
          description="Fetching saved emergency contacts."
          loading
          title="Loading emergency contacts"
        />
      ) : null}
      {!controller.listError && !controller.listLoading && controller.contacts.length === 0 ? (
        <StaffStateView
          description="Add a trusted contact for urgent staff situations."
          title="No emergency contact added"
        />
      ) : null}
      {!controller.listError && !controller.listLoading && controller.contacts.length > 0 ? (
        <View style={styles.list}>
          {controller.contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              canDelete={!readOnly && canManageContacts}
              contact={contact}
              onDelete={handleDelete}
              onEdit={readOnly ? () => undefined : controller.openEditForm}
              staffId={staffId}
            />
          ))}
        </View>
      ) : null}

      <StaffBottomSheet
        onClose={controller.closeForm}
        subtitle="Name, relationship and phone are required."
        title={controller.editingContact ? "Edit Emergency Contact" : "Add Emergency Contact"}
        visible={controller.isFormOpen}
      >
        <StaffTextField
          autoCapitalize="words"
          error={controller.formErrors.fullName}
          label="Full Name"
          onChangeText={(value) => controller.updateField("fullName", value)}
          placeholder="Contact name"
          value={controller.form.fullName}
        />
        <StaffTextField
          autoCapitalize="words"
          error={controller.formErrors.relationship}
          label="Relationship"
          onChangeText={(value) => controller.updateField("relationship", value)}
          placeholder="Parent, spouse, sibling"
          value={controller.form.relationship}
        />
        <StaffTextField
          error={controller.formErrors.phone}
          keyboardType="phone-pad"
          label="Phone"
          maxLength={PHONE_DIGIT_COUNT}
          onChangeText={(value) => controller.updateField("phone", sanitizePhoneDigits(value))}
          placeholder="Emergency phone number"
          value={controller.form.phone}
        />
        <StaffTextField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          onChangeText={(value) => controller.updateField("email", value)}
          placeholder="Optional email"
          value={controller.form.email}
        />
        <StaffTextField
          label="Address"
          multiline
          onChangeText={(value) => controller.updateField("address", value)}
          placeholder="Optional address"
          value={controller.form.address}
        />
        <StaffTextField
          label="Notes"
          multiline
          onChangeText={(value) => controller.updateField("notes", value)}
          placeholder="Optional notes"
          value={controller.form.notes}
        />

        {controller.error ? <Text style={styles.errorText}>{controller.error}</Text> : null}
        {!controller.isFormValid ? (
          <Text style={styles.hintText}>Fill name, relationship and phone to continue.</Text>
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={controller.saving}
            onPress={controller.closeForm}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={!controller.isFormValid || controller.saving}
            onPress={controller.save}
            style={[
              styles.saveButton,
              (!controller.isFormValid || controller.saving) && styles.saveButtonDisabled,
            ]}
          >
            {controller.saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {controller.editingContact ? "Update" : "Save"}
              </Text>
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
  contactInfo: {
    flex: 1,
  },
  rowActions: {
    gap: 8,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  name: {
    color: Colors.heading,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  primaryPill: {
    backgroundColor: Colors.successBg,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  primaryPillText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: "800",
  },
  meta: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  phone: {
    color: Colors.heading,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },
  subtle: {
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
  deleteButtonDisabled: {
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
