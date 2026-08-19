import type {
  ConsumableRecipeApiItem,
  ConsumableRecipeItem,
  ConsumableRecipeRequestItem,
} from "@/types/consumable";

export type ServiceSortOrder = "asc" | "desc";

export type ServiceListQuery = {
  category?: string;
  categoryId?: string;
  isActive?: boolean;
  limit: number;
  offset: number;
  search: string;
  sort_by: string;
  sort_order: ServiceSortOrder;
};

export type ServiceApiItem = {
  active?: boolean | null;
  amount?: number | string | null;
  category?: ServiceApiCategory | string | null;
  categoryId?: string | number | null;
  category_id?: string | number | null;
  category_name?: string | null;
  consumables_used?: ConsumableRecipeApiItem[] | null;
  created_at?: string | null;
  duration?: number | string | null;
  duration_minutes?: number | string | null;
  discount?: number | string | null;
  discount_amount?: number | string | null;
  discount_percent?: number | string | null;
  id?: string | number | null;
  is_active?: boolean | null;
  item_type?: string | null;
  name?: string | null;
  price?: number | string | null;
  tax?: number | string | null;
  tax_amount?: number | string | null;
  tax_rate?: number | string | null;
  parent_category?: ServiceApiCategory | string | null;
  parent_category_id?: string | number | null;
  parent_category_name?: string | null;
  service_name?: string | null;
  status?: string | null;
  title?: string | null;
  [key: string]: unknown;
};

export type ServiceApiCategory = {
  _id?: string | number | null;
  display_name?: string | null;
  category_id?: string | number | null;
  category_name?: string | null;
  label?: string | null;
  service_category_id?: string | number | null;
  service_category_name?: string | null;
  uuid?: string | number | null;
  id?: string | number | null;
  name?: string | null;
  parent?: ServiceApiCategory | string | null;
  parent_category?: ServiceApiCategory | string | null;
  parent_category_id?: string | number | null;
  parent_category_name?: string | null;
  title?: string | null;
};

export type ServiceApiPagination = {
  has_more?: boolean | null;
  limit?: number | null;
  next_offset?: number | null;
  offset?: number | null;
  // Real backend contract (`servicesRepository.list`) is page-based, not
  // offset-based — it returns exactly these two fields, never `has_more`/
  // `next_offset`/`offset`. The fields above are kept only in case a future
  // backend revision adds them.
  page?: number | null;
  total?: number | null;
  totalCount?: number | null;
  total_count?: number | null;
  total_pages?: number | null;
};

export type ServiceListApiData =
  | ServiceApiItem[]
  | {
      count?: number | null;
      data?: ServiceApiItem[] | null;
      items?: ServiceApiItem[] | null;
      pagination?: ServiceApiPagination | null;
      rows?: ServiceApiItem[] | null;
      services?: ServiceApiItem[] | null;
      total?: number | null;
      totalCount?: number | null;
      total_count?: number | null;
    };

export type ServiceListItem = {
  category: string | null;
  categoryId: string | null;
  consumablesUsed?: ConsumableRecipeItem[];
  createdAt: string | null;
  durationMinutes: number | null;
  discountAmount?: number;
  discountPercent?: number;
  id: string;
  isActive: boolean;
  itemType?: string | null;
  name: string;
  price: number;
  taxAmount?: number;
  taxRate?: number;
};

export type ServiceListPagination = {
  hasMore: boolean;
  limit: number;
  nextOffset: number;
  offset: number;
};

export type ServiceListResponse = {
  pagination: ServiceListPagination;
  query: ServiceListQuery;
  services: ServiceListItem[];
  totalCount: number;
};

export type ServiceCategoryItem = {
  id: string;
  name: string;
};

export type CategoryType = "service" | "product";

export type CreateServiceRequest = {
  category?: string;
  category_id?: string;
  consumables_used?: ConsumableRecipeRequestItem[];
  duration_minutes?: number;
  name: string;
  price: number;
  salon_id?: string;
};

export type CreateServiceResponse = {
  message?: string;
  service: ServiceListItem;
};

export type UpdateServiceRequest = {
  category?: string;
  category_id?: string;
  consumables_used?: ConsumableRecipeRequestItem[];
  duration_minutes?: number;
  is_active?: boolean;
  name?: string;
  price?: number;
  salon_id?: string;
};

export type UpdateServiceResponse = {
  message?: string;
  service: ServiceListItem;
};

export type DeleteServiceResponse = {
  message?: string;
  serviceId: string;
};
