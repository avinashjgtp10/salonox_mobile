// ── Backend enums ─────────────────────────────────────────────────────────────
import type { EntityId } from "./common.types";

export type SaleStatus = "draft" | "completed" | "cancelled" | "refunded";
export type PaymentMethod = "cash" | "card" | "gift_card" | "split" | "upi";
export type SaleItemType =
  | "service"
  | "product"
  | "membership"
  | "gift_card"
  | "quick";

// ── Core entities ─────────────────────────────────────────────────────────────
export interface SaleItemDetail {
  id: EntityId;
  sale_id: EntityId;
  item_type: SaleItemType;
  item_id: string | null;
  staff_id: string | null;
  name: string;
  quantity: number;
  unit_price: string;
  discount_amount: string;
  total_price: string;
  created_at: string;
}

export interface Sale {
  id: EntityId;
  salon_id: string;
  client_id: string | null;
  client_name?: string | null;
  status: SaleStatus;
  subtotal: string;
  discount_amount: string;
  tip_amount: string;
  tax_amount: string;
  total_amount: string;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // included when fetched by ID
  items?: SaleItemDetail[];
}

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface CreateSaleItemPayload {
  item_type: SaleItemType;
  item_id?: string;
  staff_id?: string;
  name: string;
  quantity: number;
  unit_price: string;
  discount_amount?: string;
}

export interface CreateSalePayload {
  client_id?: string | null;
  status?: SaleStatus;
  items: CreateSaleItemPayload[];
  discount_amount?: string;
  tip_amount?: string;
  tax_amount?: string;
  notes?: string;
}

export interface UpdateSalePayload {
  id: EntityId;
  data: Partial<Omit<CreateSalePayload, "salon_id">>;
}

export interface CheckoutSalePayload {
  id: EntityId;
  payment_method: PaymentMethod;
  amount_paid: number;
  payment_reference?: string;
}

// ── Backend response wrappers ─────────────────────────────────────────────────
export interface SaleWithItems {
  sale: Sale;
  items: SaleItemDetail[];
}

export interface SaleResponse {
  data: Sale;
}

export interface SaleWithItemsResponse {
  data: SaleWithItems;
}

export interface SaleListResponse {
  data: Sale[];
}

export interface SaleSummary {
  total_revenue: string;
  total_sales: number;
  completed_sales: number;
  draft_sales: number;
}

export interface SaleSummaryResponse {
  data: SaleSummary;
}
