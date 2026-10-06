import type { CartConsumableItem } from "@/features/quickSale/types";
import type { ConsumableRecipeItem, ConsumableUsageRequestItem } from "@/types/consumable";

export const buildInitialConsumables = (
  recipe: ConsumableRecipeItem[] | undefined,
  quantity: number,
): CartConsumableItem[] | undefined =>
  recipe?.map((item) => ({ ...item, actualQty: item.qty * quantity }));

export const scaleConsumables = (
  consumables: CartConsumableItem[] | undefined,
  quantity: number,
): CartConsumableItem[] | undefined =>
  consumables?.map((item) =>
    item.isActualQtyManual ? item : { ...item, actualQty: item.qty * quantity },
  );

export const toConsumableUsagePayload = (
  consumables: CartConsumableItem[] | undefined,
): ConsumableUsageRequestItem[] | undefined => {
  if (!consumables || consumables.length === 0) {
    return undefined;
  }

  return consumables.map(({ actualQty, productId, qty, unit }) => ({
    actual_qty: actualQty,
    product_id: productId,
    qty,
    unit,
  }));
};
