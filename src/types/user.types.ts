// ── User entity ───────────────────────────────────────────────────────────────
import type { EntityId } from './common.types';

export interface User {
  id:          EntityId
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
