import { createSlice } from "@reduxjs/toolkit";

import {
  deleteUserThunk,
  fetchUserByIdThunk,
  fetchUsersThunk,
  updateUserRoleThunk,
  updateUserThunk,
  type FetchUsersArgs,
} from "@/middleware/users/users.thunk";
import type { RootState } from "@/store";
import type { UserDetail, UserListItem, UserListPagination, UserListQuery } from "@/types/user";

type UsersState = {
  currentRequestId: string | null;
  deleteError: string | null;
  deletingUserIds: string[];
  detail: UserDetail | null;
  detailError: string | null;
  detailLoading: boolean;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  pagination: UserListPagination;
  query: UserListQuery;
  refreshing: boolean;
  roleUpdateError: string | null;
  roleUpdating: boolean;
  totalCount: number;
  updateError: string | null;
  updating: boolean;
  users: UserListItem[];
};

const initialQuery: UserListQuery = {
  limit: 20,
  offset: 0,
  search: "",
  sort_by: "created_at",
  sort_order: "desc",
};

const initialPagination: UserListPagination = {
  hasMore: true,
  limit: 20,
  nextOffset: 0,
  offset: 0,
};

const initialState: UsersState = {
  currentRequestId: null,
  deleteError: null,
  deletingUserIds: [],
  detail: null,
  detailError: null,
  detailLoading: false,
  error: null,
  loading: false,
  loadingMore: false,
  pagination: initialPagination,
  query: initialQuery,
  refreshing: false,
  roleUpdateError: null,
  roleUpdating: false,
  totalCount: 0,
  updateError: null,
  updating: false,
  users: [],
};

const isAppendRequest = (args?: FetchUsersArgs) =>
  !args?.refresh && !args?.reset && typeof args?.offset === "number" && args.offset > 0;

const mergeUsers = (existingUsers: UserListItem[], incomingUsers: UserListItem[]) => {
  const seenIds = new Set(existingUsers.map((user) => user.id));
  const uniqueIncoming = incomingUsers.filter((user) => !seenIds.has(user.id));

  return [...existingUsers, ...uniqueIncoming];
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsersThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.error = null;
        state.loading = !appendRequest && !action.meta.arg?.refresh;
        state.loadingMore = appendRequest;
        state.refreshing = Boolean(action.meta.arg?.refresh);
      })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);

        state.users = appendRequest
          ? mergeUsers(state.users, action.payload.users)
          : action.payload.users;
        state.currentRequestId = null;
        state.error = null;
        state.loading = false;
        state.loadingMore = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.refreshing = false;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.error = action.payload?.message ?? action.error.message ?? "Unable to load users.";
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;

        console.error("[Users Slice] Rejected", {
          error: state.error,
          requestId: action.meta.requestId,
          requestQuery: action.meta.arg,
        });
      })
      .addCase(fetchUserByIdThunk.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchUserByIdThunk.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.detailError = null;
        state.detail = action.payload;
      })
      .addCase(fetchUserByIdThunk.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError =
          action.payload?.message ?? action.error.message ?? "Unable to load user details.";
      })
      .addCase(deleteUserThunk.pending, (state, action) => {
        state.deleteError = null;
        state.deletingUserIds = [...state.deletingUserIds, action.meta.arg];
      })
      .addCase(deleteUserThunk.fulfilled, (state, action) => {
        state.deleteError = null;
        state.deletingUserIds = state.deletingUserIds.filter(
          (userId) => userId !== action.payload.userId,
        );
        state.users = state.users.filter((user) => user.id !== action.payload.userId);
        state.totalCount = Math.max(0, state.totalCount - 1);

        // Drop a now-deleted user from the detail view so it can't render stale.
        if (state.detail?.id === action.payload.userId) {
          state.detail = null;
        }
      })
      .addCase(deleteUserThunk.rejected, (state, action) => {
        state.deleteError =
          action.payload?.message ?? action.error.message ?? "Unable to delete user.";
        state.deletingUserIds = state.deletingUserIds.filter(
          (userId) => userId !== action.meta.arg,
        );
      })
      .addCase(updateUserThunk.pending, (state) => {
        state.updateError = null;
        state.updating = true;
      })
      .addCase(updateUserThunk.fulfilled, (state, action) => {
        state.updateError = null;
        state.updating = false;

        // The thunk re-fetches the list and detail; sync the detail eagerly
        // when the response echoes the updated user.
        if (action.payload.user.id && state.detail?.id === action.payload.user.id) {
          state.detail = action.payload.user;
        }
      })
      .addCase(updateUserThunk.rejected, (state, action) => {
        state.updateError =
          action.payload?.message ?? action.error.message ?? "Unable to update user.";
        state.updating = false;
      })
      .addCase(updateUserRoleThunk.pending, (state) => {
        state.roleUpdateError = null;
        state.roleUpdating = true;
      })
      .addCase(updateUserRoleThunk.fulfilled, (state, action) => {
        state.roleUpdateError = null;
        state.roleUpdating = false;

        // Optimistically sync the detail and list entries; the follow-up
        // fetchUserByIdThunk refresh remains the source of truth.
        if (state.detail && state.detail.id === action.payload.userId) {
          state.detail = { ...state.detail, role: action.payload.role };
        }

        const listIndex = state.users.findIndex((user) => user.id === action.payload.userId);

        if (listIndex !== -1) {
          state.users[listIndex] = { ...state.users[listIndex], role: action.payload.role };
        }
      })
      .addCase(updateUserRoleThunk.rejected, (state, action) => {
        state.roleUpdateError =
          action.payload?.message ?? action.error.message ?? "Unable to update user role.";
        state.roleUpdating = false;
      });
  },
});

export const selectUsers = (state: RootState) => state.users.users;
export const selectUsersError = (state: RootState) => state.users.error;
export const selectUsersLoading = (state: RootState) => state.users.loading;
export const selectUsersLoadingMore = (state: RootState) => state.users.loadingMore;
export const selectUsersPagination = (state: RootState) => state.users.pagination;
export const selectUsersQuery = (state: RootState) => state.users.query;
export const selectUsersRefreshing = (state: RootState) => state.users.refreshing;
export const selectUsersTotalCount = (state: RootState) => state.users.totalCount;
export const selectUserDetail = (state: RootState) => state.users.detail;
export const selectUserDetailLoading = (state: RootState) => state.users.detailLoading;
export const selectUserDetailError = (state: RootState) => state.users.detailError;
export const selectUserRoleUpdating = (state: RootState) => state.users.roleUpdating;
export const selectUserRoleUpdateError = (state: RootState) => state.users.roleUpdateError;
export const selectUserUpdating = (state: RootState) => state.users.updating;
export const selectUserUpdateError = (state: RootState) => state.users.updateError;
export const selectUserDeletingIds = (state: RootState) => state.users.deletingUserIds;
export const selectUserDeleteError = (state: RootState) => state.users.deleteError;

export default usersSlice.reducer;
