// ── Setting entity ─────────────────────────────────────────────────────────────
import type { EntityId } from './common.types';

export interface Setting {
  id:          EntityId;
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
  id:   EntityId;
  data: Partial<CreateSettingPayload>;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface SettingResponse {
  data: Setting;
}

export interface SettingListResponse {
  data: Setting[];
}
