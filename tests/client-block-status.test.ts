import { configureStore } from "@reduxjs/toolkit";
import { api } from "@/services/api";
import { clientService } from "@/services/client.service";
import reducer from "@/store/client/client.slice";
import type { AppDispatch } from "@/store";
import { blockClientThunk, fetchClientByIdThunk, fetchClientsThunk, unblockClientThunk } from "@/middleware/client/client.thunk";

jest.mock("@/services/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  ApiError: class extends Error {},
  getApiErrorMessage: (error: Error) => error.message,
}));
jest.mock("@/middleware/dashboard/dashboard.thunk", () => ({ fetchDashboardThunk: () => ({ type: "test/dashboard" }) }));
jest.mock("@/middleware/notification/notification.thunk", () => ({ fetchUnreadCountThunk: () => ({ type: "test/notifications" }) }));
jest.mock("@/store/branch/branch.slice", () => ({ selectActiveBranchId: () => "salon" }));

const id = "11111111-1111-4111-8111-111111111111";
const record = { id, full_name: "Alice", phone_number: "9876543210", email: "alice@example.com", is_active: true };
const get = jest.mocked(api.get);
const post = jest.mocked(api.post);
const query = { search: "", limit: 10, offset: 0, sort_by: "full_name", sort_order: "asc" as const };

const createTestStore = () => {
  // Other state dependencies are mocked; exercise the real client reducer and thunks.
  const store = configureStore({ reducer: { client: reducer } });
  return { ...store, dispatch: store.dispatch as AppDispatch };
};

describe("client blocked status", () => {
  beforeEach(() => { get.mockReset(); post.mockReset(); });

  it.each([
    [{ is_blocked: false }, false, false, "Active"],
    [{ is_blocked: true }, true, false, "Blocked"],
    [{ is_active: false, is_blocked: false }, false, true, "Inactive"],
    [{ is_active: false, is_blocked: true }, true, true, "Blocked"],
    [{ is_blocked: false, blocked: true, status: "Blocked" }, false, false, "Active"],
    [{ is_blocked: "false" }, false, false, "Active"],
    [{ is_blocked: "true" }, true, false, "Blocked"],
    [{ isBlocked: true }, true, false, "Blocked"],
    [{ status: "Blocked" }, true, false, "Blocked"],
  ])("maps API flags independently: %j", async (flags, isBlocked, inactive, status) => {
    get.mockResolvedValue({ data: { data: { ...record, ...flags } } });
    const client = await clientService.getClient(id);
    expect(client).toMatchObject({ isBlocked, inactive, status, fullName: "Alice", email: record.email });
    expect(post).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith(`/clients/${id}`);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])("preserves is_blocked=%s across list reload, detail navigation and a fresh store", async (isBlocked) => {
    const row = { ...record, is_blocked: isBlocked };
    get.mockImplementation(async (url) => ({ data: { data: url === "/clients" ? { clients: [row], total: 1 } : row } }));
    for (let launch = 0; launch < 2; launch += 1) {
      const store = createTestStore();
      await store.dispatch(fetchClientsThunk(query));
      await store.dispatch(fetchClientByIdThunk(id));
      await store.dispatch(fetchClientsThunk({ ...query, refresh: true }));
      expect(store.getState().client.clients[0].isBlocked).toBe(isBlocked);
    }
    expect(post).not.toHaveBeenCalled();
    expect(get.mock.calls.some(([url]) => url === "/clients/filter")).toBe(false);
  });

  it("updates only block status after successful explicit actions, preserving inactivity and client details", async () => {
    get.mockResolvedValue({ data: { data: { clients: [{ ...record, is_active: false, is_blocked: false }], total: 1 } } });
    post.mockResolvedValue({ data: { data: {}, message: "Success" } });
    const store = createTestStore();
    await store.dispatch(fetchClientsThunk(query));
    const original = store.getState().client.clients[0];
    await store.dispatch(blockClientThunk({ clientId: id, reason: "Confirmed by user" }));
    expect(post).toHaveBeenCalledWith("/clients/block", { client_ids: [id], reason: "Confirmed by user" });
    expect(store.getState().client.clients[0]).toEqual({ ...original, isBlocked: true, status: "Blocked" });
    await store.dispatch(unblockClientThunk(id));
    expect(post).toHaveBeenCalledWith("/clients/unblock", { client_ids: [id] });
    expect(store.getState().client.clients[0]).toEqual(original);
  });

  it("keeps the original state if a block request fails", async () => {
    get.mockResolvedValue({ data: { data: { clients: [{ ...record, is_blocked: false }], total: 1 } } });
    post.mockRejectedValue(new Error("Failed"));
    const store = createTestStore();
    await store.dispatch(fetchClientsThunk(query));
    const original = store.getState().client.clients[0];
    await store.dispatch(blockClientThunk({ clientId: id }));
    expect(store.getState().client.clients[0]).toEqual(original);
  });
});
