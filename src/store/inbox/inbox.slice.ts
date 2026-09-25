import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  fetchInboxConversationsThunk,
  fetchInboxMessagesThunk,
  sendInboxReplyThunk,
} from "@/middleware/inbox/inbox.thunk";
import type { RootState } from "@/store";
import type { InboxConversation, InboxMessage, InboxMessageEvent } from "@/types/inbox";

type ResourceStatus = "idle" | "loading" | "succeeded" | "failed";

type InboxState = {
  conversations: InboxConversation[];
  conversationsError: string | null;
  conversationsRefreshing: boolean;
  conversationsStatus: ResourceStatus;
  // Keyed by contact phone, matching how the backend routes every inbox call.
  messagesByPhone: Record<string, InboxMessage[]>;
  messagesErrorByPhone: Record<string, string | null>;
  messagesStatusByPhone: Record<string, ResourceStatus>;
  sendErrorByPhone: Record<string, string | null>;
  sendingByPhone: Record<string, boolean>;
};

const initialState: InboxState = {
  conversations: [],
  conversationsError: null,
  conversationsRefreshing: false,
  conversationsStatus: "idle",
  messagesByPhone: {},
  messagesErrorByPhone: {},
  messagesStatusByPhone: {},
  sendErrorByPhone: {},
  sendingByPhone: {},
};

// A message can arrive twice — once as the socket echo and once from a list
// refetch that raced it — so every append is keyed on id.
const appendMessage = (messages: InboxMessage[], incoming: InboxMessage): InboxMessage[] =>
  messages.some((message) => message.id === incoming.id) ? messages : [...messages, incoming];

const inboxSlice = createSlice({
  name: "inbox",
  initialState,
  reducers: {
    // Socket `inbox:message` — emitted to room salon:{salonId} whenever a
    // client's WhatsApp reply lands on the webhook.
    inboxMessageReceived: (state, action: PayloadAction<InboxMessageEvent>) => {
      const { contactName, contactPhone, message } = action.payload;

      if (!contactPhone || !message?.id) {
        return;
      }

      // Only append when the thread is already in memory. If it isn't, the
      // screen will fetch the full list on open anyway.
      if (state.messagesByPhone[contactPhone]) {
        state.messagesByPhone[contactPhone] = appendMessage(
          state.messagesByPhone[contactPhone],
          message,
        );
      }

      const conversation = state.conversations.find(
        (entry) => entry.contactPhone === contactPhone,
      );

      if (conversation) {
        conversation.contactName = contactName ?? conversation.contactName;
        conversation.lastMessage = message.body;
        conversation.lastMessageAt = message.sentAt;
        conversation.lastMessageLabel = "Just now";
        conversation.unreadCount += 1;
      }
    },
    // Socket `inbox:conversations` — the backend re-queries and broadcasts the
    // whole list after each inbound message, so this replaces wholesale.
    inboxConversationsReceived: (state, action: PayloadAction<InboxConversation[]>) => {
      state.conversations = action.payload;
      state.conversationsStatus = "succeeded";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInboxConversationsThunk.pending, (state, action) => {
        const hasExistingData = state.conversations.length > 0;
        const isRefresh = Boolean(action.meta.arg?.refresh);

        state.conversationsError = null;
        state.conversationsRefreshing = isRefresh;
        state.conversationsStatus = hasExistingData || isRefresh ? "succeeded" : "loading";
      })
      .addCase(fetchInboxConversationsThunk.fulfilled, (state, action) => {
        state.conversations = action.payload.conversations;
        state.conversationsError = null;
        state.conversationsRefreshing = false;
        state.conversationsStatus = "succeeded";
      })
      .addCase(fetchInboxConversationsThunk.rejected, (state, action) => {
        const hasExistingData = state.conversations.length > 0;

        state.conversationsError =
          action.payload?.message ?? action.error.message ?? "Unable to load conversations.";
        state.conversationsRefreshing = false;
        state.conversationsStatus = hasExistingData ? "succeeded" : "failed";
      })
      .addCase(fetchInboxMessagesThunk.pending, (state, action) => {
        const { phone } = action.meta.arg;

        state.messagesErrorByPhone[phone] = null;
        state.messagesStatusByPhone[phone] = state.messagesByPhone[phone]?.length
          ? "succeeded"
          : "loading";
      })
      .addCase(fetchInboxMessagesThunk.fulfilled, (state, action) => {
        const { phone } = action.meta.arg;

        state.messagesByPhone[phone] = action.payload.messages;
        state.messagesErrorByPhone[phone] = null;
        state.messagesStatusByPhone[phone] = "succeeded";

        // The server cleared unread_count when it served these messages.
        const conversation = state.conversations.find((entry) => entry.contactPhone === phone);

        if (conversation) {
          conversation.unreadCount = 0;
        }
      })
      .addCase(fetchInboxMessagesThunk.rejected, (state, action) => {
        const { phone } = action.meta.arg;

        state.messagesErrorByPhone[phone] =
          action.payload?.message ?? action.error.message ?? "Unable to load this conversation.";
        state.messagesStatusByPhone[phone] = state.messagesByPhone[phone]?.length
          ? "succeeded"
          : "failed";
      })
      .addCase(sendInboxReplyThunk.pending, (state, action) => {
        const { phone } = action.meta.arg;

        state.sendErrorByPhone[phone] = null;
        state.sendingByPhone[phone] = true;
      })
      .addCase(sendInboxReplyThunk.fulfilled, (state, action) => {
        const { phone } = action.meta.arg;

        state.sendingByPhone[phone] = false;

        // Deliberately not optimistic: the reply only exists once Meta has
        // accepted it, and a failed send must not leave a phantom bubble in
        // a thread the client never received.
        if (action.payload.message && state.messagesByPhone[phone]) {
          state.messagesByPhone[phone] = appendMessage(
            state.messagesByPhone[phone],
            action.payload.message,
          );
        }
      })
      .addCase(sendInboxReplyThunk.rejected, (state, action) => {
        const { phone } = action.meta.arg;

        state.sendErrorByPhone[phone] =
          action.payload?.message ?? action.error.message ?? "Unable to send this reply.";
        state.sendingByPhone[phone] = false;
      });
  },
});

export const { inboxConversationsReceived, inboxMessageReceived } = inboxSlice.actions;

export const selectInboxConversations = (state: RootState) => state.inbox.conversations;
export const selectInboxConversationsError = (state: RootState) => state.inbox.conversationsError;
export const selectInboxConversationsLoading = (state: RootState) =>
  state.inbox.conversationsStatus === "loading";
export const selectInboxConversationsRefreshing = (state: RootState) =>
  state.inbox.conversationsRefreshing;

export const selectInboxUnreadTotal = (state: RootState) =>
  state.inbox.conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

const EMPTY_MESSAGES: InboxMessage[] = [];

export const selectInboxMessages = (state: RootState, phone: string) =>
  state.inbox.messagesByPhone[phone] ?? EMPTY_MESSAGES;
export const selectInboxMessagesLoading = (state: RootState, phone: string) =>
  state.inbox.messagesStatusByPhone[phone] === "loading";
export const selectInboxMessagesError = (state: RootState, phone: string) =>
  state.inbox.messagesErrorByPhone[phone] ?? null;

export const selectInboxSending = (state: RootState, phone: string) =>
  state.inbox.sendingByPhone[phone] ?? false;
export const selectInboxSendError = (state: RootState, phone: string) =>
  state.inbox.sendErrorByPhone[phone] ?? null;

export const selectInboxConversationByPhone = (state: RootState, phone: string) =>
  state.inbox.conversations.find((conversation) => conversation.contactPhone === phone) ?? null;

export default inboxSlice.reducer;
