export type InboxMessageDirection = "INBOUND" | "OUTBOUND";

export type InboxMessageStatus =
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | string;

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
  reaction?: string | null;
};

export type InboxTemplate = {
  id: string;
  name: string;
  body: string;
  header: string;
  footer: string;
  language: string;
  category: string;
  needsCoupon: boolean;
  needsExpiry: boolean;
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

export type InboxMediaFile = {
  /** Local file URI from the image or document picker. */
  uri: string;
  /** Filename sent to Meta; WhatsApp shows it as the document title. */
  name: string;
  /** MIME type the backend uses to classify image/video/audio/document. */
  type: string;
  /** Byte size, so the per-type limit is enforced before the upload starts. */
  size: number | null;
};

export type SendInboxMediaRequest = {
  phone: string;
  file: InboxMediaFile;
  caption?: string;
};

export type InboxMessageEvent = {
  contactName: string | null;
  contactPhone: string;
  message: InboxMessage;
};
