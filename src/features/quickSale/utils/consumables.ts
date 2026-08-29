import type { CartConsumableItem } from "@/features/quickSale/types";
import type { ConsumableRecipeItem, ConsumableUsageRequestItem } from "@/types/consumable";

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

// Strips cart-only bookkeeping (isActualQtyManual) and converts to the wire
// shape the backend's flattenServiceConsumables() actually reads
// (product_id/qty/unit/actual_qty, snake_case) before the recipe goes into
// the appointment payload. Previously returned the camelCase ConsumableUsageItem
// shape verbatim, which flattenServiceConsumables silently drops (its
// `if (!c.product_id) continue` skips every row, since c.product_id is always
// undefined on a camelCase object) — no consumable ever reached
// appointment_service_consumables despite the recipe being correctly carried
// this far.
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
