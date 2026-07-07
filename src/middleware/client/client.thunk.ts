import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { clientService } from "@/services/client.service";
import type { RootState } from "@/store";
import { selectCurrentUser } from "@/store/user/user.slice";
import type {
  CreateClientRequest,
  CreateClientResponse,
  ClientListItem,
  ClientListQuery,
  ClientListResponse,
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
>("client/createClient", async (clientPayload, { getState, rejectWithValue }) => {
  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    const payload: CreateClientRequest = {
      ...clientPayload,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await clientService.createClient(payload);
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

  const nextQuery: ClientListQuery = {
    inactive: args?.inactive ?? clientState.query.inactive,
    limit: args?.limit ?? clientState.query.limit,
    offset: args?.offset ?? clientState.query.offset,
    search: args?.search ?? clientState.query.search,
    sort_by: args?.sort_by ?? clientState.query.sort_by,
    sort_order: args?.sort_order ?? clientState.query.sort_order,
  };

  try {
    const salonId = selectCurrentUser(getState())?.salonId;
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
