import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { clientService } from "@/services/client.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import type {
  CreateClientRequest,
  CreateClientResponse,
  ClientFilterValue,
  ClientListItem,
  ClientListQuery,
  ClientListResponse,
  DeleteClientResponse,
  UpdateClientRequest,
  UpdateClientResponse,
  ClientDuplicateGroup,
  MergeClientsResponse,
  MergeAllDuplicatesResponse,
  BlockClientResponse,
  UnblockClientResponse,
  ClientHistoryItem,
  ClientWithHistoryStats,
} from "@/types/client";

export type FetchClientsArgs = {
  inactive?: boolean;
  limit?: number;
  offset?: number;
  refresh?: boolean;
  reset?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: ClientListQuery["sort_order"];
};

export type FetchFilteredClientsArgs = FetchClientsArgs & {
  filter: ClientFilterValue;
  membership?: "all" | "has" | "none";
  status?: "active" | "all" | "blocked" | "inactive";
};

type FetchClientsRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

type CreateClientRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

const DUPLICATE_CLIENT_MESSAGE = "A client with this phone number already exists.";

const getNextQuery = (
  clientState: RootState["client"],
  args?: FetchClientsArgs,
): ClientListQuery => ({
  inactive: args && "inactive" in args ? args.inactive : clientState.query.inactive,
  limit: args?.limit ?? clientState.query.limit,
  offset: args?.offset ?? clientState.query.offset,
  search: args?.search ?? clientState.query.search,
  sort_by: args?.sort_by ?? clientState.query.sort_by,
  sort_order: args?.sort_order ?? clientState.query.sort_order,
});

const responseContainsDuplicateEntry = (value: unknown): boolean => {
  if (typeof value === "string") {
    return value.toUpperCase().includes("DUPLICATE_ENTRY");
  }

  if (Array.isArray(value)) {
    return value.some(responseContainsDuplicateEntry);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(responseContainsDuplicateEntry);
  }

  return false;
};

const getCreateClientErrorMessage = (error: unknown) => {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    responseContainsDuplicateEntry(error.responseData)
  ) {
    return DUPLICATE_CLIENT_MESSAGE;
  }

  return error instanceof ApiError ? error.message : getApiErrorMessage(error);
};

export const createClientThunk = createAsyncThunk<
  CreateClientResponse,
  Omit<CreateClientRequest, "salon_id">,
  { rejectValue: CreateClientRejectValue; state: RootState }
>("client/createClient", async (clientPayload, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const payload: CreateClientRequest = {
      ...clientPayload,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await clientService.createClient(payload);

    // The backend fires a "New Client Added" notification on create.
    void dispatch(fetchUnreadCountThunk());
    void dispatch(fetchClientsThunk({ ...getState().client.query, offset: 0, refresh: true, reset: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = getCreateClientErrorMessage(error);

    console.error("[Clients] Create failed", {
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

export const fetchClientsThunk = createAsyncThunk<
  ClientListResponse,
  FetchClientsArgs | undefined,
  { rejectValue: FetchClientsRejectValue; state: RootState }
>("client/fetchClients", async (args, { getState, rejectWithValue }) => {
  const clientState = getState().client;

  const nextQuery = getNextQuery(clientState, args);

  try {
    const salonId = selectActiveBranchId(getState());
    const payload = await clientService.getClients(nextQuery, salonId);

    return payload;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Clients] Fetch failed", {
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

export const searchClientsThunk = createAsyncThunk<
  ClientListResponse,
  FetchClientsArgs | undefined,
  { rejectValue: FetchClientsRejectValue; state: RootState }
>("client/searchClients", async (args, { getState, rejectWithValue }) => {
  const nextQuery = getNextQuery(getState().client, args);

  try {
    const salonId = selectActiveBranchId(getState());
    return await clientService.searchClients(nextQuery, salonId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});

export const filterClientsThunk = createAsyncThunk<
  ClientListResponse,
  FetchFilteredClientsArgs,
  { rejectValue: FetchClientsRejectValue; state: RootState }
>("client/filterClients", async (args, { getState, rejectWithValue }) => {
  const nextQuery = getNextQuery(getState().client, args);

  try {
    const salonId = selectActiveBranchId(getState());
    return await clientService.filterClients(nextQuery, args.filter, salonId, {
      membership: args.membership,
      status: args.status,
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

export const fetchClientByIdThunk = createAsyncThunk<
  ClientListItem,
  string,
  { rejectValue: { message: string }; state: RootState }
>("client/fetchClientById", async (clientId, { rejectWithValue }) => {
  try {
    return await clientService.getClient(clientId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Clients] Fetch by ID failed", {
      clientId,
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });

    return rejectWithValue({ message });
  }
});

export const updateClientThunk = createAsyncThunk<
  UpdateClientResponse,
  { clientId: string; updates: Omit<UpdateClientRequest, "salon_id"> },
  { rejectValue: { message: string }; state: RootState }
>("client/updateClient", async ({ clientId, updates }, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = selectActiveBranchId(getState());
    const payload: UpdateClientRequest = {
      ...updates,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await clientService.updateClient(clientId, payload);

    void dispatch(fetchClientByIdThunk(clientId));
    void dispatch(fetchClientsThunk({ ...getState().client.query, offset: 0, refresh: true, reset: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    return rejectWithValue({ message });
  }
});

export const deleteClientThunk = createAsyncThunk<
  DeleteClientResponse,
  string,
  { rejectValue: { message: string }; state: RootState }
>("client/deleteClient", async (clientId, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await clientService.deleteClient(clientId);

    void dispatch(fetchClientsThunk({ ...getState().client.query, offset: 0, refresh: true, reset: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    return rejectWithValue({ message });
  }
});

export const fetchDuplicatesThunk = createAsyncThunk<
  ClientDuplicateGroup[],
  string | null | undefined,
  { rejectValue: { message: string } }
>("client/fetchDuplicates", async (phoneNumber, { rejectWithValue }) => {
  if (!phoneNumber?.trim()) {
    return [];
  }

  try {
    return await clientService.getDuplicates(phoneNumber);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({ message });
  }
});

export const mergeClientsThunk = createAsyncThunk<
  MergeClientsResponse,
  { primaryId: string; secondaryId: string },
  { rejectValue: { message: string } }
>("client/mergeClients", async ({ primaryId, secondaryId }, { rejectWithValue }) => {
  try {
    return await clientService.mergeClients(primaryId, secondaryId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({ message });
  }
});

export const mergeAllDuplicatesThunk = createAsyncThunk<
  MergeAllDuplicatesResponse,
  void,
  { rejectValue: { message: string } }
>("client/mergeAllDuplicates", async (_, { rejectWithValue }) => {
  try {
    return await clientService.mergeDuplicates();
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({ message });
  }
});

export const blockClientThunk = createAsyncThunk<
  BlockClientResponse,
  { clientId: string; reason?: string },
  { rejectValue: { message: string }; state: RootState }
>("client/blockClient", async ({ clientId, reason }, { dispatch, rejectWithValue }) => {
  try {
    const response = await clientService.blockClient(clientId, reason);

    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({ message });
  }
});

export const updateBlockThunk = createAsyncThunk<
  BlockClientResponse,
  { clientId: string; reason: string },
  { rejectValue: { message: string }; state: RootState }
>("client/updateBlock", async ({ clientId, reason }, { dispatch, rejectWithValue }) => {
  try {
    const response = await clientService.updateBlockStatus(clientId, reason);

    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({ message });
  }
});

export const unblockClientThunk = createAsyncThunk<
  UnblockClientResponse,
  string,
  { rejectValue: { message: string }; state: RootState }
>("client/unblockClient", async (clientId, { dispatch, rejectWithValue }) => {
  try {
    const response = await clientService.unblockClient(clientId);

    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({ message });
  }
});

export const fetchClientHistoryThunk = createAsyncThunk<
  ClientHistoryItem[],
  string,
  { rejectValue: { message: string } }
>("client/fetchClientHistory", async (clientId, { rejectWithValue }) => {
  try {
    return await clientService.getClientHistory(clientId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({ message });
  }
});

export const fetchClientsWithHistoryStatsThunk = createAsyncThunk<
  ClientListResponse & { clientsWithStats: ClientWithHistoryStats[] },
  FetchClientsArgs | undefined,
  { rejectValue: FetchClientsRejectValue; state: RootState }
>("client/fetchClientsWithHistoryStats", async (args, { getState, rejectWithValue }) => {
  const clientState = getState().client;
  const nextQuery = getNextQuery(clientState, args);
  try {
    const salonId = selectActiveBranchId(getState());
    return await clientService.getClientsWithHistoryStats(nextQuery, salonId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);
    return rejectWithValue({
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
    });
  }
});
