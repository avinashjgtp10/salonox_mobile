import { api, ApiError } from "@/services/api";
import { clientService } from "@/services/client.service";
import { inboxService, normalizeMessage } from "@/services/inbox.service";
import reducer, { inboxActivePhoneChanged, inboxDraftChanged, inboxMessageReceived } from "@/store/inbox/inbox.slice";
import { fetchInboxMessagesThunk, sendInboxReplyThunk } from "@/middleware/inbox/inbox.thunk";
import { inboxPhoneKey, mediaLink, mergeInboxMessages, messageDay } from "@/utils/inboxPresentation";
import type { InboxMessage } from "@/types/inbox";

jest.mock("@/services/api", () => {
  class ApiError extends Error {
    status?: number;
    constructor(message: string, code?: number) { super(message); this.status = code; }
  }
  return { api: { get: jest.fn(), post: jest.fn() }, ApiError, getApiErrorMessage: (error: Error) => error.message };
});
jest.mock("@/services/client.service", () => ({ clientService: { searchClients: jest.fn(), getClientHistory: jest.fn() } }));

const phone = "+919876543210";
const message: InboxMessage = { id: "m1", body: "Hello", conversationId: "c1", direction: "INBOUND", status: "DELIVERED", sentAt: "2026-09-30T10:00:00Z", sentAtLabel: "10:00", wamid: null };

beforeEach(() => { jest.resetAllMocks(); });

test("message day accepts database timestamps unsupported by Hermes Date parsing", () => {
  expect(messageDay("2026-09-30 04:47:00+00")).not.toBe("Unknown date");
});

test("customer last_visit_at is preserved for the mobile date formatter", async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { data: { id: "c1", last_visit_at: "2026-09-28 10:00:00+00" } } });
  await expect(inboxService.getCustomer(phone)).resolves.toMatchObject({ lastVisitDate: "2026-09-28 10:00:00+00" });
});

test("normalizer preserves campaign media and normalizes delivery status", () => {
  expect(normalizeMessage({ id: "m1", media_type: "image", media_url: "123456", status: "read" })).toMatchObject({ mediaType: "image", mediaUrl: "123456", status: "READ" });
  expect(mediaLink("123456")).toBeNull();
  expect(mediaLink("javascript:alert(1)")).toBeNull();
  expect(mediaLink("https://example.com/image.jpg")).toBe("https://example.com/image.jpg");
});

test("message merge updates status and preserves a live arrival omitted by an older fetch", () => {
  const later = { ...message, id: "m2", sentAt: "2026-09-30T11:00:00Z" };
  expect(mergeInboxMessages([later, message], [{ ...message, status: "READ" }])).toEqual([{ ...message, status: "READ" }, later]);
});

test("duplicate socket delivery counts once and active chats stay read", () => {
  const event = inboxMessageReceived({ contactPhone: phone, contactName: "Asha", message });
  let state = reducer(undefined, event);
  state = reducer(state, event);
  expect(state.conversations[0].unreadCount).toBe(1);
  state = reducer(state, inboxActivePhoneChanged(phone));
  state = reducer(state, inboxMessageReceived({ contactPhone: phone, contactName: "Asha", message: { ...message, id: "m2" } }));
  expect(state.conversations[0].unreadCount).toBe(0);
});

test("late fetch responses cannot replace newer thread data", () => {
  const args = { phone };
  let state = reducer(undefined, fetchInboxMessagesThunk.pending("old", args));
  state = reducer(state, fetchInboxMessagesThunk.pending("new", args));
  state = reducer(state, fetchInboxMessagesThunk.fulfilled({ messages: [message] }, "new", args));
  state = reducer(state, fetchInboxMessagesThunk.fulfilled({ messages: [] }, "old", args));
  expect(state.messagesByPhone[phone]).toEqual([message]);
});

test("failed sends retain the draft and successful sends clear only their own draft", () => {
  const args = { phone, message: "Hello" };
  let state = reducer(undefined, inboxDraftChanged({ phone, text: "Hello" }));
  state = reducer(state, sendInboxReplyThunk.rejected(new Error("offline"), "req", args));
  expect(state.draftsByPhone[phone]).toBe("Hello");
  state = reducer(state, sendInboxReplyThunk.fulfilled({ message }, "req", args));
  expect(state.draftsByPhone[phone]).toBe("");
  state = reducer(state, inboxDraftChanged({ phone, text: "New draft" }));
  state = reducer(state, sendInboxReplyThunk.fulfilled({ message }, "req", args));
  expect(state.draftsByPhone[phone]).toBe("New draft");
});

test("customer endpoint supports the web payload", async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { data: { id: "c1", full_name: "Asha", total_visits: "3", lifetime_spend: "1500" } } });
  await expect(inboxService.getCustomer(phone)).resolves.toMatchObject({ id: "c1", fullName: "Asha", totalVisits: 3, lifetimeSpend: 1500 });
  expect(api.get).toHaveBeenCalledWith(`/inbox/conversations/${encodeURIComponent(phone)}/customer`);
});

test("missing customer route falls back to an exact phone match and client history", async () => {
  (api.get as jest.Mock).mockRejectedValue(new ApiError("Not found", 404));
  (clientService.searchClients as jest.Mock).mockResolvedValue({ clients: [
    { id: "wrong", phone: "+449876543210" }, { id: "right", phone: "9876543210", phoneCountryCode: "+91", fullName: "Asha", membership: null },
  ], pagination: { hasMore: false } });
  (clientService.getClientHistory as jest.Mock).mockResolvedValue({ stats: { totalVisits: 2, lifetimeSpend: 500, lastVisit: null }, memberships: [] });
  await expect(inboxService.getCustomer(phone)).resolves.toMatchObject({ id: "right", totalVisits: 2 });
  expect(clientService.getClientHistory).toHaveBeenCalledWith("right");
  expect(inboxPhoneKey("9876543210", "+91")).toBe("919876543210");
});

test("permission failures are shown rather than disguised as missing customers", async () => {
  (api.get as jest.Mock).mockRejectedValue(new ApiError("Forbidden", 403));
  await expect(inboxService.getCustomer(phone)).rejects.toThrow("Forbidden");
  expect(clientService.searchClients).not.toHaveBeenCalled();
});
