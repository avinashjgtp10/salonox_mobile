// Single source of truth for alert/validation/toast copy across the app.
// New features should add their strings here (grouped by feature) instead of
// inlining them in components, and existing inline strings should move here
// as those files get touched — see Products below for the pattern to follow.

export const PRODUCT_MESSAGES = {
  PRODUCT_NAME_REQUIRED: "Product name is required",
  CATEGORY_REQUIRED: "Product category is required",
  QUANTITY_REQUIRED: "Product quantity is required",
  LOW_STOCK_ALERT_REQUIRED: "Low stock alert is required",
  LOW_STOCK_ALERT_EXCEEDS_QUANTITY: "Low Stock Alert Quantity must be less than the Product Quantity.",
  LOW_STOCK_ALERT_HINT: "Alert when stock drops to or below this number.",
  HSN_SAC_INVALID: "HSN/SAC code must contain only numbers",
} as const;

export const SUPPLIER_MESSAGES = {
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Enter a valid email address",
  MOBILE_REQUIRED: "Mobile number is required",
  MOBILE_INVALID: "Mobile number must be exactly 10 digits",
  GSTIN_INVALID: "Enter a valid 15-character GSTIN",
  PAN_INVALID: "Enter a valid 10-character PAN",
  IFSC_INVALID: "Enter a valid 11-character IFSC code",
} as const;

export const CURRENCY_MESSAGES = {
  PAGE_TITLE: "Currency",
  PAGE_SUBTITLE: "Choose the country and currency used everywhere in the app — bills, reports, the calendar, and receipts.",
  SECTION_TITLE: "Region & Currency",
  SECTION_DESC: "Selecting a country automatically fills in its currency — but you can still change the currency independently afterward (e.g. a salon in India billing in USD).",
  SALON_NOT_FOUND: "Salon information not found",
  SAVE_SUCCESS: "Saved — applies across the whole app immediately",
  SAVE_FAILED: "Failed to save",
} as const;
