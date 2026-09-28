import type { DiscountApplyTarget } from "@/features/quickSale/components/checkout/types";
import type { DiscountScope } from "@/types/pricing";

export const toDiscountScope = (targets: DiscountApplyTarget[]): DiscountScope[] =>
  targets.includes("entireBill")
    ? ["bill"]
    : targets.map((target) => target === "package" ? "packages" : target as DiscountScope);
