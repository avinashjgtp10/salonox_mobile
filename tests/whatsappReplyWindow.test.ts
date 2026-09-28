import type { InboxMessage } from "@/types/inbox";
import { getReplyWindow, REPLY_WINDOW_MS } from "@/utils/whatsappReplyWindow";

const NOW = new Date("2026-09-24T12:00:00.000Z").getTime();

const message = (overrides: Partial<InboxMessage>): InboxMessage => ({
  body: "hi",
  conversationId: "c1",
  direction: "INBOUND",
  id: Math.random().toString(36).slice(2),
  sentAt: new Date(NOW).toISOString(),
  sentAtLabel: "",
  status: "DELIVERED",
  wamid: null,
  ...overrides,
});

test("window is open within 24h of the last inbound message", () => {
  const messages = [message({ sentAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString() })];

  const window = getReplyWindow(messages, NOW);

  expect(window.isOpen).toBe(true);
  expect(window.hoursRemaining).toBe(22);
});

test("window is closed once 24h have elapsed", () => {
  const messages = [message({ sentAt: new Date(NOW - REPLY_WINDOW_MS - 1000).toISOString() })];

  const window = getReplyWindow(messages, NOW);

  expect(window.isOpen).toBe(false);
  expect(window.hoursRemaining).toBe(0);
});

test("outbound messages never open the window", () => {
  const messages = [
    message({ direction: "OUTBOUND", sentAt: new Date(NOW - 60_000).toISOString(), status: "SENT" }),
  ];

  const window = getReplyWindow(messages, NOW);

  expect(window.isOpen).toBe(false);
  expect(window.lastInboundAt).toBeNull();
});

test("the most recent inbound message wins, regardless of list order", () => {
  const messages = [
    message({ sentAt: new Date(NOW - 30 * 60 * 60 * 1000).toISOString() }),
    message({ sentAt: new Date(NOW - 1 * 60 * 60 * 1000).toISOString() }),
    message({ sentAt: new Date(NOW - 40 * 60 * 60 * 1000).toISOString() }),
  ];

  const window = getReplyWindow(messages, NOW);

  expect(window.isOpen).toBe(true);
  expect(window.lastInboundAt?.toISOString()).toBe(new Date(NOW - 60 * 60 * 1000).toISOString());
});

test("an empty thread is closed, not open", () => {
  expect(getReplyWindow([], NOW).isOpen).toBe(false);
});

test("messages with an unparseable timestamp are ignored", () => {
  const messages = [message({ sentAt: "not-a-date" }), message({ sentAt: null })];

  expect(getReplyWindow(messages, NOW).isOpen).toBe(false);
});
