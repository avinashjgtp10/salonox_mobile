// Centralized copy for email validation messages, so every form validates
// and reports the same wording instead of each page hardcoding its own.
export const EMAIL_MESSAGES = {
  REQUIRED: "Email is required",
  INVALID: "Please enter a valid email address",
  INVALID_CREDENTIALS: "Invalid email or password",
  ALREADY_REGISTERED: "This email address is already registered. Please use a different email address.",
} as const;
