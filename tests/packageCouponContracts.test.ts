import { api } from "@/services/api";
import { packageService } from "@/services/package.service";
import { adaptPricingResponseToBillTotals } from "@/features/quickSale/utils/calculations";
import { consumePackageSessions } from "@/features/quickSale/utils/consumePackageSessions";
import type { CalculateTotalsResponse } from "@/types/pricing";

jest.mock("@/services/api", () => ({ api: { get: jest.fn() } }));

beforeEach(() => jest.mocked(api.get).mockReset());

test("active client packages use server casing and fetch beyond the 100-row cap", async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `package-${index}`, status: "Active" }));
  jest.mocked(api.get)
    .mockResolvedValueOnce({ data: { data: { items: firstPage, total: 101 } } })
    .mockResolvedValueOnce({ data: { data: { items: [{ id: "last" }], total: 101 } } });
  const result = await packageService.getClientPackages("client", "salon");
  expect(result).toHaveLength(101);
  expect(result[100].id).toBe("last");
  expect(api.get).toHaveBeenNthCalledWith(2, "/client-packages", {
    params: { clientId: "client", salon_id: "salon", status: "Active", page: 2, limit: 100 },
  });
});

test("empty pages stop pagination even if the count changes", async () => {
  jest.mocked(api.get).mockResolvedValueOnce({ data: { data: { items: [], total: 10 } } });
  expect(await packageService.getClientPackages("client")).toEqual([]);
  expect(api.get).toHaveBeenCalledTimes(1);
});

test("package lookup failures are not disguised as no active packages", async () => {
  jest.mocked(api.get).mockRejectedValueOnce(new Error("Unavailable"));
  await expect(packageService.getClientPackages("client")).rejects.toThrow("Unavailable");
});

test("coupon discount uses the latest pricing result rather than cached validation", () => {
  const response = { subtotal: 1000, manualDiscount: 100, totalDisc: 200 } as CalculateTotalsResponse;
  const totals = adaptPricingResponseToBillTotals(response, { couponDiscount: 90 });
  expect(totals.couponDiscount).toBe(100);
  expect(totals.subtotal).toBe(1000);
  expect(totals.overallDiscount).toBe(100);
});

test("rejected coupons never survive in the payment discount", () => {
  const response = { manualDiscount: 100, totalDisc: 100, couponRejectedReason: "Expired" } as CalculateTotalsResponse;
  expect(adaptPricingResponseToBillTotals(response, { couponDiscount: 90 })).toMatchObject({
    couponDiscount: 0, couponRejectedReason: "Expired",
  });
});

const consumption = { clientPackageId: "package-1", serviceId: "service-row", quantity: 3, staffName: "Staff" };

test("confirmed package sessions complete once per quantity", async () => {
  const complete = jest.fn().mockResolvedValue({});
  expect(await consumePackageSessions([consumption], complete)).toBeNull();
  expect(complete).toHaveBeenCalledTimes(3);
});

test("uncertain session failure stops without retrying or consuming later sessions", async () => {
  const complete = jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("timeout"));
  const warning = await consumePackageSessions([consumption, { ...consumption, clientPackageId: "later" }], complete);
  expect(complete).toHaveBeenCalledTimes(2);
  expect(warning).toContain("only 1 of 6");
  expect(warning).toContain("package-1");
  expect(warning).toContain("Do not repeat checkout");
});

test("a sale without package coverage makes no deduction requests", async () => {
  const complete = jest.fn();
  expect(await consumePackageSessions([], complete)).toBeNull();
  expect(complete).not.toHaveBeenCalled();
});
