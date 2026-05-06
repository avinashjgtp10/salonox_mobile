export type StocktakeStatus = "In progress" | "Paused" | "Review" | "Completed" | "Canceled";

export interface Stocktake {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  status: StocktakeStatus;
  started_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStocktakePayload {
  branch_id: string;
  name?: string;
  description?: string;
  selection_type?: "all" | "category" | "manual";
}

export interface StockTakeItem {
  product_id: string;
  actual_qty: number;
  notes?: string;
}

export interface ProcessStockTakePayload {
  stocktake_id?: string;
  branch_id: string;
  notes?: string;
  items: StockTakeItem[];
}

export interface StockTakeResult {
  processed: number;
  movements: any[];
}

export interface InventoryResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  description: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile_country_code: string | null;
  mobile_number: string | null;
  telephone_country_code: string | null;
  telephone_number: string | null;
  email: string | null;
  website: string | null;
  street: string | null;
  suburb: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  same_as_physical: boolean;
  postal_street: string | null;
  postal_suburb: string | null;
  postal_city: string | null;
  postal_state: string | null;
  postal_zip_code: string | null;
  postal_country: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierPayload {
  name: string;
  description?: string;
  first_name?: string;
  last_name?: string;
  mobile_country_code?: string;
  mobile_number?: string;
  telephone_country_code?: string;
  telephone_number?: string;
  email?: string;
  website?: string;
  street?: string;
  suburb?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  same_as_physical?: boolean;
  postal_street?: string | null;
  postal_suburb?: string | null;
  postal_city?: string | null;
  postal_state?: string | null;
  postal_zip_code?: string | null;
  postal_country?: string | null;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;
