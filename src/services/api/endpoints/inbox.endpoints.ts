export const INBOX = {
  CONVERSATIONS: "/inbox/conversations",
  DELETE_CONVERSATIONS: "/inbox/conversations/delete",
  CUSTOMER: (phone: string) =>
    `/inbox/conversations/${encodeURIComponent(phone)}/customer`,
  MEDIA: (mediaId: string) => `/inbox/media/${encodeURIComponent(mediaId)}`,
  SEND_MEDIA: (phone: string) =>
    `/inbox/conversations/${encodeURIComponent(phone)}/media`,
  MESSAGES: (phone: string) =>
    `/inbox/conversations/${encodeURIComponent(phone)}/messages`,
  REPLY: (phone: string) =>
    `/inbox/conversations/${encodeURIComponent(phone)}/reply`,
  TEMPLATES: "/templates",
  TEMPLATE: (phone: string) =>
    `/inbox/conversations/${encodeURIComponent(phone)}/template`,
  REACT: (id: string) => `/inbox/messages/${encodeURIComponent(id)}/react`,
} as const;
