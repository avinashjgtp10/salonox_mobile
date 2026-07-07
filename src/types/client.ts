export type ClientSortOrder = "asc" | "desc";

export type ClientListQuery = {
  inactive: boolean;
  limit: number;
  offset: number;
  search: string;
  sort_by: string;
  sort_order: ClientSortOrder;
};

export type ClientApiMembership =
  | string
  | {
      id?: string | null;
      name?: string | null;
      title?: string | null;
    }
  | null;

export type ClientApiItem = {
  created_at?: string | null;
  email?: string | null;
  first_name?: string | null;
  full_name?: string | null;
  gender?: string | null;
  id?: string | null;
  inactive?: boolean | null;
  is_inactive?: boolean | null;
  is_vip?: boolean | null;
  last_name?: string | null;
  membership?: ClientApiMembership;
  membership_name?: string | null;
  name?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  status?: string | null;
  total_visits?: number | string | null;
  visits?: number | string | null;
};

export type ClientApiPagination = {
  has_more?: boolean | null;
  limit?: number | null;
  next_offset?: number | null;
  offset?: number | null;
  total?: number | null;
  totalCount?: number | null;
  total_count?: number | null;
};

export type ClientListApiData =
  | ClientApiItem[]
  | {
      clients?: ClientApiItem[] | null;
      count?: number | null;
      data?: ClientApiItem[] | null;
      items?: ClientApiItem[] | null;
      pagination?: ClientApiPagination | null;
      rows?: ClientApiItem[] | null;
      total?: number | null;
      totalCount?: number | null;
      total_count?: number | null;
    };

export type ClientListItem = {
  createdAt: string | null;
  createdDateLabel: string;
  email: string;
  fullName: string;
  gender: string;
  id: string;
  inactive: boolean;
  initials: string;
  isVip: boolean;
  joinedDaysAgo: number | null;
  membership: string | null;
  phone: string;
  status: string;
  totalVisits: number;
};

export type CreateClientRequest = {
  email?: string;
  full_name: string;
  gender?: string;
  phone: string;
  salon_id?: string;
};

export type CreateClientResponse = {
  client: ClientListItem;
  message?: string;
};

export type ClientListPagination = {
  hasMore: boolean;
  limit: number;
  nextOffset: number;
  offset: number;
};

export type ClientListResponse = {
  clients: ClientListItem[];
  pagination: ClientListPagination;
  query: ClientListQuery;
  totalCount: number;
};
