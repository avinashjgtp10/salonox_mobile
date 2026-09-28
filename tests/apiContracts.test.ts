import { api } from "@/services/api";
import { clientMembershipService } from "@/services/clientMembership.service";
import { membershipService } from "@/services/membership.service";
import { salesService } from "@/services/sales.service";
import { consumableService } from "@/services/consumable.service";
import { toDiscountScope } from "@/features/quickSale/utils/discountScope";
import { buildAppointmentPayload } from "@/features/quickSale/utils/quickSalePayloads";

jest.mock("@/services/api", () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
jest.mock("@/services/membership.service", () => ({ membershipService: { getMembershipById: jest.fn() } }));

beforeEach(() => jest.clearAllMocks());

test("membership client lookup filters all pages of the supported list endpoint", async () => {
  jest.mocked(api.get)
    .mockResolvedValueOnce({ data: { data: { items: [{ id: "other", membershipId: "other" }], total: 2 } } })
    .mockResolvedValueOnce({ data: { data: { items: [{ id: "match", membershipId: "plan", status: "exhausted" }], total: 2 } } });
  const result = await clientMembershipService.getMembershipClients("plan");
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ id: "match", status: "exhausted" });
  expect(api.get).toHaveBeenNthCalledWith(2, "/client-memberships", { params: { page: 2, limit: 100 } });
});

test("cancellation patches the assignment and preserves its identity despite a message-only response", async () => {
  jest.mocked(api.get).mockResolvedValueOnce({ data: { data: { id: "assigned", clientId: "client", membershipId: "plan" } } });
  jest.mocked(api.patch).mockResolvedValueOnce({ data: { data: { message: "Membership cancelled" } } });
  expect(await clientMembershipService.cancel("assigned")).toMatchObject({
    id: "assigned", clientId: "client", membershipId: "plan", status: "cancelled",
  });
  expect(api.patch).toHaveBeenCalledWith("/client-memberships/assigned/cancel", {});
  expect(api.post).not.toHaveBeenCalled();
});

test("manual assignment includes required catalog fields and does not record a sale", async () => {
  jest.mocked(membershipService.getMembershipById).mockResolvedValueOnce({ name: "Gold", numberOfSessions: 5, colour: "pink" } as Awaited<ReturnType<typeof membershipService.getMembershipById>>);
  jest.mocked(api.post).mockResolvedValueOnce({ data: { data: { id: "assigned" } } });
  await clientMembershipService.assign({ clientId: "client", membershipId: "plan", startDate: "2026-09-01" });
  expect(api.post).toHaveBeenCalledWith("/client-memberships", {
    clientId: "client", membershipId: "plan", membershipName: "Gold", totalSessions: 5,
    colour: "pink", pricePaid: 0, silent: true, purchasedAt: "2026-09-01",
  });
});

test("renewal never calls an invented route", async () => {
  await expect(clientMembershipService.renew("assigned")).rejects.toThrow("not supported");
  expect(api.post).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
});

test("changing a membership assigns the new plan before cancelling the old one", async () => {
  jest.mocked(api.get).mockResolvedValueOnce({ data: { data: { id: "assigned", clientId: "client", membershipId: "plan" } } });
  jest.mocked(membershipService.getMembershipById).mockResolvedValueOnce({ name: "Silver", numberOfSessions: 0, colour: "grey" } as Awaited<ReturnType<typeof membershipService.getMembershipById>>);
  jest.mocked(api.post).mockResolvedValueOnce({ data: { data: { id: "new", clientId: "client", membershipId: "other" } } });
  jest.mocked(api.patch).mockResolvedValueOnce({ data: { data: { message: "Membership cancelled" } } });

  expect(await clientMembershipService.change("assigned", { membershipId: "other" })).toMatchObject({ id: "new", membershipId: "other" });
  expect(api.post).toHaveBeenCalledWith("/client-memberships", expect.objectContaining({ clientId: "client", membershipId: "other" }));
  expect(api.patch).toHaveBeenCalledWith("/client-memberships/assigned/cancel", {});
  expect(jest.mocked(api.post).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(api.patch).mock.invocationCallOrder[0]);
});

test("changing to the same plan is a no-op", async () => {
  jest.mocked(api.get).mockResolvedValueOnce({ data: { data: { id: "assigned", clientId: "client", membershipId: "plan" } } });
  expect(await clientMembershipService.change("assigned", { membershipId: "plan" })).toMatchObject({ id: "assigned" });
  expect(api.post).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
});

test("a failed cancel after a successful assign reports the partial change", async () => {
  jest.mocked(api.get).mockResolvedValueOnce({ data: { data: { id: "assigned", clientId: "client", membershipId: "plan" } } });
  jest.mocked(membershipService.getMembershipById).mockResolvedValueOnce({ name: "Silver" } as Awaited<ReturnType<typeof membershipService.getMembershipById>>);
  jest.mocked(api.post).mockResolvedValueOnce({ data: { data: { id: "new" } } });
  jest.mocked(api.patch).mockRejectedValueOnce(new Error("boom"));
  await expect(clientMembershipService.change("assigned", { membershipId: "other" })).rejects.toThrow("previous one could not be cancelled");
});

test.each(["csv", "excel", "pdf"] as const)("sales %s export requests a file rather than a JSON URL", async (format) => {
  const data = format === "csv" ? "id,total\n1,900" : new ArrayBuffer(4);
  jest.mocked(api.get).mockResolvedValueOnce({ data, headers: { "content-type": "test/type", "content-disposition": 'attachment; filename="sales-file"' } });
  expect(await salesService.exportSales({}, format)).toEqual({ data, format, contentType: "test/type", filename: "sales-file" });
  expect(api.get).toHaveBeenCalledWith("/sales/export", { params: { format }, responseType: format === "csv" ? "text" : "arraybuffer" });
});

test("consumables are deleted using their product ID", async () => {
  jest.mocked(api.delete).mockResolvedValueOnce({ data: { message: "Deleted" } });
  await consumableService.deleteConsumable("product-1");
  expect(api.delete).toHaveBeenCalledWith("/products/product-1");
});

test("discount targets use backend scope names", () => {
  expect(toDiscountScope(["entireBill"])).toEqual(["bill"]);
  expect(toDiscountScope(["product", "package"])).toEqual(["product", "packages"]);
});

test("appointment creation keeps discount scope and category restrictions", () => {
  const payload = buildAppointmentPayload({
    cartItems: [{ itemType: "service", itemId: "haircut", categoryId: "hair", quantity: 1, unitPrice: 100, discountAmount: 0 }],
    clientId: "client", discountApplyTo: ["service"], initialSlot: null, notes: "", staffId: null,
    totals: { overallDiscount: 10, couponDiscount: 0, subtotal: 100, taxAmount: 0 },
  } as Parameters<typeof buildAppointmentPayload>[0]);
  expect(payload.discount_applies_to).toEqual(["service"]);
  expect(payload.services?.[0].category_id).toBe("hair");
});
