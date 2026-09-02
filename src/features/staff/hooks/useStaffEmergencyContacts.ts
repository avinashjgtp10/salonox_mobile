import { useCallback, useMemo, useState } from "react";

import {
  createEmergencyContactThunk,
  deleteEmergencyContactThunk,
  fetchEmergencyContactsThunk,
  updateEmergencyContactThunk,
} from "@/middleware/staff/staff.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectEmergencyContactCreateError,
  selectEmergencyContactCreating,
  selectEmergencyContactListState,
  selectEmergencyContactsByStaffId,
  selectEmergencyContactUpdateError,
  selectEmergencyContactUpdating,
} from "@/store/staff/staff.slice";
import type {
  EmergencyContactController,
  EmergencyContactFormValues,
} from "@/features/staff/types/staffFeature.types";
import { validateEmergencyContactForm } from "@/features/staff/validation/staff.validation";
import type { StaffEmergencyContactListItem } from "@/types/staff";
import { isValidStaffId } from "@/utils/staffIds";

const EMPTY_FORM: EmergencyContactController["form"] = {
  address: "",
  email: "",
  fullName: "",
  notes: "",
  phone: "",
  relationship: "",
};

const getFormFromContact = (
  contact?: StaffEmergencyContactListItem | null,
): EmergencyContactController["form"] =>
  contact
    ? {
        address: contact.address,
        email: contact.email,
        fullName: contact.fullName,
        notes: contact.notes,
        phone: contact.phone,
        relationship: contact.relationship,
      }
    : EMPTY_FORM;

export const useStaffEmergencyContacts = (
  staffId?: string | null,
): EmergencyContactController => {
  const dispatch = useAppDispatch();
  const contacts = useAppSelector((state) => selectEmergencyContactsByStaffId(state, staffId));
  const listState = useAppSelector((state) => selectEmergencyContactListState(state, staffId));
  const createError = useAppSelector((state) => selectEmergencyContactCreateError(state, staffId));
  const creating = useAppSelector((state) => selectEmergencyContactCreating(state, staffId));
  const [editingContact, setEditingContact] = useState<StaffEmergencyContactListItem | null>(null);
  const [form, setForm] = useState<EmergencyContactController["form"]>(EMPTY_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const editingContactId = editingContact?.id ?? null;
  const updateError = useAppSelector((state) =>
    selectEmergencyContactUpdateError(state, staffId, editingContactId),
  );
  const updating = useAppSelector((state) =>
    selectEmergencyContactUpdating(state, staffId, editingContactId),
  );
  const saving = creating || updating;
  const validation = useMemo(() => validateEmergencyContactForm(form), [form]);
  const error = editingContact ? updateError : createError;

  const refresh = useCallback(() => {
    if (!isValidStaffId(staffId)) {
      return;
    }

    const validStaffId = typeof staffId === "string" ? staffId.trim() : "";

    void dispatch(
      fetchEmergencyContactsThunk({
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
      fetchEmergencyContactsThunk({
        limit: listState.pagination.limit,
        page: listState.pagination.nextPage,
        staffId: validStaffId,
      }),
    );
  }, [dispatch, listState, staffId]);

  const openCreateForm = () => {
    setEditingContact(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (contact: StaffEmergencyContactListItem) => {
    setEditingContact(contact);
    setForm(getFormFromContact(contact));
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setEditingContact(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(false);
  };

  const updateField = (field: keyof EmergencyContactController["form"], value: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const save = async () => {
    if (!staffId || !validation.isValid) {
      return false;
    }

    const payload: EmergencyContactFormValues = {
      address: form.address,
      email: form.email,
      fullName: form.fullName,
      notes: form.notes,
      phone: form.phone,
      relationship: form.relationship,
    };
    const action = editingContact
      ? await dispatch(
          updateEmergencyContactThunk({
            recordId: editingContact.id,
            staffId,
            updates: payload,
          }),
        )
      : await dispatch(
          createEmergencyContactThunk({
            contact: payload,
            staffId,
          }),
        );
    const succeeded =
      createEmergencyContactThunk.fulfilled.match(action) ||
      updateEmergencyContactThunk.fulfilled.match(action);

    if (succeeded) {
      setEditingContact(null);
      setForm(EMPTY_FORM);
      setIsFormOpen(false);
    }

    return succeeded;
  };

  const deleteContact = useCallback(
    async (recordId: string) => {
      if (!staffId) {
        return { message: "Missing staff id.", success: false as const };
      }

      const resultAction = await dispatch(deleteEmergencyContactThunk({ recordId, staffId }));

      if (deleteEmergencyContactThunk.rejected.match(resultAction)) {
        return {
          message: resultAction.payload?.message ?? "Unable to delete emergency contact.",
          success: false as const,
        };
      }

      return { message: resultAction.payload.message, success: true as const };
    },
    [dispatch, staffId],
  );

  return {
    closeForm,
    contacts,
    createError,
    creating,
    deleteContact,
    editingContact,
    error,
    fetchMore,
    form,
    formErrors: validation.errors,
    isFormOpen,
    isFormValid: validation.isValid,
    listError: listState?.error ?? null,
    listLoading: listState?.loading ?? false,
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
