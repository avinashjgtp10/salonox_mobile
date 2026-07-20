import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { fetchCurrentUserThunk } from "@/middleware/user/user.thunk";
import type { RootState } from "@/store";
import type { AuthUser } from "@/types/auth";

type UserState = {
  loading: boolean;
  user: AuthUser | null;
  error: string | null;
};

const initialState: UserState = {
  loading: false,
  user: null,
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUser(state) {
      state.loading = false;
      state.user = null;
      state.error = null;
    },
    setCurrentUser(state, action: PayloadAction<AuthUser | null>) {
      state.loading = false;
      state.user =
        action.payload && !action.payload.salonId && state.user?.salonId
          ? { ...action.payload, salonId: state.user.salonId }
          : action.payload;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUserThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUserThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(fetchCurrentUserThunk.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message ?? action.error.message ?? "Unable to load user profile.";
      });
  },
});

export const { clearUser, setCurrentUser } = userSlice.actions;
export const selectCurrentUser = (state: RootState) => state.user.user;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;

export default userSlice.reducer;
