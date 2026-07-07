export type SalonApiItem = {
  address?: string | null;
  business_name?: string | null;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  created_at?: string | null;
  email?: string | null;
  id?: string | number | null;
  is_active?: boolean | string | null;
  name?: string | null;
  owner_id?: string | number | null;
  phone?: string | null;
  phone_number?: string | null;
  postal_code?: string | number | null;
  state?: string | null;
  status?: string | null;
  timezone?: string | null;
  updated_at?: string | null;
};

export type SalonApiPagination = {
  has_more?: boolean | null;
  hasMore?: boolean | null;
  limit?: number | string | null;
  next_page?: number | string | null;
  nextPage?: number | string | null;
  page?: number | string | null;
  total?: number | string | null;
  totalCount?: number | string | null;
  total_count?: number | string | null;
  total_pages?: number | string | null;
  totalPages?: number | string | null;
};

export type SalonListApiData =
  | SalonApiItem[]
  | {
      data?: SalonApiItem[] | null;
      items?: SalonApiItem[] | null;
      pagination?: SalonApiPagination | null;
      rows?: SalonApiItem[] | null;
      salons?: SalonApiItem[] | null;
      total?: number | string | null;
      totalCount?: number | string | null;
      total_count?: number | string | null;
      total_pages?: number | string | null;
    };

export type SalonListItem = {
  address: string;
  businessName: string;
  city: string;
  country: string;
  countryCode: string;
  createdAt: string | null;
  email: string;
  id: string;
  isActive: boolean;
  name: string;
  ownerId: string | null;
  phone: string;
  postalCode: string;
  state: string;
  status: string;
  timezone: string;
  updatedAt: string | null;
};

export type SalonSortOrder = "ASC" | "DESC";

export type SalonListQuery = {
  limit: number;
  page: number;
  search: string;
  sort_by: string;
  sort_order: SalonSortOrder;
  status?: string;
};

export type SalonListPagination = {
  hasMore: boolean;
  limit: number;
  nextPage: number;
  page: number;
  totalCount: number;
  totalPages: number | null;
};

export type SalonListResponse = {
  pagination: SalonListPagination;
  query: SalonListQuery;
  salons: SalonListItem[];
  totalCount: number;
};

export type CreateSalonRequest = {
  address?: string;
  business_name?: string;
  city?: string;
  country?: string;
  country_code?: string;
  email?: string;
  name: string;
  owner_id?: string;
  phone?: string;
  phone_number?: string;
  postal_code?: string;
  state?: string;
  status?: string;
  timezone?: string;
  website?: string;
  primary_category_id?: string;
  related_category_ids?: string[];
  team_type?: string;
  team_size?: string;
  referral_source?: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
};

export type CreateSalonResponse = {
  message?: string;
  salon: SalonListItem;
};

export type UpdateSalonRequest = Partial<CreateSalonRequest>;

export type UpdateSalonFormFields = {
  address?: string;
  businessName?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  placeId?: string;
  postalCode?: string;
  primaryCategoryId?: string;
  referralSource?: string;
  relatedCategoryIds?: string[];
  state?: string;
  status?: string;
  teamSize?: string;
  teamType?: string;
  timezone?: string;
  website?: string;
};

export type UpdateSalonResponse = {
  message?: string;
  salon: SalonListItem;
};

export type GetSalonResponse = SalonListItem;
