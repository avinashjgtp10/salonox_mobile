export type PosPaymentMethod = string;
export type PosDiscountType = string;

export type PosClient = {
  avatarBg: string;
  avatarColor: string;
  id: string;
  initials: string;
  loyaltyPoints: number;
  membership?: string;
  mobileNumber: string;
  name: string;
  walletBalance?: number;
};

export type PosCatalogItem = {
  category: "service" | "product";
  duration?: string;
  id: string;
  isQuickChip?: boolean;
  name: string;
  price: number;
};

export type PosStaffMember = {
  avatarBg: string;
  avatarColor: string;
  id: string;
  initials: string;
  name: string;
  status: string;
};

export type PosCoupon = {
  code: string;
  label: string;
  type: "fixed" | "percentage";
  value: number;
};

export type PreviousSale = {
  amount: number;
  clientName: string;
  id: string;
  method: string;
  timeLabel: string;
};

export type PosSettingRow = {
  id: string;
  label: string;
  value: string;
};

export type SalesInitData = {
  catalog: PosCatalogItem[];
  clients: PosClient[];
  coupons: PosCoupon[];
  discountTypes: PosDiscountType[];
  paymentMethods: PosPaymentMethod[];
  previousSales: PreviousSale[];
  receiptNumber: string;
  settings: PosSettingRow[];
  staff: PosStaffMember[];
  taxRate: number;
};

// Loose API shape — the backend contract is undocumented, so every section is
// read defensively across common camelCase/snake_case key variants.
export type SalesInitApiData = {
  [key: string]: unknown;
} | null;

export type SaleStatus = "draft" | "completed" | "cancelled" | string;

export type SaleLineItemRequest = {
  catalogId: string;
  category: "service" | "product";
  name: string;
  price: number;
  quantity: number;
  staffId?: string;
};

export type SaleDiscountRequest = {
  couponCode?: string;
  type: string;
  value: number;
};

export type CreateSaleRequest = {
  clientId: string;
  discount?: SaleDiscountRequest;
  items: SaleLineItemRequest[];
  notes?: string;
  status: "draft" | "pending";
};

export type UpdateSaleRequest = Partial<CreateSaleRequest>;

export type CheckoutSaleSplitPayment = {
  amount: number;
  method: string;
};

export type CheckoutSaleRequest = {
  amountPaid: number;
  outstandingAmount?: number;
  paymentMethod: string;
  splitPayments?: CheckoutSaleSplitPayment[];
};

export type SaleLineItem = {
  category: "service" | "product";
  duration?: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  staffName?: string;
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
  address?: string;
  amountPaid: number;
  clientName: string;
  clientPhone: string;
  createdDateLabel: string;
  discountAmount: number;
  id: string;
  lineItems: SaleLineItem[];
  notes: string | null;
  outstandingAmount: number;
  paymentMethod: string;
  receiptNumber: string;
  status: SaleStatus;
  subtotal: number;
  taxAmount: number;
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
