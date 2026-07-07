export type UserSortOrder = "asc" | "desc";

export type UserListQuery = {
  limit: number;
  offset: number;
  search: string;
  sort_by: string;
  sort_order: UserSortOrder;
};

export type UserApiItem = {
  avatar?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  created_at?: string | null;
  email?: string | null;
  first_name?: string | null;
  firstName?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  id?: string | number | null;
  is_active?: boolean | null;
  isActive?: boolean | null;
  last_name?: string | null;
  lastName?: string | null;
  mobile?: string | null;
  name?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  status?: string | null;
  _id?: string | null;
  [key: string]: unknown;
};

export type UserApiPagination = {
  has_more?: boolean | null;
  limit?: number | null;
  next_offset?: number | null;
  offset?: number | null;
  total?: number | null;
  totalCount?: number | null;
  total_count?: number | null;
};

export type UserListApiData =
  | UserApiItem[]
  | {
      count?: number | null;
      data?: UserApiItem[] | null;
      items?: UserApiItem[] | null;
      pagination?: UserApiPagination | null;
      rows?: UserApiItem[] | null;
      total?: number | null;
      totalCount?: number | null;
      total_count?: number | null;
      users?: UserApiItem[] | null;
    };

export type UserListItem = {
  avatarUrl: string | null;
  createdDateLabel: string;
  email: string;
  fullName: string;
  id: string;
  initials: string;
  isActive: boolean;
  phone: string;
  role: string;
  status: string;
};

export type UserDetailApiItem = UserApiItem & {
  address?: string | null;
  business_name?: string | null;
  businessName?: string | null;
  country?: string | null;
  country_code?: string | null;
  countryCode?: string | null;
  date_of_birth?: string | null;
  dateOfBirth?: string | null;
  dob?: string | null;
  gender?: string | null;
  is_verified?: boolean | null;
  isVerified?: boolean | null;
  salon_name?: string | null;
  updated_at?: string | null;
};

export type UserDetailApiData =
  | UserDetailApiItem
  | {
      data?: UserDetailApiItem | null;
      user?: UserDetailApiItem | null;
    };

export type UserDetailField = {
  label: string;
  value: string;
};

export type UserDetail = {
  address: string | null;
  avatarUrl: string | null;
  businessName: string | null;
  country: string | null;
  createdDateLabel: string;
  dateOfBirth: string | null;
  email: string;
  fullName: string;
  gender: string | null;
  id: string;
  initials: string;
  isActive: boolean;
  isVerified: boolean | null;
  phone: string;
  role: string;
  status: string;
  // Any additional API fields not covered above, surfaced generically.
  extraFields: UserDetailField[];
};

export type UserListPagination = {
  hasMore: boolean;
  limit: number;
  nextOffset: number;
  offset: number;
};

export type UserListResponse = {
  pagination: UserListPagination;
  query: UserListQuery;
  totalCount: number;
  users: UserListItem[];
};

export type UpdateUserRoleResponse = {
  message?: string;
  role: string;
  userId: string;
};

export type UpdateUserRequest = {
  address?: string;
  dateOfBirth?: string;
  email?: string;
  fullName?: string;
  gender?: string;
  phone?: string;
};

export type UpdateUserResponse = {
  message?: string;
  user: UserDetail;
};

export type DeleteUserResponse = {
  message?: string;
  userId: string;
};
