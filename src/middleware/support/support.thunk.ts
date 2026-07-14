import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { SUPPORT } from "../../services/api/endpoints/support.endpoints";
import type { SupportTicket, SupportStats } from "../../store/supportSlice";

export const submitTicketThunk = createAsyncThunk<
  SupportTicket,
  { subject: string; category: string; message: string; priority: string; attachments?: File[] },
  { rejectValue: string }
>("support/submitTicket", async ({ attachments, ...fields }, { rejectWithValue }) => {
  try {
    let res;
    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
      attachments.forEach((file) => formData.append("attachments", file));
      res = await api.post(SUPPORT.SUBMIT, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } else {
      res = await api.post(SUPPORT.SUBMIT, fields);
    }
    return res.data?.data ?? res.data;
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.error?.message ?? err?.message ?? "Failed to submit ticket");
  }
});

export const fetchMyTicketsThunk = createAsyncThunk<SupportTicket[], void, { rejectValue: string }>(
  "support/fetchMyTickets",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPPORT.MY_TICKETS);
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch tickets");
    }
  }
);

export const fetchAllTicketsThunk = createAsyncThunk<
  SupportTicket[],
  { status?: string; priority?: string; search?: string } | undefined,
  { rejectValue: string }
>("support/fetchAllTickets", async (filters, { rejectWithValue }) => {
  try {
    const res = await api.get(SUPPORT.ALL_TICKETS, { params: filters ?? {} });
    const data = res.data?.data ?? res.data;
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    return rejectWithValue(err?.message ?? "Failed to fetch tickets");
  }
});

export const fetchSupportStatsThunk = createAsyncThunk<SupportStats, void, { rejectValue: string }>(
  "support/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get(SUPPORT.STATS);
      return res.data?.data ?? res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message ?? "Failed to fetch stats");
    }
  }
);

export const replyToTicketThunk = createAsyncThunk<
  SupportTicket,
  { id: string; reply: string },
  { rejectValue: string }
>("support/replyToTicket", async ({ id, reply }, { rejectWithValue }) => {
  try {
    const res = await api.patch(SUPPORT.REPLY(id), { reply });
    return res.data?.data ?? res.data;
  } catch (err: any) {
    return rejectWithValue(err?.message ?? "Failed to send reply");
  }
});

export const updateTicketStatusThunk = createAsyncThunk<
  SupportTicket,
  { id: string; status: string },
  { rejectValue: string }
>("support/updateStatus", async ({ id, status }, { rejectWithValue }) => {
  try {
    const res = await api.patch(SUPPORT.STATUS(id), { status });
    return res.data?.data ?? res.data;
  } catch (err: any) {
    return rejectWithValue(err?.message ?? "Failed to update status");
  }
});
