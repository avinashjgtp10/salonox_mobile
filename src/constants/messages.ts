// Single source of truth for alert/validation/toast copy across the app.
// New features should add their strings here (grouped by feature) instead of
// inlining them in components, and existing inline strings should move here
// as those files get touched.

export const PRODUCT_MESSAGES = {
  HSN_SAC_INVALID: "HSN/SAC code must contain only numbers",
  QTY_ALERT_REQUIRED: "Low stock alert is required",
  QTY_ALERT_EXCEEDS_QUANTITY: "Low stock alert must be less than the product quantity",
} as const;

export const SUPPLIER_MESSAGES = {
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Enter a valid email address",
  MOBILE_REQUIRED: "Mobile number is required",
  MOBILE_INVALID: "Mobile number must be exactly 10 digits",
} as const;
