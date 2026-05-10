// src/middleware/marketing/inbox.thunk.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import { ApiError } from "../../services/api/interceptors";
import type { WAConversation, WAMessage } from "../../types/inbox.types";

// ── Endpoints ──────────────────────────────────────────────────────────────────

const INBOX = {
  CONVERSATIONS: "/api/v1/inbox/conversations",
  MESSAGES:      (phone: string) =>
    `/api/v1/inbox/conversations/${encodeURIComponent(phone)}/messages`,
  REPLY:         (phone: string) =>
    `/api/v1/inbox/conversations/${encodeURIComponent(phone)}/reply`,
} as const;

// ── Thunks ─────────────────────────────────────────────────────────────────────

export const fetchConversationsThunk = createAsyncThunk<
  WAConversation[],
  void,
  { rejectValue: string }
>("inbox/fetchConversations", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: any[] }>(INBOX.CONVERSATIONS);
    // Normalize snake_case from API to camelCase
    return (res.data.data ?? []).map((c: any) => ({
      id:             c.id,
      contactPhone:   c.contact_phone  ?? c.contactPhone  ?? "",
      contactName:    c.contact_name   ?? c.contactName   ?? null,
      lastMessage:    c.last_message   ?? c.lastMessage   ?? "",
      lastMessageAt:  c.last_message_at ?? c.lastMessageAt ?? null,
      unreadCount:    c.unread_count   ?? c.unreadCount   ?? 0,
    }));
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch conversations");
  }
});

export const fetchMessagesThunk = createAsyncThunk<
  WAMessage[],
  string,
  { rejectValue: string }
>("inbox/fetchMessages", async (phone, { rejectWithValue }) => {
  try {
    const res = await api.get<{ data: WAMessage[] }>(INBOX.MESSAGES(phone));
    return res.data.data ?? [];
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to fetch messages");
  }
});

export const sendReplyThunk = createAsyncThunk<
  { phone: string; message: WAMessage },
  { phone: string; message: string },
  { rejectValue: string }
>("inbox/sendReply", async ({ phone, message }, { rejectWithValue }) => {
  try {
    const res = await api.post<{ data: WAMessage }>(INBOX.REPLY(phone), {
      message,
    });
    return { phone, message: res.data.data };
  } catch (err: any) {
    if (err instanceof ApiError) return rejectWithValue(err.message);
    return rejectWithValue("Failed to send reply");
  }
});