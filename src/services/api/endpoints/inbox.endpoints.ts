export const INBOX = {
  CONVERSATIONS: "/inbox/conversations",
  DELETE_CONVERSATIONS: "/inbox/conversations/delete",
  CUSTOMER: (phone: string) => `/inbox/conversations/${encodeURIComponent(phone)}/customer`,
  MEDIA: (mediaId: string) => `/inbox/media/${encodeURIComponent(mediaId)}`,
  MESSAGES:(phone: string) => `/inbox/conversations/${encodeURIComponent(phone)}/messages`,
  REPLY: (phone: string) => `/inbox/conversations/${encodeURIComponent(phone)}/reply`,
} as const;
