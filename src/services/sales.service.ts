import { api } from "@/services/api";
import { SALES } from "@/services/api/endpoints";
import { serviceService } from "@/services/service.service";
import type { ApiResponse } from "@/types/auth";
import type {
  CheckoutSaleRequest,
  CheckoutSaleResponse,
  CreateSaleRequest,
  CreateSaleResponse,
  DeleteSaleResponse,
  ExportSalesResponse,
  PosCatalogItem,
  PosClient,
  PosCoupon,
  PosSettingRow,
  PosStaffMember,
  PreviousSale,
  SaleDetail,
  SaleLineItem,
  SaleListItem,
  SalesInitApiData,
  SalesInitData,
  SalesListPagination,
  SalesListQuery,
  SalesListResponse,
  SalesSummary,
  UpdateSaleRequest,
  UpdateSaleResponse,
} from "@/types/sales";

type SalesInitApiResponse = ApiResponse<SalesInitApiData>;

type UnknownRecord = Record<string, unknown>;

type SaleApiData =
  | UnknownRecord
  | {
      data?: UnknownRecord | null;
      sale?: UnknownRecord | null;
    };
type SaleApiResponse = ApiResponse<SaleApiData>;
type SalesListApiData =
  | UnknownRecord[]
  | {
      count?: number | null;
      data?: UnknownRecord[] | null;
      items?: UnknownRecord[] | null;
      pagination?: UnknownRecord | null;
      rows?: UnknownRecord[] | null;
      sales?: UnknownRecord[] | null;
      total?: number | null;
      totalCount?: number | null;
      total_count?: number | null;
    };
type SalesListApiResponse = ApiResponse<SalesListApiData>;
type SalesSummaryApiResponse = ApiResponse<UnknownRecord | null>;
type ExportSalesApiResponse = ApiResponse<UnknownRecord | string | null>;

const AVATAR_PALETTE = [
  { background: "#FBF3E5", color: "#8A5A0E" },
  { background: "#EAF5EF", color: "#2E7049" },
  { background: "#F1EEF8", color: "#6B52C1" },
  { background: "#FAECE7", color: "#712B13" },
  { background: "#EEF4F1", color: "#365046" },
] as const;

const DEFAULT_PAYMENT_METHODS = ["Cash", "Card", "UPI", "Wallet", "Gift Card", "Split Payment"];
const DEFAULT_DISCOUNT_TYPES = [
  "Percentage Discount",
  "Fixed Amount Discount",
  "Coupon Code",
  "Membership Discount",
];
const DEFAULT_TAX_RATE = 18;

const WALK_IN_CLIENT: PosClient = {
  avatarBg: "#EEF4F1",
  avatarColor: "#365046",
  id: "walk-in",
  initials: "WI",
  loyaltyPoints: 0,
  mobileNumber: "No client selected",
  name: "Walk-in Customer",
};

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const toSafeString = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
};

const toSafeNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
};

const firstValue = (record: UnknownRecord, keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
};

const firstArray = (record: UnknownRecord, keys: string[]): UnknownRecord[] => {
  const value = firstValue(record, keys);

  return Array.isArray(value) ? value.map(asRecord) : [];
};

// Some backends nest the POS catalog a level deeper (e.g. `data.catalog.services`
// or `data.pos.services`) instead of at the top level of the /sales/init payload.
// This checks the direct keys first, then falls back to common wrapper objects.
const CATALOG_WRAPPER_KEYS = ["catalog", "menu", "pos", "posData", "pos_data"];

const firstArrayDeep = (record: UnknownRecord, keys: string[]): UnknownRecord[] => {
  const direct = firstArray(record, keys);

  if (direct.length > 0) {
    return direct;
  }

  for (const wrapperKey of CATALOG_WRAPPER_KEYS) {
    const wrapped = firstArray(asRecord(record[wrapperKey]), keys);

    if (wrapped.length > 0) {
      return wrapped;
    }
  }

  return [];
};

const getAvatarTone = (seed: string) => {
  const hash = seed.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const getInitials = (name: string, fallback = "??") => {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return fallback;
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

const getEntryName = (entry: UnknownRecord, fallback: string) =>
  toSafeString(
    firstValue(entry, ["name", "fullName", "full_name", "title", "label", "service_name"]),
    fallback,
  );

const getEntryId = (entry: UnknownRecord, fallbackName: string) =>
  toSafeString(firstValue(entry, ["id", "_id"]), fallbackName.toLowerCase().replace(/\s+/g, "-"));

const toDurationLabel = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const minutes = toSafeNumber(value);

  return minutes > 0 ? `${minutes} min` : undefined;
};

const normalizeClient = (entry: UnknownRecord): PosClient => {
  const name = getEntryName(entry, "Client");
  const id = getEntryId(entry, name);
  const tone = getAvatarTone(id);
  const membershipValue = firstValue(entry, ["membership", "membership_name", "membershipName"]);
  const membership =
    toSafeString(membershipValue) || toSafeString(asRecord(membershipValue).name) || undefined;
  const walletBalance = toSafeNumber(
    firstValue(entry, ["walletBalance", "wallet_balance", "wallet"]),
  );

  return {
    avatarBg: tone.background,
    avatarColor: tone.color,
    id,
    initials: getInitials(name, "CL"),
    loyaltyPoints: toSafeNumber(
      firstValue(entry, ["loyaltyPoints", "loyalty_points", "points"]),
    ),
    ...(membership ? { membership } : {}),
    mobileNumber: toSafeString(
      firstValue(entry, ["mobileNumber", "mobile_number", "mobile", "phone", "phone_number", "phoneNumber"]),
      "-",
    ),
    name,
    ...(walletBalance > 0 ? { walletBalance } : {}),
  };
};

const normalizeCatalogItem = (
  entry: UnknownRecord,
  category: "service" | "product",
): PosCatalogItem => {
  const name = getEntryName(entry, category === "service" ? "Service" : "Product");
  const duration = toDurationLabel(
    firstValue(entry, ["duration", "duration_minutes", "durationMinutes"]),
  );
  const quickChipValue = firstValue(entry, [
    "isQuickChip",
    "is_quick_chip",
    "isPopular",
    "is_popular",
    "featured",
    "is_featured",
  ]);

  return {
    category,
    ...(category === "service" && duration ? { duration } : {}),
    id: getEntryId(entry, `${category}-${name}`),
    ...(quickChipValue === true || quickChipValue === "true" ? { isQuickChip: true } : {}),
    name,
    price: toSafeNumber(firstValue(entry, ["price", "amount", "selling_price", "sellingPrice"])),
  };
};

const normalizeStaffMember = (entry: UnknownRecord): PosStaffMember => {
  const name = getEntryName(entry, "Staff");
  const id = getEntryId(entry, name);
  const tone = getAvatarTone(id);

  return {
    avatarBg: tone.background,
    avatarColor: tone.color,
    id,
    initials: getInitials(name, "ST"),
    name,
    status: toSafeString(
      firstValue(entry, ["status", "availability", "role", "designation"]),
      "Available",
    ),
  };
};

const normalizeCoupon = (entry: UnknownRecord): PosCoupon | null => {
  const code = toSafeString(firstValue(entry, ["code", "coupon_code", "couponCode"])).toUpperCase();

  if (!code) {
    return null;
  }

  const rawType = toSafeString(
    firstValue(entry, ["type", "discount_type", "discountType"]),
  ).toLowerCase();

  return {
    code,
    label: toSafeString(firstValue(entry, ["label", "description", "name", "title"]), code),
    type: rawType.includes("percent") ? "percentage" : "fixed",
    value: toSafeNumber(firstValue(entry, ["value", "amount", "discount_value", "discountValue"])),
  };
};

const formatSaleTime = (value: unknown): string => {
  const raw = toSafeString(value);

  if (!raw) {
    return "-";
  }

  const parsedDate = new Date(raw);

  if (Number.isNaN(parsedDate.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(parsedDate);
};

const normalizePreviousSale = (entry: UnknownRecord, index: number): PreviousSale => {
  const clientValue = firstValue(entry, ["clientName", "client_name", "client", "customer_name"]);
  const clientName =
    toSafeString(clientValue) || toSafeString(asRecord(clientValue).name) || "Walk-in Customer";

  return {
    amount: toSafeNumber(firstValue(entry, ["amount", "total", "grand_total", "grandTotal"])),
    clientName,
    id: toSafeString(
      firstValue(entry, ["receipt", "receipt_number", "receiptNumber", "id", "_id"]),
      `SALE-${index + 1}`,
    ),
    method: toSafeString(
      firstValue(entry, ["method", "payment_method", "paymentMethod"]),
      "-",
    ),
    timeLabel: formatSaleTime(firstValue(entry, ["timeLabel", "time", "created_at", "createdAt"])),
  };
};

const normalizeStringList = (record: UnknownRecord, keys: string[]): string[] => {
  const value = firstValue(record, keys);

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) =>
      typeof entry === "string"
        ? entry.trim()
        : toSafeString(firstValue(asRecord(entry), ["name", "label", "method", "type", "title"])),
    )
    .filter(Boolean);
};

const getTaxRate = (payload: UnknownRecord): number => {
  const directRate = firstValue(payload, ["taxRate", "tax_rate", "tax_percentage", "taxPercentage"]);

  if (directRate !== undefined) {
    const rate = toSafeNumber(directRate);

    if (rate > 0) {
      return rate;
    }
  }

  const taxes = firstArray(payload, ["taxes", "tax"]);

  for (const tax of taxes) {
    const rate = toSafeNumber(firstValue(tax, ["rate", "percentage", "value"]));

    if (rate > 0) {
      return rate;
    }
  }

  return DEFAULT_TAX_RATE;
};

const buildSettings = (payload: UnknownRecord, taxRate: number): PosSettingRow[] => {
  const apiSettings = firstArray(payload, ["settings", "pos_settings", "posSettings"])
    .map((entry, index) => ({
      id: getEntryId(entry, `setting-${index}`),
      label: toSafeString(firstValue(entry, ["label", "name", "title"]), `Setting ${index + 1}`),
      value: toSafeString(firstValue(entry, ["value", "setting_value"]), "-"),
    }))
    .filter((setting) => setting.value !== "-");

  if (apiSettings.length > 0) {
    return apiSettings;
  }

  return [{ id: "tax", label: "Tax Rate", value: `${taxRate}%` }];
};

const isSaleEnvelope = (
  payload: SaleApiData,
): payload is { data?: UnknownRecord | null; sale?: UnknownRecord | null } =>
  Boolean(payload) && typeof payload === "object" && ("data" in payload || "sale" in payload);

const getSaleFromEnvelope = (payload: SaleApiData): UnknownRecord => {
  if (isSaleEnvelope(payload)) {
    return payload.sale ?? payload.data ?? {};
  }

  return payload;
};

const getSaleArray = (payload: SalesListApiData): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  return firstArray(payload, ["sales", "items", "rows", "data"]);
};

const getSalesTotalCount = (payload: SalesListApiData, fallbackCount: number): number => {
  if (Array.isArray(payload)) {
    return fallbackCount;
  }

  return (
    toSafeNumber(payload.totalCount) ||
    toSafeNumber(payload.total_count) ||
    toSafeNumber(payload.total) ||
    toSafeNumber(payload.count) ||
    toSafeNumber(asRecord(payload.pagination).totalCount) ||
    toSafeNumber(asRecord(payload.pagination).total) ||
    fallbackCount
  );
};

const getSalesPagination = (
  payload: SalesListApiData,
  query: SalesListQuery,
  pageCount: number,
  totalCount: number,
): SalesListPagination => {
  const paginationRecord = Array.isArray(payload) ? {} : asRecord(payload.pagination);

  const payloadOffset = toSafeNumber(firstValue(paginationRecord, ["offset"]));
  const payloadLimit = toSafeNumber(firstValue(paginationRecord, ["limit"]));
  const payloadNextOffset = toSafeNumber(firstValue(paginationRecord, ["next_offset", "nextOffset"]));
  const payloadHasMore = firstValue(paginationRecord, ["has_more", "hasMore"]);

  const offset = payloadOffset || query.offset;
  const limit = payloadLimit || query.limit;
  const nextOffset = payloadNextOffset || offset + pageCount;
  const hasMore =
    payloadHasMore === true || (totalCount > 0 ? nextOffset < totalCount : pageCount >= limit);

  return {
    hasMore,
    limit,
    nextOffset,
    offset,
  };
};

const getSaleClientName = (entry: UnknownRecord): string => {
  const clientValue = firstValue(entry, ["client", "customer"]);
  const nested = asRecord(clientValue);

  return (
    toSafeString(firstValue(entry, ["clientName", "client_name", "customer_name"])) ||
    toSafeString(firstValue(nested, ["name", "fullName", "full_name"])) ||
    toSafeString(clientValue) ||
    "Walk-in Customer"
  );
};

const normalizeSaleLineItem = (entry: UnknownRecord, index: number): SaleLineItem => {
  const category =
    toSafeString(firstValue(entry, ["category", "type"])).toLowerCase() === "product"
      ? "product"
      : "service";
  const staffValue = firstValue(entry, ["staffName", "staff_name", "staff"]);
  const staffName =
    toSafeString(staffValue) || toSafeString(asRecord(staffValue).name) || undefined;
  const duration = toDurationLabel(firstValue(entry, ["duration", "duration_minutes", "durationMinutes"]));

  return {
    category,
    ...(category === "service" && duration ? { duration } : {}),
    id: getEntryId(entry, `line-${index}`),
    name: getEntryName(entry, category === "service" ? "Service" : "Product"),
    price: toSafeNumber(firstValue(entry, ["price", "amount", "unit_price", "unitPrice"])),
    quantity: toSafeNumber(firstValue(entry, ["quantity", "qty"])) || 1,
    ...(staffName ? { staffName } : {}),
  };
};

const normalizeSaleListItem = (entry: UnknownRecord): SaleListItem => {
  const lineItems = firstArray(entry, ["items", "line_items", "lineItems"]);

  return {
    clientName: getSaleClientName(entry),
    createdDateLabel: formatSaleTime(firstValue(entry, ["createdAt", "created_at", "time"])),
    id: toSafeString(firstValue(entry, ["id", "_id"])),
    itemCount: lineItems.length || toSafeNumber(firstValue(entry, ["itemCount", "item_count"])),
    paymentMethod: toSafeString(firstValue(entry, ["paymentMethod", "payment_method", "method"]), "-"),
    receiptNumber: toSafeString(
      firstValue(entry, ["receiptNumber", "receipt_number", "receipt"]),
      toSafeString(firstValue(entry, ["id", "_id"])),
    ),
    status: toSafeString(firstValue(entry, ["status"]), "draft"),
    total: toSafeNumber(firstValue(entry, ["total", "grand_total", "grandTotal", "amount"])),
  };
};

const normalizeSaleDetail = (entry: UnknownRecord): SaleDetail => {
  const clientValue = firstValue(entry, ["client", "customer"]);
  const clientRecord = asRecord(clientValue);
  const lineItems = firstArray(entry, ["items", "line_items", "lineItems"]).map(
    normalizeSaleLineItem,
  );

  return {
    amountPaid: toSafeNumber(firstValue(entry, ["amountPaid", "amount_paid", "paid_amount"])),
    clientName: getSaleClientName(entry),
    clientPhone: toSafeString(
      firstValue(clientRecord, ["phone", "mobile", "phone_number", "mobileNumber"]),
      "-",
    ),
    createdDateLabel: formatSaleTime(firstValue(entry, ["createdAt", "created_at", "time"])),
    discountAmount: toSafeNumber(firstValue(entry, ["discountAmount", "discount_amount", "discount"])),
    id: toSafeString(firstValue(entry, ["id", "_id"])),
    lineItems,
    notes: toSafeString(firstValue(entry, ["notes", "note"])) || null,
    outstandingAmount: toSafeNumber(
      firstValue(entry, ["outstandingAmount", "outstanding_amount", "balance_due"]),
    ),
    paymentMethod: toSafeString(firstValue(entry, ["paymentMethod", "payment_method", "method"]), "-"),
    receiptNumber: toSafeString(
      firstValue(entry, ["receiptNumber", "receipt_number", "receipt"]),
      toSafeString(firstValue(entry, ["id", "_id"])),
    ),
    status: toSafeString(firstValue(entry, ["status"]), "draft"),
    subtotal: toSafeNumber(firstValue(entry, ["subtotal", "sub_total"])),
    taxAmount: toSafeNumber(firstValue(entry, ["taxAmount", "tax_amount", "tax"])),
    total: toSafeNumber(firstValue(entry, ["total", "grand_total", "grandTotal", "amount"])),
  };
};

const buildSaleRequestBody = (payload: CreateSaleRequest | UpdateSaleRequest) => {
  const requestBody: UnknownRecord = {};

  if (payload.clientId !== undefined) {
    requestBody.clientId = payload.clientId;
    requestBody.client_id = payload.clientId;
  }

  if (payload.items !== undefined) {
    const items = payload.items.map((item) => ({
      catalog_id: item.catalogId,
      catalogId: item.catalogId,
      category: item.category,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      ...(item.staffId ? { staffId: item.staffId, staff_id: item.staffId } : {}),
    }));

    requestBody.items = items;
    requestBody.line_items = items;
  }

  if (payload.discount !== undefined) {
    requestBody.discount = {
      ...(payload.discount.couponCode ? { coupon_code: payload.discount.couponCode } : {}),
      type: payload.discount.type,
      value: payload.discount.value,
    };
  }

  if (payload.notes !== undefined) {
    requestBody.notes = payload.notes;
  }

  if (payload.status !== undefined) {
    requestBody.status = payload.status;
  }

  return requestBody;
};

const buildCheckoutRequestBody = (payload: CheckoutSaleRequest) => ({
  amount_paid: payload.amountPaid,
  amountPaid: payload.amountPaid,
  ...(payload.outstandingAmount !== undefined
    ? { outstanding_amount: payload.outstandingAmount, outstandingAmount: payload.outstandingAmount }
    : {}),
  payment_method: payload.paymentMethod,
  paymentMethod: payload.paymentMethod,
  ...(payload.splitPayments
    ? {
        split_payments: payload.splitPayments,
        splitPayments: payload.splitPayments,
      }
    : {}),
});

export const salesService = {
  async getSalesInit(salonId?: string | null): Promise<SalesInitData> {
    const response = await api.get<SalesInitApiResponse>(SALES.INIT, {
      params: salonId ? { salon_id: salonId } : undefined,
    });

    const payload = asRecord(response.data.data);

    const services = firstArrayDeep(payload, ["services", "service_list", "serviceList"]).map(
      (entry) => normalizeCatalogItem(entry, "service"),
    );
    const products = firstArrayDeep(payload, ["products", "product_list", "productList"]).map(
      (entry) => normalizeCatalogItem(entry, "product"),
    );
    const mixedCatalog = firstArrayDeep(payload, ["catalog", "items"]).map((entry) =>
      normalizeCatalogItem(
        entry,
        toSafeString(firstValue(entry, ["category", "type"])).toLowerCase() === "product"
          ? "product"
          : "service",
      ),
    );

    let catalog = [...services, ...products, ...mixedCatalog];

    if (__DEV__) {
      console.warn("[Sales][init] raw payload top-level keys:", Object.keys(payload));
      console.warn("[Sales][init] catalog counts:", {
        mixedCatalog: mixedCatalog.length,
        products: products.length,
        services: services.length,
      });
    }

    // /sales/init's catalog shape is unconfirmed against a live backend. If it
    // comes back with no services, fall back to the already-verified GET /services
    // endpoint so Quick Sale search still has real data instead of an empty list.
    if (!catalog.some((item) => item.category === "service")) {
      try {
        const fallbackServices = await serviceService.getServices(
          { isActive: true, limit: 100, offset: 0, search: "", sort_by: "name", sort_order: "asc" },
          salonId,
        );

        const mappedFallbackServices: PosCatalogItem[] = fallbackServices.services.map((service) => ({
          category: "service",
          ...(service.durationMinutes ? { duration: `${service.durationMinutes} min` } : {}),
          id: service.id,
          name: service.name,
          price: service.price,
        }));

        if (__DEV__) {
          console.warn(
            "[Sales][init] catalog had no services — fell back to GET /services:",
            mappedFallbackServices.length,
          );
        }

        catalog = [...catalog, ...mappedFallbackServices];
      } catch (fallbackError) {
        console.warn("[Sales][init] fallback GET /services fetch failed", fallbackError);
      }
    }

    // Guarantee the "Popular" quick-chip row has content when the API doesn't flag items.
    if (catalog.length > 0 && !catalog.some((item) => item.isQuickChip)) {
      catalog.slice(0, 6).forEach((item) => {
        item.isQuickChip = true;
      });
    }

    const clients = firstArray(payload, ["clients", "customers"]).map(normalizeClient);
    const staff = firstArray(payload, ["staff", "staff_members", "staffMembers", "employees"]).map(
      normalizeStaffMember,
    );
    const coupons = firstArray(payload, ["coupons", "coupon_codes", "couponCodes"])
      .map(normalizeCoupon)
      .filter((coupon): coupon is PosCoupon => coupon !== null);
    const previousSales = firstArray(payload, [
      "previousSales",
      "previous_sales",
      "recent_sales",
      "recentSales",
      "sales",
    ]).map(normalizePreviousSale);

    const paymentMethods = normalizeStringList(payload, [
      "paymentMethods",
      "payment_methods",
      "payment_modes",
      "paymentModes",
    ]);
    const discountTypes = normalizeStringList(payload, [
      "discountTypes",
      "discount_types",
      "discounts",
    ]);

    const taxRate = getTaxRate(payload);

    return {
      catalog,
      clients: [WALK_IN_CLIENT, ...clients.filter((client) => client.id !== WALK_IN_CLIENT.id)],
      coupons,
      discountTypes: discountTypes.length > 0 ? discountTypes : DEFAULT_DISCOUNT_TYPES,
      paymentMethods: paymentMethods.length > 0 ? paymentMethods : DEFAULT_PAYMENT_METHODS,
      previousSales,
      receiptNumber: toSafeString(
        firstValue(payload, [
          "receiptNumber",
          "receipt_number",
          "nextReceiptNumber",
          "next_receipt_number",
        ]),
        "QS-0001",
      ),
      settings: buildSettings(payload, taxRate),
      staff,
      taxRate,
    };
  },

  async createSale(payload: CreateSaleRequest): Promise<CreateSaleResponse> {
    const response = await api.post<SaleApiResponse>(SALES.CREATE, buildSaleRequestBody(payload));

    return {
      message: response.data.message,
      sale: normalizeSaleDetail(getSaleFromEnvelope(response.data.data)),
    };
  },

  async updateSale(saleId: string, payload: UpdateSaleRequest): Promise<UpdateSaleResponse> {
    const response = await api.patch<SaleApiResponse>(
      SALES.UPDATE(saleId),
      buildSaleRequestBody(payload),
    );

    return {
      message: response.data.message,
      sale: normalizeSaleDetail(getSaleFromEnvelope(response.data.data)),
    };
  },

  async checkoutSale(saleId: string, payload: CheckoutSaleRequest): Promise<CheckoutSaleResponse> {
    const response = await api.post<SaleApiResponse>(
      SALES.CHECKOUT(saleId),
      buildCheckoutRequestBody(payload),
    );

    return {
      message: response.data.message,
      sale: normalizeSaleDetail(getSaleFromEnvelope(response.data.data)),
    };
  },

  async getSales(query: SalesListQuery, salonId?: string | null): Promise<SalesListResponse> {
    const response = await api.get<SalesListApiResponse>(SALES.LIST, {
      params: {
        ...query,
        ...(salonId ? { salon_id: salonId } : {}),
      },
    });

    const apiSales = getSaleArray(response.data.data);
    const sales = apiSales.map(normalizeSaleListItem);
    const totalCount = getSalesTotalCount(response.data.data, sales.length);
    const pagination = getSalesPagination(response.data.data, query, sales.length, totalCount);

    return {
      pagination,
      query,
      sales,
      totalCount,
    };
  },

  async getSale(saleId: string): Promise<SaleDetail> {
    const response = await api.get<SaleApiResponse>(SALES.DETAIL(saleId));

    return normalizeSaleDetail(getSaleFromEnvelope(response.data.data));
  },

  async deleteSale(saleId: string): Promise<DeleteSaleResponse> {
    const response = await api.delete<ApiResponse<unknown>>(SALES.DELETE(saleId));

    return {
      message: response.data.message,
      saleId,
    };
  },

  async getSalesSummary(salonId?: string | null): Promise<SalesSummary> {
    const response = await api.get<SalesSummaryApiResponse>(SALES.SUMMARY, {
      params: salonId ? { salon_id: salonId } : undefined,
    });

    const payload = asRecord(response.data.data);

    return {
      averageSale: toSafeNumber(firstValue(payload, ["averageSale", "average_sale", "avg_sale"])),
      totalRevenue: toSafeNumber(
        firstValue(payload, ["totalRevenue", "total_revenue", "revenue"]),
      ),
      totalSales: toSafeNumber(firstValue(payload, ["totalSales", "total_sales", "count"])),
      totalTransactions: toSafeNumber(
        firstValue(payload, ["totalTransactions", "total_transactions", "transactions"]),
      ),
    };
  },

  async exportSales(query?: Partial<SalesListQuery>): Promise<ExportSalesResponse> {
    const response = await api.get<ExportSalesApiResponse>(SALES.EXPORT, {
      params: query,
    });

    const rawData = response.data.data;
    const url =
      typeof rawData === "string"
        ? rawData
        : toSafeString(firstValue(asRecord(rawData), ["url", "file_url", "fileUrl", "download_url"]));

    return {
      message: response.data.message,
      url: url || null,
    };
  },
};
