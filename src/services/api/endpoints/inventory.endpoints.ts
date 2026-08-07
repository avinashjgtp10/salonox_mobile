export const INVENTORY = {
  BASE: "/api/v1/inventory",
  SUPPLIERS: "/api/v1/inventory/suppliers",
  SUPPLIER_BY_ID: (id: string) => `/api/v1/inventory/suppliers/${id}`,

  STOCK_MOVEMENTS: "/api/v1/inventory/stock-movements",
  MOVEMENT_BY_ID: (id: string) => `/api/v1/inventory/stock-movements/${id}`,

  STOCK_TAKES: "/api/v1/inventory/stock-takes",
  STOCK_TAKE_BY_ID: (id: string) => `/api/v1/inventory/stock-takes/${id}`,

  PROCESS_STOCK_TAKE: "/api/v1/inventory/stock-take",

  // Back-bar consumption totals per product — read-only, powers the
  // Consumable Usage report (the editable reconciliation page it was built
  // for is gone; that URL now redirects to Consumable Inventory).
  STOCK_RECONCILIATION: "/api/v1/inventory/stock-reconciliation",

  // Consumable Inventory (dedicated module)
  CONSUMABLES: "/api/v1/inventory/consumables",
  CONSUMABLES_DASHBOARD: "/api/v1/inventory/consumables/dashboard",
  CONSUMABLES_USAGE_HISTORY: "/api/v1/inventory/consumables/usage-history",
  CONSUMABLE_BY_ID: (id: string) => `/api/v1/inventory/consumables/${id}`,
  CONSUMABLE_ADJUST: (id: string) => `/api/v1/inventory/consumables/${id}/adjust`,
  CONSUMABLE_ASSIGNED_SERVICES: (id: string) => `/api/v1/inventory/consumables/${id}/assigned-services`,
  CONSUMABLE_UNIT_CONVERSIONS: (id: string) => `/api/v1/inventory/consumables/${id}/unit-conversions`,
} as const;
