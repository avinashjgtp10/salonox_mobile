import { filterInboxConversations } from "@/utils/inboxFilters";
import type { InboxConversation } from "@/types/inbox";

const chats: InboxConversation[] = [
  { id: "1", contactName: "Asha Sharma", contactPhone: "+919876543210", lastMessage: "Haircut tomorrow?", lastMessageAt: null, lastMessageLabel: "10:30", unreadCount: 2 },
  { id: "2", contactName: null, contactPhone: "+919111222333", lastMessage: "Thank you", lastMessageAt: null, lastMessageLabel: "Yesterday", unreadCount: 0 },
];

test("all chats retain the server ordering", () => {
  expect(filterInboxConversations(chats, "  ", false)).toEqual(chats);
});

test("search matches names and message previews without case sensitivity", () => {
  expect(filterInboxConversations(chats, " ASHA ", false)).toEqual([chats[0]]);
  expect(filterInboxConversations(chats, "thank", false)).toEqual([chats[1]]);
});

test("phone search accepts common display formatting", () => {
  expect(filterInboxConversations(chats, "+91 (98765) 43210", false)).toEqual([chats[0]]);
});

test("unread filter combines with search", () => {
  expect(filterInboxConversations(chats, "", true)).toEqual([chats[0]]);
  expect(filterInboxConversations(chats, "thank", true)).toEqual([]);
});

test("no matches and empty conversations are safe", () => {
  expect(filterInboxConversations(chats, "missing", false)).toEqual([]);
  expect(filterInboxConversations([], "", false)).toEqual([]);
});
