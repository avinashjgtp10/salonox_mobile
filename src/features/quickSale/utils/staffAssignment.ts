import type { CartItem } from "@/features/quickSale/types";

export const getServicesMissingStaff = (items: CartItem[]) =>
  items.filter((item) => item.itemType === "service" && !item.staffId);

export const getMissingStaffMessage = (items: CartItem[]): string | null => {
  const missingServices = getServicesMissingStaff(items);

  if (missingServices.length === 0) {
    return null;
  }

  const serviceNames = Array.from(new Set(missingServices.map((item) => item.name.trim()).filter(Boolean)));
  const affectedServices = serviceNames.length > 0 ? ` Missing: ${serviceNames.join(", ")}.` : "";

  return `Please assign a staff member to every service before continuing.${affectedServices}`;
};
