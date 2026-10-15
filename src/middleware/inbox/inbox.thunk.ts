import { createAsyncThunk } from "@reduxjs/toolkit";

import { getApiErrorMessage } from "@/services/api";
import { inboxService } from "@/services/inbox.service";
import type { RootState } from "@/store";
import type {
  InboxConversationsResponse,
  InboxMessagesResponse,
  SendInboxReplyRequest,
  SendInboxReplyResponse,
} from "@/types/inbox";

type RejectValue = { message: string };

const reject = (error: unknown): RejectValue => ({ message: getApiErrorMessage(error) });

export const deleteInboxConversationsThunk = createAsyncThunk<
  { deleted: number }, string[], { rejectValue: RejectValue; state: RootState }
>("inbox/deleteConversations", async (phones, { rejectWithValue }) => {
  try {
    return await inboxService.deleteConversations(phones);
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export type FetchInboxConversationsArgs = { refresh?: boolean } | undefined;

export type FetchInboxMessagesArgs = {
  phone: string;
  refresh?: boolean;
  // Routine background refresh (30s poll, reconnect, AppState foreground) —
  // the thread is already open and showing good data, so don't blank it back
  // to a loading spinner while this resolves; just swap the data in once it
  // does. Omit (or false) for the fetch that fires when the thread is first
  // opened/focused, where there's nothing good on screen yet to protect.
  silent?: boolean;
};

export const fetchInboxConversationsThunk = createAsyncThunk<
  InboxConversationsResponse,
  FetchInboxConversationsArgs,
  { rejectValue: RejectValue; state: RootState }
>("inbox/fetchConversations", async (_args, { rejectWithValue }) => {
  try {
    return await inboxService.getConversations();
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const fetchInboxMessagesThunk = createAsyncThunk<
  InboxMessagesResponse,
  FetchInboxMessagesArgs,
  { rejectValue: RejectValue; state: RootState }
>("inbox/fetchMessages", async ({ phone }, { dispatch, rejectWithValue }) => {
  try {
    const response = await inboxService.getMessages(phone);

    void dispatch(fetchInboxConversationsThunk({ refresh: true }));

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});

export const sendInboxReplyThunk = createAsyncThunk<
  SendInboxReplyResponse,
  SendInboxReplyRequest,
  { rejectValue: RejectValue; state: RootState }
>("inbox/sendReply", async ({ message, phone }, { dispatch, rejectWithValue }) => {
  try {
    const response = await inboxService.sendReply({ message, phone });

    if (!response.message?.id) void dispatch(fetchInboxMessagesThunk({ phone, refresh: true }));

    void dispatch(fetchInboxConversationsThunk({ refresh: true }));

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});
