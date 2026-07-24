import type { SaleItemType } from "@/types/sales";

// A cart line is always one of these three sources. "quick" is a free-typed
// custom charge with no catalog id behind it (matches the backend's own
// "quick" item_type — a real, first-class value, not an invented one).
export type CartItemSource = Extract<SaleItemType, "service" | "product" | "membership" | "quick"> | "package";

export type CartItem = {
  category: string | null;
  discountAmount: number;
  duration?: string;
  itemId: string;
  itemType: CartItemSource;
  lineId: string;
  name: string;
  note: string;
  originalUnitPrice: number;
  packageCoverageClientPackageId?: string;
  packageCoverageRemaining?: number;
  packageCoverageServiceId?: string;
  quantity: number;
  staffId: string | null;
  staffName: string | null;
  // Sourced straight from the catalog item (Service/Membership `tax_rate` /
  // `tax_amount`) at add-to-cart time — never user-entered. See
  // calculations.ts `calculateCartTaxAmount`.
  taxAmount?: number;
  taxRate?: number;
  unitPrice: number;
};

export type QuickSaleClient = {
  avatarBg: string;
  avatarColor: string;
  id: string;
  initials: string;
  membership: string | null;
  name: string;
  phone: string;
};

export const WALK_IN_CLIENT: QuickSaleClient = {
  avatarBg: "#F2EFE9",
  avatarColor: "#1C1917",
  id: "",
  initials: "WI",
  membership: null,
  name: "Walk-in Customer",
  phone: "No client selected",
};

