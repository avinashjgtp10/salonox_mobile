export type SaleStatus = "draft" | "completed" | "cancelled" | "refunded";
export type SalePaymentMethod = "cash" | "card" | "gift_card" | "split" | "upi";
export type SaleItemType = "service" | "product" | "membership" | "gift_card" | "quick" | "package";

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

export type StaffSaleItem = SaleLineItem & {
  clientName: string | null;
  paymentSource: string;
  saleCreatedDateLabel: string;
  saleId: string;
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

export type StaffSaleItemsResponse = {
  items: StaffSaleItem[];
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

export type ExportFormat = "csv" | "excel" | "pdf";

export type ExportSalesResponse = {
  data: string | ArrayBuffer;
  contentType: string;
  filename: string;
  format: ExportFormat;
};
