import { useCallback, useMemo, useState } from "react";

import {
  createStaffAddressThunk,
  deleteStaffAddressThunk,
  fetchStaffAddressesThunk,
  updateStaffAddressThunk,
} from "@/middleware/staff/staff.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffAddressCreateError,
  selectStaffAddressCreating,
  selectStaffAddressListState,
  selectStaffAddressesByStaffId,
  selectStaffAddressUpdateError,
  selectStaffAddressUpdating,
} from "@/store/staff/staff.slice";
import type {
  StaffAddressController,
  StaffAddressFormFields,
} from "@/features/staff/types/staffFeature.types";
import { mapStaffAddressFormToRequest } from "@/features/staff/utils/staffFormMappers";
import { validateStaffAddressForm } from "@/features/staff/validation/staff.validation";
import type { StaffAddressListItem } from "@/types/staff";
import { isValidStaffId } from "@/utils/staffIds";

const EMPTY_FORM: StaffAddressFormFields = {
  addressLine: "",
  addressName: "",
};

const clearPlaceholder = (value: string) => (value === "-" ? "" : value);

const getFormFromAddress = (address?: StaffAddressListItem | null): StaffAddressFormFields =>
  address
    ? {
        addressLine: clearPlaceholder(address.addressLine),
        addressName: address.type,
      }
    : EMPTY_FORM;

export const useStaffAddresses = (staffId?: string | null): StaffAddressController => {
  const dispatch = useAppDispatch();
  const addresses = useAppSelector((state) => selectStaffAddressesByStaffId(state, staffId));
  const listState = useAppSelector((state) => selectStaffAddressListState(state, staffId));
  const createError = useAppSelector((state) => selectStaffAddressCreateError(state, staffId));
  const creating = useAppSelector((state) => selectStaffAddressCreating(state, staffId));

  const [editingAddress, setEditingAddress] = useState<StaffAddressListItem | null>(null);
  const [form, setForm] = useState<StaffAddressFormFields>(EMPTY_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const editingAddressId = editingAddress?.id ?? null;

  const updateError = useAppSelector((state) =>
    selectStaffAddressUpdateError(state, staffId, editingAddressId),
  );
  const updating = useAppSelector((state) =>
    selectStaffAddressUpdating(state, staffId, editingAddressId),
  );
  const saving = creating || updating;
  const validation = useMemo(
    () => validateStaffAddressForm({ address: form.addressLine, address_name: form.addressName }),
    [form.addressLine, form.addressName],
  );
  const error = editingAddress ? updateError : createError;

  const refresh = useCallback(() => {
    if (!isValidStaffId(staffId)) {
      return;
    }

    const validStaffId = typeof staffId === "string" ? staffId.trim() : "";

    void dispatch(
      fetchStaffAddressesThunk({
        limit: listState?.query.limit ?? 10,
        page: 1,
        refresh: true,
        staffId: validStaffId,
      }),
    );
  }, [dispatch, listState?.query.limit, staffId]);

  const fetchMore = useCallback(() => {
    if (
      !isValidStaffId(staffId) ||
      listState?.loading ||
      listState?.loadingMore ||
      !listState?.pagination.hasMore
    ) {
      return;
    }

    const validStaffId = typeof staffId === "string" ? staffId.trim() : "";

    void dispatch(
      fetchStaffAddressesThunk({
        limit: listState.pagination.limit,
        page: listState.pagination.nextPage,
        staffId: validStaffId,
      }),
    );
  }, [dispatch, listState, staffId]);

  const openCreateForm = () => {
    setEditingAddress(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (address: StaffAddressListItem) => {
    setEditingAddress(address);
    setForm(getFormFromAddress(address));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setEditingAddress(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(false);
  };

  const updateField = (field: keyof StaffAddressFormFields, value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const deleteAddress = useCallback(
    async (recordId: string) => {
      if (!staffId) {
        return { message: "Missing staff id.", success: false as const };
      }

      const resultAction = await dispatch(deleteStaffAddressThunk({ recordId, staffId }));

      if (deleteStaffAddressThunk.rejected.match(resultAction)) {
        return {
          message: resultAction.payload?.message ?? "Unable to delete address.",
          success: false as const,
        };
      }

      return { message: resultAction.payload.message, success: true as const };
    },
    [dispatch, staffId],
  );

  const save = async () => {
    if (!staffId || !validation.isValid) {
      return false;
    }

    const payload = mapStaffAddressFormToRequest({
      address: form.addressLine,
      address_name: form.addressName,
    });

    const action = editingAddress
      ? await dispatch(
          updateStaffAddressThunk({
            recordId: editingAddress.id,
            staffId,
            updates: payload,
          }),
        )
      : await dispatch(
          createStaffAddressThunk({
            address: payload,
            staffId,
          }),
        );
    const succeeded =
      createStaffAddressThunk.fulfilled.match(action) ||
      updateStaffAddressThunk.fulfilled.match(action);

    if (succeeded) {
      setEditingAddress(null);
      setForm(EMPTY_FORM);
      setIsFormOpen(false);
    }

    return succeeded;
  };

  return {
    addresses,
    closeForm,
    createError,
    creating,
    deleteAddress,
    editingAddress,
    error,
    fetchMore,
    form,
    formErrors: validation.errors,
    isFormOpen,
    isFormValid: validation.isValid,
    listError: listState?.error ?? null,
    loading: listState?.loading ?? false,
    loadingMore: listState?.loadingMore ?? false,
    openCreateForm,
    openEditForm,
    refresh,
    refreshing: listState?.refreshing ?? false,
    save,
    saving,
    updateError,
    updateField,
    updating,
  };
};
