// ── Staff entity ──────────────────────────────────────────────────────────────
import type { EntityId } from './common.types';

export interface Staff {
  id:        EntityId
  fullName:  string
  email?:    string
  phone?:    string
  role?:     string
  [key: string]: any          // allow extra fields from API
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateStaffPayload {
  fullName:  string
  email?:    string
  phone?:    string
  role?:     string
  [key: string]: any
}

export interface UpdateStaffPayload {
  id:        EntityId
  data:      Partial<CreateStaffPayload>
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface StaffResponse {
  data: Staff
}

export interface StaffListResponse {
  data: Staff[]
}
