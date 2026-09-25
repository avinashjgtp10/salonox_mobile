// Backend mounts these at /api/v1/inbox (app.ts) and the configured
// EXPO_PUBLIC_API_BASE_URL already ends in /api/v1, so these stay relative.
// The phone segment is encoded because it carries a leading "+".
export const INBOX = {
  CONVERSATIONS: "/inbox/conversations",
  MESSAGES: (phone: string) => `/inbox/conversations/${encodeURIComponent(phone)}/messages`,
  REPLY: (phone: string) => `/inbox/conversations/${encodeURIComponent(phone)}/reply`,
} as const;
