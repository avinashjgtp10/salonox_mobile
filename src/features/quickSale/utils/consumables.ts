import type { CartConsumableItem } from "@/features/quickSale/types";
import type { ConsumableRecipeItem, ConsumableUsageItem } from "@/types/consumable";

// Copies a service's recipe onto a freshly added cart line, seeding Actual
// Qty at the recipe's standard quantity scaled to the starting billed
// quantity — matches Web's default before any staff edit.
export const buildInitialConsumables = (
  recipe: ConsumableRecipeItem[] | undefined,
  quantity: number,
): CartConsumableItem[] | undefined =>
  recipe?.map((item) => ({ ...item, actualQty: item.qty * quantity }));

// Recipe qty scales with billed service quantity; an Actual Qty the staff has
// manually edited is left alone so re-stepping quantity doesn't clobber it.
export const scaleConsumables = (
  consumables: CartConsumableItem[] | undefined,
  quantity: number,
): CartConsumableItem[] | undefined =>
  consumables?.map((item) =>
    item.isActualQtyManual ? item : { ...item, actualQty: item.qty * quantity },
  );

// Strips cart-only bookkeeping (isActualQtyManual) before the recipe goes
// into the appointment payload — the backend only ever sees the recipe shape.
export const toConsumableUsagePayload = (
  consumables: CartConsumableItem[] | undefined,
): ConsumableUsageItem[] | undefined => {
  if (!consumables || consumables.length === 0) {
    return undefined;
  }

  return consumables.map(({ actualQty, productId, qty, unit }) => ({
    actualQty,
    productId,
    qty,
    unit,
  }));
};
