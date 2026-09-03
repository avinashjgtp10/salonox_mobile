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
  // Detail already present on the backend rows that flattening used to drop —
  // surfaced on the Activity feed. Optional because the generic timeline
  // fallback (a flat `history` array) carries none of it.
  dueAmount?: number;
  netAmount?: number | null;
  paymentStatus?: string;
  paymentMethod?: string;
  invoiceNumber?: string;
};

// Field names mirror GET /api/v1/clients/:clientId/history's own `stats`
// object exactly (see clients.controller.ts getHistory) — the legacy
// camelCase/`total_visits`/`last_visit` aliases are kept only so the older
// /clients/with-history-stats shape still parses, but the canonical names
// are the snake_case ones the history endpoint actually returns.
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
  // Real field names returned by /clients/:clientId/history.
  completed_appointments?: number | string | null;
  no_shows?: number | string | null;
  cancellations?: number | string | null;
  total_sales?: number | string | null;
  active_packages?: number | string | null;
  active_memberships?: number | string | null;
  last_visit_at?: string | null;
};

export type ClientHistoryStats = {
  lifetimeSpend: number;
  totalVisits: number;
  lastVisit: string | null;
  totalAppointments: number;
  averageSpend: number;
  completedAppointments: number;
  noShows: number;
  cancellations: number;
  totalSales: number;
  activePackages: number;
  activeMemberships: number;
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

// ─── Structured records from GET /api/v1/clients/:clientId/history ──────────
// The endpoint returns `client`, `stats`, `appointments`, `sales`, `packages`
// and `memberships` side by side. The flattened `history` timeline below is
// derived from those same four arrays for the Activity feed; these record
// types preserve the per-row detail that flattening throws away (due/net
// amounts, invoice numbers, item types, session counts, expiry dates), which
// the Summary/Services/Products/Memberships/Packages sections need.

export type ClientHistoryReferrerApi = {
  id?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
};

export type ClientHistoryReferrer = {
  id: string;
  fullName: string;
  phoneNumber: string;
};

export type ClientHistoryClientApi = ClientHistorySummaryApi & {
  id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  phone_country_code?: string | null;
  avatar_url?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  gender?: string | null;
  client_source?: string | null;
  birthday_day_month?: string | null;
  birthday_year?: number | string | null;
  referred_by?: ClientHistoryReferrerApi | null;
};

export type ClientHistoryClient = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  phoneCountryCode: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string | null;
  gender: string;
  clientSource: string | null;
  birthdayDayMonth: string | null;
  birthdayYear: number | null;
  referredBy: ClientHistoryReferrer | null;
  walletBalance: number;
  rewardPointsBalance: number;
  referralBalance: number;
  referralCode: string | null;
  totalReferralEarnings: number;
  totalSuccessfulReferrals: number;
};

/** A `services` / `product_items` / `package_items` / `membership_items` entry on an appointment row. */
export type ClientAppointmentLineItem = {
  name: string;
  price: number;
  quantity: number;
  serviceId: string | null;
  staffId: string | null;
};

export type ClientAppointmentRecord = {
  id: string;
  scheduledAt: string | null;
  status: string;
  durationMinutes: number;
  notes: string;
  cancelReason: string;
  staffId: string | null;
  staffName: string;
  amountPaid: number;
  /** Authoritative remaining balance, already net of discount/eWallet/membership-wallet. */
  dueAmount: number;
  /** Net bill for a completed appointment. `null` (not 0) means "not billed yet". */
  netAmount: number | null;
  paymentStatus: string;
  paymentMethod: string;
  ewalletUsed: number;
  membershipWalletUsed: number;
  linkedMembershipName: string;
  linkedPackageName: string;
  services: ClientAppointmentLineItem[];
  productItems: ClientAppointmentLineItem[];
  packageItems: ClientAppointmentLineItem[];
  membershipItems: ClientAppointmentLineItem[];
};

export type ClientSaleItem = {
  name: string;
  itemType: "service" | "product" | "package" | "membership" | "gift_card" | "quick" | "other";
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  /** `null` when no sale_items row backs the entry, so the UI can show "–" rather than a misleading 0. */
  discountAmount: number | null;
  taxAmount: number | null;
  staffId: string | null;
};

export type ClientSaleRecord = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  tipAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentReference: string;
  notes: string;
  createdAt: string | null;
  appointmentId: string | null;
  couponCode: string;
  manualDiscountAmount: number;
  couponDiscountAmount: number;
  referralDiscountAmount: number;
  items: ClientSaleItem[];
};

export type ClientPackageServiceRecord = {
  serviceName: string;
  totalSessions: number;
  completedSessions: number;
};

export type ClientPackageRecord = {
  id: string;
  packageName: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  expiryDate: string | null;
  createdDate: string | null;
  staffId: string | null;
  saleId: string | null;
  appointmentId: string | null;
  services: ClientPackageServiceRecord[];
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
};

export type ClientMembershipRecord = {
  id: string;
  membershipName: string;
  status: string;
  pricePaid: number;
  expiresAt: string | null;
  purchasedAt: string | null;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  membershipWalletBalance: number;
  discountBalanceRemaining: number;
  staffId: string | null;
  saleId: string | null;
  appointmentId: string | null;
};

/** A row from GET /api/v1/clients/:clientId/notes (`client_notes`). */
export type ClientNoteApi = {
  id?: string | null;
  note?: string | null;
  staff_id?: string | null;
  staff_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClientNote = {
  id: string;
  note: string;
  staffName: string;
  createdAt: string | null;
};

export type ClientHistoryResult = {
  /** Flattened, date-sorted timeline used by the Activity feed. */
  history: ClientHistoryItem[];
  summary: ClientHistorySummary;
  client: ClientHistoryClient | null;
  stats: ClientHistoryStats;
  appointments: ClientAppointmentRecord[];
  sales: ClientSaleRecord[];
  packages: ClientPackageRecord[];
  memberships: ClientMembershipRecord[];
};
