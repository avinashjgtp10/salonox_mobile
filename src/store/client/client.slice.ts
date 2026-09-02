import { createSlice } from "@reduxjs/toolkit";

import {
  createClientThunk,
  deleteClientThunk,
  filterClientsThunk,
  fetchClientByIdThunk,
  fetchClientsThunk,
  searchClientsThunk,
  updateClientThunk,
  fetchDuplicatesThunk,
  mergeClientsThunk,
  mergeAllDuplicatesThunk,
  blockClientThunk,
  updateBlockThunk,
  unblockClientThunk,
  fetchClientHistoryThunk,
  fetchClientsWithHistoryStatsThunk,
  type FetchClientsArgs,
} from "@/middleware/client/client.thunk";
import type { RootState } from "@/store";
import type {
  ClientFilterValue,
  ClientListItem,
  ClientListPagination,
  ClientListQuery,
  ClientDuplicateGroup,
  ClientHistoryItem,
  ClientHistoryStats,
} from "@/types/client";

type ClientState = {
  activeFilter: ClientFilterValue | null;
  clients: ClientListItem[];
  createError: string | null;
  creating: boolean;
  currentRequestId: string | null;
  deleteError: string | null;
  deletingClientIds: string[];
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  pagination: ClientListPagination;
  query: ClientListQuery;
  refreshing: boolean;
  totalCount: number;
  updateError: string | null;
  updating: boolean;
  detailsLoading: boolean;
  detailsError: string | null;
  duplicates: ClientDuplicateGroup[];
  duplicatesLoading: boolean;
  duplicatesError: string | null;
  merging: boolean;
  mergeError: string | null;
  mergingAll: boolean;
  mergeAllError: string | null;
  blockingClientIds: string[];
  blockError: string | null;
  history: ClientHistoryItem[] | null;
  historyLoading: boolean;
  historyError: string | null;
  historyClientId: string | null;
  historyStats: Record<string, ClientHistoryStats>;
  historyStatsLoading: boolean;
  historyStatsError: string | null;
};

const initialQuery: ClientListQuery = {
  inactive: false,
  limit: 10,
  offset: 0,
  search: "",
  sort_by: "created_at",
  sort_order: "desc",
};

const initialPagination: ClientListPagination = {
  hasMore: true,
  limit: 10,
  nextOffset: 0,
  offset: 0,
};

const initialState: ClientState = {
  activeFilter: null,
  clients: [],
  createError: null,
  creating: false,
  currentRequestId: null,
  deleteError: null,
  deletingClientIds: [],
  error: null,
  loading: false,
  loadingMore: false,
  pagination: initialPagination,
  query: initialQuery,
  refreshing: false,
  totalCount: 0,
  updateError: null,
  updating: false,
  detailsLoading: false,
  detailsError: null,
  duplicates: [],
  duplicatesLoading: false,
  duplicatesError: null,
  merging: false,
  mergeError: null,
  mergingAll: false,
  mergeAllError: null,
  blockingClientIds: [],
  blockError: null,
  history: null,
  historyLoading: false,
  historyError: null,
  historyClientId: null,
  historyStats: {},
  historyStatsLoading: false,
  historyStatsError: null,
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
        state.activeFilter = null;
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
      .addCase(searchClientsThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.error = null;
        state.loading = !appendRequest && !action.meta.arg?.refresh;
        state.loadingMore = appendRequest;
        state.refreshing = Boolean(action.meta.arg?.refresh);
      })
      .addCase(searchClientsThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);
        state.clients = appendRequest
          ? mergeClients(state.clients, action.payload.clients)
          : action.payload.clients;
        state.activeFilter = null;
        state.currentRequestId = null;
        state.error = null;
        state.loading = false;
        state.loadingMore = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.refreshing = false;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(searchClientsThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.error = action.payload?.message ?? action.error.message ?? "Unable to search clients.";
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
      })
      .addCase(filterClientsThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.error = null;
        state.loading = !appendRequest && !action.meta.arg.refresh;
        state.loadingMore = appendRequest;
        state.refreshing = Boolean(action.meta.arg.refresh);
      })
      .addCase(filterClientsThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);
        state.clients = appendRequest
          ? mergeClients(state.clients, action.payload.clients)
          : action.payload.clients;
        state.activeFilter = action.meta.arg.filter;
        state.currentRequestId = null;
        state.error = null;
        state.loading = false;
        state.loadingMore = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.refreshing = false;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(filterClientsThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.error = action.payload?.message ?? action.error.message ?? "Unable to filter clients.";
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
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
        }
      })
      .addCase(fetchClientByIdThunk.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = action.payload?.message ?? action.error.message ?? "Unable to load client details.";
      })
      .addCase(updateClientThunk.pending, (state) => {
        state.updateError = null;
        state.updating = true;
      })
      .addCase(updateClientThunk.fulfilled, (state, action) => {
        state.updateError = null;
        state.updating = false;

        const index = state.clients.findIndex((client) => client.id === action.payload.client.id);
        if (index !== -1) {
          state.clients[index] = action.payload.client;
        } else {
          state.clients.push(action.payload.client);
        }
      })
      .addCase(updateClientThunk.rejected, (state, action) => {
        state.updateError = action.payload?.message ?? action.error.message ?? "Unable to update client.";
        state.updating = false;
      })
      .addCase(deleteClientThunk.pending, (state, action) => {
        state.deleteError = null;
        state.deletingClientIds = [...state.deletingClientIds, action.meta.arg];
      })
      .addCase(deleteClientThunk.fulfilled, (state, action) => {
        state.deleteError = null;
        state.deletingClientIds = state.deletingClientIds.filter(
          (clientId) => clientId !== action.payload.clientId,
        );
        state.clients = state.clients.filter((client) => client.id !== action.payload.clientId);
        state.totalCount = Math.max(0, state.totalCount - 1);
      })
      .addCase(deleteClientThunk.rejected, (state, action) => {
        state.deleteError = action.payload?.message ?? action.error.message ?? "Unable to delete client.";
        state.deletingClientIds = state.deletingClientIds.filter(
          (clientId) => clientId !== action.meta.arg,
        );
      })
      .addCase(fetchDuplicatesThunk.pending, (state) => {
        state.duplicatesLoading = true;
        state.duplicatesError = null;
      })
      .addCase(fetchDuplicatesThunk.fulfilled, (state, action) => {
        state.duplicatesLoading = false;
        state.duplicatesError = null;
        state.duplicates = action.payload;
      })
      .addCase(fetchDuplicatesThunk.rejected, (state, action) => {
        state.duplicatesLoading = false;
        state.duplicatesError = action.payload?.message ?? action.error.message ?? "Unable to load duplicates.";
      })
      .addCase(mergeClientsThunk.pending, (state) => {
        state.merging = true;
        state.mergeError = null;
      })
      .addCase(mergeClientsThunk.fulfilled, (state, action) => {
        state.merging = false;
        state.mergeError = null;
        const { primaryId, secondaryId } = action.meta.arg;
        state.clients = state.clients.filter((client) => client.id !== secondaryId);
        const index = state.clients.findIndex((client) => client.id === primaryId);
        if (index !== -1) {
          state.clients[index] = action.payload.primaryClient;
        }
        state.totalCount = Math.max(0, state.totalCount - 1);
      })
      .addCase(mergeClientsThunk.rejected, (state, action) => {
        state.merging = false;
        state.mergeError = action.payload?.message ?? action.error.message ?? "Unable to merge clients.";
      })
      .addCase(mergeAllDuplicatesThunk.pending, (state) => {
        state.mergingAll = true;
        state.mergeAllError = null;
      })
      .addCase(mergeAllDuplicatesThunk.fulfilled, (state) => {
        state.mergingAll = false;
        state.mergeAllError = null;
        state.duplicates = [];
      })
      .addCase(mergeAllDuplicatesThunk.rejected, (state, action) => {
        state.mergingAll = false;
        state.mergeAllError = action.payload?.message ?? action.error.message ?? "Unable to merge duplicates.";
      })
      .addCase(blockClientThunk.pending, (state, action) => {
        state.blockError = null;
        state.blockingClientIds = [...state.blockingClientIds, action.meta.arg.clientId];
      })
      .addCase(blockClientThunk.fulfilled, (state, action) => {
        state.blockError = null;
        state.blockingClientIds = state.blockingClientIds.filter(id => id !== action.meta.arg.clientId);
        const updatedClient = action.payload.client;
        const index = state.clients.findIndex((client) => client.id === updatedClient.id);
        if (index !== -1) {
          state.clients[index] = updatedClient;
        }
      })
      .addCase(blockClientThunk.rejected, (state, action) => {
        state.blockError = action.payload?.message ?? action.error.message ?? "Unable to block client.";
        state.blockingClientIds = state.blockingClientIds.filter(id => id !== action.meta.arg.clientId);
      })
      .addCase(updateBlockThunk.pending, (state, action) => {
        state.blockError = null;
        state.blockingClientIds = [...state.blockingClientIds, action.meta.arg.clientId];
      })
      .addCase(updateBlockThunk.fulfilled, (state, action) => {
        state.blockError = null;
        state.blockingClientIds = state.blockingClientIds.filter(id => id !== action.meta.arg.clientId);
        const updatedClient = action.payload.client;
        const index = state.clients.findIndex((client) => client.id === updatedClient.id);
        if (index !== -1) {
          state.clients[index] = updatedClient;
        }
      })
      .addCase(updateBlockThunk.rejected, (state, action) => {
        state.blockError = action.payload?.message ?? action.error.message ?? "Unable to update block status.";
        state.blockingClientIds = state.blockingClientIds.filter(id => id !== action.meta.arg.clientId);
      })
      .addCase(unblockClientThunk.pending, (state, action) => {
        state.blockError = null;
        state.blockingClientIds = [...state.blockingClientIds, action.meta.arg];
      })
      .addCase(unblockClientThunk.fulfilled, (state, action) => {
        state.blockError = null;
        state.blockingClientIds = state.blockingClientIds.filter(id => id !== action.meta.arg);
        const updatedClient = action.payload.client;
        const index = state.clients.findIndex((client) => client.id === updatedClient.id);
        if (index !== -1) {
          state.clients[index] = updatedClient;
        }
      })
      .addCase(unblockClientThunk.rejected, (state, action) => {
        state.blockError = action.payload?.message ?? action.error.message ?? "Unable to unblock client.";
        state.blockingClientIds = state.blockingClientIds.filter(id => id !== action.meta.arg);
      })
      .addCase(fetchClientHistoryThunk.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchClientHistoryThunk.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.historyError = null;
        state.history = action.payload;
        state.historyClientId = action.meta.arg;
      })
      .addCase(fetchClientHistoryThunk.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.payload?.message ?? action.error.message ?? "Unable to load client history.";
      })
      .addCase(fetchClientsWithHistoryStatsThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);
        state.currentRequestId = action.meta.requestId;
        state.historyStatsLoading = !appendRequest && !action.meta.arg?.refresh;
        state.historyStatsError = null;
      })
      .addCase(fetchClientsWithHistoryStatsThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }
        const appendRequest = isAppendRequest(action.meta.arg);
        state.clients = appendRequest
          ? mergeClients(state.clients, action.payload.clients)
          : action.payload.clients;
        
        action.payload.clientsWithStats.forEach((item) => {
          state.historyStats[item.client.id] = item.stats;
        });

        state.activeFilter = null;
        state.currentRequestId = null;
        state.historyStatsError = null;
        state.historyStatsLoading = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchClientsWithHistoryStatsThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }
        state.currentRequestId = null;
        state.historyStatsLoading = false;
        state.historyStatsError = action.payload?.message ?? action.error.message ?? "Unable to load history statistics.";
      });
  },
});

export const selectClients = (state: RootState) => state.client.clients;
export const selectClientsActiveFilter = (state: RootState) => state.client.activeFilter;
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
export const selectClientUpdating = (state: RootState) => state.client.updating;
export const selectClientUpdateError = (state: RootState) => state.client.updateError;
export const selectClientDeletingIds = (state: RootState) => state.client.deletingClientIds;
export const selectClientDeleteError = (state: RootState) => state.client.deleteError;
export const selectClientById = (state: RootState, clientId?: string) =>
  state.client.clients.find((client) => client.id === clientId);

export const selectClientDuplicates = (state: RootState) => state.client.duplicates;
export const selectClientDuplicatesLoading = (state: RootState) => state.client.duplicatesLoading;
export const selectClientDuplicatesError = (state: RootState) => state.client.duplicatesError;
export const selectClientMerging = (state: RootState) => state.client.merging;
export const selectClientMergeError = (state: RootState) => state.client.mergeError;
export const selectClientMergingAll = (state: RootState) => state.client.mergingAll;
export const selectClientMergeAllError = (state: RootState) => state.client.mergeAllError;
export const selectClientBlockingIds = (state: RootState) => state.client.blockingClientIds;
export const selectClientBlockError = (state: RootState) => state.client.blockError;
export const selectClientHistory = (state: RootState) => state.client.history;
export const selectClientHistoryLoading = (state: RootState) => state.client.historyLoading;
export const selectClientHistoryError = (state: RootState) => state.client.historyError;
export const selectClientHistoryClientId = (state: RootState) => state.client.historyClientId;
export const selectClientHistoryStats = (state: RootState) => state.client.historyStats;
export const selectClientHistoryStatsLoading = (state: RootState) => state.client.historyStatsLoading;
export const selectClientHistoryStatsError = (state: RootState) => state.client.historyStatsError;

export default clientSlice.reducer;
