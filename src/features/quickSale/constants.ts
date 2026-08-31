import type { CategoryChipOption } from "@/features/quickSale/components/CategoryChips";

export type CatalogTab = "services" | "products" | "packages" | "membership";

export const ITEM_TYPE_CHIPS: CategoryChipOption[] = [
  { id: "services", label: "Services" },
  { id: "products", label: "Products" },
  { id: "packages", label: "Packages" },
  { id: "membership", label: "Memberships" },
];
