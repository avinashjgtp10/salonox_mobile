import { INBOX } from "@/services/api/endpoints";
import type { InboxConversation, InboxMessage } from "@/types/inbox";
import { formatAppDate, parseAppDateTime } from "@/utils/dateTime";

export function inboxAvatar(name: string | null | undefined, phone: string) {
  const parts = name?.trim().split(/\s+/) ?? [];
  return {
    initials: (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0]?.slice(0, 2) || phone.slice(-2)).toUpperCase(),
  };
}

/** The backend stores a WhatsApp media id in media_url; its bytes come from our authed
 * `/inbox/media/:id` proxy. A plain http(s) link (older rows) is used as-is, without our token. */
export function mediaSource(value: string | null | undefined, apiBaseUrl: string): { uri: string; authenticated: boolean } | null {
  const media = value?.trim();
  if (!media) return null;
  if (/^https?:\/\//i.test(media)) return { uri: media, authenticated: false };
  return { uri: `${apiBaseUrl.replace(/\/+$/, "")}${INBOX.MEDIA(media)}`, authenticated: true };
}

const timestamp = (value: string | null) => {
  const time = parseAppDateTime(value)?.getTime() ?? 0;
  return Number.isFinite(time) ? time : 0;
};

export function mergeInboxMessages(existing: InboxMessage[], incoming: InboxMessage[]) {
  const byId = new Map(existing.map(message => [message.id, message]));
  incoming.forEach(message => byId.set(message.id, { ...byId.get(message.id), ...message }));
  return [...byId.values()].sort((a, b) => timestamp(a.sentAt) - timestamp(b.sentAt));
}

export function sortInboxConversations(items: InboxConversation[], unreadFirst = false) {
  return [...items].sort((a, b) =>
    (unreadFirst ? Number(b.unreadCount > 0) - Number(a.unreadCount > 0) : 0) || timestamp(b.lastMessageAt) - timestamp(a.lastMessageAt));
}

export function messageDay(value: string | null) {
  return formatAppDate(value, "Unknown date");
}

export function inboxPhoneKey(phone: string, countryCode?: string | null) {
  const digits = phone.replace(/\D/g, "");
  const code = countryCode?.replace(/\D/g, "");
  if (phone.startsWith("+")) return digits;
  if (code && !digits.startsWith(code)) return code + digits;
  return digits.length === 10 ? `91${digits}` : digits;
}
