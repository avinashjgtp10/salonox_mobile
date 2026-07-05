export const INVENTORY = {
  BASE: "/api/v1/inventory",
  SUPPLIERS: "/api/v1/inventory/suppliers",
  SUPPLIER_BY_ID: (id: string) => `/api/v1/inventory/suppliers/${id}`,

  STOCK_MOVEMENTS: "/api/v1/inventory/stock-movements",
  MOVEMENT_BY_ID: (id: string) => `/api/v1/inventory/stock-movements/${id}`,

  STOCK_TAKES: "/api/v1/inventory/stock-takes",
  STOCK_TAKE_BY_ID: (id: string) => `/api/v1/inventory/stock-takes/${id}`,

  PROCESS_STOCK_TAKE: "/api/v1/inventory/stock-take",

  // Stock Reconciliation
  STOCK_RECONCILIATION: "/api/v1/inventory/stock-reconciliation",
  STOCK_RECONCILIATION_ROW: (productId: string) => `/api/v1/inventory/stock-reconciliation/${productId}`,

  // Consumable usage (from calendar appointments)
  CONSUMABLE_USAGE: "/api/v1/inventory/consumable-usage",
} as const;
