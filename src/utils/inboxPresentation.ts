import type { InboxConversation, InboxMessage } from "@/types/inbox";
import { parseAppDateTime } from "@/utils/dateTime";

export function inboxAvatar(name: string | null | undefined, phone: string) {
  const parts = name?.trim().split(/\s+/) ?? [];
  return {
    initials: (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0]?.slice(0, 2) || phone.slice(-2)).toUpperCase(),
  };
}

export function mediaLink(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
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
  const date = parseAppDateTime(value);
  if (!date) return "Unknown date";
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// Backend normalizes bare Indian numbers to +91. Other country codes must
// match in full so two different international contacts cannot be confused.
export function inboxPhoneKey(phone: string, countryCode?: string | null) {
  const digits = phone.replace(/\D/g, "");
  const code = countryCode?.replace(/\D/g, "");
  if (phone.startsWith("+")) return digits;
  if (code && !digits.startsWith(code)) return code + digits;
  return digits.length === 10 ? `91${digits}` : digits;
}
