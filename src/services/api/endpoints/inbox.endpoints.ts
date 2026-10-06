export const INBOX = {
  CONVERSATIONS: "/inbox/conversations",
  CUSTOMER: (phone: string) => `/inbox/conversations/${encodeURIComponent(phone)}/customer`,
  MESSAGES: (phone: string) => `/inbox/conversations/${encodeURIComponent(phone)}/messages`,
  REPLY: (phone: string) => `/inbox/conversations/${encodeURIComponent(phone)}/reply`,
} as const;
