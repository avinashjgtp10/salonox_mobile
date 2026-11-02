import type { CartItem } from "@/features/quickSale/types";

/** Every service, product, package and membership line needs its own staff
 * before the bill is saved or paid (web parity); quick lines have no picker. */
export const requiresStaff = (item: CartItem) => item.itemType !== "quick";

export const isMissingStaff = (item: CartItem) => requiresStaff(item) && !item.staffId;
