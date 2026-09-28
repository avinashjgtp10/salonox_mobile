import type { InboxConversation } from "@/types/inbox";

export const filterInboxConversations = (
  conversations: InboxConversation[],
  query: string,
  unreadOnly: boolean,
) => {
  const search = query.trim().toLocaleLowerCase();
  const phoneSearch = /^[+\d\s()-]+$/.test(search) ? search.replace(/\D/g, "") : "";
  return conversations.filter((conversation) => {
    if (unreadOnly && conversation.unreadCount <= 0) return false;
    if (!search) return true;
    return [conversation.contactName, conversation.contactPhone, conversation.lastMessage]
      .some((value) => value?.toLocaleLowerCase().includes(search))
      || Boolean(phoneSearch && conversation.contactPhone.replace(/\D/g, "").includes(phoneSearch));
  });
};
