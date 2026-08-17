export type ProductSortOrder = "asc" | "desc";

export type ProductListQuery = {
  brandId?: string;
  category?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
  search: string;
  sort_by: string;
  sort_order: ProductSortOrder;
  stock?: "low" | "out_of_stock";
};

export type BrandApiItem = {
  active?: boolean | null;
  created_at?: string | null;
  createdAt?: string | null;
  description?: string | null;
  id?: string | number | null;
  is_active?: boolean | null;
  isActive?: boolean | null;
  name?: string | null;
  product_count?: number | string | null;
  productCount?: number | string | null;
  [key: string]: unknown;
};

export type ProductApiItem = {
  active?: boolean | null;
  amount?: number | string | null;
  brand?: BrandApiItem | null;
  brand_id?: string | number | null;
  brandId?: string | number | null;
  barcode?: string | null;
  category?: string | null;
  category_id?: string | number | null;
  categoryId?: string | number | null;
  created_at?: string | null;
  createdAt?: string | null;
  description?: string | null;
  id?: string | number | null;
  is_active?: boolean | null;
  isActive?: boolean | null;
  bottle_size?: number | string | null;
  bottleSize?: number | string | null;
  low_stock_threshold?: number | string | null;
  lowStockThreshold?: number | string | null;
  markup_percentage?: number | string | null;
  markupPercentage?: number | string | null;
  measure_unit?: string | null;
  measureUnit?: string | null;
  name?: string | null;
  price?: number | string | null;
  product_type?: string | null;
  productType?: string | null;
  qty_alert?: number | string | null;
  qtyAlert?: number | string | null;
  retail_price?: number | string | null;
  retailPrice?: number | string | null;
  sku?: string | null;
  supply_price?: number | string | null;
  supplyPrice?: number | string | null;
  stock_quantity?: number | string | null;
  stockQuantity?: number | string | null;
  [key: string]: unknown;
};

export type ProductApiPagination = {
  has_more?: boolean | null;
  hasMore?: boolean | null;
  limit?: number | null;
  next_offset?: number | null;
  nextOffset?: number | null;
  offset?: number | null;
  page?: number | null;
  pageSize?: number | null;
  totalPages?: number | null;
  total?: number | null;
  totalCount?: number | null;
  total_count?: number | null;
};

export type ProductListApiData =
  | ProductApiItem[]
  | {
      count?: number | null;
      data?: ProductApiItem[] | null;
      items?: ProductApiItem[] | null;
      page?: number | null;
      pageSize?: number | null;
      pagination?: ProductApiPagination | null;
      products?: ProductApiItem[] | null;
      rows?: ProductApiItem[] | null;
      total?: number | null;
      totalCount?: number | null;
      total_count?: number | null;
      totalPages?: number | null;
      totalRecords?: number | null;
    };

export type BrandListApiData =
  | BrandApiItem[]
  | {
      brands?: BrandApiItem[] | null;
      data?: BrandApiItem[] | null;
      items?: BrandApiItem[] | null;
      rows?: BrandApiItem[] | null;
    };

export type Product = {
  bottleSize?: number | null;
  brandId: string | null;
  brandName: string | null;
  category: string | null;
  createdAt: string | null;
  description: string | null;
  id: string;
  isActive: boolean;
  lowStockThreshold: number;
  markupPercentage?: number | null;
  measureUnit?: string | null;
  name: string;
  price: number;
  productType?: string | null;
  retailPrice?: number | null;
  sku: string | null;
  stockQuantity: number;
  supplyPrice?: number | null;
};

export type ProductListItem = Product;

export type ProductListPagination = {
  hasMore: boolean;
  limit: number;
  nextOffset: number;
  offset: number;
};

export type ProductListResponse = {
  pagination: ProductListPagination;
  products: Product[];
  query: ProductListQuery;
  totalCount: number;
};

export type InventorySummary = {
  lowStockProducts: number;
  outOfStockProducts: number;
  totalProducts: number;
};

export type Brand = {
  createdAt: string | null;
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  productCount: number;
};

export type CreateProductRequest = {
  brand_id?: string | null;
  category?: string;
  description?: string;
  is_active?: boolean;
  low_stock_threshold?: number;
  name: string;
  price: number;
  salon_id?: string;
  sku?: string;
  stock_quantity?: number;
};

export type UpdateProductRequest = Partial<CreateProductRequest>;

export type CreateBrandRequest = {
  description?: string;
  name: string;
  salon_id?: string;
};

export type UpdateBrandRequest = {
  description?: string;
  is_active?: boolean;
  name?: string;
  salon_id?: string;
};

export type CreateProductResponse = { message?: string; product: Product };
export type UpdateProductResponse = { message?: string; product: Product };
export type DeleteProductResponse = { message?: string; productId: string };
export type CreateBrandResponse = { brand: Brand; message?: string };
export type UpdateBrandResponse = { brand: Brand; message?: string };
export type DeleteBrandResponse = { brandId: string; message?: string };
