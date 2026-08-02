import { api } from "@/services/api";
import { SALES } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import { normalizeSaleId } from "@/utils/apiNormalize";
import type {
  CheckoutSaleRequest,
  CheckoutSaleResponse,
  CreateSaleRequest,
  CreateSaleResponse,
  DeleteSaleResponse,
  ExportSalesResponse,
  PosServiceItem,
  PosStaffMember,
  SaleDetail,
  SaleItemType,
  SaleLineItem,
  SaleLineItemRequest,
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
      items?: UnknownRecord[] | null;
      sale?: UnknownRecord | null;
    };
type SaleApiResponse = ApiResponse<SaleApiData>;
type SalesListApiData =
  | UnknownRecord[]
  | {
      count?: number | null;
      data?: UnknownRecord[] | null;
      items?: UnknownRecord[] | null;
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
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#726A63" },
  { background: "#F2EFE9", color: "#1C1917" },
] as const;

const VALID_SALE_ITEM_TYPES: SaleItemType[] = ["service", "product", "membership", "gift_card", "quick", "package"];

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

// The create/update validators require unit_price/discount_amount/tax_amount/
// tip_amount to be decimal STRINGS, not numbers (sales.validator.ts,
// sales.types.ts) — matching the Postgres numeric-as-string convention this
// backend uses everywhere else. Never send a plain number for these fields.
const toMoneyString = (value: number) => value.toFixed(2);

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
  toSafeString(firstValue(entry, ["name", "full_name", "fullName", "title"]), fallback);

const getStaffName = (entry: UnknownRecord) => {
  const user = asRecord(firstValue(entry, ["user", "profile"]));
  const firstName =
    toSafeString(firstValue(entry, ["first_name", "firstName"])) ||
    toSafeString(firstValue(user, ["first_name", "firstName"]));
  const lastName =
    toSafeString(firstValue(entry, ["last_name", "lastName"])) ||
    toSafeString(firstValue(user, ["last_name", "lastName"]));
  const composedName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    toSafeString(firstValue(entry, ["name", "full_name", "fullName", "display_name", "displayName"])) ||
    toSafeString(firstValue(user, ["name", "full_name", "fullName", "display_name", "displayName"])) ||
    composedName ||
    "Staff"
  );
};

const getStaffRole = (entry: UnknownRecord) => {
  const roleValue = firstValue(entry, [
    "role",
    "staff_role",
    "staffRole",
    "role_name",
    "roleName",
    "designation",
    "job_title",
    "jobTitle",
    "position",
  ]);
  const role = asRecord(roleValue);

  return toSafeString(roleValue) || toSafeString(firstValue(role, ["name", "title", "label"])) || null;
};

const getEntryId = (entry: UnknownRecord, fallbackName: string) =>
  toSafeString(firstValue(entry, ["id", "_id"]), fallbackName.toLowerCase().replace(/\s+/g, "-"));

const getStaffId = (entry: UnknownRecord, fallbackName: string) =>
  toSafeString(
    firstValue(entry, ["id", "_id", "staff_id", "staffId", "uuid", "staff_uuid"]),
    fallbackName.toLowerCase().replace(/\s+/g, "-"),
  );

const toDurationLabel = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  const minutes = toSafeNumber(value);

  return minutes > 0 ? `${minutes} min` : undefined;
};

const normalizeStaffMember = (entry: UnknownRecord): PosStaffMember => {
  const name = getStaffName(entry);
  const id = getStaffId(entry, name);
  const tone = getAvatarTone(id);

  return {
    avatarBg: tone.background,
    avatarColor: tone.color,
    id,
    initials: getInitials(name, "ST"),
    name,
    role: getStaffRole(entry),
    status: toSafeString(firstValue(entry, ["status", "availability"]), "Available"),
  };
};

const normalizeServiceItem = (entry: UnknownRecord): PosServiceItem => {
  const name = getEntryName(entry, "Service");

  return {
    category: toSafeString(firstValue(entry, ["category_name", "categoryName", "category"])) || null,
    duration: toDurationLabel(firstValue(entry, ["duration", "duration_minutes", "durationMinutes"])),
    id: getEntryId(entry, name),
    name,
    price: toSafeNumber(firstValue(entry, ["price"])),
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

const isSaleEnvelope = (
  payload: SaleApiData,
): payload is {
  data?: UnknownRecord | null;
  items?: UnknownRecord[] | null;
  sale?: UnknownRecord | null;
} =>
  Boolean(payload) && typeof payload === "object" && ("data" in payload || "sale" in payload);

const getSaleFromEnvelope = (payload: SaleApiData): UnknownRecord => {
  if (isSaleEnvelope(payload)) {
    const sale = payload.sale ?? payload.data ?? {};
    const items = Array.isArray(payload.items) ? payload.items : undefined;

    return items ? { ...sale, items } : sale;
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
    fallbackCount
  );
};

// The real GET /sales endpoint has no pagination at all (sales.repository.ts
// `list()` — no LIMIT/OFFSET, returns every matching row). This always
// reports hasMore: false after the one unbounded fetch, which is the honest
// reflection of that — not a simulation of real server-side pagination.
const getSalesPagination = (query: SalesListQuery, pageCount: number): SalesListPagination => ({
  hasMore: false,
  limit: query.limit,
  nextOffset: query.offset + pageCount,
  offset: query.offset,
});

const getSaleClientName = (entry: UnknownRecord): string => {
  const clientValue = firstValue(entry, ["client", "customer"]);
  const nested = asRecord(clientValue);

  return (
    toSafeString(firstValue(entry, ["client_name", "clientName"])) ||
    toSafeString(firstValue(nested, ["full_name", "fullName", "name"])) ||
    toSafeString(clientValue) ||
    "Walk-in Customer"
  );
};

const toSaleItemType = (value: unknown): SaleItemType => {
  const normalized = toSafeString(value).toLowerCase();

  return (VALID_SALE_ITEM_TYPES as string[]).includes(normalized)
    ? (normalized as SaleItemType)
    : "quick";
};

const normalizeSaleLineItem = (entry: UnknownRecord, index: number): SaleLineItem => {
  const staffValue = firstValue(entry, ["staff_name", "staffName", "staff"]);
  const staffRecord = asRecord(staffValue);
  const staffName = toSafeString(staffValue) || toSafeString(staffRecord.name) || undefined;

  return {
    discountAmount: toSafeNumber(firstValue(entry, ["discount_amount", "discountAmount"])),
    id: toSafeString(firstValue(entry, ["id", "_id"]), `line-${index}`),
    itemId: toSafeString(firstValue(entry, ["item_id", "itemId"])) || null,
    itemType: toSaleItemType(firstValue(entry, ["item_type", "itemType"])),
    name: getEntryName(entry, "Item"),
    quantity: toSafeNumber(firstValue(entry, ["quantity", "qty"])) || 1,
    staffId:
      toSafeString(firstValue(entry, ["staff_id", "staffId"])) ||
      toSafeString(firstValue(staffRecord, ["id", "_id"])) ||
      null,
    ...(staffName ? { staffName } : {}),
    taxAmount: toSafeNumber(firstValue(entry, ["tax_amount", "taxAmount"])),
    taxableAmount: toSafeNumber(firstValue(entry, ["taxable_amount", "taxableAmount"])),
    totalPrice: toSafeNumber(firstValue(entry, ["total_price", "totalPrice"])),
    unitPrice: toSafeNumber(firstValue(entry, ["unit_price", "unitPrice"])),
  };
};

const normalizeSaleListItem = (entry: UnknownRecord): SaleListItem => {
  const lineItems = firstArray(entry, ["items", "line_items", "lineItems"]);

  return {
    clientName: getSaleClientName(entry),
    createdDateLabel: formatSaleTime(firstValue(entry, ["created_at", "createdAt"])),
    id: normalizeSaleId({ sale: entry }) ?? "",
    itemCount: lineItems.length || toSafeNumber(firstValue(entry, ["item_count", "itemCount"])),
    paymentMethod: toSafeString(firstValue(entry, ["payment_method", "paymentMethod"]), "-"),
    receiptNumber: toSafeString(firstValue(entry, ["invoice_number", "invoiceNumber"])),
    status: toSafeString(firstValue(entry, ["status"]), "draft") as SaleListItem["status"],
    total: toSafeNumber(firstValue(entry, ["total_amount", "totalAmount", "total"])),
  };
};

const normalizeSaleDetail = (entry: UnknownRecord): SaleDetail => {
  const clientValue = firstValue(entry, ["client", "customer"]);
  const clientRecord = asRecord(clientValue);
  const lineItems = firstArray(entry, ["items", "line_items", "lineItems"]).map(normalizeSaleLineItem);
  const total = toSafeNumber(firstValue(entry, ["total_amount", "totalAmount", "total"]));
  const amountPaid = toSafeNumber(firstValue(entry, ["amount_paid", "amountPaid"]));

  return {
    amountPaid,
    clientId:
      toSafeString(firstValue(entry, ["client_id", "clientId"])) ||
      toSafeString(firstValue(clientRecord, ["id", "_id"])) ||
      null,
    clientName: getSaleClientName(entry),
    clientPhone: toSafeString(
      firstValue(entry, ["client_phone", "clientPhone"]) ?? firstValue(clientRecord, ["phone_number", "phone"]),
      "-",
    ),
    couponCode: toSafeString(firstValue(entry, ["coupon_code", "couponCode"])) || null,
    createdDateLabel: formatSaleTime(firstValue(entry, ["created_at", "createdAt"])),
    discountAmount: toSafeNumber(firstValue(entry, ["discount_amount", "discountAmount"])),
    discountPercent: toSafeNumber(firstValue(entry, ["discount_percent", "discountPercent"])),
    discountType: (() => {
      const value = toSafeString(firstValue(entry, ["discount_type", "discountType"])).toLowerCase();
      return value === "flat" || value === "percentage" ? value : null;
    })(),
    exCharges: toSafeNumber(firstValue(entry, ["ex_charges", "exCharges"])),
    id: normalizeSaleId({ sale: entry }) ?? "",
    lineItems,
    notes: toSafeString(firstValue(entry, ["notes", "note"])) || null,
    outstandingAmount: toSafeNumber(
      firstValue(entry, ["outstanding_amount", "outstandingAmount"]),
    ) || Math.max(0, total - amountPaid),
    paymentMethod: toSafeString(firstValue(entry, ["payment_method", "paymentMethod"]), "-"),
    receiptNumber: toSafeString(firstValue(entry, ["invoice_number", "invoiceNumber"])),
    status: toSafeString(firstValue(entry, ["status"]), "draft") as SaleDetail["status"],
    subtotal: toSafeNumber(firstValue(entry, ["subtotal"])),
    taxAmount: toSafeNumber(firstValue(entry, ["tax_amount", "taxAmount"])),
    tipAmount: toSafeNumber(firstValue(entry, ["tip_amount", "tipAmount"])),
    total,
  };
};

const buildSaleItemBody = (item: SaleLineItemRequest) => ({
  discount_amount: toMoneyString(item.discountAmount ?? 0),
  item_id: item.itemId,
  item_type: item.itemType,
  name: item.name,
  quantity: item.quantity,
  staff_id: item.staffId,
  unit_price: toMoneyString(item.unitPrice),
});

const buildSaleRequestBody = (payload: CreateSaleRequest | UpdateSaleRequest) => {
  const requestBody: UnknownRecord = {};

  if (payload.clientId !== undefined) {
    requestBody.client_id = payload.clientId;
  }

  if (payload.staffId !== undefined) {
    requestBody.staff_id = payload.staffId || undefined;
  }

  if (payload.status !== undefined) {
    requestBody.status = payload.status;
  }

  if (payload.items !== undefined) {
    requestBody.items = payload.items.map(buildSaleItemBody);
  }

  if (payload.discountAmount !== undefined) {
    requestBody.discount_amount = toMoneyString(payload.discountAmount);
  }

  if (payload.discountPercent !== undefined) {
    requestBody.discount_percent = toMoneyString(payload.discountPercent);
  }

  if (payload.discountType !== undefined) {
    requestBody.discount_type = payload.discountType;
  }

  if (payload.couponCode !== undefined) {
    requestBody.coupon_code = payload.couponCode;
  }

  if (payload.exCharges !== undefined) {
    requestBody.ex_charges = toMoneyString(payload.exCharges);
  }

  if (payload.taxAmount !== undefined) {
    requestBody.tax_amount = toMoneyString(payload.taxAmount);
  }

  if (payload.tipAmount !== undefined) {
    requestBody.tip_amount = toMoneyString(payload.tipAmount);
  }

  if (payload.paymentMethod !== undefined) {
    requestBody.payment_method = payload.paymentMethod;
  }

  if (payload.paymentReference !== undefined) {
    requestBody.payment_reference = payload.paymentReference;
  }

  if (payload.salonId !== undefined) {
    requestBody.salon_id = payload.salonId || undefined;
  }

  if (payload.notes !== undefined) {
    requestBody.notes = payload.notes;
  }

  return requestBody;
};

const buildCheckoutRequestBody = (payload: CheckoutSaleRequest) => {
  // The checkout endpoint has no structured split-payment field — a split
  // breakdown must be JSON-serialized into payment_reference instead
  // (sales.service.ts reads `JSON.parse(body.payment_reference)` when
  // payment_method === "split").
  const paymentReference =
    payload.paymentMethod === "split" && payload.splitEntries?.length
      ? JSON.stringify(
          payload.splitEntries.reduce<Record<string, number>>((accumulator, entry) => {
            accumulator[entry.method] = entry.amount;
            return accumulator;
          }, {}),
        )
      : payload.paymentReference;

  return {
    amount_paid: payload.amountPaid,
    payment_method: payload.paymentMethod,
    ...(paymentReference ? { payment_reference: paymentReference } : {}),
  };
};

export const salesService = {
  async getSalesInit(salonId?: string | null): Promise<SalesInitData> {
    const response = await api.get<SalesInitApiResponse>(SALES.INIT, {
      params: salonId ? { salon_id: salonId } : undefined,
    });

    const payload = asRecord(response.data.data);

    return {
      services: firstArray(payload, ["services"]).map(normalizeServiceItem),
      staff: firstArray(payload, ["staff"]).map(normalizeStaffMember),
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
        status: query.status,
        ...(salonId ? { salon_id: salonId } : {}),
      },
    });

    const apiSales = getSaleArray(response.data.data);
    const sales = apiSales.map(normalizeSaleListItem);
    const totalCount = getSalesTotalCount(response.data.data, sales.length);

    return {
      pagination: getSalesPagination(query, sales.length),
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
    const totalRevenue = toSafeNumber(firstValue(payload, ["total"]));
    const totalSales = toSafeNumber(firstValue(payload, ["count"]));

    return {
      averageSale: totalSales > 0 ? totalRevenue / totalSales : 0,
      totalRevenue,
      totalSales,
      totalTransactions: totalSales,
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
