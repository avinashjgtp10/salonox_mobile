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

export type FetchInboxConversationsArgs = { refresh?: boolean } | undefined;

export type FetchInboxMessagesArgs = {
  phone: string;
  refresh?: boolean;
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

    // Opening a thread clears unread_count server-side (inboxService.getMessages
    // fires markConversationRead), so the cached list is now stale. Refresh it
    // so the badge on the inbox list matches what the server believes.
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

    void dispatch(fetchInboxConversationsThunk({ refresh: true }));

    return response;
  } catch (error) {
    return rejectWithValue(reject(error));
  }
});
