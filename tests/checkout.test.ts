import { buildPricingLine, getCartItemBillableQuantity, getExpectedSaleRevenue } from "@/features/quickSale/utils/calculations";
import { hasMembershipDiscount } from "@/features/quickSale/utils/membershipEligibility";
import type { ClientMembershipAssignment } from "@/types/clientMembership";
import { amountsReconcile } from "@/features/quickSale/utils/money";
import { getPackageSessionConsumptions } from "@/features/quickSale/utils/packageCoverage";

type CartItem = Parameters<typeof getCartItemBillableQuantity>[0];

const item: CartItem = {
  category: null, discountAmount: 0, itemId: "haircut", itemType: "service", lineId: "line-1",
  name: "Haircut", note: "", originalUnitPrice: 100, quantity: 3, staffId: null, staffName: null, unitPrice: 100,
  packageCoverageAllocations: [{ clientPackageId: "package-1", serviceId: "service-1", remainingSessions: 2 }],
};

test("package coverage bills only sessions exceeding the remaining allowance", () => {
  expect(getCartItemBillableQuantity(item)).toBe(1);
  expect(getCartItemBillableQuantity({ ...item, quantity: 1 })).toBe(0);
  expect(getCartItemBillableQuantity({ ...item, itemType: "product" })).toBe(3);
});

test("pricing preview charges only uncovered package sessions and carries restriction IDs", () => {
  expect(buildPricingLine({ ...item, categoryId: "hair" })).toMatchObject({
    itemId: "haircut", categoryId: "hair", qty: 3, total: 100, discount: 200, isPackageService: false,
  });
  expect(buildPricingLine({ ...item, quantity: 2 })).toMatchObject({ total: 0, isPackageService: true });
});

test("pricing never produces negative totals after a quantity or price reduction", () => {
  expect(buildPricingLine({ ...item, discountAmount: 200 }).total).toBe(0);
  expect(buildPricingLine({ ...item, itemType: "product", discountAmount: 20 }).total).toBe(280);
});

test("validity memberships do not require a consumable discount balance", () => {
  const membership = {
    status: "active", pricingType: "percentage", discountPercent: 10,
    discountBalanceRemaining: 0, benefitType: "validity",
  } as ClientMembershipAssignment;
  expect(hasMembershipDiscount(membership)).toBe(true);
  expect(hasMembershipDiscount({ ...membership, benefitType: "discount_balance" })).toBe(false);
  expect(hasMembershipDiscount({ ...membership, status: "expired" })).toBe(false);
  expect(hasMembershipDiscount({ ...membership, benefitType: "discount_balance", discountBalanceRemaining: 100 })).toBe(true);
});

test("split cart lines cannot consume the same package allowance twice", () => {
  const consumptions = getPackageSessionConsumptions([item, { ...item, lineId: "line-2" }]);
  expect(consumptions.reduce((sum, entry) => sum + entry.quantity, 0)).toBe(2);
});

test("payment reconciliation tolerates one paisa but detects a missing charge", () => {
  expect(amountsReconcile(0.1 + 0.2, 0.3)).toBe(true);
  expect(amountsReconcile(100, 100.01)).toBe(true);
  expect(amountsReconcile(100, 100.02)).toBe(false);
  expect(amountsReconcile(100, 90)).toBe(false);
});

test.each([
  [900, 0, 0, 250, 0, 0, 1150],
  [900, 0, 0, 0, 250, 0, 1150],
  [900, 0, 0, 0, 0, 250, 1150],
  [1000, 100, 0, 250, 0, 0, 1150],
  [900, 0, 0.4, 250.2, 0, 0, 1150],
  [900, 0, -0.4, 250.2, 0, 0, 1151],
  [0, 0, 0, 900, 0, 0, 900],
  [900, 0, 0, 0, 0, 0, 900],
])("sale revenue reconciles payable %s, tip %s, rounding %s and credits %s/%s/%s", (
  grandTotal, tipAmount, roundOff, appliedEWallet, appliedReferralCredit, appliedRewardPointsValue, expected,
) => {
  expect(getExpectedSaleRevenue({
    grandTotal, tipAmount, roundOff, appliedEWallet, appliedReferralCredit, appliedRewardPointsValue,
  })).toBe(expected);
});
