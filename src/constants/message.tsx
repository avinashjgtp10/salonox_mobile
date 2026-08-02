// Centralized copy for email validation messages, so every form validates
// and reports the same wording instead of each page hardcoding its own.
export const EMAIL_MESSAGES = {
  REQUIRED: "Email is required",
  INVALID: "Please enter a valid email address",
  INVALID_CREDENTIALS: "Invalid email or password",
  ALREADY_REGISTERED: "This email address is already registered. Please use a different email address.",
} as const;

// GST/PAN validation messages — shared between BusinessSettingsPage's live
// field validation and its save-time gate so both report identical wording.
export const TAX_ID_MESSAGES = {
  GSTIN_LENGTH: "GSTIN must be exactly 15 characters.",
  GSTIN_FORMAT: "Invalid GSTIN format (e.g. 22AAAAA0000A1Z5).",
  PAN_LENGTH: "PAN must be exactly 10 characters.",
  PAN_FORMAT: "Invalid PAN format (e.g. AAAAA0000A).",
} as const;
