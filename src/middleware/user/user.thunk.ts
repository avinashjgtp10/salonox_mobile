import { createAsyncThunk } from "@reduxjs/toolkit"
import api from "../../services/api/axios"
import { USER } from "../../services/api/endpoints"
import { ApiError } from "../../services/api/interceptors"
import type {
  User,
  UserResponse,
  UpdateUserPayload,
} from "../../types/user.types"

// ── Fetch current user (me) ───────────────────────────────────────────────────
export const fetchMeThunk = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>("user/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<UserResponse>(USER.ME)
    return res.data.data
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message)
    return rejectWithValue("Failed to fetch user profile")
  }
})

// ── Update current user ───────────────────────────────────────────────────────
export const updateUserThunk = createAsyncThunk<
  User,
  UpdateUserPayload,
  { rejectValue: string }
>("user/update", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.put<UserResponse>(USER.UPDATE, payload)
    return res.data.data
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message)
    return rejectWithValue("Failed to update user profile")
  }
})
