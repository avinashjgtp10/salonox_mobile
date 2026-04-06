import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { CLIENT } from "../../services/api/endpoints";
import { ApiError } from "../../services/api/interceptors";
import { createCRUDThunks } from "../utils/createCRUDThunks";
import type {
  Client,
  CreateClientPayload,
  BlockClientsPayload,
  UnblockClientsPayload,
  MergeSelectedClientsPayload,
} from "../../types/client.types";

// ── Standard CRUD thunks (generated) ─────────────────────────────────────────
// Clients have no update endpoint; updateThunk is provided by factory but unused.
const clientThunks = createCRUDThunks<Client, CreateClientPayload>(
  "client",
  CLIENT,
  "client",
);

export const {
  fetchAllThunk:  fetchClientsThunk,
  fetchByIdThunk: fetchClientByIdThunk,
  createThunk:    createClientThunk,
  deleteThunk:    deleteClientThunk,
  exportThunk:    exportClientsThunk,
} = clientThunks;

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
>("client/mergeSelected", async ({ primaryId, secondaryId }, { rejectWithValue }) => {
  try {
    await api.post(CLIENT.MERGE, { primary_id: primaryId, secondary_id: secondaryId });
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to merge clients");
  }
});
