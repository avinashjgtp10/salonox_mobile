export type ClientSortOrder = "asc" | "desc";

export type ClientListQuery = {
  inactive?: boolean;
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
  blocked?: boolean | null;
  created_at?: string | null;
  email?: string | null;
  first_name?: string | null;
  full_name?: string | null;
  gender?: string | null;
  id?: string | null;
  inactive?: boolean | null;
  isBlocked?: boolean | null;
  is_blocked?: boolean | null;
  is_inactive?: boolean | null;
  is_vip?: boolean | null;
  last_name?: string | null;
  membership?: ClientApiMembership;
  membership_name?: string | null;
  name?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
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
  hasValidId: boolean;
  id: string;
  inactive: boolean;
  initials: string;
  isVip: boolean;
  joinedDaysAgo: number | null;
  membership: string | null;
  phone: string;
  phoneCountryCode: string | null;
  status: string;
  totalVisits: number;
};

export type CreateClientRequest = {
  email?: string;
  first_name: string;
  gender?: string;
  last_name?: string;
  phone_country_code?: string;
  phone_number?: string;
  salon_id?: string;
};

export type CreateClientResponse = {
  client: ClientListItem;
  message?: string;
};

export type UpdateClientRequest = Partial<CreateClientRequest>;

export type UpdateClientResponse = {
  client: ClientListItem;
  message?: string;
};

export type DeleteClientResponse = {
  clientId: string;
  message?: string;
};

export type ClientFilterValue =
  | "active"
  | "blocked"
  | "inactive"
  | "membership"
  | "new"
  | "no_membership"
  | "regular"
  | "vip";

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

export type ClientDuplicateGroupApi = {
  id: string;
  type?: string;
  field?: string;
  value?: string;
  clients: ClientApiItem[];
};

export type ClientDuplicateGroup = {
  id: string;
  type: string;
  value: string;
  clients: ClientListItem[];
};

export type MergeClientsRequest = {
  primary_client_id?: string;
  secondary_client_id?: string;
  primaryClientId?: string;
  secondaryClientId?: string;
};

export type MergeClientsResponse = {
  primaryClient: ClientListItem;
  message?: string;
};

export type MergeAllDuplicatesResponse = {
  mergedGroupsCount?: number;
  merged_groups_count?: number;
  message?: string;
};

export type BlockClientRequest = {
  reason?: string;
};

export type BlockClientResponse = {
  client: ClientListItem;
  message?: string;
};

export type UnblockClientResponse = {
  client: ClientListItem;
  message?: string;
};

export type ClientHistoryItemApi = {
  id?: string | null;
  date?: string | null;
  created_at?: string | null;
  type?: "appointment" | "sale" | "visit" | "note" | string | null;
  title?: string | null;
  description?: string | null;
  amount?: number | string | null;
  status?: string | null;
  items?: { name?: string | null; type?: "membership" | "package" | "service" | "product" | string | null; price?: number | string | null }[] | null;
  staff_name?: string | null;
  staffName?: string | null;
};

export type ClientHistoryItem = {
  id: string;
  date: string;
  type: "appointment" | "sale" | "package" | "membership" | "visit" | "note";
  title: string;
  description: string;
  amount: number;
  status: string;
  items: { name: string; type: "membership" | "package" | "product" | "service"; price: number }[];
  staffName: string;
  dateLabel: string;
};

export type ClientHistoryStatsApi = {
  lifetime_spend?: number | string | null;
  lifetimeSpend?: number | string | null;
  total_visits?: number | string | null;
  totalVisits?: number | string | null;
  last_visit?: string | null;
  lastVisit?: string | null;
  total_appointments?: number | string | null;
  totalAppointments?: number | string | null;
  average_spend?: number | string | null;
  averageSpend?: number | string | null;
};

export type ClientHistoryStats = {
  lifetimeSpend: number;
  totalVisits: number;
  lastVisit: string | null;
  totalAppointments: number;
  averageSpend: number;
};

export type ClientWithHistoryStatsApi = ClientApiItem & {
  stats?: ClientHistoryStatsApi | null;
  history_stats?: ClientHistoryStatsApi | null;
  lifetime_spend?: number | string | null;
  total_visits?: number | string | null;
  last_visit?: string | null;
  total_appointments?: number | string | null;
  average_spend?: number | string | null;
};

export type ClientWithHistoryStats = {
  client: ClientListItem;
  stats: ClientHistoryStats;
};

export type ClientHistorySummaryApi = {
  wallet_balance?: number | string | null;
  walletBalance?: number | string | null;
  reward_points_balance?: number | string | null;
  rewardPointsBalance?: number | string | null;
  referral_balance?: number | string | null;
  referralBalance?: number | string | null;
  referral_code?: string | null;
  referralCode?: string | null;
  total_referral_earnings?: number | string | null;
  totalReferralEarnings?: number | string | null;
  total_successful_referrals?: number | string | null;
  totalSuccessfulReferrals?: number | string | null;
};

export type ClientHistorySummary = {
  walletBalance: number;
  rewardPointsBalance: number;
  referralBalance: number;
  referralCode: string | null;
  totalReferralEarnings: number;
  totalSuccessfulReferrals: number;
};

export type ClientHistoryResult = {
  history: ClientHistoryItem[];
  summary: ClientHistorySummary;
};
