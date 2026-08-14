import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchCurrentUserThunk } from "@/middleware/user/user.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { profileService } from "@/services/profile.service";
import type { RootState } from "@/store";
import type {
  AvatarUploadAsset,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UploadAvatarResponse,
  UserProfile,
} from "@/types/profile";

export type FetchProfileArgs = {
  refresh?: boolean;
  userId: string;
};

type ProfileRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

const toRejectValue = (error: unknown): ProfileRejectValue => ({
  message: error instanceof ApiError ? error.message : getApiErrorMessage(error),
  responseBody: error instanceof ApiError ? error.responseData : undefined,
  status: error instanceof ApiError ? error.status : undefined,
});

export const fetchProfileThunk = createAsyncThunk<
  UserProfile,
  FetchProfileArgs,
  { rejectValue: ProfileRejectValue; state: RootState }
>("profile/fetchProfile", async ({ userId }, { rejectWithValue }) => {
  try {
    return await profileService.getProfile(userId);
  } catch (error) {
    const rejectValue = toRejectValue(error);

    console.error("[Profile] Fetch failed", { ...rejectValue, userId });

    return rejectWithValue(rejectValue);
  }
});

export const updateProfileThunk = createAsyncThunk<
  UpdateProfileResponse,
  { updates: UpdateProfileRequest; userId: string },
  { rejectValue: ProfileRejectValue; state: RootState }
>("profile/updateProfile", async ({ updates, userId }, { dispatch, rejectWithValue }) => {
  try {
    const response = await profileService.updateProfile(userId, updates);

    // Refresh the shared auth user (Dashboard/More hero) from the source of truth.
    void dispatch(fetchCurrentUserThunk());

    return response;
  } catch (error) {
    const rejectValue = toRejectValue(error);

    console.error("[Profile] Update failed", rejectValue);

    return rejectWithValue(rejectValue);
  }
});

export const uploadAvatarThunk = createAsyncThunk<
  UploadAvatarResponse,
  { asset: AvatarUploadAsset },
  { rejectValue: ProfileRejectValue; state: RootState }
>("profile/uploadAvatar", async ({ asset }, { dispatch, rejectWithValue }) => {
  try {
    const response = await profileService.uploadAvatar(asset);

    // Keep the shared auth user (Dashboard/More hero) in sync with the new avatar.
    void dispatch(fetchCurrentUserThunk());

    return response;
  } catch (error) {
    const rejectValue = toRejectValue(error);

    console.error("[Profile] Avatar upload failed", rejectValue);

    return rejectWithValue(rejectValue);
  }
});
