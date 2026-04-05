// ── Staff entity ──────────────────────────────────────────────────────────────
export interface Staff {
  id:        string | number
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
  id:        string | number
  data:      Partial<CreateStaffPayload>
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface StaffResponse {
  data: Staff
}

export interface StaffListResponse {
  data: Staff[]
}
