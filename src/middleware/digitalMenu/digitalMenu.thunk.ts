import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { DIGITAL_MENU } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import type {
  DigitalMenu,
  PublicMenuResponse,
  SaveDigitalMenuPayload,
} from "../../features/catalog/types/digitalMenu.types";

// 404 means "not configured yet" — a normal, expected state for a salon that
// hasn't created a menu, not an error to surface.
export const fetchDigitalMenuThunk = createAsyncThunk<
  DigitalMenu | null,
  void,
  { rejectValue: string }
>("digitalMenu/fetch", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get(DIGITAL_MENU.GET);
    return res.data?.data ?? null;
  } catch (err: any) {
    if (err instanceof ApiError && err.status === 404) return null;
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to load digital menu.");
  }
});

export const saveDigitalMenuThunk = createAsyncThunk<
  DigitalMenu,
  SaveDigitalMenuPayload,
  { rejectValue: string }
>("digitalMenu/save", async (payload, { rejectWithValue }) => {
  try {
    const { id, ...body } = payload;
    const res = id
      ? await api.patch(DIGITAL_MENU.UPDATE(id), body)
      : await api.post(DIGITAL_MENU.CREATE, body);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to save digital menu.");
  }
});

export const deleteDigitalMenuThunk = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>("digitalMenu/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(DIGITAL_MENU.DELETE(id));
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete digital menu.");
  }
});

export const fetchPublicDigitalMenuThunk = createAsyncThunk<
  PublicMenuResponse,
  string,
  { rejectValue: string }
>("digitalMenu/fetchPublic", async (token, { rejectWithValue }) => {
  try {
    const res = await api.get(DIGITAL_MENU.PUBLIC_BY_TOKEN(token));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to load menu.");
  }
});
