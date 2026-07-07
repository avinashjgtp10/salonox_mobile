import { createSlice } from "@reduxjs/toolkit";

import {
  createClientThunk,
  fetchClientByIdThunk,
  fetchClientsThunk,
  type FetchClientsArgs,
} from "@/middleware/client/client.thunk";
import type { RootState } from "@/store";
import type { ClientListItem, ClientListPagination, ClientListQuery } from "@/types/client";

type ClientState = {
  clients: ClientListItem[];
  createError: string | null;
  creating: boolean;
  currentRequestId: string | null;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  pagination: ClientListPagination;
  query: ClientListQuery;
  refreshing: boolean;
  totalCount: number;
  detailsLoading: boolean;
  detailsError: string | null;
};

const initialQuery: ClientListQuery = {
  inactive: false,
  limit: 20,
  offset: 0,
  search: "",
  sort_by: "created_at",
  sort_order: "desc",
};

const initialPagination: ClientListPagination = {
  hasMore: true,
  limit: 20,
  nextOffset: 0,
  offset: 0,
};

const initialState: ClientState = {
  clients: [],
  createError: null,
  creating: false,
  currentRequestId: null,
  error: null,
  loading: false,
  loadingMore: false,
  pagination: initialPagination,
  query: initialQuery,
  refreshing: false,
  totalCount: 0,
  detailsLoading: false,
  detailsError: null,
};

const isAppendRequest = (args?: FetchClientsArgs) =>
  !args?.refresh && !args?.reset && typeof args?.offset === "number" && args.offset > 0;

const mergeClients = (existingClients: ClientListItem[], incomingClients: ClientListItem[]) => {
  const seenIds = new Set(existingClients.map((client) => client.id));
  const uniqueIncoming = incomingClients.filter((client) => !seenIds.has(client.id));

  return [...existingClients, ...uniqueIncoming];
};

const clientSlice = createSlice({
  name: "client",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(createClientThunk.pending, (state) => {
        state.createError = null;
        state.creating = true;
      })
      .addCase(createClientThunk.fulfilled, (state) => {
        state.createError = null;
        state.creating = false;
      })
      .addCase(createClientThunk.rejected, (state, action) => {
        state.createError = action.payload?.message ?? action.error.message ?? "Unable to create client.";
        state.creating = false;
      })
      .addCase(fetchClientsThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.error = null;
        state.loading = !appendRequest && !action.meta.arg?.refresh;
        state.loadingMore = appendRequest;
        state.refreshing = Boolean(action.meta.arg?.refresh);
      })
      .addCase(fetchClientsThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);

        state.clients = appendRequest
          ? mergeClients(state.clients, action.payload.clients)
          : action.payload.clients;
        state.currentRequestId = null;
        state.error = null;
        state.loading = false;
        state.loadingMore = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.refreshing = false;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchClientsThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.error = action.payload?.message ?? action.error.message ?? "Unable to load clients.";
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;

        console.error("[Clients Slice] Rejected", {
          error: state.error,
          requestId: action.meta.requestId,
          requestQuery: action.meta.arg,
        });
      })
      .addCase(fetchClientByIdThunk.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(fetchClientByIdThunk.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = null;
        const index = state.clients.findIndex((client) => client.id === action.payload.id);
        if (index !== -1) {
          state.clients[index] = action.payload;
        } else {
          state.clients.push(action.payload);
        }
      })
      .addCase(fetchClientByIdThunk.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = action.payload?.message ?? action.error.message ?? "Unable to load client details.";
      });
  },
});

export const selectClients = (state: RootState) => state.client.clients;
export const selectClientCreateError = (state: RootState) => state.client.createError;
export const selectClientCreating = (state: RootState) => state.client.creating;
export const selectClientsError = (state: RootState) => state.client.error;
export const selectClientsLoading = (state: RootState) => state.client.loading;
export const selectClientsLoadingMore = (state: RootState) => state.client.loadingMore;
export const selectClientsPagination = (state: RootState) => state.client.pagination;
export const selectClientsQuery = (state: RootState) => state.client.query;
export const selectClientsRefreshing = (state: RootState) => state.client.refreshing;
export const selectClientsTotalCount = (state: RootState) => state.client.totalCount;
export const selectClientDetailsLoading = (state: RootState) => state.client.detailsLoading;
export const selectClientDetailsError = (state: RootState) => state.client.detailsError;
export const selectClientById = (state: RootState, clientId?: string) =>
  state.client.clients.find((client) => client.id === clientId);

export default clientSlice.reducer;
