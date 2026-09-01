import { createSlice } from "@reduxjs/toolkit";

import {
  createEmergencyContactThunk,
  createStaffAddressThunk,
  createStaffThunk,
  deleteEmergencyContactThunk,
  deleteStaffAddressThunk,
  deleteStaffThunk,
  fetchEmergencyContactsThunk,
  fetchStaffAddressesThunk,
  fetchStaffByIdThunk,
  fetchStaffThunk,
  resolveCurrentStaffThunk,
  setStaffActiveStatusThunk,
  updateEmergencyContactThunk,
  updateStaffAddressThunk,
  updateStaffThunk,
  type FetchEmergencyContactsArgs,
  type FetchStaffAddressesArgs,
  type FetchStaffArgs,
} from "@/middleware/staff/staff.thunk";
import type { RootState } from "@/store";
import type { StaffMember } from "@/data/teamData";
import type {
  EmergencyContactListPagination,
  EmergencyContactListQuery,
  StaffAddressListItem,
  StaffAddressListPagination,
  StaffAddressListQuery,
  StaffEmergencyContactListItem,
  StaffListPagination,
  StaffListQuery,
} from "@/types/staff";

type StaffAddressListState = {
  addresses: StaffAddressListItem[];
  currentRequestId: string | null;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  pagination: StaffAddressListPagination;
  query: StaffAddressListQuery;
  refreshing: boolean;
  staffId: string;
};

type EmergencyContactListState = {
  contacts: StaffEmergencyContactListItem[];
  currentRequestId: string | null;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  pagination: EmergencyContactListPagination;
  query: EmergencyContactListQuery;
  refreshing: boolean;
  staffId: string;
};

type StaffState = {
  activeStatusErrorsByStaffId: Record<string, string | null>;
  activeStatusTogglingStaffIds: string[];
  addressCreateErrorsByStaffId: Record<string, string | null>;
  addressCreatingStaffIds: string[];
  addressDeleteErrorsByRecordKey: Record<string, string | null>;
  addressDeletingRecordKeys: string[];
  addressListsByStaffId: Record<string, StaffAddressListState>;
  addressUpdateErrorsByRecordKey: Record<string, string | null>;
  addressUpdatingRecordKeys: string[];
  createError: string | null;
  creating: boolean;
  currentRequestId: string | null;
  currentStaff: StaffMember | null;
  currentStaffError: string | null;
  currentStaffLoading: boolean;
  deleteError: string | null;
  deletingStaffIds: string[];
  detailsError: string | null;
  detailsLoading: boolean;
  emergencyContactCreateErrorsByStaffId: Record<string, string | null>;
  emergencyContactCreatingStaffIds: string[];
  emergencyContactDeleteErrorsByRecordKey: Record<string, string | null>;
  emergencyContactDeletingRecordKeys: string[];
  emergencyContactListsByStaffId: Record<string, EmergencyContactListState>;
  emergencyContactUpdateErrorsByRecordKey: Record<string, string | null>;
  emergencyContactUpdatingRecordKeys: string[];
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  pagination: StaffListPagination;
  query: StaffListQuery;
  refreshing: boolean;
  staffMembers: StaffMember[];
  updateError: string | null;
  updating: boolean;
};

const initialQuery: StaffListQuery = {
  limit: 20,
  page: 1,
  sort_by: "created_at",
  sort_order: "DESC",
};

const initialAddressQuery: StaffAddressListQuery = {
  limit: 20,
  page: 1,
  sort_by: "created_at",
  sort_order: "DESC",
};

const initialPagination: StaffListPagination = {
  hasMore: true,
  limit: 20,
  nextPage: 1,
  page: 0,
  totalCount: 0,
  totalPages: null,
};

const initialAddressPagination: StaffAddressListPagination = {
  hasMore: true,
  limit: 20,
  nextPage: 1,
  page: 0,
  totalCount: 0,
  totalPages: null,
};

const initialState: StaffState = {
  activeStatusErrorsByStaffId: {},
  activeStatusTogglingStaffIds: [],
  addressCreateErrorsByStaffId: {},
  addressCreatingStaffIds: [],
  addressDeleteErrorsByRecordKey: {},
  addressDeletingRecordKeys: [],
  addressListsByStaffId: {},
  addressUpdateErrorsByRecordKey: {},
  addressUpdatingRecordKeys: [],
  createError: null,
  creating: false,
  currentRequestId: null,
  currentStaff: null,
  currentStaffError: null,
  currentStaffLoading: false,
  deleteError: null,
  deletingStaffIds: [],
  detailsError: null,
  detailsLoading: false,
  emergencyContactCreateErrorsByStaffId: {},
  emergencyContactCreatingStaffIds: [],
  emergencyContactDeleteErrorsByRecordKey: {},
  emergencyContactDeletingRecordKeys: [],
  emergencyContactListsByStaffId: {},
  emergencyContactUpdateErrorsByRecordKey: {},
  emergencyContactUpdatingRecordKeys: [],
  error: null,
  loading: false,
  loadingMore: false,
  pagination: initialPagination,
  query: initialQuery,
  refreshing: false,
  staffMembers: [],
  updateError: null,
  updating: false,
};

const isAppendRequest = (args?: FetchStaffArgs) =>
  !args?.refresh && !args?.reset && typeof args?.page === "number" && args.page > 1;

const isAddressAppendRequest = (args?: FetchStaffAddressesArgs) =>
  !args?.refresh && !args?.reset && typeof args?.page === "number" && args.page > 1;

const isEmergencyContactAppendRequest = (args?: FetchEmergencyContactsArgs) =>
  !args?.refresh && !args?.reset && typeof args?.page === "number" && args.page > 1;

const getInitialAddressListState = (staffId: string): StaffAddressListState => ({
  addresses: [],
  currentRequestId: null,
  error: null,
  loading: false,
  loadingMore: false,
  pagination: initialAddressPagination,
  query: initialAddressQuery,
  refreshing: false,
  staffId,
});

const getInitialEmergencyContactListState = (staffId: string): EmergencyContactListState => ({
  contacts: [],
  currentRequestId: null,
  error: null,
  loading: false,
  loadingMore: false,
  pagination: initialAddressPagination,
  query: initialAddressQuery,
  refreshing: false,
  staffId,
});

const mergeStaffMembers = (
  existingStaffMembers: StaffMember[],
  incomingStaffMembers: StaffMember[],
) => {
  const seenIds = new Set(existingStaffMembers.map((staffMember) => staffMember.id));
  const uniqueIncoming = incomingStaffMembers.filter((staffMember) => !seenIds.has(staffMember.id));

  return [...existingStaffMembers, ...uniqueIncoming];
};

const mergeStaffAddresses = (
  existingAddresses: StaffAddressListItem[],
  incomingAddresses: StaffAddressListItem[],
) => {
  const seenIds = new Set(existingAddresses.map((address) => address.id));
  const uniqueIncoming = incomingAddresses.filter((address) => !seenIds.has(address.id));

  return [...existingAddresses, ...uniqueIncoming];
};

const mergeEmergencyContacts = (
  existingContacts: StaffEmergencyContactListItem[],
  incomingContacts: StaffEmergencyContactListItem[],
) => {
  const seenIds = new Set(existingContacts.map((contact) => contact.id));
  const uniqueIncoming = incomingContacts.filter((contact) => !seenIds.has(contact.id));

  return [...existingContacts, ...uniqueIncoming];
};

const upsertStaffAddress = (
  addresses: StaffAddressListItem[],
  incomingAddress: StaffAddressListItem,
) => {
  const index = addresses.findIndex((address) => address.id === incomingAddress.id);

  if (index === -1) {
    return [incomingAddress, ...addresses];
  }

  const nextAddresses = [...addresses];
  nextAddresses[index] = incomingAddress;

  return nextAddresses;
};

const upsertEmergencyContact = (
  contacts: StaffEmergencyContactListItem[],
  incomingContact: StaffEmergencyContactListItem,
) => {
  const index = contacts.findIndex((contact) => contact.id === incomingContact.id);

  if (index === -1) {
    return [incomingContact, ...contacts];
  }

  const nextContacts = [...contacts];
  nextContacts[index] = incomingContact;

  return nextContacts;
};

const getAddressRecordKey = (staffId: string, recordId: string) => `${staffId}:${recordId}`;
const getEmergencyContactRecordKey = (staffId: string, recordId: string) =>
  `${staffId}:${recordId}`;

const staffSlice = createSlice({
  name: "staff",
  initialState,
  reducers: {
    clearCurrentStaff(state) {
      state.currentStaff = null;
      state.currentStaffError = null;
      state.currentStaffLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createStaffThunk.pending, (state) => {
        state.createError = null;
        state.creating = true;
      })
      .addCase(createStaffThunk.fulfilled, (state, action) => {
        state.createError = null;
        state.creating = false;
        const newStaff = action.payload.staffMember;
        const index = state.staffMembers.findIndex((m) => m.id === newStaff.id);
        if (index !== -1) {
          state.staffMembers[index] = newStaff;
        } else {
          state.staffMembers = [newStaff, ...state.staffMembers];
          state.pagination.totalCount += 1;
        }
      })
      .addCase(createStaffThunk.rejected, (state, action) => {
        state.createError = action.payload?.message ?? action.error.message ?? "Unable to create staff.";
        state.creating = false;
      })
      .addCase(setStaffActiveStatusThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.activeStatusErrorsByStaffId[staffId] = null;
        state.activeStatusTogglingStaffIds = [...state.activeStatusTogglingStaffIds, staffId];
      })
      .addCase(setStaffActiveStatusThunk.fulfilled, (state, action) => {
        const { staffId } = action.meta.arg;
        const updatedStaff = action.payload;

        state.activeStatusErrorsByStaffId[staffId] = null;
        state.activeStatusTogglingStaffIds = state.activeStatusTogglingStaffIds.filter(
          (togglingStaffId) => togglingStaffId !== staffId,
        );

        const index = state.staffMembers.findIndex((staffMember) => staffMember.id === updatedStaff.id);
        if (index !== -1) {
          state.staffMembers[index] = updatedStaff;
        } else {
          state.staffMembers.push(updatedStaff);
        }
      })
      .addCase(setStaffActiveStatusThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.activeStatusErrorsByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to update staff status.";
        state.activeStatusTogglingStaffIds = state.activeStatusTogglingStaffIds.filter(
          (togglingStaffId) => togglingStaffId !== staffId,
        );
      })
      .addCase(createStaffAddressThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.addressCreateErrorsByStaffId[staffId] = null;
        state.addressCreatingStaffIds = [...state.addressCreatingStaffIds, staffId];
      })
      .addCase(createStaffAddressThunk.fulfilled, (state, action) => {
        const { address, staffId } = action.payload;
        const addressState =
          state.addressListsByStaffId[staffId] ?? getInitialAddressListState(staffId);
        const hadAddress = addressState.addresses.some(
          (existingAddress) => existingAddress.id === address.id,
        );

        state.addressCreateErrorsByStaffId[staffId] = null;
        state.addressCreatingStaffIds = state.addressCreatingStaffIds.filter(
          (creatingStaffId) => creatingStaffId !== staffId,
        );
        addressState.addresses = upsertStaffAddress(addressState.addresses, address);
        addressState.pagination.totalCount = hadAddress
          ? addressState.pagination.totalCount
          : addressState.pagination.totalCount + 1;
        state.addressListsByStaffId[staffId] = addressState;
      })
      .addCase(createStaffAddressThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.addressCreateErrorsByStaffId[staffId] =
          action.payload?.message ?? action.error.message ?? "Unable to create staff address.";
        state.addressCreatingStaffIds = state.addressCreatingStaffIds.filter(
          (creatingStaffId) => creatingStaffId !== staffId,
        );
      })
      .addCase(createEmergencyContactThunk.pending, (state, action) => {
        const { staffId } = action.meta.arg;

        state.emergencyContactCreateErrorsByStaffId[staffId] = null;
        state.emergencyContactCreatingStaffIds = [
          ...state.emergencyContactCreatingStaffIds,
          staffId,
        ];
      })
      .addCase(createEmergencyContactThunk.fulfilled, (state, action) => {
        const { emergencyContact, staffId } = action.payload;
        const contactState =
          state.emergencyContactListsByStaffId[staffId] ??
          getInitialEmergencyContactListState(staffId);
        const hadContact = contactState.contacts.some(
          (existingContact) => existingContact.id === emergencyContact.id,
        );

        state.emergencyContactCreateErrorsByStaffId[staffId] = null;
        state.emergencyContactCreatingStaffIds = state.emergencyContactCreatingStaffIds.filter(
          (creatingStaffId) => creatingStaffId !== staffId,
        );
        contactState.contacts = upsertEmergencyContact(contactState.contacts, emergencyContact);
        contactState.pagination.totalCount = hadContact
          ? contactState.pagination.totalCount
          : contactState.pagination.totalCount + 1;
        state.emergencyContactListsByStaffId[staffId] = contactState;
      })
      .addCase(createEmergencyContactThunk.rejected, (state, action) => {
        const { staffId } = action.meta.arg;

        state.emergencyContactCreateErrorsByStaffId[staffId] =
          action.payload?.message ??
          action.error.message ??
          "Unable to create emergency contact.";
        state.emergencyContactCreatingStaffIds = state.emergencyContactCreatingStaffIds.filter(
          (creatingStaffId) => creatingStaffId !== staffId,
        );
      })
      .addCase(updateEmergencyContactThunk.pending, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getEmergencyContactRecordKey(staffId, recordId);

        state.emergencyContactUpdateErrorsByRecordKey[recordKey] = null;
        state.emergencyContactUpdatingRecordKeys = [
          ...state.emergencyContactUpdatingRecordKeys,
          recordKey,
        ];
      })
      .addCase(updateEmergencyContactThunk.fulfilled, (state, action) => {
        const { emergencyContact, recordId, staffId } = action.payload;
        const recordKey = getEmergencyContactRecordKey(staffId, recordId);
        const contactState =
          state.emergencyContactListsByStaffId[staffId] ??
          getInitialEmergencyContactListState(staffId);

        state.emergencyContactUpdateErrorsByRecordKey[recordKey] = null;
        state.emergencyContactUpdatingRecordKeys = state.emergencyContactUpdatingRecordKeys.filter(
          (updatingRecordKey) => updatingRecordKey !== recordKey,
        );
        contactState.contacts = upsertEmergencyContact(contactState.contacts, emergencyContact);
        state.emergencyContactListsByStaffId[staffId] = contactState;
      })
      .addCase(updateEmergencyContactThunk.rejected, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getEmergencyContactRecordKey(staffId, recordId);

        state.emergencyContactUpdateErrorsByRecordKey[recordKey] =
          action.payload?.message ??
          action.error.message ??
          "Unable to update emergency contact.";
        state.emergencyContactUpdatingRecordKeys = state.emergencyContactUpdatingRecordKeys.filter(
          (updatingRecordKey) => updatingRecordKey !== recordKey,
        );
      })
      .addCase(fetchEmergencyContactsThunk.pending, (state, action) => {
        const appendRequest = isEmergencyContactAppendRequest(action.meta.arg);
        const staffId = action.meta.arg.staffId;
        const contactState =
          state.emergencyContactListsByStaffId[staffId] ??
          getInitialEmergencyContactListState(staffId);

        contactState.currentRequestId = action.meta.requestId;
        contactState.error = null;
        contactState.loading = !appendRequest && !action.meta.arg.refresh;
        contactState.loadingMore = appendRequest;
        contactState.refreshing = Boolean(action.meta.arg.refresh);
        state.emergencyContactListsByStaffId[staffId] = contactState;
      })
      .addCase(fetchEmergencyContactsThunk.fulfilled, (state, action) => {
        const contactState =
          state.emergencyContactListsByStaffId[action.payload.staffId] ??
          getInitialEmergencyContactListState(action.payload.staffId);

        if (contactState.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isEmergencyContactAppendRequest(action.meta.arg);

        contactState.contacts = appendRequest
          ? mergeEmergencyContacts(contactState.contacts, action.payload.contacts)
          : action.payload.contacts;
        contactState.currentRequestId = null;
        contactState.error = null;
        contactState.loading = false;
        contactState.loadingMore = false;
        contactState.pagination = action.payload.pagination;
        contactState.query = action.payload.query;
        contactState.refreshing = false;
        state.emergencyContactListsByStaffId[action.payload.staffId] = contactState;
      })
      .addCase(fetchEmergencyContactsThunk.rejected, (state, action) => {
        const staffId = action.meta.arg.staffId;
        const contactState =
          state.emergencyContactListsByStaffId[staffId] ??
          getInitialEmergencyContactListState(staffId);

        if (contactState.currentRequestId !== action.meta.requestId) {
          return;
        }

        contactState.currentRequestId = null;
        contactState.error =
          action.payload?.message ?? action.error.message ?? "Unable to load emergency contacts.";
        contactState.loading = false;
        contactState.loadingMore = false;
        contactState.refreshing = false;
        state.emergencyContactListsByStaffId[staffId] = contactState;
      })
      .addCase(deleteEmergencyContactThunk.pending, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getEmergencyContactRecordKey(staffId, recordId);

        state.emergencyContactDeleteErrorsByRecordKey[recordKey] = null;
        state.emergencyContactDeletingRecordKeys = [
          ...state.emergencyContactDeletingRecordKeys,
          recordKey,
        ];
      })
      .addCase(deleteEmergencyContactThunk.fulfilled, (state, action) => {
        const { recordId, staffId } = action.payload;
        const recordKey = getEmergencyContactRecordKey(staffId, recordId);
        const contactState = state.emergencyContactListsByStaffId[staffId];

        state.emergencyContactDeleteErrorsByRecordKey[recordKey] = null;
        state.emergencyContactDeletingRecordKeys = state.emergencyContactDeletingRecordKeys.filter(
          (deletingRecordKey) => deletingRecordKey !== recordKey,
        );

        if (contactState) {
          const hadContact = contactState.contacts.some((contact) => contact.id === recordId);

          contactState.contacts = contactState.contacts.filter((contact) => contact.id !== recordId);
          contactState.pagination.totalCount = hadContact
            ? Math.max(0, contactState.pagination.totalCount - 1)
            : contactState.pagination.totalCount;
        }
      })
      .addCase(deleteEmergencyContactThunk.rejected, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getEmergencyContactRecordKey(staffId, recordId);

        state.emergencyContactDeleteErrorsByRecordKey[recordKey] =
          action.payload?.message ?? action.error.message ?? "Unable to delete emergency contact.";
        state.emergencyContactDeletingRecordKeys = state.emergencyContactDeletingRecordKeys.filter(
          (deletingRecordKey) => deletingRecordKey !== recordKey,
        );
      })
      .addCase(updateStaffThunk.pending, (state) => {
        state.updateError = null;
        state.updating = true;
      })
      .addCase(updateStaffThunk.fulfilled, (state, action) => {
        state.updateError = null;
        state.updating = false;
        const index = state.staffMembers.findIndex((staffMember) => staffMember.id === action.payload.staffMember.id);

        if (index !== -1) {
          state.staffMembers[index] = action.payload.staffMember;
        } else {
          state.staffMembers.push(action.payload.staffMember);
        }
      })
      .addCase(updateStaffThunk.rejected, (state, action) => {
        state.updateError = action.payload?.message ?? action.error.message ?? "Unable to update staff.";
        state.updating = false;
      })
      .addCase(updateStaffAddressThunk.pending, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getAddressRecordKey(staffId, recordId);

        state.addressUpdateErrorsByRecordKey[recordKey] = null;
        state.addressUpdatingRecordKeys = [...state.addressUpdatingRecordKeys, recordKey];
      })
      .addCase(updateStaffAddressThunk.fulfilled, (state, action) => {
        const { address, recordId, staffId } = action.payload;
        const recordKey = getAddressRecordKey(staffId, recordId);
        const addressState =
          state.addressListsByStaffId[staffId] ?? getInitialAddressListState(staffId);

        state.addressUpdateErrorsByRecordKey[recordKey] = null;
        state.addressUpdatingRecordKeys = state.addressUpdatingRecordKeys.filter(
          (updatingRecordKey) => updatingRecordKey !== recordKey,
        );
        addressState.addresses = upsertStaffAddress(addressState.addresses, address);
        state.addressListsByStaffId[staffId] = addressState;
      })
      .addCase(updateStaffAddressThunk.rejected, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getAddressRecordKey(staffId, recordId);

        state.addressUpdateErrorsByRecordKey[recordKey] =
          action.payload?.message ?? action.error.message ?? "Unable to update staff address.";
        state.addressUpdatingRecordKeys = state.addressUpdatingRecordKeys.filter(
          (updatingRecordKey) => updatingRecordKey !== recordKey,
        );
      })
      .addCase(deleteStaffThunk.pending, (state, action) => {
        state.deleteError = null;
        state.deletingStaffIds = [...state.deletingStaffIds, action.meta.arg];
      })
      .addCase(deleteStaffThunk.fulfilled, (state, action) => {
        state.deleteError = null;
        state.deletingStaffIds = state.deletingStaffIds.filter(
          (staffId) => staffId !== action.payload.staffId,
        );
        state.staffMembers = state.staffMembers.filter(
          (staffMember) => staffMember.id !== action.payload.staffId,
        );
        state.pagination.totalCount = Math.max(0, state.pagination.totalCount - 1);
      })
      .addCase(deleteStaffThunk.rejected, (state, action) => {
        state.deleteError = action.payload?.message ?? action.error.message ?? "Unable to delete staff.";
        state.deletingStaffIds = state.deletingStaffIds.filter(
          (staffId) => staffId !== action.meta.arg,
        );
      })
      .addCase(deleteStaffAddressThunk.pending, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getAddressRecordKey(staffId, recordId);

        state.addressDeleteErrorsByRecordKey[recordKey] = null;
        state.addressDeletingRecordKeys = [...state.addressDeletingRecordKeys, recordKey];
      })
      .addCase(deleteStaffAddressThunk.fulfilled, (state, action) => {
        const { recordId, staffId } = action.payload;
        const recordKey = getAddressRecordKey(staffId, recordId);
        const addressState = state.addressListsByStaffId[staffId];

        state.addressDeleteErrorsByRecordKey[recordKey] = null;
        state.addressDeletingRecordKeys = state.addressDeletingRecordKeys.filter(
          (deletingRecordKey) => deletingRecordKey !== recordKey,
        );

        if (addressState) {
          const hadAddress = addressState.addresses.some((address) => address.id === recordId);

          addressState.addresses = addressState.addresses.filter((address) => address.id !== recordId);
          addressState.pagination.totalCount = hadAddress
            ? Math.max(0, addressState.pagination.totalCount - 1)
            : addressState.pagination.totalCount;
        }
      })
      .addCase(deleteStaffAddressThunk.rejected, (state, action) => {
        const { recordId, staffId } = action.meta.arg;
        const recordKey = getAddressRecordKey(staffId, recordId);

        state.addressDeleteErrorsByRecordKey[recordKey] =
          action.payload?.message ?? action.error.message ?? "Unable to delete staff address.";
        state.addressDeletingRecordKeys = state.addressDeletingRecordKeys.filter(
          (deletingRecordKey) => deletingRecordKey !== recordKey,
        );
      })
      .addCase(fetchStaffThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.error = null;
        state.loading = !appendRequest && !action.meta.arg?.refresh;
        state.loadingMore = appendRequest;
        state.refreshing = Boolean(action.meta.arg?.refresh);
      })
      .addCase(fetchStaffThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = null;
        state.error = null;
        state.loading = false;
        state.loadingMore = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.refreshing = false;
        state.staffMembers = appendRequest
          ? mergeStaffMembers(state.staffMembers, action.payload.staffMembers)
          : action.payload.staffMembers;
      })
      .addCase(fetchStaffThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.error = action.payload?.message ?? action.error.message ?? "Unable to load staff.";
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
      })
      .addCase(fetchStaffAddressesThunk.pending, (state, action) => {
        const appendRequest = isAddressAppendRequest(action.meta.arg);
        const staffId = action.meta.arg.staffId;
        const addressState =
          state.addressListsByStaffId[staffId] ?? getInitialAddressListState(staffId);

        addressState.currentRequestId = action.meta.requestId;
        addressState.error = null;
        addressState.loading = !appendRequest && !action.meta.arg.refresh;
        addressState.loadingMore = appendRequest;
        addressState.refreshing = Boolean(action.meta.arg.refresh);
        state.addressListsByStaffId[staffId] = addressState;
      })
      .addCase(fetchStaffAddressesThunk.fulfilled, (state, action) => {
        const addressState =
          state.addressListsByStaffId[action.payload.staffId] ??
          getInitialAddressListState(action.payload.staffId);

        if (addressState.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAddressAppendRequest(action.meta.arg);

        addressState.addresses = appendRequest
          ? mergeStaffAddresses(addressState.addresses, action.payload.addresses)
          : action.payload.addresses;
        addressState.currentRequestId = null;
        addressState.error = null;
        addressState.loading = false;
        addressState.loadingMore = false;
        addressState.pagination = action.payload.pagination;
        addressState.query = action.payload.query;
        addressState.refreshing = false;
        state.addressListsByStaffId[action.payload.staffId] = addressState;
      })
      .addCase(fetchStaffAddressesThunk.rejected, (state, action) => {
        const staffId = action.meta.arg.staffId;
        const addressState =
          state.addressListsByStaffId[staffId] ?? getInitialAddressListState(staffId);

        if (addressState.currentRequestId !== action.meta.requestId) {
          return;
        }

        addressState.currentRequestId = null;
        addressState.error = action.payload?.message ?? action.error.message ?? "Unable to load staff addresses.";
        addressState.loading = false;
        addressState.loadingMore = false;
        addressState.refreshing = false;
        state.addressListsByStaffId[staffId] = addressState;
      })
      .addCase(fetchStaffByIdThunk.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(fetchStaffByIdThunk.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = null;
        const index = state.staffMembers.findIndex((staffMember) => staffMember.id === action.payload.id);

        if (index !== -1) {
          state.staffMembers[index] = action.payload;
        } else {
          state.staffMembers.push(action.payload);
        }
      })
      .addCase(fetchStaffByIdThunk.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = action.payload?.message ?? action.error.message ?? "Unable to load staff details.";
      })
      .addCase(resolveCurrentStaffThunk.pending, (state) => {
        state.currentStaffLoading = true;
        state.currentStaffError = null;
      })
      .addCase(resolveCurrentStaffThunk.fulfilled, (state, action) => {
        state.currentStaff = action.payload;
        state.currentStaffLoading = false;
        state.currentStaffError = null;
      })
      .addCase(resolveCurrentStaffThunk.rejected, (state, action) => {
        state.currentStaff = null;
        state.currentStaffLoading = false;
        state.currentStaffError =
          action.payload?.message ?? action.error.message ?? "Unable to resolve staff profile.";
      });
  },
});

export const { clearCurrentStaff } = staffSlice.actions;

export const selectCurrentStaff = (state: RootState) => state.staff.currentStaff;
export const selectCurrentStaffError = (state: RootState) => state.staff.currentStaffError;
export const selectCurrentStaffLoading = (state: RootState) => state.staff.currentStaffLoading;
export const selectStaffCreateError = (state: RootState) => state.staff.createError;
export const selectStaffCreating = (state: RootState) => state.staff.creating;
export const selectStaffActiveStatusToggling = (state: RootState, staffId?: string | null) =>
  staffId ? state.staff.activeStatusTogglingStaffIds.includes(staffId) : false;
export const selectStaffActiveStatusTogglingIds = (state: RootState) =>
  state.staff.activeStatusTogglingStaffIds;
export const selectStaffActiveStatusError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staff.activeStatusErrorsByStaffId[staffId] ?? null : null;
export const selectStaffAddressCreateError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staff.addressCreateErrorsByStaffId[staffId] ?? null : null;
export const selectStaffAddressCreating = (state: RootState, staffId?: string | null) =>
  staffId ? state.staff.addressCreatingStaffIds.includes(staffId) : false;
export const selectEmergencyContactCreateError = (state: RootState, staffId?: string | null) =>
  staffId ? state.staff.emergencyContactCreateErrorsByStaffId[staffId] ?? null : null;
export const selectEmergencyContactCreating = (state: RootState, staffId?: string | null) =>
  staffId ? state.staff.emergencyContactCreatingStaffIds.includes(staffId) : false;
export const selectEmergencyContactListState = (state: RootState, staffId?: string | null) =>
  staffId ? state.staff.emergencyContactListsByStaffId[staffId] : undefined;
export const selectEmergencyContactsByStaffId = (state: RootState, staffId?: string | null) =>
  selectEmergencyContactListState(state, staffId)?.contacts ?? [];
export const selectEmergencyContactUpdateError = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staff.emergencyContactUpdateErrorsByRecordKey[
        getEmergencyContactRecordKey(staffId, recordId)
      ] ?? null
    : null;
export const selectEmergencyContactUpdating = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staff.emergencyContactUpdatingRecordKeys.includes(
        getEmergencyContactRecordKey(staffId, recordId),
      )
    : false;
export const selectEmergencyContactDeleteError = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staff.emergencyContactDeleteErrorsByRecordKey[
        getEmergencyContactRecordKey(staffId, recordId)
      ] ?? null
    : null;
export const selectEmergencyContactDeleting = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staff.emergencyContactDeletingRecordKeys.includes(
        getEmergencyContactRecordKey(staffId, recordId),
      )
    : false;
export const selectStaffAddressDeleteError = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staff.addressDeleteErrorsByRecordKey[getAddressRecordKey(staffId, recordId)] ?? null
    : null;
export const selectStaffAddressDeleting = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staff.addressDeletingRecordKeys.includes(getAddressRecordKey(staffId, recordId))
    : false;
export const selectStaffAddressUpdateError = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staff.addressUpdateErrorsByRecordKey[getAddressRecordKey(staffId, recordId)] ?? null
    : null;
export const selectStaffAddressUpdating = (
  state: RootState,
  staffId?: string | null,
  recordId?: string | null,
) =>
  staffId && recordId
    ? state.staff.addressUpdatingRecordKeys.includes(getAddressRecordKey(staffId, recordId))
    : false;
export const selectStaffDeleteError = (state: RootState) => state.staff.deleteError;
export const selectStaffDeletingIds = (state: RootState) => state.staff.deletingStaffIds;
export const selectStaffAddressListState = (state: RootState, staffId?: string | null) =>
  staffId ? state.staff.addressListsByStaffId[staffId] : undefined;
export const selectStaffAddressesByStaffId = (state: RootState, staffId?: string | null) =>
  selectStaffAddressListState(state, staffId)?.addresses ?? [];
export const selectStaffMembers = (state: RootState) => state.staff.staffMembers;
export const selectStaffDetailsError = (state: RootState) => state.staff.detailsError;
export const selectStaffDetailsLoading = (state: RootState) => state.staff.detailsLoading;
export const selectStaffError = (state: RootState) => state.staff.error;
export const selectStaffLoading = (state: RootState) => state.staff.loading;
export const selectStaffLoadingMore = (state: RootState) => state.staff.loadingMore;
export const selectStaffPagination = (state: RootState) => state.staff.pagination;
export const selectStaffQuery = (state: RootState) => state.staff.query;
export const selectStaffRefreshing = (state: RootState) => state.staff.refreshing;
export const selectStaffUpdateError = (state: RootState) => state.staff.updateError;
export const selectStaffUpdating = (state: RootState) => state.staff.updating;
export const selectStaffById = (state: RootState, staffId?: string | null) =>
  state.staff.staffMembers.find((staffMember) => staffMember.id === staffId);

export default staffSlice.reducer;
