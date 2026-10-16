export function productFormInventory(input: {
  consumable: boolean;
  quantity: number;
  unitSize: number;
  stockQuantity: number;
  lowStockAlert: number;
  audit: boolean;
}) {
  const physicalPacks = input.consumable ? input.quantity : input.stockQuantity;
  const baseStock = input.consumable ? physicalPacks * input.unitSize : physicalPacks;
  return {
    physicalPacks,
    baseStock,
    amount: input.audit ? 0 : baseStock,
    bottle_size: input.consumable ? input.unitSize : null,
    // Zero means disabled. Null avoids the backend's threshold >= stock rule.
    qty_alert: !input.audit && input.lowStockAlert > 0 ? input.lowStockAlert : null,
  };
}
