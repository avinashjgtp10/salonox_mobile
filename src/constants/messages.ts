// Single source of truth for alert/validation/toast copy across the app.
// New features should add their strings here (grouped by feature) instead of
// inlining them in components, and existing inline strings should move here
// as those files get touched — see Products below for the pattern to follow.

export const PRODUCT_MESSAGES = {
  PRODUCT_NAME_REQUIRED: "Product name is required",
  CATEGORY_REQUIRED: "Product category is required",
  QUANTITY_REQUIRED: "Product quantity is required",
  SUPPLY_PRICE_REQUIRED: "Supplier price is required",
  LOW_STOCK_ALERT_REQUIRED: "Low stock alert is required",
  LOW_STOCK_ALERT_EXCEEDS_QUANTITY: "Low Stock Alert Quantity must be less than the Product Quantity.",
  LOW_STOCK_ALERT_HINT: "Alert when stock drops to or below this number.",
} as const;
