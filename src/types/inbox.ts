// Verified against salon_mgm_backend/src/modules/marketing/whatsapp/inbox —
// conversations are keyed by CONTACT PHONE (E.164, normalized server-side to
// +91… for bare 10-digit numbers), not by conversation id. Every route takes
// the phone, so that is what the app routes on too.
//
// Media can also be present on campaign messages. A media_url can be a Meta
// media ID rather than a publicly accessible URL; never treat IDs as URLs.

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
  mediaType?: string | null;
  mediaUrl?: string | null;
};

export type InboxCustomer = {
  id: string;
  fullName: string | null;
  phoneNumber: string | null;
  totalVisits: number;
  lifetimeSpend: number;
  lastVisitDate: string | null;
  membershipName: string | null;
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
