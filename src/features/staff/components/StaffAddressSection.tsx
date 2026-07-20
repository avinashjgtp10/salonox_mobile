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
import { useStaffAddresses } from "@/features/staff/hooks/useStaffAddresses";
import { selectStaffAddressDeleting } from "@/store/staff/staff.slice";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/user/user.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { StaffAddressListItem } from "@/types/staff";
import { canManageStaffLifecycle } from "@/utils/userProfile";

type StaffAddressSectionProps = {
  staffId?: string | null;
};

type AddressRowProps = {
  address: StaffAddressListItem;
  canDelete: boolean;
  onDelete: (address: StaffAddressListItem) => void;
  onEdit: (address: StaffAddressListItem) => void;
  staffId?: string | null;
};

function AddressRow({ address, canDelete, onDelete, onEdit, staffId }: AddressRowProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const deleting = useAppSelector((state) => selectStaffAddressDeleting(state, staffId, address.id));

  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <View style={styles.rowHeader}>
          <Text style={styles.addressType}>{address.type}</Text>
          {address.isPrimary ? (
            <View style={styles.primaryPill}>
              <Text style={styles.primaryPillText}>Primary</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.addressLine}>{address.addressLine}</Text>
        <Text style={styles.addressMeta}>
          {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
        </Text>
        <Text style={styles.addressMeta}>{address.country}</Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={deleting}
          onPress={() => onEdit(address)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.84}
          disabled={!canDelete || deleting}
          onPress={() => onDelete(address)}
          style={[styles.deleteButton, (!canDelete || deleting) && styles.deleteButtonDisabled]}
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

export function StaffAddressSection({ staffId }: StaffAddressSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const controller = useStaffAddresses(staffId);
  const currentUser = useAppSelector(selectCurrentUser);
  const canManageAddresses = canManageStaffLifecycle(currentUser?.role);

  const handleDelete = (address: StaffAddressListItem) => {
    if (!canManageAddresses) {
      Alert.alert("Permission required", "You don't have permission to delete a staff address.");
      return;
    }

    Alert.alert(
      "Delete Address",
      `Are you sure you want to delete this ${address.type.toLowerCase()} address? This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => void handleConfirmDelete(address),
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  };

  const handleConfirmDelete = async (address: StaffAddressListItem) => {
    const result = await controller.deleteAddress(address.id);

    if (!result.success) {
      Alert.alert("Unable to delete address", result.message ?? "Something went wrong. Please try again.");
      return;
    }

    Alert.alert("Address deleted", result.message ?? "The address has been removed.");
  };

  return (
    <StaffSectionCard
      action={
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={controller.openCreateForm}
          style={styles.addButton}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      }
      title="Staff Address"
    >
      {controller.listError ? (
        <StaffStateView
          actionLabel="Retry"
          description={controller.listError}
          onAction={controller.refresh}
          title="Unable to load addresses"
          variant="error"
        />
      ) : null}
      {!controller.listError && controller.loading ? (
        <StaffStateView description="Fetching saved staff addresses." loading title="Loading addresses" />
      ) : null}
      {!controller.listError && !controller.loading && controller.addresses.length === 0 ? (
        <StaffStateView
          description="Add a staff address for records and correspondence."
          title="No address added"
        />
      ) : null}
      {!controller.listError && !controller.loading && controller.addresses.length > 0 ? (
        <View style={styles.list}>
          {controller.addresses.map((address) => (
            <AddressRow
              key={address.id}
              address={address}
              canDelete={canManageAddresses}
              onDelete={handleDelete}
              onEdit={controller.openEditForm}
              staffId={staffId}
            />
          ))}
        </View>
      ) : null}

      <StaffBottomSheet
        onClose={controller.closeForm}
        subtitle="Address line is required."
        title={controller.editingAddress ? "Edit Address" : "Add Address"}
        visible={controller.isFormOpen}
      >
        <StaffTextField
          autoCapitalize="words"
          label="Address Type"
          onChangeText={(value) => controller.updateField("type", value)}
          placeholder="Home, Work, Billing"
          value={controller.form.type}
        />
        <StaffTextField
          error={controller.formErrors.address}
          label="Address Line"
          multiline
          onChangeText={(value) => controller.updateField("addressLine", value)}
          placeholder="House / street / area"
          value={controller.form.addressLine}
        />
        <StaffTextField
          autoCapitalize="words"
          label="City"
          onChangeText={(value) => controller.updateField("city", value)}
          placeholder="City"
          value={controller.form.city}
        />
        <StaffTextField
          autoCapitalize="words"
          label="State"
          onChangeText={(value) => controller.updateField("state", value)}
          placeholder="State"
          value={controller.form.state}
        />
        <StaffTextField
          keyboardType="number-pad"
          label="Postal Code"
          onChangeText={(value) => controller.updateField("postalCode", value)}
          placeholder="Postal code"
          value={controller.form.postalCode}
        />
        <StaffTextField
          autoCapitalize="words"
          label="Country"
          onChangeText={(value) => controller.updateField("country", value)}
          placeholder="Country"
          value={controller.form.country}
        />

        {controller.error ? <Text style={styles.errorText}>{controller.error}</Text> : null}
        {!controller.isFormValid ? (
          <Text style={styles.hintText}>Enter an address line to continue.</Text>
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
                {controller.editingAddress ? "Update" : "Save"}
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
  rowInfo: {
    flex: 1,
  },
  rowActions: {
    gap: 8,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  addressType: {
    color: Colors.heading,
    fontSize: 13,
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
  addressLine: {
    color: Colors.heading,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: Spacing.sm,
  },
  addressMeta: {
    color: Colors.text2,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
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
