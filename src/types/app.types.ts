// ── App entity ─────────────────────────────────────────────────────────────────
export interface ExternalApp {
  id:          string | number;
  name:        string;
  description?: string;
  provider:    string;
  status:      string; // e.g. 'connected', 'disconnected'
  config?:     Record<string, any>;
  [key: string]: any;
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface ConnectAppPayload {
  name:        string;
  provider:    string;
  config?:     Record<string, any>;
  [key: string]: any;
}

export interface UpdateAppPayload {
  id:   string | number;
  data: Partial<ConnectAppPayload>;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface AppResponse {
  data: ExternalApp;
}

export interface AppListResponse {
  data: ExternalApp[];
}
