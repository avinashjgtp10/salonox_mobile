
import type { InboxMessage } from "@/types/inbox";
import { parseAppDateTime } from "@/utils/dateTime";

export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ReplyWindow = {
  expiresAt: Date | null;
  isOpen: boolean;
  lastInboundAt: Date | null;
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

    const sentMs = parseAppDateTime(message.sentAt)?.getTime() ?? NaN;

    if (Number.isFinite(sentMs) && (lastInboundMs === null || sentMs > lastInboundMs)) {
      lastInboundMs = sentMs;
    }
  }

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

export const canAttemptInboxReply = (messages: InboxMessage[], now = Date.now()) => {
  const window = getReplyWindow(messages, now);
  return window.lastInboundAt === null || window.isOpen;
};
