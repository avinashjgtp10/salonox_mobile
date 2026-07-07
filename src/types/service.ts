export type ServiceSortOrder = "asc" | "desc";

export type ServiceListQuery = {
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
  category?: string | null;
  created_at?: string | null;
  duration?: number | string | null;
  duration_minutes?: number | string | null;
  id?: string | number | null;
  is_active?: boolean | null;
  name?: string | null;
  price?: number | string | null;
  service_name?: string | null;
  status?: string | null;
  title?: string | null;
  [key: string]: unknown;
};

export type ServiceApiPagination = {
  has_more?: boolean | null;
  limit?: number | null;
  next_offset?: number | null;
  offset?: number | null;
  total?: number | null;
  totalCount?: number | null;
  total_count?: number | null;
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
  createdAt: string | null;
  durationMinutes: number | null;
  id: string;
  isActive: boolean;
  name: string;
  price: number;
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

export type CreateServiceRequest = {
  category?: string;
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
