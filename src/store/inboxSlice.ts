// src/store/inboxSlice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { WAConversation, WAMessage } from '../types/inbox.types'
import {
  fetchConversationsThunk,
  fetchMessagesThunk,
  sendReplyThunk,
} from '../middleware/marketing/inbox.thunk'

export type { WAConversation, WAMessage }

interface InboxState {
  conversations: WAConversation[]
  messages:      WAMessage[]
  activePhone:   string | null
  loading: {
    fetchConversations: boolean
    fetchMessages:      boolean
    sendReply:          boolean
  }
  error: string | null
}

const initialState: InboxState = {
  conversations: [],
  messages:      [],
  activePhone:   null,
  loading: {
    fetchConversations: false,
    fetchMessages:      false,
    sendReply:          false,
  },
  error: null,
}

const inboxSlice = createSlice({
  name: 'inbox',
  initialState,
  reducers: {

    setActivePhone(state, { payload }: PayloadAction<string | null>) {
      state.activePhone = payload
      if (payload === null) {
        state.messages = []
      } else {
        // ✅ instantly zero unread badge when conversation is opened
        const conv = state.conversations.find(c => c.contactPhone === payload)
        if (conv) conv.unreadCount = 0
      }
    },

    clearInboxError(state) {
      state.error = null
    },

    // Called by socket: new inbound message arrived
    receiveMessage(state, { payload }: PayloadAction<{
      contactPhone: string
      message:      WAMessage
    }>) {
      // Append to messages only if this conversation is currently open
      if (state.activePhone === payload.contactPhone) {
        const alreadyExists = state.messages.some(m => m.id === payload.message.id)
        if (!alreadyExists) state.messages.push(payload.message)
      }
      // Update conversation preview + unread badge
      const conv = state.conversations.find(c => c.contactPhone === payload.contactPhone)
      if (conv) {
        conv.lastMessage   = payload.message.body
        conv.lastMessageAt = payload.message.sent_at
        // Only increment unread if this convo isn't currently open
        if (state.activePhone !== payload.contactPhone) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1
        }
      } else {
        // New conversation — add it to the top
        state.conversations.unshift({
          id:            payload.message.conversationId,
          contactPhone:  payload.contactPhone,
          contactName:   null,
          lastMessage:   payload.message.body,
          lastMessageAt: payload.message.sent_at,
          unreadCount:   1,
        })
      }
    },

    // Called by socket: full refreshed conversation list
    receiveConversations(state, { payload }: PayloadAction<WAConversation[]>) {
      const activePhone = state.activePhone
      state.conversations = payload.map((c: any) => ({
        id:            c.id,
        contactPhone:  c.contact_phone  ?? c.contactPhone  ?? '',
        contactName:   c.contact_name   ?? c.contactName   ?? null,
        lastMessage:   c.last_message   ?? c.lastMessage   ?? '',
        lastMessageAt: c.last_message_at ?? c.lastMessageAt ?? null,
        // ✅ keep unread=0 for currently open conversation even after socket refresh
        unreadCount:   (c.contact_phone ?? c.contactPhone) === activePhone
          ? 0
          : (c.unread_count ?? c.unreadCount ?? 0),
      }))
    },
  },

  extraReducers: (builder) => {
    // fetchConversations
    builder
      .addCase(fetchConversationsThunk.pending, (state) => {
        state.loading.fetchConversations = true
        state.error = null
      })
      .addCase(fetchConversationsThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchConversations = false
        // ✅ keep unread=0 for currently open conversation
        const activePhone = state.activePhone
        state.conversations = payload.map((c: any) => ({
          ...c,
          unreadCount: c.contactPhone === activePhone ? 0 : (c.unreadCount ?? 0),
        }))
      })
      .addCase(fetchConversationsThunk.rejected, (state, { payload }) => {
        state.loading.fetchConversations = false
        state.error = payload ?? 'Failed to fetch conversations'
      })

    // fetchMessages
    builder
      .addCase(fetchMessagesThunk.pending, (state) => {
        state.loading.fetchMessages = true
        state.error = null
      })
      .addCase(fetchMessagesThunk.fulfilled, (state, { payload }) => {
        state.loading.fetchMessages = false
        state.messages = payload
      })
      .addCase(fetchMessagesThunk.rejected, (state, { payload }) => {
        state.loading.fetchMessages = false
        state.error = payload ?? 'Failed to fetch messages'
      })

    // sendReply
    builder
      .addCase(sendReplyThunk.pending, (state) => {
        state.loading.sendReply = true
        state.error = null
      })
      .addCase(sendReplyThunk.fulfilled, (state, { payload }) => {
        state.loading.sendReply = false
        state.messages.push(payload.message)
        const conv = state.conversations.find(c => c.contactPhone === payload.phone)
        if (conv) {
          conv.lastMessage   = payload.message.body
          conv.lastMessageAt = payload.message.sent_at
        }
      })
      .addCase(sendReplyThunk.rejected, (state, { payload }) => {
        state.loading.sendReply = false
        state.error = payload ?? 'Failed to send reply'
      })
  },
})

export const {
  setActivePhone,
  clearInboxError,
  receiveMessage,
  receiveConversations,
} = inboxSlice.actions

export default inboxSlice.reducer