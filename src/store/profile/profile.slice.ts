import { createSlice } from "@reduxjs/toolkit";

import {
  fetchProfileThunk,
  updateProfileThunk,
  uploadAvatarThunk,
} from "@/middleware/profile/profile.thunk";
import type { RootState } from "@/store";
import type { UserProfile } from "@/types/profile";

type ProfileState = {
  avatarError: string | null;
  error: string | null;
  loading: boolean;
  profile: UserProfile | null;
  refreshing: boolean;
  saveError: string | null;
  saving: boolean;
  uploadingAvatar: boolean;
};

const initialState: ProfileState = {
  avatarError: null,
  error: null,
  loading: false,
  profile: null,
  refreshing: false,
  saveError: null,
  saving: false,
  uploadingAvatar: false,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfileThunk.pending, (state, action) => {
        state.error = null;
        state.refreshing = Boolean(action.meta.arg?.refresh);
        state.loading = !action.meta.arg?.refresh;
      })
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.error = null;
        state.loading = false;
        state.refreshing = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfileThunk.rejected, (state, action) => {
        state.error = action.payload?.message ?? action.error.message ?? "Unable to load profile.";
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(updateProfileThunk.pending, (state) => {
        state.saveError = null;
        state.saving = true;
      })
      .addCase(updateProfileThunk.fulfilled, (state) => {
        // The Profile screen re-fetches GET /profile/:id after a successful save,
        // so the authoritative refresh comes from that request, not the PATCH body.
        state.saveError = null;
        state.saving = false;
      })
      .addCase(updateProfileThunk.rejected, (state, action) => {
        state.saveError =
          action.payload?.message ?? action.error.message ?? "Unable to update profile.";
        state.saving = false;
      })
      .addCase(uploadAvatarThunk.pending, (state) => {
        state.avatarError = null;
        state.uploadingAvatar = true;
      })
      .addCase(uploadAvatarThunk.fulfilled, (state, action) => {
        state.avatarError = null;
        state.uploadingAvatar = false;

        // Update the avatar immediately after a successful upload.
        if (action.payload.profile) {
          state.profile = action.payload.profile;
        } else if (state.profile && action.payload.avatarUrl) {
          state.profile = { ...state.profile, avatarUrl: action.payload.avatarUrl };
        }
      })
      .addCase(uploadAvatarThunk.rejected, (state, action) => {
        state.avatarError =
          action.payload?.message ?? action.error.message ?? "Unable to upload photo.";
        state.uploadingAvatar = false;
      });
  },
});

export const selectProfile = (state: RootState) => state.profile.profile;
export const selectProfileLoading = (state: RootState) => state.profile.loading;
export const selectProfileRefreshing = (state: RootState) => state.profile.refreshing;
export const selectProfileError = (state: RootState) => state.profile.error;
export const selectProfileSaving = (state: RootState) => state.profile.saving;
export const selectProfileSaveError = (state: RootState) => state.profile.saveError;
export const selectProfileUploadingAvatar = (state: RootState) => state.profile.uploadingAvatar;
export const selectProfileAvatarError = (state: RootState) => state.profile.avatarError;

export default profileSlice.reducer;
