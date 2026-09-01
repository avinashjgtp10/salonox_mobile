import { api } from "@/services/api";
import { PRODUCT } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/auth";
import type {
  Brand,
  BrandApiItem,
  BrandListApiData,
  CreateBrandRequest,
  CreateBrandResponse,
  CreateProductRequest,
  CreateProductResponse,
  DeleteBrandResponse,
  DeleteProductResponse,
  Product,
  ProductApiItem,
  InventorySummary,
  ProductListApiData,
  ProductListQuery,
  ProductListResponse,
  UpdateBrandRequest,
  UpdateBrandResponse,
  UpdateProductRequest,
  UpdateProductResponse,
} from "@/types/product";

type ProductDetailData =
  | ProductApiItem
  | { data?: ProductApiItem | null; product?: ProductApiItem | null };
type BrandDetailData =
  | BrandApiItem
  | { brand?: BrandApiItem | null; data?: BrandApiItem | null };

const toStringValue = (value: unknown, fallback = ""): string => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
};

const toNumberValue = (value: unknown, fallback = 0): number => {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : fallback;
};

const toBooleanValue = (value: unknown, fallback = true): boolean => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1) return true;
  if (value === "false" || value === 0) return false;
  return fallback;
};

const getCategoryRecord = (value: unknown): { id?: unknown; name?: unknown; category_id?: unknown; category_name?: unknown } | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as { id?: unknown; name?: unknown; category_id?: unknown; category_name?: unknown })
    : null;

const normalizeBrand = (raw: BrandApiItem): Brand => ({
  createdAt: toStringValue(raw.created_at ?? raw.createdAt) || null,
  description: toStringValue(raw.description) || null,
  id: toStringValue(raw.id),
  isActive: toBooleanValue(raw.is_active ?? raw.active ?? raw.isActive),
  name: toStringValue(raw.name, "Unnamed brand"),
  productCount: toNumberValue(raw.product_count ?? raw.productCount),
});

const normalizeProduct = (raw: ProductApiItem): Product => {
  const brand = raw.brand ?? undefined;
  const retailPrice = raw.retail_price ?? raw.retailPrice;
  const supplyPrice = raw.supply_price ?? raw.supplyPrice;
  const markupPercentage = raw.markup_percentage ?? raw.markupPercentage;
  const measureUnit = raw.measure_unit ?? raw.measureUnit;
  const bottleSize = raw.bottle_size ?? raw.bottleSize;
  const productType = raw.product_type ?? raw.productType;
  const categoryRecord = getCategoryRecord(raw.category);

  return {
    bottleSize: bottleSize != null ? toNumberValue(bottleSize) : null,
    brandId: toStringValue(raw.brand_id ?? raw.brandId ?? brand?.id) || null,
    brandName: toStringValue(brand?.name) || null,
    category:
      toStringValue(categoryRecord?.name ?? categoryRecord?.category_name) ||
      toStringValue(raw.category) ||
      null,
    categoryId:
      toStringValue(raw.category_id ?? raw.categoryId ?? categoryRecord?.id ?? categoryRecord?.category_id) ||
      null,
    createdAt: toStringValue(raw.created_at ?? raw.createdAt) || null,
    description: toStringValue(raw.description) || null,
    id: toStringValue(raw.id),
    isActive: toBooleanValue(raw.is_active ?? raw.active ?? raw.isActive),
    lowStockThreshold: toNumberValue(
      raw.low_stock_threshold ?? raw.lowStockThreshold ?? raw.qty_alert ?? raw.qtyAlert,
      5,
    ),
    markupPercentage: markupPercentage != null ? toNumberValue(markupPercentage) : null,
    measureUnit: toStringValue(measureUnit) || null,
    name: toStringValue(raw.name, "Unnamed product"),
    price: toNumberValue(raw.price ?? raw.retail_price ?? raw.retailPrice ?? raw.supply_price ?? raw.supplyPrice),
    productType: toStringValue(productType) || null,
    retailPrice: retailPrice != null ? toNumberValue(retailPrice) : null,
    sku: toStringValue(raw.sku ?? raw.barcode) || null,
    stockQuantity: toNumberValue(raw.stock_quantity ?? raw.stockQuantity ?? raw.amount),
    supplyPrice: supplyPrice != null ? toNumberValue(supplyPrice) : null,
  };
};

const getProductArray = (payload: ProductListApiData): ProductApiItem[] => {
  if (Array.isArray(payload)) return payload;
  return payload.products ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const getBrandArray = (payload: BrandListApiData): BrandApiItem[] => {
  if (Array.isArray(payload)) return payload;
  return payload.brands ?? payload.items ?? payload.rows ?? payload.data ?? [];
};

const getTotal = (payload: ProductListApiData): number | null => {
  if (Array.isArray(payload)) return null;
  const value =
    payload.totalRecords ??
    payload.totalCount ??
    payload.total_count ??
    payload.total ??
    payload.count ??
    payload.pagination?.totalCount ??
    payload.pagination?.total_count ??
    payload.pagination?.total;
  return value == null ? null : toNumberValue(value);
};

const getDetailItem = <T extends object>(
  payload: T | { data?: T | null; product?: T | null; brand?: T | null } | null,
): T | null => {
  if (!payload) return null;
  const nested = payload as { data?: T | null; product?: T | null; brand?: T | null };
  return nested.product ?? nested.brand ?? nested.data ?? (payload as T);
};

const requireId = <T extends { id: string }>(item: T, label: string): T => {
  if (!item.id) throw new Error(`${label} response did not include an id.`);
  return item;
};

export const productService = {
  async fetchProducts(query: ProductListQuery, salonId?: string | null): Promise<ProductListResponse> {
    const page = Math.floor(query.offset / Math.max(query.limit, 1)) + 1;
    const params: Record<string, unknown> = {
      page,
      pageSize: query.limit,
      sort_by: query.sort_by,
      sort_order: query.sort_order.toUpperCase(),
    };
    if (query.search) params.search = query.search;
    if (query.brandId) params.brand_id = query.brandId;
    if (query.category) params.category_id = query.category;
    if (query.isActive !== undefined) params.is_active = query.isActive;
    if (query.stock) params.stock = query.stock;
    if (salonId) params.salon_id = salonId;

    const { data } = await api.get<ApiResponse<ProductListApiData>>(PRODUCT.LIST, {
      params,
    });
    const payload = data.data ?? [];
    const products = getProductArray(payload).map(normalizeProduct);
    const rawPagination = Array.isArray(payload) ? null : payload.pagination;
    const total = getTotal(payload);
    const responsePage = Array.isArray(payload)
      ? page
      : toNumberValue(payload.page ?? rawPagination?.page, page);
    const limit = Array.isArray(payload)
      ? query.limit
      : toNumberValue(payload.pageSize ?? rawPagination?.pageSize ?? rawPagination?.limit, query.limit);
    const offset = Math.max(0, (responsePage - 1) * limit);
    const nextOffset = toNumberValue(
      rawPagination?.next_offset ?? rawPagination?.nextOffset,
      offset + products.length,
    );
    const totalPages = Array.isArray(payload)
      ? null
      : toNumberValue(payload.totalPages ?? rawPagination?.totalPages);
    const hasMore =
      rawPagination?.has_more ??
      rawPagination?.hasMore ??
      (totalPages
        ? responsePage < totalPages
        : total === null ? products.length === limit : nextOffset < total);

    return {
      pagination: { hasMore, limit, nextOffset, offset },
      products,
      query,
      totalCount: total ?? offset + products.length,
    };
  },

  async fetchInventorySummary(salonId?: string | null): Promise<InventorySummary> {
    const summaryQuery: ProductListQuery = {
      limit: 1,
      offset: 0,
      search: "",
      sort_by: "created_at",
      sort_order: "desc",
    };

    const [totalResponse, lowStockResponse, outOfStockResponse] = await Promise.all([
      this.fetchProducts(summaryQuery, salonId),
      this.fetchProducts({ ...summaryQuery, stock: "low" }, salonId),
      this.fetchProducts({ ...summaryQuery, stock: "out_of_stock" }, salonId),
    ]);

    return {
      lowStockProducts: lowStockResponse.totalCount,
      outOfStockProducts: outOfStockResponse.totalCount,
      totalProducts: totalResponse.totalCount,
    };
  },

  async fetchProductById(id: string): Promise<Product> {
    const { data } = await api.get<ApiResponse<ProductDetailData>>(PRODUCT.DETAIL(id));
    const item = getDetailItem<ProductApiItem>(data.data ?? null);
    if (!item) throw new Error("Product not found.");
    return requireId(normalizeProduct(item), "Product");
  },

  async createProduct(payload: CreateProductRequest): Promise<CreateProductResponse> {
    const { data } = await api.post<ApiResponse<ProductDetailData>>(PRODUCT.CREATE, payload);
    const item = getDetailItem<ProductApiItem>(data.data ?? null);
    if (!item) throw new Error("Product was created, but no product was returned.");
    return { message: data.message, product: requireId(normalizeProduct(item), "Product") };
  },

  async updateProduct(
    id: string,
    payload: UpdateProductRequest,
  ): Promise<UpdateProductResponse> {
    const { data } = await api.patch<ApiResponse<ProductDetailData>>(
      PRODUCT.UPDATE(id),
      payload,
    );
    const item = getDetailItem<ProductApiItem>(data.data ?? null);
    if (!item) return { message: data.message, product: await this.fetchProductById(id) };
    return { message: data.message, product: requireId(normalizeProduct(item), "Product") };
  },

  async deleteProduct(id: string): Promise<DeleteProductResponse> {
    const { data } = await api.delete<ApiResponse<unknown>>(PRODUCT.DELETE(id));
    return { productId: id, message: data.message };
  },

  async fetchBrands(salonId?: string | null): Promise<Brand[]> {
    const { data } = await api.get<ApiResponse<BrandListApiData>>(PRODUCT.BRAND_LIST, {
      params: salonId ? { salon_id: salonId } : undefined,
    });
    return getBrandArray(data.data ?? []).map(normalizeBrand).filter((brand) => brand.id);
  },

  async fetchBrandById(id: string): Promise<Brand> {
    const { data } = await api.get<ApiResponse<BrandDetailData>>(PRODUCT.BRAND_DETAIL(id));
    const item = getDetailItem<BrandApiItem>(data.data ?? null);
    if (!item) throw new Error("Brand not found.");
    return requireId(normalizeBrand(item), "Brand");
  },

  async createBrand(payload: CreateBrandRequest): Promise<CreateBrandResponse> {
    const { data } = await api.post<ApiResponse<BrandDetailData>>(
      PRODUCT.BRAND_CREATE,
      payload,
    );
    const item = getDetailItem<BrandApiItem>(data.data ?? null);
    if (!item) throw new Error("Brand was created, but no brand was returned.");
    return { brand: requireId(normalizeBrand(item), "Brand"), message: data.message };
  },

  async updateBrand(id: string, payload: UpdateBrandRequest): Promise<UpdateBrandResponse> {
    const { data } = await api.patch<ApiResponse<BrandDetailData>>(
      PRODUCT.BRAND_UPDATE(id),
      payload,
    );
    const item = getDetailItem<BrandApiItem>(data.data ?? null);
    if (!item) return { brand: await this.fetchBrandById(id), message: data.message };
    return { brand: requireId(normalizeBrand(item), "Brand"), message: data.message };
  },

  async deleteBrand(id: string): Promise<DeleteBrandResponse> {
    const { data } = await api.delete<ApiResponse<unknown>>(PRODUCT.BRAND_DELETE(id));
    return { brandId: id, message: data.message };
  },
};
