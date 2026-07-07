import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { staffService } from "@/services/staff.service";
import type { StaffMember } from "@/data/teamData";
import type { RootState } from "@/store";
import { selectCurrentUser } from "@/store/user/user.slice";
import type {
  CreateEmergencyContactFormFields,
  CreateEmergencyContactRequest,
  CreateEmergencyContactResponse,
  CreateStaffAddressRequest,
  CreateStaffAddressResponse,
  CreateStaffRequest,
  CreateStaffResponse,
  DeleteEmergencyContactResponse,
  DeleteStaffAddressResponse,
  DeleteStaffResponse,
  EmergencyContactListResponse,
  StaffAddressListQuery,
  StaffAddressListResponse,
  StaffListQuery,
  StaffListResponse,
  UpdateEmergencyContactFormFields,
  UpdateEmergencyContactRequest,
  UpdateEmergencyContactResponse,
  UpdateStaffAddressRequest,
  UpdateStaffAddressResponse,
  UpdateStaffRequest,
  UpdateStaffResponse,
} from "@/types/staff";
import { isValidStaffId } from "@/utils/staffIds";

export type FetchStaffArgs = {
  limit?: number;
  page?: number;
  refresh?: boolean;
  reset?: boolean;
};

export type FetchStaffAddressesArgs = FetchStaffArgs & {
  staffId: string;
};

export type FetchEmergencyContactsArgs = FetchStaffArgs & {
  staffId: string;
};

type FetchStaffRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type FetchStaffAddressesRejectValue = FetchStaffRejectValue;

type CreateStaffRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type CreateStaffAddressRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type CreateEmergencyContactRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type UpdateStaffRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type UpdateStaffAddressRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type UpdateEmergencyContactRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type DeleteStaffRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type DeleteStaffAddressRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type DeleteEmergencyContactRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const createStaffThunk = createAsyncThunk<
  CreateStaffResponse,
  Omit<CreateStaffRequest, "salon_id">,
  { rejectValue: CreateStaffRejectValue; state: RootState }
>("staff/createStaff", async (staffPayload, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    const payload: CreateStaffRequest = {
      ...staffPayload,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await staffService.createStaff(payload);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Create failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const createStaffAddressThunk = createAsyncThunk<
  CreateStaffAddressResponse,
  { address: Omit<CreateStaffAddressRequest, "salon_id">; staffId: string },
  { rejectValue: CreateStaffAddressRejectValue; state: RootState }
>("staff/createStaffAddress", async ({ address, staffId }, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    const payload: CreateStaffAddressRequest = {
      ...address,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await staffService.createStaffAddress(staffId, payload);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Create address failed", {
      staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

const trimOptional = (value?: string) => {
  const trimmedValue = value?.trim();

  return trimmedValue || undefined;
};

const mapEmergencyContactFormToRequest = (
  contact: CreateEmergencyContactFormFields,
): Omit<CreateEmergencyContactRequest, "salon_id"> => {
  const fullName = trimOptional(contact.fullName) ?? trimOptional(contact.name);
  const phone = trimOptional(contact.phone) ?? trimOptional(contact.phoneNumber);

  return {
    ...(trimOptional(contact.address) ? { address: trimOptional(contact.address) } : {}),
    ...(trimOptional(contact.email) ? { email: trimOptional(contact.email) } : {}),
    ...(fullName ? { full_name: fullName, name: fullName } : {}),
    ...(typeof contact.isPrimary === "boolean" ? { is_primary: contact.isPrimary } : {}),
    ...(trimOptional(contact.notes) ? { notes: trimOptional(contact.notes) } : {}),
    ...(phone ? { phone, phone_number: phone } : {}),
    ...(trimOptional(contact.relationship)
      ? { relationship: trimOptional(contact.relationship) }
      : {}),
  };
};

const hasEmergencyContactUpdateFields = (payload: Omit<UpdateEmergencyContactRequest, "salon_id">) =>
  Object.keys(payload).length > 0;

export const createEmergencyContactThunk = createAsyncThunk<
  CreateEmergencyContactResponse,
  { contact: CreateEmergencyContactFormFields; staffId: string },
  { rejectValue: CreateEmergencyContactRejectValue; state: RootState }
>("staff/createEmergencyContact", async ({ contact, staffId }, { getState, rejectWithValue }) => {
  try {
    const payloadWithoutSalon = mapEmergencyContactFormToRequest(contact);

    if (!staffId.trim()) {
      return rejectWithValue({
        message: "Unable to create emergency contact because no staff member is selected.",
      });
    }

    if (!payloadWithoutSalon.full_name && !payloadWithoutSalon.name) {
      return rejectWithValue({ message: "Emergency contact name is required." });
    }

    if (!payloadWithoutSalon.relationship) {
      return rejectWithValue({ message: "Emergency contact relationship is required." });
    }

    if (!payloadWithoutSalon.phone && !payloadWithoutSalon.phone_number) {
      return rejectWithValue({ message: "Emergency contact phone number is required." });
    }

    const salonId = selectCurrentUser(getState())?.salonId;
    const payload: CreateEmergencyContactRequest = {
      ...payloadWithoutSalon,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await staffService.createEmergencyContact(staffId, payload);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Create emergency contact failed", {
      staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const updateEmergencyContactThunk = createAsyncThunk<
  UpdateEmergencyContactResponse,
  {
    recordId: string;
    staffId: string;
    updates: UpdateEmergencyContactFormFields;
  },
  { rejectValue: UpdateEmergencyContactRejectValue; state: RootState }
>(
  "staff/updateEmergencyContact",
  async ({ recordId, staffId, updates }, { getState, rejectWithValue }) => {
    try {
      const payloadWithoutSalon = mapEmergencyContactFormToRequest(updates);

      if (!staffId.trim()) {
        return rejectWithValue({
          message: "Unable to update emergency contact because no staff member is selected.",
        });
      }

      if (!recordId.trim()) {
        return rejectWithValue({
          message: "Unable to update emergency contact because no contact is selected.",
        });
      }

      if (!hasEmergencyContactUpdateFields(payloadWithoutSalon)) {
        return rejectWithValue({ message: "No emergency contact changes to update." });
      }

      const salonId = selectCurrentUser(getState())?.salonId;
      const payload: UpdateEmergencyContactRequest = {
        ...payloadWithoutSalon,
        ...(salonId ? { salon_id: salonId } : {}),
      };

      return await staffService.updateEmergencyContact(staffId, recordId, payload);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

      console.error("[Staff] Update emergency contact failed", {
        recordId,
        staffId,
        message,
        responseBody: error instanceof ApiError ? error.responseData : undefined,
        status: error instanceof ApiError ? error.status : undefined,
      });

      return rejectWithValue({
        message,
        responseBody: error instanceof ApiError ? error.responseData : undefined,
        status: error instanceof ApiError ? error.status : undefined,
      });
    }
  },
);

export const fetchStaffThunk = createAsyncThunk<
  StaffListResponse,
  FetchStaffArgs | undefined,
  { rejectValue: FetchStaffRejectValue; state: RootState }
>("staff/fetchStaff", async (args, { getState, rejectWithValue }) => {
  const staffState = getState().staff;
  const nextQuery: Pick<StaffListQuery, "limit" | "page"> = {
    limit: args?.limit ?? staffState.query.limit,
    page: args?.page ?? staffState.query.page,
  };

  try {
    return await staffService.getStaff(nextQuery);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Fetch failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const fetchStaffAddressesThunk = createAsyncThunk<
  StaffAddressListResponse,
  FetchStaffAddressesArgs,
  { rejectValue: FetchStaffAddressesRejectValue; state: RootState }
>("staff/fetchStaffAddresses", async (args, { getState, rejectWithValue }) => {
  const addressState = getState().staff.addressListsByStaffId[args.staffId];
  const nextQuery: Pick<StaffAddressListQuery, "limit" | "page"> = {
    limit: args.limit ?? addressState?.query.limit ?? 20,
    page: args.page ?? addressState?.query.page ?? 1,
  };

  try {
    if (!isValidStaffId(args.staffId)) {
      console.warn("[Staff] Skipping address fetch because staffId is not a valid UUID", {
        staffId: args.staffId,
      });

      return rejectWithValue({
        message: "A valid staff UUID is required to load staff addresses.",
        status: 400,
      });
    }

    return await staffService.getStaffAddresses(args.staffId, nextQuery);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Fetch addresses failed", {
      staffId: args.staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const fetchEmergencyContactsThunk = createAsyncThunk<
  EmergencyContactListResponse,
  FetchEmergencyContactsArgs,
  { rejectValue: FetchStaffAddressesRejectValue; state: RootState }
>("staff/fetchEmergencyContacts", async (args, { getState, rejectWithValue }) => {
  const contactState = getState().staff.emergencyContactListsByStaffId[args.staffId];
  const nextQuery = {
    limit: args.limit ?? contactState?.query.limit ?? 20,
    page: args.page ?? contactState?.query.page ?? 1,
  };

  try {
    if (!isValidStaffId(args.staffId)) {
      console.warn("[Staff] Skipping emergency contacts fetch because staffId is not a valid UUID", {
        staffId: args.staffId,
      });

      return rejectWithValue({
        message: "A valid staff UUID is required to load emergency contacts.",
        status: 400,
      });
    }

    return await staffService.getEmergencyContacts(args.staffId, nextQuery);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Fetch emergency contacts failed", {
      staffId: args.staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const updateStaffThunk = createAsyncThunk<
  UpdateStaffResponse,
  { staffId: string; updates: Omit<UpdateStaffRequest, "salon_id"> },
  { rejectValue: UpdateStaffRejectValue; state: RootState }
>("staff/updateStaff", async ({ staffId, updates }, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    const payload: UpdateStaffRequest = {
      ...updates,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await staffService.updateStaff(staffId, payload);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Update failed", {
      staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const updateStaffAddressThunk = createAsyncThunk<
  UpdateStaffAddressResponse,
  {
    recordId: string;
    staffId: string;
    updates: Omit<UpdateStaffAddressRequest, "salon_id">;
  },
  { rejectValue: UpdateStaffAddressRejectValue; state: RootState }
>("staff/updateStaffAddress", async ({ recordId, staffId, updates }, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    const payload: UpdateStaffAddressRequest = {
      ...updates,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await staffService.updateStaffAddress(staffId, recordId, payload);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Update address failed", {
      recordId,
      staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const deleteStaffThunk = createAsyncThunk<
  DeleteStaffResponse,
  string,
  { rejectValue: DeleteStaffRejectValue; state: RootState }
>("staff/deleteStaff", async (staffId, { rejectWithValue }) => {
  try {
    return await staffService.deleteStaff(staffId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Delete failed", {
      staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const deleteStaffAddressThunk = createAsyncThunk<
  DeleteStaffAddressResponse,
  { recordId: string; staffId: string },
  { rejectValue: DeleteStaffAddressRejectValue; state: RootState }
>("staff/deleteStaffAddress", async ({ recordId, staffId }, { rejectWithValue }) => {
  try {
    return await staffService.deleteStaffAddress(staffId, recordId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Delete address failed", {
      recordId,
      staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const deleteEmergencyContactThunk = createAsyncThunk<
  DeleteEmergencyContactResponse,
  { recordId: string; staffId: string },
  { rejectValue: DeleteEmergencyContactRejectValue; state: RootState }
>("staff/deleteEmergencyContact", async ({ recordId, staffId }, { rejectWithValue }) => {
  try {
    return await staffService.deleteEmergencyContact(staffId, recordId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Delete emergency contact failed", {
      recordId,
      staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const fetchStaffByIdThunk = createAsyncThunk<
  StaffMember,
  string,
  { rejectValue: { message: string }; state: RootState }
>("staff/fetchStaffById", async (staffId, { rejectWithValue }) => {
  try {
    return await staffService.getStaffMember(staffId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Staff] Fetch by ID failed", {
      staffId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({ message });
  }
});
