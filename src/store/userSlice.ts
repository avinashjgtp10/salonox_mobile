import { createSlice } from "@reduxjs/toolkit";
import type { User } from "../types/user.types";
import {
  fetchMeThunk,
  updateUserThunk,
  uploadAvatarThunk,
  changePasswordThunk,
} from "../middleware/user/user.thunk";

export interface UserState {
  profile: User | null;
  loading: {
    fetch: boolean;
    update: boolean;
    avatar: boolean;
    changePassword: boolean;
  };
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  loading: {
    fetch: false,
    update: false,
    avatar: false,
    changePassword: false,
  },
  error: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    clearUserError(state) {
      state.error = null;
    },
    clearUserProfile(state) {
      state.profile = null;
    },
  },

  extraReducers: (builder) => {
    // ── fetchMeThunk ──────────────────────────────────────────────────────────
    builder
      .addCase(fetchMeThunk.pending, (state) => {
        state.loading.fetch = true;
        state.error = null;
      })
      .addCase(fetchMeThunk.fulfilled, (state, { payload }) => {
        state.loading.fetch = false;
        state.profile = payload;
      })
      .addCase(fetchMeThunk.rejected, (state, { payload }) => {
        state.loading.fetch = false;
        state.error = payload ?? "Failed to fetch user profile";
      });

    // ── updateUserThunk ───────────────────────────────────────────────────────
    builder
      .addCase(updateUserThunk.pending, (state) => {
        state.loading.update = true;
        state.error = null;
      })
      .addCase(updateUserThunk.fulfilled, (state, { payload }) => {
        state.loading.update = false;
        state.profile = payload;
      })
      .addCase(updateUserThunk.rejected, (state, { payload }) => {
        state.loading.update = false;
        state.error = payload ?? "Failed to update user profile";
      });

    // ── uploadAvatarThunk ─────────────────────────────────────────────────────
    builder
      .addCase(uploadAvatarThunk.pending, (state) => {
        state.loading.avatar = true;
        state.error = null;
      })
      .addCase(uploadAvatarThunk.fulfilled, (state, { payload }) => {
        state.loading.avatar = false;
        if (state.profile) {
          state.profile.avatarUrl = payload;
        }
      })
      .addCase(uploadAvatarThunk.rejected, (state, { payload }) => {
        state.loading.avatar = false;
        state.error = payload ?? "Failed to upload avatar";
      });

    // ── changePasswordThunk ───────────────────────────────────────────────────
    builder
      .addCase(changePasswordThunk.pending, (state) => {
        state.loading.changePassword = true;
        state.error = null;
      })
      .addCase(changePasswordThunk.fulfilled, (state) => {
        state.loading.changePassword = false;
      })
      .addCase(changePasswordThunk.rejected, (state, { payload }) => {
        state.loading.changePassword = false;
        state.error = payload ?? "Failed to change password";
      });
  },
});

export const { clearUserError, clearUserProfile } = userSlice.actions;
export default userSlice.reducer;
