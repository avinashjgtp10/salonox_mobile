import { getCartItemBillableQuantity } from "@/features/quickSale/utils/calculations";
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
