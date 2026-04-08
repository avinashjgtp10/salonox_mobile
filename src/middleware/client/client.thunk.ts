import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { CLIENT } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { downloadBlob } from "../../utils/downloadBlob";
import type {
  Client,
  ClientResponse,
  ClientListResponse,
  CreateClientPayload,
  BlockClientsPayload,
  UnblockClientsPayload,
  MergeSelectedClientsPayload,
} from "../../types/client.types";

// ── Fetch all clients ─────────────────────────────────────────────────────────
export const fetchClientsThunk = createAsyncThunk<
  Client[],
  void,
  { rejectValue: string }
>("client/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<ClientListResponse>(CLIENT.BASE);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch clients");
  }
});

// ── Fetch single client ───────────────────────────────────────────────────────
export const fetchClientByIdThunk = createAsyncThunk<
  Client,
  string | number,
  { rejectValue: string }
>("client/fetchById", async (id, { rejectWithValue }) => {
  try {
    const res = await api.get<ClientResponse>(CLIENT.BY_ID(id));
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch client");
  }
});

// ── Create client ─────────────────────────────────────────────────────────────
export const createClientThunk = createAsyncThunk<
  Client,
  CreateClientPayload,
  { rejectValue: string }
>("client/create", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post<ClientResponse>(CLIENT.BASE, payload);
    return res.data.data;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to create client");
  }
});

// ── Delete client ─────────────────────────────────────────────────────────────
export const deleteClientThunk = createAsyncThunk<
  string | number,
  string | number,
  { rejectValue: string }
>("client/delete", async (id, { rejectWithValue }) => {
  try {
    await api.delete(CLIENT.BY_ID(id));
    return id;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to delete client");
  }
});

// ── Block clients ─────────────────────────────────────────────────────────────
export const blockClientsThunk = createAsyncThunk<
  string[] | number[],
  BlockClientsPayload,
  { rejectValue: string }
>("client/block", async ({ ids, reason }, { rejectWithValue }) => {
  try {
    await api.patch(CLIENT.BLOCK, { client_ids: ids, reason });
    return ids;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to block clients");
  }
});

// ── Unblock clients ───────────────────────────────────────────────────────────
export const unblockClientsThunk = createAsyncThunk<
  string[] | number[],
  UnblockClientsPayload,
  { rejectValue: string }
>("client/unblock", async ({ ids }, { rejectWithValue }) => {
  try {
    await api.patch(CLIENT.UNBLOCK, { client_ids: ids });
    return ids;
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to unblock clients");
  }
});

// ── Export clients ────────────────────────────────────────────────────────────
export const exportClientsThunk = createAsyncThunk<
  void,
  "excel" | "csv",
  { rejectValue: string }
>("client/export", async (format, { rejectWithValue }) => {
  try {
    const res = await api.get(CLIENT.EXPORT(format), { responseType: "blob" });
    downloadBlob(res.data, `clients.${format === "excel" ? "xlsx" : "csv"}`);
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to export clients");
  }
});

// ── Import clients ────────────────────────────────────────────────────────────
export const importClientsThunk = createAsyncThunk<
  void,
  File,
  { rejectValue: string }
>("client/import", async (file, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    await api.post(CLIENT.IMPORT, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to import clients");
  }
});

// ── Merge duplicates ──────────────────────────────────────────────────────────
export const mergeDuplicateClientsThunk = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("client/mergeDuplicates", async (_, { rejectWithValue }) => {
  try {
    await api.post(CLIENT.MERGE_DUPLICATES, { merge_by: "phone" });
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to merge duplicate clients");
  }
});

// ── Merge selected clients ────────────────────────────────────────────────────
export const mergeSelectedClientsThunk = createAsyncThunk<
  void,
  MergeSelectedClientsPayload,
  { rejectValue: string }
>(
  "client/mergeSelected",
  async ({ primaryId, secondaryId }, { rejectWithValue }) => {
    try {
      await api.post(CLIENT.MERGE, {
        primary_id: primaryId,
        secondary_id: secondaryId,
      });
    } catch (err: any) {
      if (err instanceof ApiError) return rejectWithValue(err.message);
      return rejectWithValue("Failed to merge clients");
    }
  },
);
