// ── Catalog entity ─────────────────────────────────────────────────────────────
import type { EntityId } from "./common.types";

export interface CatalogItem {
  id: EntityId;
  name: string;
  type?: string; // e.g. 'service', 'product', 'membership', 'package'
  categoryId?: string;
  price?: number;
  active?: boolean;
  [key: string]: any; // allow extra fields from API
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateCatalogPayload {
  name: string;
  type?: string;
  categoryId?: string;
  price?: number;
  [key: string]: any;
}

export interface UpdateCatalogPayload {
  id: EntityId;
  data: Partial<CreateCatalogPayload>;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface CatalogResponse {
  data: CatalogItem;
}

export interface CatalogListResponse {
  data: CatalogItem[];
}
