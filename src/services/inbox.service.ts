import { api } from "@/services/api";
import { INBOX } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  InboxConversation,
  InboxConversationsResponse,
  InboxMessage,
  InboxMessageDirection,
  InboxMessagesResponse,
  SendInboxReplyRequest,
  SendInboxReplyResponse,
} from "@/types/inbox";
import { asRecord, firstArray, firstValue, toSafeNumber, toSafeString } from "@/utils/apiNormalize";
import { formatAppDate, parseAppDateTime } from "@/utils/dateTime";

type UnknownRecord = Record<string, unknown>;
type ConversationsApiData = UnknownRecord[] | UnknownRecord | null;
type MessagesApiData = UnknownRecord[] | UnknownRecord | null;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Mirrors the relative-time style of notification.service so the inbox list
// reads the same as the notification feed it is reached from.
const formatRelativeTime = (isoValue: string | null): string => {
  if (!isoValue) {
    return "";
  }

  const parsed = parseAppDateTime(isoValue);

  if (!parsed) {
    return "";
  }

  const diffMs = Date.now() - parsed.getTime();

  if (diffMs < MINUTE_MS) {
    return "Just now";
  }

  if (diffMs < HOUR_MS) {
    return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  }

  if (diffMs < DAY_MS) {
    return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  }

  if (diffMs < 7 * DAY_MS) {
    return `${Math.floor(diffMs / DAY_MS)}d ago`;
  }

  return formatAppDate(parsed, "");
};

// Clock time is what matters inside a chat thread ("2:14 PM"), not "3h ago".
const formatClockTime = (isoValue: string | null): string => {
  if (!isoValue) {
    return "";
  }

  const parsed = parseAppDateTime(isoValue);

  if (!parsed) {
    return "";
  }

  return parsed.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export const normalizeConversation = (entry: UnknownRecord): InboxConversation => {
  const lastMessageAt =
    toSafeString(firstValue(entry, ["last_message_at", "lastMessageAt"])) || null;

  return {
    contactName: toSafeString(firstValue(entry, ["contact_name", "contactName"])) || null,
    contactPhone: toSafeString(firstValue(entry, ["contact_phone", "contactPhone"])),
    id: toSafeString(firstValue(entry, ["id", "_id"])),
    lastMessage: toSafeString(firstValue(entry, ["last_message", "lastMessage"])) || null,
    lastMessageAt,
    lastMessageLabel: formatRelativeTime(lastMessageAt),
    unreadCount: toSafeNumber(firstValue(entry, ["unread_count", "unreadCount"])),
  };
};

export const normalizeMessage = (entry: UnknownRecord): InboxMessage => {
  const sentAt = toSafeString(firstValue(entry, ["sent_at", "sentAt", "created_at"])) || null;
  const direction = toSafeString(firstValue(entry, ["direction"])).toUpperCase();

  return {
    body: toSafeString(firstValue(entry, ["body", "message", "text"])),
    conversationId: toSafeString(firstValue(entry, ["conversation_id", "conversationId"])),
    direction: (direction === "OUTBOUND" ? "OUTBOUND" : "INBOUND") as InboxMessageDirection,
    id: toSafeString(firstValue(entry, ["id", "_id"])),
    sentAt,
    sentAtLabel: formatClockTime(sentAt),
    status: toSafeString(firstValue(entry, ["status"]), "SENT"),
    wamid: toSafeString(firstValue(entry, ["wamid"])) || null,
  };
};

// sendSuccess() wraps the payload as { data }, and the axios layer already
// unwraps to response.data.data — but the repository returns a bare array, so
// this tolerates both an array and a { conversations: [...] } envelope.
const getRecordArray = (payload: ConversationsApiData | MessagesApiData, keys: string[]): UnknownRecord[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.map(asRecord);
  }

  return firstArray(payload, keys);
};

export const inboxService = {
  async getConversations(): Promise<InboxConversationsResponse> {
    // salonId comes from the JWT server-side (inbox.controller reads
    // req.user.salonId), so no branch/salon param is sent.
    const response = await api.get<ApiResponse<ConversationsApiData>>(INBOX.CONVERSATIONS);
    const conversations = getRecordArray(response.data.data, ["conversations", "data"])
      .map(normalizeConversation)
      .filter((conversation) => conversation.contactPhone);

    return { conversations };
  },

  async getMessages(phone: string): Promise<InboxMessagesResponse> {
    const response = await api.get<ApiResponse<MessagesApiData>>(INBOX.MESSAGES(phone));
    const messages = getRecordArray(response.data.data, ["messages", "data"])
      .map(normalizeMessage)
      .filter((message) => message.id)
      // Backend orders by sent_at ASC already; defensive re-sort so the
      // thread stays chronological even if that changes.
      .sort((a, b) => {
        const aTime = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const bTime = b.sentAt ? new Date(b.sentAt).getTime() : 0;

        return aTime - bTime;
      });

    return { messages };
  },

  async sendReply({ message, phone }: SendInboxReplyRequest): Promise<SendInboxReplyResponse> {
    const response = await api.post<ApiResponse<UnknownRecord | null>>(INBOX.REPLY(phone), {
      message,
    });
    const payload = response.data.data;

    return { message: payload ? normalizeMessage(asRecord(payload)) : null };
  },
};
