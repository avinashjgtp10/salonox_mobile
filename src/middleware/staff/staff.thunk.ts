import { createAsyncThunk } from "@reduxjs/toolkit";
import { mapEmergencyContactFormToRequest } from "@/features/staff/utils/staffFormMappers";

import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { isUserLogoutInProgress } from "@/services/authLifecycle";
import { staffService } from "@/services/staff.service";
import type { StaffMember } from "@/data/teamData";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
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
  SetStaffWagesRequest,
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
import { isStaffExperienceUser } from "@/utils/routeResolver";

// Staff accounts have no role permissions on the regular staff routes; the staff
// app only ever shows their own profile, which comes from the mobile staff API.
const isOwnStaffRead = (state: RootState) => isStaffExperienceUser(selectCurrentUser(state));

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

export type CreateStaffThunkArgs = {
  staff: Omit<CreateStaffRequest, "salon_id">;
  wages?: SetStaffWagesRequest | null;
};

export const createStaffThunk = createAsyncThunk<
  CreateStaffResponse,
  CreateStaffThunkArgs,
  { rejectValue: CreateStaffRejectValue; state: RootState }
>("staff/createStaff", async ({ staff: staffPayload, wages }, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const payload: CreateStaffRequest = {
      ...staffPayload,
      is_active: true,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await staffService.createStaff(payload);

    // Match web: create may ignore is_active, so activate the saved staff explicitly.
    // Creation has already succeeded; an activation failure must not invite a duplicate create.
    try {
      if (!response.staffMember.id) throw new Error("The created staff ID was not returned.");
      await staffService.activateStaff(response.staffMember.id);
      response.staffMember = await staffService.getStaffMember(response.staffMember.id);
      if (response.staffMember.status === "Inactive") throw new Error("Staff is still inactive.");
    } catch {
      response.activationWarning = "Staff was created, but active status could not be confirmed. Check the staff profile before retrying activation.";
    }

    if (wages && response.staffMember.id) {
      try {
        await staffService.setStaffWages(response.staffMember.id, wages);
      } catch {
        // Wages are optional here; the staff record itself is already saved.
      }
    }

    void dispatch(fetchStaffThunk({ ...getState().staff.query, page: 1, refresh: true, reset: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


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
>("staff/createStaffAddress", async ({ address, staffId }, { rejectWithValue }) => {
  try {
    const payload: CreateStaffAddressRequest = { ...address };

    return await staffService.createStaffAddress(staffId, payload);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

const hasEmergencyContactUpdateFields = (payload: Omit<UpdateEmergencyContactRequest, "salon_id">) =>
  Object.keys(payload).length > 0;

export const createEmergencyContactThunk = createAsyncThunk<
  CreateEmergencyContactResponse,
  { contact: CreateEmergencyContactFormFields; staffId: string },
  { rejectValue: CreateEmergencyContactRejectValue; state: RootState }
>("staff/createEmergencyContact", async ({ contact, staffId }, { rejectWithValue }) => {
  try {
    const payloadWithoutSalon = mapEmergencyContactFormToRequest(contact);

    if (!staffId.trim()) {
      return rejectWithValue({
        message: "Unable to create emergency contact because no staff member is selected.",
      });
    }

    if (!payloadWithoutSalon.full_name) {
      return rejectWithValue({ message: "Emergency contact name is required." });
    }

    if (!payloadWithoutSalon.relationship) {
      return rejectWithValue({ message: "Emergency contact relationship is required." });
    }

    if (!payloadWithoutSalon.phone_number) {
      return rejectWithValue({ message: "Emergency contact phone number is required." });
    }

    const payload: CreateEmergencyContactRequest = payloadWithoutSalon;

    return await staffService.createEmergencyContact(staffId, payload);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


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
  async ({ recordId, staffId, updates }, { rejectWithValue }) => {
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

      const payload: UpdateEmergencyContactRequest = payloadWithoutSalon;

      return await staffService.updateEmergencyContact(staffId, recordId, payload);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


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
    const salonId = selectActiveBranchId(getState());

    return await staffService.getStaff(nextQuery, salonId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    if (isUserLogoutInProgress() || !selectCurrentUser(getState())) {
      return rejectWithValue({
        message,
        responseBody: error instanceof ApiError ? error.responseData : undefined,
        status: error instanceof ApiError ? error.status : undefined,
      });
    }


    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
}, {
  condition: (_, { getState }) =>
    !isUserLogoutInProgress() && Boolean(selectCurrentUser(getState())),
});

export const resolveCurrentStaffThunk = createAsyncThunk<
  StaffMember,
  string,
  { rejectValue: FetchStaffRejectValue; state: RootState }
>("staff/resolveCurrentStaff", async (authenticatedUserId, { getState, rejectWithValue }) => {
  const normalizedUserId = authenticatedUserId.trim();

  if (!normalizedUserId) {
    return rejectWithValue({
      message: "Unable to resolve staff profile because the authenticated user ID is missing.",
    });
  }

  try {
    // Staff accounts: the backend resolves the profile from the JWT (inactive
    // profiles are rejected there), so a single call replaces the list scan.
    if (isOwnStaffRead(getState())) {
      const ownProfile = await staffService.getStaffMember(normalizedUserId, { self: true });
      if (ownProfile.userId && ownProfile.userId !== normalizedUserId) {
        return rejectWithValue({ message: "Your staff session has changed. Please sign in again." });
      }
      return ownProfile;
    }

    const salonId = selectActiveBranchId(getState());
    const matches: StaffMember[] = [];
    const limit = 100;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await staffService.getStaff({ limit, page }, salonId);

      matches.push(
        ...response.staffMembers.filter((staffMember) => staffMember.userId === normalizedUserId && staffMember.status !== "Inactive"),
      );

      hasMore = response.pagination.hasMore;

      if (response.pagination.nextPage <= response.pagination.page) {
        break;
      }

      page = response.pagination.nextPage;
    }

    if (matches.length === 1) {
      return matches[0];
    }

    if (matches.length > 1) {
      return rejectWithValue({
        message: "Multiple staff profiles are linked to this authenticated user.",
      });
    }

    return rejectWithValue({
      message: "No staff profile is linked to this authenticated user.",
    });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


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
    limit: args.limit ?? addressState?.query.limit ?? 10,
    page: args.page ?? addressState?.query.page ?? 1,
  };

  try {
    if (!isValidStaffId(args.staffId)) {

      return rejectWithValue({
        message: "A valid staff UUID is required to load staff addresses.",
        status: 400,
      });
    }

    return await staffService.getStaffAddresses(args.staffId, nextQuery, { self: isOwnStaffRead(getState()) });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


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
    limit: args.limit ?? contactState?.query.limit ?? 10,
    page: args.page ?? contactState?.query.page ?? 1,
  };

  try {
    if (!isValidStaffId(args.staffId)) {

      return rejectWithValue({
        message: "A valid staff UUID is required to load emergency contacts.",
        status: 400,
      });
    }

    return await staffService.getEmergencyContacts(args.staffId, nextQuery, { self: isOwnStaffRead(getState()) });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const updateStaffThunk = createAsyncThunk<
  UpdateStaffResponse,
  {
    staffId: string;
    updates: Omit<UpdateStaffRequest, "salon_id">;
    wages?: SetStaffWagesRequest | null;
  },
  { rejectValue: UpdateStaffRejectValue; state: RootState }
>("staff/updateStaff", async ({ staffId, updates, wages }, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const payload: UpdateStaffRequest = {
      ...updates,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await staffService.updateStaff(staffId, payload);

    if (wages) {
      try {
        await staffService.setStaffWages(staffId, wages);
      } catch {
        // Wages are optional here; the staff record itself is already saved.
      }
    }

    void dispatch(fetchStaffByIdThunk(staffId));
    void dispatch(fetchStaffThunk({ ...getState().staff.query, page: 1, refresh: true, reset: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

type SetStaffActiveStatusRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const setStaffActiveStatusThunk = createAsyncThunk<
  StaffMember,
  { nextStatus: "active" | "inactive"; staffId: string },
  { rejectValue: SetStaffActiveStatusRejectValue; state: RootState }
>("staff/setActiveStatus", async ({ nextStatus, staffId }, { dispatch, getState, rejectWithValue }) => {
  try {
    if (nextStatus === "inactive") {
      await staffService.deactivateStaff(staffId);
    } else {
      await staffService.activateStaff(staffId);
    }
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }

  let refreshed: StaffMember;

  try {
    refreshed = await staffService.getStaffMember(staffId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


    return rejectWithValue({
      message: `The request to the server may have gone through, but we couldn't confirm it: ${message}`,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }

  const expectedInactive = nextStatus === "inactive";
  const actuallyInactive = refreshed.status === "Inactive";

  if (expectedInactive !== actuallyInactive) {

    return rejectWithValue({
      message:
        nextStatus === "inactive"
          ? "Staff could not be confirmed as deactivated. Please try again."
          : "Staff could not be confirmed as reactivated. Please try again.",
    });
  }

  void dispatch(fetchStaffThunk({ ...getState().staff.query, page: 1, refresh: true, reset: true }));

  return refreshed;
});

export const updateStaffAddressThunk = createAsyncThunk<
  UpdateStaffAddressResponse,
  {
    recordId: string;
    staffId: string;
    updates: Omit<UpdateStaffAddressRequest, "salon_id">;
  },
  { rejectValue: UpdateStaffAddressRejectValue; state: RootState }
>("staff/updateStaffAddress", async ({ recordId, staffId, updates }, { rejectWithValue }) => {
  try {
    const payload: UpdateStaffAddressRequest = { ...updates };

    return await staffService.updateStaffAddress(staffId, recordId, payload);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


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
>("staff/deleteStaff", async (staffId, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await staffService.deleteStaff(staffId);

    void dispatch(fetchStaffThunk({ ...getState().staff.query, page: 1, refresh: true, reset: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


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
>("staff/fetchStaffById", async (staffId, { getState, rejectWithValue }) => {
  try {
    return await staffService.getStaffMember(staffId, { self: isOwnStaffRead(getState()) });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);


    return rejectWithValue({ message });
  }
});
