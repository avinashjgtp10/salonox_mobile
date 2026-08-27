export const INVENTORY = {
  BASE: "/api/v1/inventory",
  SUPPLIERS: "/api/v1/inventory/suppliers",
  SUPPLIER_BY_ID: (id: string) => `/api/v1/inventory/suppliers/${id}`,
  SUPPLIER_PAYMENTS: (id: string) => `/api/v1/inventory/suppliers/${id}/payments`,

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

  // Product Inventory — retail stock (product_type retail/both). The
  // consumable endpoints above cover salon-use stock; these are the resale
  // counterpart, kept separate so the two can't write each other's figures.
  PRODUCT_INVENTORY: "/api/v1/inventory/product-inventory",
  PRODUCT_INVENTORY_FILTER_OPTIONS: "/api/v1/inventory/product-inventory/filter-options",
  PRODUCT_INVENTORY_HISTORY: "/api/v1/inventory/product-inventory/history",
  PRODUCT_INVENTORY_STOCK_IN: (id: string) => `/api/v1/inventory/product-inventory/${id}/stock-in`,

  // Purchases — supplier deliveries recorded from the Product Inventory page's
  // "Purchase" button. Saving hits PRODUCT_INVENTORY_PURCHASES once (supplier +
  // every product line in one request); the response includes the generated
  // Supplier Number and the freshly recomputed inventory rows for the products
  // touched, so the table can patch itself without a follow-up GET.
  PRODUCT_INVENTORY_PURCHASES: "/api/v1/inventory/product-inventory/purchases",
  PRODUCT_INVENTORY_PURCHASE_BY_ID: (id: string) => `/api/v1/inventory/product-inventory/purchases/${id}`,

  // Orders — a purchase-order DOCUMENT only (no stock movement), separate
  // from the Purchase flow above which records a delivery immediately.
  ORDERS: "/api/v1/inventory/orders",
  ORDER_BY_ID: (id: string) => `/api/v1/inventory/orders/${id}`,
  ORDER_UPLOAD_SIGNATURE: "/api/v1/inventory/orders/upload-signature",
  ORDER_SIGNATURES: "/api/v1/inventory/orders/signatures",

  // Product Audit — count physical stock against system quantities. Never
  // adjusts real stock; see product-audit.repository.ts on the backend.
  PRODUCT_AUDITS: "/api/v1/inventory/product-audits",
  PRODUCT_AUDIT_BY_ID: (id: string) => `/api/v1/inventory/product-audits/${id}`,
  PRODUCT_AUDIT_ITEMS: (id: string) => `/api/v1/inventory/product-audits/${id}/items`,
  PRODUCT_AUDIT_ITEM_BY_ID: (id: string, itemId: string) => `/api/v1/inventory/product-audits/${id}/items/${itemId}`,
  PRODUCT_AUDIT_SUBMIT: (id: string) => `/api/v1/inventory/product-audits/${id}/submit`,
  PRODUCT_AUDIT_APPROVE: (id: string) => `/api/v1/inventory/product-audits/${id}/approve`,
  PRODUCT_AUDIT_REJECT: (id: string) => `/api/v1/inventory/product-audits/${id}/reject`,
  PRODUCT_AUDIT_REOPEN: (id: string) => `/api/v1/inventory/product-audits/${id}/reopen`,
} as const;
