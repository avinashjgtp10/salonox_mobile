import type { CartItem } from "@/features/quickSale/types";

export type ProductStockErrors = Record<string, string>;

export const normalizeAvailableStock = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export const clampCartItemQuantity = (item: CartItem, requestedQuantity: number) => {
  const quantity = Number.isFinite(requestedQuantity) ? Math.round(requestedQuantity) : 0;

  if (quantity <= 0) {
    return 0;
  }

  return item.itemType === "product"
    ? Math.min(quantity, normalizeAvailableStock(item.availableStock ?? 0))
    : quantity;
};

export const validateProductStock = (
  items: CartItem[],
  availableStockByProductId?: Readonly<Record<string, number>>,
): ProductStockErrors =>
  items.reduce<ProductStockErrors>((errors, item) => {
    if (item.itemType !== "product") {
      return errors;
    }

    const availableStock = normalizeAvailableStock(
      availableStockByProductId?.[item.itemId] ?? item.availableStock ?? 0,
    );

    if (item.quantity > availableStock) {
      errors[item.lineId] =
        availableStock === 0
          ? `${item.name} is out of stock.`
          : `${item.name} has only ${availableStock} available.`;
    }

    return errors;
  }, {});
