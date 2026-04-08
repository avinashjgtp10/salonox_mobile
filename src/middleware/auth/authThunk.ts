import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
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
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Invalid email or password");
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
