export const INVENTORY = {
  BASE: "/api/v1/inventory",
  SUPPLIERS: "/api/v1/inventory/suppliers",
  SUPPLIERS_LIST: "/api/v1/inventory/suppliers/list",
  SUPPLIER_FILTER_OPTIONS: "/api/v1/inventory/suppliers/filter-options",
  SUPPLIER_BY_ID: (id: string) => `/api/v1/inventory/suppliers/${id}`,
  SUPPLIER_PAYMENTS: (id: string) => `/api/v1/inventory/suppliers/${id}/payments`,

  // Supplier Products Catalog (Excel/CSV import + Suggested Products on New Order)
  SUPPLIER_PRODUCTS: (id: string) => `/api/v1/inventory/suppliers/${id}/products`,
  SUPPLIER_PRODUCTS_IMPORT: (id: string) => `/api/v1/inventory/suppliers/${id}/products/import`,
  SUPPLIER_PRODUCT_RESOLVE: (supplierId: string, catalogId: string) =>
    `/api/v1/inventory/suppliers/${supplierId}/products/${catalogId}/resolve`,

  STOCK_MOVEMENTS: "/api/v1/inventory/stock-movements",
  MOVEMENT_BY_ID: (id: string) => `/api/v1/inventory/stock-movements/${id}`,

  // Back-bar consumption totals per product — read-only, powers the
  // Consumable Usage report (the editable reconciliation page it was built
  // for is gone; that URL now redirects to Consumable Inventory).
  STOCK_RECONCILIATION: "/api/v1/inventory/stock-reconciliation",

  // Consumable Inventory (dedicated module)
  CONSUMABLES: "/api/v1/inventory/consumables",
  CONSUMABLES_DASHBOARD: "/api/v1/inventory/consumables/dashboard",
  CONSUMABLES_USAGE_HISTORY: "/api/v1/inventory/consumables/usage-history",
  CONSUMABLES_USAGE_REVERT: (usageId: string) =>
    `/api/v1/inventory/consumables/usage-history/${usageId}/revert`,
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
  // Detail drawer aggregate: current stock, on-order, last purchase price, suppliers.
  PRODUCT_INVENTORY_DETAIL: (id: string) => `/api/v1/inventory/product-inventory/${id}/detail`,

  // Multi-supplier pricing per product — additive alongside
  // products.supplier_id/supply_price (the preferred/default supplier).
  PRODUCT_SUPPLIERS: (productId: string) => `/api/v1/inventory/product-inventory/${productId}/suppliers`,
  PRODUCT_SUPPLIER_BY_ID: (productId: string, mappingId: string) =>
    `/api/v1/inventory/product-inventory/${productId}/suppliers/${mappingId}`,

  // Purchases — supplier deliveries recorded from the Product Inventory page's
  // "Receive Stock" button. Saving hits PRODUCT_INVENTORY_PURCHASES once (supplier +
  // every product line in one request); the response includes the generated
  // Supplier Number and the freshly recomputed inventory rows for the products
  // touched, so the table can patch itself without a follow-up GET.
  PRODUCT_INVENTORY_PURCHASES: "/api/v1/inventory/product-inventory/purchases",
  PRODUCT_INVENTORY_PURCHASE_BY_ID: (id: string) => `/api/v1/inventory/product-inventory/purchases/${id}`,
  PRODUCT_INVENTORY_PURCHASES_CHART: "/api/v1/inventory/product-inventory/purchases/chart",

  // Orders — a purchase-order document. Receiving against one creates a
  // linked Purchase (see PRODUCT_INVENTORY_PURCHASES above) which is what
  // actually moves stock.
  ORDERS: "/api/v1/inventory/orders",
  ORDER_BY_ID: (id: string) => `/api/v1/inventory/orders/${id}`,
  ORDER_RECEIVE: (id: string) => `/api/v1/inventory/orders/${id}/receive`,
  ORDER_CORRECT_RECEIVED: (id: string, itemId: string) => `/api/v1/inventory/orders/${id}/items/${itemId}/correct-received`,
  ORDER_CANCEL: (id: string) => `/api/v1/inventory/orders/${id}/cancel`,
  ORDER_DELETE: (id: string) => `/api/v1/inventory/orders/${id}/delete`,
  ORDER_UPDATE: (id: string) => `/api/v1/inventory/orders/${id}/update`,
  ORDER_UPLOAD_SIGNATURE: "/api/v1/inventory/orders/upload-signature",
  ORDER_SIGNATURES: "/api/v1/inventory/orders/signatures",

  // Order Receiving (draft -> confirm) — replaces the single-shot
  // ORDER_RECEIVE above with a session the clerk can save as a draft (zero
  // stock effect); only ORDER_RECEIPT_CONFIRM moves stock.
  ORDER_RECEIPT_DRAFT: (orderId: string) => `/api/v1/inventory/orders/${orderId}/receipts/draft`,
  ORDER_RECEIPT_ITEMS: (orderId: string, receiptId: string) => `/api/v1/inventory/orders/${orderId}/receipts/${receiptId}/items`,
  ORDER_RECEIPT_CONFIRM: (orderId: string, receiptId: string) => `/api/v1/inventory/orders/${orderId}/receipts/${receiptId}/confirm`,

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

  // Stock Ledger — full movement history per product, one row per
  // transaction with the running balance already applied.
  STOCK_LEDGER: "/api/v1/inventory/stock-ledger",
  // POST variant of STOCK_LEDGER's GET list — same filters, sent as a JSON
  // body instead of query params (report-style: one call, no query-string cap).
  STOCK_LEDGER_LIST: "/api/v1/inventory/stock-ledger/list",
  STOCK_LEDGER_BY_ID: (id: string) => `/api/v1/inventory/stock-ledger/${id}`,
  STOCK_LEDGER_PRODUCT_TIMELINE: (productId: string) => `/api/v1/inventory/stock-ledger/product/${productId}/timeline`,
} as const;
