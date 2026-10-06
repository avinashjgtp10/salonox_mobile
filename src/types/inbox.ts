
export type InboxMessageDirection = "INBOUND" | "OUTBOUND";

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

export type InboxMessageEvent = {
  contactName: string | null;
  contactPhone: string;
  message: InboxMessage;
};
