// ── User entity ───────────────────────────────────────────────────────────────
export interface User {
  id:          string | number
  email:       string
  fullName:    string
  phone?:      string
  businessName?: string
  address?:    string
  country?:    string
  countryCode?: string
  avatarUrl?:  string
  isOnboardingComplete?: boolean
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface UpdateUserPayload {
  fullName?:    string
  phone?:       string
  businessName?: string
  address?:     string
  country?:     string
  countryCode?: string
  avatarUrl?:   string
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface UserResponse {
  data: User
}
