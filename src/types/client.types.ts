// ── Client entity ─────────────────────────────────────────────────────────────
export interface Client {
  id:        string | number
  fullName:  string
  email?:    string
  phone?:    string
  isBlocked?: boolean
  [key: string]: any          // allow extra fields from API
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateClientPayload {
  fullName:  string
  email?:    string
  phone?:    string
  [key: string]: any
}

export interface BlockClientsPayload {
  ids:    string[] | number[]
  reason: string
}

export interface MergeSelectedClientsPayload {
  primaryId:   string | number
  secondaryId: string | number
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface ClientResponse {
  data: Client
}

export interface ClientsListResponse {
  data: Client[]
}
