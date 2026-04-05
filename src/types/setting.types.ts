// ── Setting entity ─────────────────────────────────────────────────────────────
export interface Setting {
  id:          string | number;
  key:         string;
  value:       string | Record<string, any>;
  description?: string;
  [key: string]: any;
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateSettingPayload {
  key:         string;
  value:       string | Record<string, any>;
  description?: string;
  [key: string]: any;
}

export interface UpdateSettingPayload {
  id:   string | number;
  data: Partial<CreateSettingPayload>;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface SettingResponse {
  data: Setting;
}

export interface SettingListResponse {
  data: Setting[];
}
