import { getClientInitials } from "@/features/quickSale/utils/client";
import type { CartItem, QuickSaleClient } from "@/features/quickSale/types";
import type { PosStaffMember, SaleDetail } from "@/types/sales";

export const mapDraftSaleToCartItems = (sale: SaleDetail): CartItem[] =>
  sale.lineItems.map((item) => ({
    availableStock: item.itemType === "product" ? 0 : undefined,
    category: null,
    discountAmount: item.discountAmount,
    itemId: item.itemId ?? "",
    itemType: item.itemType === "gift_card" ? "quick" : item.itemType,
    lineId: item.id,
    name: item.name,
    note: "",
    originalUnitPrice: item.unitPrice,
    quantity: item.quantity,
    staffId: item.staffId,
    staffName: item.staffName ?? null,
    taxAmount: item.taxableAmount > 0 ? undefined : item.taxAmount,
    taxRate: item.taxableAmount > 0 ? (item.taxAmount / item.taxableAmount) * 100 : undefined,
    unitPrice: item.unitPrice,
  }));

export const mapDraftSaleToStaff = (sale: SaleDetail): PosStaffMember | null => {
  const restoredStaffId = sale.lineItems.find((item) => item.staffId)?.staffId ?? null;
  const restoredStaffName = sale.lineItems.find((item) => item.staffName)?.staffName ?? null;

  return restoredStaffId
    ? {
        avatarBg: "#e4edf9",
        avatarColor: "#7488a0",
        id: restoredStaffId,
        initials: getClientInitials(restoredStaffName ?? "Staff"),
        name: restoredStaffName ?? "Selected staff",
        role: null,
        status: "Available",
      }
    : null;
};

export const mapDraftSaleToClient = (sale: SaleDetail): QuickSaleClient | null =>
  sale.clientId
    ? {
        avatarBg: "#e4edf9",
        avatarColor: "#7488a0",
        id: sale.clientId,
        initials: getClientInitials(sale.clientName),
        membership: null,
        name: sale.clientName,
        phone: sale.clientPhone,
      }
    : null;
