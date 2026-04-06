// ── Sale entity ───────────────────────────────────────────────────────────────
import type { EntityId } from './common.types';

export interface SaleItemPayload {
  id: EntityId;
  name?: string;
  price?: number;
  type?: "service" | "product" | "membership" | "giftcard" | "quick";
  quantity?: number;
}

export interface Sale {
  id: EntityId;
  clientId?: string | null;
  status: string;
  total: number;
  items: SaleItemPayload[];
  createdAt?: string;
  [key: string]: any;          // allow extra fields from API
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateSalePayload {
  clientId?: string | null;
  items: SaleItemPayload[];
  total?: number;
  status?: string;
  [key: string]: any;
}

export interface UpdateSalePayload {
  id: EntityId;
  data: Partial<CreateSalePayload>;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface SaleResponse {
  data: Sale;
}

export interface SaleListResponse {
  data: Sale[];
}
