// WhatsApp's Business Platform only permits free-form replies within 24 hours
// of the contact's most recent INBOUND message. Outside that window Meta
// rejects anything that isn't a pre-approved template.
//
// The backend does NOT enforce this — inboxService.sendReply calls
// whatsappMetaApi.sendTextMessage directly — so a send outside the window
// fails at Meta after the fact. The app therefore computes the window itself
// from the message list (getMessages returns `direction` and `sent_at`) and
// disables the composer rather than letting a message fail silently.

import type { InboxMessage } from "@/types/inbox";

export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ReplyWindow = {
  expiresAt: Date | null;
  isOpen: boolean;
  lastInboundAt: Date | null;
  // Whole hours left, for the "closes in Nh" hint. 0 once it has closed.
  hoursRemaining: number;
};

const CLOSED: ReplyWindow = {
  expiresAt: null,
  hoursRemaining: 0,
  isOpen: false,
  lastInboundAt: null,
};

export const getReplyWindow = (messages: InboxMessage[], now = Date.now()): ReplyWindow => {
  let lastInboundMs: number | null = null;

  for (const message of messages) {
    if (message.direction !== "INBOUND" || !message.sentAt) {
      continue;
    }

    const sentMs = new Date(message.sentAt).getTime();

    if (Number.isFinite(sentMs) && (lastInboundMs === null || sentMs > lastInboundMs)) {
      lastInboundMs = sentMs;
    }
  }

  // No inbound message ever means the window was never opened — the salon
  // cannot start a free-form conversation, only respond to one.
  if (lastInboundMs === null) {
    return CLOSED;
  }

  const expiresMs = lastInboundMs + REPLY_WINDOW_MS;
  const remainingMs = expiresMs - now;

  return {
    expiresAt: new Date(expiresMs),
    hoursRemaining: remainingMs > 0 ? Math.floor(remainingMs / (60 * 60 * 1000)) : 0,
    isOpen: remainingMs > 0,
    lastInboundAt: new Date(lastInboundMs),
  };
};
