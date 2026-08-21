// ─── Full client profile (from GET /api/v1/clients/:id) ──────────────────────
export interface ClientDetails {
  id: string | number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone_number?: string;
  phone?: string;
  mobile?: string;
  mobile_number?: string;
  phone_no?: string;

  // eWallet — manual top-up only now; referral/reward money no longer folds in here
  wallet_balance?: number;
  ewallet_balance?: number;

  // Reward points — own dedicated, spendable balance (raw points, not ₹)
  reward_points_balance?: number;

  // Referral — own dedicated, spendable ₹ balance, separate from the
  // lifetime total_referral_earnings figure below
  referral_balance?: number;

  // Refer & Earn — every client gets a permanent referral_code at creation;
  // referred_by_client_id/referral_reward_status are only set if THIS client
  // was themselves referred by someone else's code.
  referral_code?: string | null;
  referred_by_client_id?: string | null;
  referral_reward_status?: "pending" | "completed" | null;
  total_referral_earnings?: number; // ₹ this client has earned from referring others (lifetime)

  // Membership
  membership_tier?: string;
  membership?: string;

  // Visit history (Phase 1 — from profile API)
  last_visit_date?: string | null;
  last_visit_at?: string | null;

  // Unpaid balance — field name varies by endpoint
  unpaid_amount?: number;
  total_due?: number;
  outstanding_amount?: number;
  due_amount?: number;

  // Stats enriched from history API (Phase 2)
  total_visits?: number;
  cancelled_count?: number;
  total_revenue?: number;
  no_show_count?: number;

  // Revenue-by-category breakdown (Phase 2) — catalog-value sums (pre
  // discount/wallet-adjustment), not a wallet-adjusted reconciliation of
  // total_revenue above; see useClientDetails.ts for why an exact split
  // isn't possible without deeper backend support.
  service_revenue?: number;
  product_revenue?: number;
  package_revenue?: number;
  membership_revenue?: number;
  service_count?: number;
  product_count?: number;
  active_package_count?: number;
  active_membership_name?: string | null;
  active_membership_expires_at?: string | null;

  // Already present on the raw GET /clients/:id response but previously
  // undeclared here — added so QuickEditClientModal can read this client's
  // edit-form fields straight off the profile ClientPanel already fetched,
  // instead of firing its own redundant GET /clients/:id on every open.
  email?: string | null;
  phone_country_code?: string | null;
  birthday_day_month?: string | null;
  birthday_year?: number | null;
  client_source?: string | null;
}

// ─── Derived stat card values (computed in useClientDetails) ──────────────────
export interface ClientStats {
  ewalletAmt: number;
  rewardPoints: number;    // raw points balance, own dedicated spendable balance
  referralBalance: number; // ₹, own dedicated spendable balance
  referralCode: string | null; // this client's own permanent referral code, for sharing
  referredByClientId: string | null;
  referralPending: boolean; // true if referred AND the reward hasn't been claimed yet
  referralEarnings: number; // lifetime total earned from referring others (separate from referralBalance)
  unpaidAmt: number;
  membership: string;
  cancelled: number;
  totalVisit: number;
  lastVisit: string; // formatted display string e.g. "22 Jun 2026"
  totalRevenue: number;
  noShow: number;

  // Revenue-by-category breakdown — see ClientDetails for the same caveat.
  serviceRevenue: number;
  productRevenue: number;
  packageRevenue: number;
  membershipRevenue: number;
  serviceCount: number;
  productCount: number;
  activePackageCount: number;
  activeMembershipName: string | null;
  activeMembershipExpiresAt: string | null;
}

// ─── History stats shape (from GET /api/v1/clients/:id/history) ──────────────
export interface HistoryStats {
  total_appointments?: number;
  total_visits?: number;
  cancellations?: number;
  cancelled_count?: number;
  lifetime_spend?: number;
  total_revenue?: number;
  // Note: last_visit is NOT in this response — comes from profile only
}
