// ── Catalog entity ─────────────────────────────────────────────────────────────
export interface CatalogItem {
  id:          string | number;
  name:        string;
  type?:       string; // e.g. 'service', 'product', 'membership', 'package'
  categoryId?: string;
  price?:      number;
  active?:     boolean;
  [key: string]: any;          // allow extra fields from API
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateCatalogPayload {
  name:        string;
  type?:       string;
  categoryId?: string;
  price?:      number;
  [key: string]: any;
}

export interface UpdateCatalogPayload {
  id:   string | number;
  data: Partial<CreateCatalogPayload>;
}

// ── API responses ─────────────────────────────────────────────────────────────
export interface CatalogResponse {
  data: CatalogItem;
}

export interface CatalogListResponse {
  data: CatalogItem[];
}
