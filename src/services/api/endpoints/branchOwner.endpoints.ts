export const BRANCH_OWNER = {
  SALONS:      "/api/v1/branch-owner/salons",
  SALON_ENTER: (id: string) => `/api/v1/branch-owner/salons/${id}/enter`,
  STATS:       "/api/v1/branch-owner/stats",
  PAYMENTS:    "/api/v1/branch-owner/payments",
  SALON_PRODUCTS: (salonId: string) => `/api/v1/branch-owner/salons/${salonId}/products`,
  SUGGEST_MATCH: "/api/v1/branch-owner/stock-transfer/suggest-match",
  STOCK_TRANSFER: "/api/v1/branch-owner/stock-transfer",
  STOCK_TRANSFER_COMPLETE: (id: string) => `/api/v1/branch-owner/stock-transfer/${id}/complete`,
  STOCK_TRANSFER_CANCEL: (id: string) => `/api/v1/branch-owner/stock-transfer/${id}/cancel`,
  STOCK_TRANSFERS: "/api/v1/branch-owner/stock-transfers",
  INVENTORY_SUMMARY: "/api/v1/branch-owner/inventory/summary",
  INVENTORY_BRANCH_OVERVIEW: "/api/v1/branch-owner/inventory/branch-overview",
  INVENTORY_LOW_STOCK: "/api/v1/branch-owner/inventory/low-stock",
  INVENTORY_CATEGORIES: "/api/v1/branch-owner/inventory/categories",
  INVENTORY_CATEGORY_PRODUCTS: (name: string) => `/api/v1/branch-owner/inventory/categories/${encodeURIComponent(name)}/products`,

  FINANCE_OVERVIEW: "/api/v1/branch-owner/finance/overview",
  FINANCE_SALON_COMMISSIONS: (salonId: string) => `/api/v1/branch-owner/finance/salons/${salonId}/commissions`,
  FINANCE_SETTLE_COMMISSION: (salonId: string) => `/api/v1/branch-owner/finance/salons/${salonId}/commissions/settle`,

  STAFF_PERFORMANCE: "/api/v1/branch-owner/staff-performance",

  SALON_MEMBERSHIPS: (salonId: string) => `/api/v1/branch-owner/salons/${salonId}/memberships`,
  MEMBERSHIP_COPY: "/api/v1/branch-owner/memberships/copy",

  SALON_PACKAGES: (salonId: string) => `/api/v1/branch-owner/salons/${salonId}/packages`,
  PACKAGE_COPY: "/api/v1/branch-owner/packages/copy",
} as const;
