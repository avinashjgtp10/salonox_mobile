import type { ConsumableUsageItem } from "@/types/consumable";
import type { CheckoutSaleSplitEntry, SaleItemType, SalePaymentMethod } from "@/types/sales";

export type CheckoutInitialStep = "review" | "charges" | "payment";

export type PendingCheckoutPayment = {
  method: SalePaymentMethod;
  paidAmount?: number;
  splitEntries?: CheckoutSaleSplitEntry[];
};

export type ClientPackageLoadStatus = "idle" | "loading" | "loaded" | "error";

export type ClientPackageLoadState = {
  clientId: string;
  error: string | null;
  isRetrying: boolean;
  status: ClientPackageLoadStatus;
};

export type QuickSaleSlot = {
  date: string;
  staffName?: string;
  time: string;
};

export type QuickSaleScreenProps = {
  embedded?: boolean;
  initialSlot?: QuickSaleSlot | null;
  onRequestClose?: () => void;
};

export type CartItemSource = Extract<SaleItemType, "service" | "product" | "membership" | "quick"> | "package";

export type PackageCoverageAllocation = {
  clientPackageId: string;
  remainingSessions: number;
  serviceId: string;
};

export type CartConsumableItem = ConsumableUsageItem & {
  isActualQtyManual?: boolean;
};

export type CartItem = {
  availableStock?: number;
  category: string | null;
  categoryId?: string | null;
  consumables?: CartConsumableItem[];
  discountAmount: number;
  duration?: string;
  itemId: string;
  itemType: CartItemSource;
  lineId: string;
  name: string;
  note: string;
  originalUnitPrice: number;
  packageCoverageAllocations?: PackageCoverageAllocation[];
  packageCoverageClientPackageId?: string;
  packageCoverageRemaining?: number;
  packageCoverageServiceId?: string;
  quantity: number;
  staffId: string | null;
  staffName: string | null;
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

