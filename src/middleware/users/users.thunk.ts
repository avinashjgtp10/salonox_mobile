import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { usersService } from "@/services/users.service";
import type { RootState } from "@/store";
import { selectCurrentUser } from "@/store/user/user.slice";
import type {
  DeleteUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UpdateUserRoleResponse,
  UserDetail,
  UserListQuery,
  UserListResponse,
} from "@/types/user";

export type FetchUsersArgs = {
  limit?: number;
  offset?: number;
  refresh?: boolean;
  reset?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: UserListQuery["sort_order"];
};

type FetchUsersRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

export const fetchUsersThunk = createAsyncThunk<
  UserListResponse,
  FetchUsersArgs | undefined,
  { rejectValue: FetchUsersRejectValue; state: RootState }
>("users/fetchUsers", async (args, { getState, rejectWithValue }) => {
  const usersState = getState().users;

  const nextQuery: UserListQuery = {
    limit: args?.limit ?? usersState.query.limit,
    offset: args?.offset ?? usersState.query.offset,
    search: args?.search ?? usersState.query.search,
    sort_by: args?.sort_by ?? usersState.query.sort_by,
    sort_order: args?.sort_order ?? usersState.query.sort_order,
  };

  try {
    const salonId = selectCurrentUser(getState())?.salonId;
    return await usersService.getUsers(nextQuery, salonId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Users] Fetch failed", {
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

export const fetchUserByIdThunk = createAsyncThunk<
  UserDetail,
  string,
  { rejectValue: { message: string }; state: RootState }
>("users/fetchUserById", async (userId, { rejectWithValue }) => {
  try {
    return await usersService.getUser(userId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Users] Fetch by ID failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
      userId,
    });

    return rejectWithValue({ message });
  }
});

export const deleteUserThunk = createAsyncThunk<
  DeleteUserResponse,
  string,
  { rejectValue: { message: string }; state: RootState }
>("users/deleteUser", async (userId, { rejectWithValue }) => {
  try {
    return await usersService.deleteUser(userId);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Users] Delete failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
      userId,
    });

    return rejectWithValue({ message });
  }
});

export const updateUserThunk = createAsyncThunk<
  UpdateUserResponse,
  { updates: UpdateUserRequest; userId: string },
  { rejectValue: { message: string }; state: RootState }
>("users/updateUser", async ({ updates, userId }, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await usersService.updateUser(userId, updates);
    const currentQuery = getState().users.query;

    // Refresh the User List (preserving the active search) and the detail view
    // from the source of truth after a successful update.
    void dispatch(
      fetchUsersThunk({
        limit: currentQuery.limit,
        offset: 0,
        reset: true,
        search: currentQuery.search,
      }),
    );
    void dispatch(fetchUserByIdThunk(userId));

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Users] Update failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      status: error instanceof ApiError ? error.status : undefined,
      userId,
    });

    return rejectWithValue({ message });
  }
});

export const updateUserRoleThunk = createAsyncThunk<
  UpdateUserRoleResponse,
  { role: string; userId: string },
  { rejectValue: { message: string }; state: RootState }
>("users/updateUserRole", async ({ role, userId }, { dispatch, rejectWithValue }) => {
  try {
    const response = await usersService.updateUserRole(userId, role);

    // Refresh the user details from the source of truth after a successful update.
    void dispatch(fetchUserByIdThunk(userId));

    return response;
  } catch (error) {
    const message = error instanceof ApiError ? error.message : getApiErrorMessage(error);

    console.error("[Users] Role update failed", {
      message,
      responseBody: error instanceof ApiError ? error.responseData : undefined,
      role,
      status: error instanceof ApiError ? error.status : undefined,
      userId,
    });

    return rejectWithValue({ message });
  }
});
