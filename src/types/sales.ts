// Wire-level enums, verified directly against the backend source
// (salon_mgm_backend/src/modules/sales/sales.types.ts). Do not widen these
// without re-checking the backend — sending an unlisted value is rejected by
// the API's own validators (see sales.validator.ts / payments.validator.ts).
export type SaleStatus = "draft" | "completed" | "cancelled" | "refunded";
export type SalePaymentMethod = "cash" | "card" | "gift_card" | "split" | "upi";
export type SaleItemType = "service" | "product" | "membership" | "gift_card" | "quick" | "package";

// ---- GET /sales/init ---------------------------------------------------
// The backend genuinely only returns `{ staff, services }` (sales.service.ts
// `init()`). Clients, products, coupons, payment methods, and tax rate are
// NOT part of this response and are fetched from their own real endpoints
// instead (client/service/product Redux slices, the coupon service).
export type PosStaffMember = {
  avatarBg: string;
  avatarColor: string;
  id: string;
  initials: string;
  name: string;
  role: string | null;
  status: string;
};

export type PosServiceItem = {
  category: string | null;
  duration?: string;
  id: string;
  name: string;
  price: number;
};

export type SalesInitData = {
  services: PosServiceItem[];
  staff: PosStaffMember[];
};

export type SalesInitApiData = {
  services?: unknown[] | null;
  staff?: unknown[] | null;
} | null;

// ---- Create / update sale (POST /sales, PATCH /sales/:id) -------------
// UI-facing (camelCase, plain numbers) — the service layer converts these to
// the backend's real snake_case body with money fields as decimal strings
// (the create/update validators require `typeof unit_price === "string"`).
export type SaleLineItemRequest = {
  discountAmount?: number;
  itemId?: string;
  itemType: SaleItemType;
  name: string;
  quantity: number;
  staffId?: string;
  unitPrice: number;
};

export type CreateSaleRequest = {
  clientId?: string | null;
  couponCode?: string | null;
  discountAmount?: number;
  discountPercent?: number;
  discountType?: "flat" | "percentage";
  exCharges?: number;
  items: SaleLineItemRequest[];
  notes?: string | null;
  paymentMethod?: SalePaymentMethod;
  paymentReference?: string;
  salonId?: string;
  staffId?: string;
  status?: SaleStatus;
  taxAmount?: number;
  tipAmount?: number;
};

export type UpdateSaleRequest = Partial<CreateSaleRequest>;

// ---- Checkout (POST /sales/:id/checkout) -------------------------------
// Real body only accepts payment_method / amount_paid / payment_reference.
// A split payment has no dedicated array field on this endpoint — the
// backend expects the { [method]: amount } breakdown JSON-serialized into
// payment_reference when paymentMethod === "split" (sales.service.ts).
export type CheckoutSaleSplitEntry = {
  amount: number;
  method: Exclude<SalePaymentMethod, "split">;
};

export type CheckoutSaleRequest = {
  amountPaid: number;
  paymentMethod: SalePaymentMethod;
  paymentReference?: string;
  splitEntries?: CheckoutSaleSplitEntry[];
};

// ---- Normalized display types ------------------------------------------
export type SaleLineItem = {
  discountAmount: number;
  id: string;
  itemId: string | null;
  itemType: SaleItemType;
  name: string;
  quantity: number;
  staffId: string | null;
  staffName?: string;
  taxAmount: number;
  taxableAmount: number;
  totalPrice: number;
  unitPrice: number;
};

export type SaleListItem = {
  clientName: string;
  createdDateLabel: string;
  id: string;
  itemCount: number;
  paymentMethod: string;
  receiptNumber: string;
  status: SaleStatus;
  total: number;
};

export type SaleDetail = {
  amountPaid: number;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  couponCode: string | null;
  // Real backend-computed split of discountAmount — manual_discount_amount /
  // coupon_discount_amount are stored as distinct columns (sales.types.ts on
  // the backend), not derived client-side.
  couponDiscountAmount: number;
  manualDiscountAmount: number;
  createdDateLabel: string;
  discountAmount: number;
  discountPercent: number;
  discountType: "flat" | "percentage" | null;
  exCharges: number;
  id: string;
  lineItems: SaleLineItem[];
  notes: string | null;
  outstandingAmount: number;
  paymentMethod: string;
  // Raw JSON string of { [method]: amount } when paymentMethod === "split"
  // (see sales.service.ts's buildSaleRequestBody) — null otherwise.
  paymentReference: string | null;
  receiptNumber: string;
  status: SaleStatus;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  total: number;
};

export type SalesSortOrder = "asc" | "desc";

export type SalesListQuery = {
  limit: number;
  offset: number;
  search: string;
  sort_by: string;
  sort_order: SalesSortOrder;
  status?: string;
};

export type SalesListPagination = {
  hasMore: boolean;
  limit: number;
  nextOffset: number;
  offset: number;
};

export type SalesListResponse = {
  pagination: SalesListPagination;
  query: SalesListQuery;
  sales: SaleListItem[];
  totalCount: number;
};

export type CreateSaleResponse = {
  message?: string;
  sale: SaleDetail;
};

export type UpdateSaleResponse = {
  message?: string;
  sale: SaleDetail;
};

export type CheckoutSaleResponse = {
  message?: string;
  sale: SaleDetail;
};

export type DeleteSaleResponse = {
  message?: string;
  saleId: string;
};

export type SalesSummary = {
  averageSale: number;
  totalRevenue: number;
  totalSales: number;
  totalTransactions: number;
};

export type ExportSalesResponse = {
  message?: string;
  url: string | null;
};
