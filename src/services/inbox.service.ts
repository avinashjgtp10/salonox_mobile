import { ApiError, api } from "@/services/api";
import { clientService } from "@/services/client.service";
import { inboxPhoneKey } from "@/utils/inboxPresentation";
import { INBOX } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  InboxConversation,
  InboxCustomer,
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
    status: toSafeString(firstValue(entry, ["status"]), "SENT").toUpperCase(),
    wamid: toSafeString(firstValue(entry, ["wamid"])) || null,
    mediaType: toSafeString(firstValue(entry, ["media_type", "mediaType"])).toLowerCase() || null,
    mediaUrl: toSafeString(firstValue(entry, ["media_url", "mediaUrl"])) || null,
  };
};

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
  async getCustomer(phone: string): Promise<InboxCustomer | null> {
    try {
      const response = await api.get<ApiResponse<UnknownRecord | null>>(INBOX.CUSTOMER(phone));
      const record = response.data.data;
      if (!record) return null;
      return {
        id: toSafeString(record.id),
        fullName: toSafeString(firstValue(record, ["full_name", "fullName"])) || null,
        phoneNumber: toSafeString(firstValue(record, ["phone_number", "phoneNumber"])) || phone,
        totalVisits: toSafeNumber(firstValue(record, ["total_visits", "totalVisits"])),
        lifetimeSpend: toSafeNumber(firstValue(record, ["lifetime_spend", "lifetimeSpend"])),
        lastVisitDate: toSafeString(firstValue(record, ["last_visit_date", "lastVisitDate", "last_visit_at", "lastVisitAt", "last_visit", "lastVisit"])) || null,
        membershipName: toSafeString(firstValue(record, ["membership_name", "membershipName"])) || null,
      };
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
    }
    const key = inboxPhoneKey(phone);
    let offset = 0;
    for (;;) {
      const result = await clientService.searchClients({ search: key.slice(-10), limit: 100, offset, sort_by: "full_name", sort_order: "asc" });
      const client = result.clients.find(item => inboxPhoneKey(item.phone, item.phoneCountryCode) === key);
      if (client) {
        const history = await clientService.getClientHistory(client.id);
        return {
          id: client.id, fullName: client.fullName, phoneNumber: phone,
          totalVisits: history.stats.totalVisits, lifetimeSpend: history.stats.lifetimeSpend,
          lastVisitDate: history.stats.lastVisit,
          membershipName: history.memberships.find(item => item.status.toLowerCase() === "active")?.membershipName ?? client.membership,
        };
      }
      if (!result.pagination.hasMore || result.pagination.nextOffset <= offset) return null;
      offset = result.pagination.nextOffset;
    }
  },
  async getConversations(): Promise<InboxConversationsResponse> {
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
      .sort((a, b) => {
        const aTime = parseAppDateTime(a.sentAt)?.getTime() ?? 0;
        const bTime = parseAppDateTime(b.sentAt)?.getTime() ?? 0;

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
