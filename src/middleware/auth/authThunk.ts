import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import api from "../../services/api/axios";
import { API_ORIGIN } from "../../services/api/baseUrl";
import { AUTH } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
} from "../../types/auth.types";

// ── Login ─────────────────────────────────────────────────────────────────────
export const loginThunk = createAsyncThunk<
  LoginResponse["data"],
  { email: string; password: string },
  { rejectValue: string }
>("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const payload: LoginPayload = { email, password };
    const res = await api.post<LoginResponse>(AUTH.LOGIN, payload);
    if (import.meta.env.DEV) {
      console.log("[Auth] Login response user:", res.data.data.user);
      console.log("[Auth] custom_permissions from login:", res.data.data.user?.custom_permissions ?? "NOT IN RESPONSE");
    }
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) {
      if (err.status === 401) return rejectWithValue("Invalid email or password");
      return rejectWithValue(err.message);
    }
    return rejectWithValue("Invalid credentials.");
  }
});

// ── Silent session restore (app boot) ────────────────────────────────────────
// Uses plain axios — bypasses the response interceptor to avoid a refresh loop
// if the refresh token itself is invalid.
export const refreshSessionThunk = createAsyncThunk<
  string,          // resolves with the new access token
  void,
  { rejectValue: string }
>("auth/refreshSession", async (_, { getState, rejectWithValue }) => {
  const state = getState() as any;
  const refreshToken: string | null = state.auth?.refreshToken ?? null;

  if (!refreshToken) {
    return rejectWithValue("No refresh token available");
  }

  try {
    const res = await axios.post<{
      data?: { accessToken: string };
      accessToken?: string;
    }>(
      `${API_ORIGIN}${AUTH.REFRESH_TOKEN}`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    const newToken = res.data?.data?.accessToken ?? res.data?.accessToken;
    if (!newToken) return rejectWithValue("No access token in refresh response");
    return newToken;
  } catch {
    return rejectWithValue("Refresh token expired or invalid");
  }
});

// ── Register ──────────────────────────────────────────────────────────────────
export const registerThunk = createAsyncThunk<
  RegisterResponse["data"],
  Omit<RegisterPayload, "password"> & { rawPassword: string },
  { rejectValue: string }
>("auth/register", async ({ rawPassword, ...rest }, { rejectWithValue }) => {
  try {
    const payload: RegisterPayload = { ...rest, password: rawPassword };
    const res = await api.post<RegisterResponse>(AUTH.REGISTER, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Registration failed. Please try again.");
  }
});
