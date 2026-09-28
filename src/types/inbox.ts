// Verified against salon_mgm_backend/src/modules/marketing/whatsapp/inbox —
// conversations are keyed by CONTACT PHONE (E.164, normalized server-side to
// +91… for bare 10-digit numbers), not by conversation id. Every route takes
// the phone, so that is what the app routes on too.
//
// Note the backend only stores inbound messages where `msg.type === 'text'`
// (webhooks.service.ts) — media arrives as nothing at all, so this app never
// needs to render an image/audio/document bubble.

export type InboxMessageDirection = "INBOUND" | "OUTBOUND";

// Backend writes 'SENT' on reply and 'DELIVERED' on inbound, then webhook
// status callbacks move it to DELIVERED/READ/FAILED. Kept as a string union
// with a widening fallback in the normalizer since Meta can add statuses.
export type InboxMessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED" | string;

export type InboxConversation = {
  contactName: string | null;
  contactPhone: string;
  id: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageLabel: string;
  unreadCount: number;
};

export type InboxMessage = {
  body: string;
  conversationId: string;
  direction: InboxMessageDirection;
  id: string;
  sentAt: string | null;
  sentAtLabel: string;
  status: InboxMessageStatus;
  wamid: string | null;
};

export type InboxConversationsResponse = {
  conversations: InboxConversation[];
};

export type InboxMessagesResponse = {
  messages: InboxMessage[];
};

export type SendInboxReplyRequest = {
  message: string;
  phone: string;
};

export type SendInboxReplyResponse = {
  message: InboxMessage | null;
};

// Socket payload emitted by inboxService.handleInboundMessage as
// `inbox:message` to room `salon:{salonId}`.
export type InboxMessageEvent = {
  contactName: string | null;
  contactPhone: string;
  message: InboxMessage;
};
