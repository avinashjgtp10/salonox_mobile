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

  // eWallet
  wallet_balance?: number;
  ewallet_balance?: number;

  // Refer & Earn — every client gets a permanent referral_code at creation;
  // referred_by_client_id/referral_reward_status are only set if THIS client
  // was themselves referred by someone else's code.
  referral_code?: string | null;
  referred_by_client_id?: string | null;
  referral_reward_status?: "pending" | "completed" | null;
  total_referral_earnings?: number; // ₹ this client has earned from referring others

  // Membership
  membership_tier?: string;
  membership?: string;

  // Discount
  assign_discount?: number;
  discount_validity?: string;

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
}

// ─── Derived stat card values (computed in useClientDetails) ──────────────────
export interface ClientStats {
  ewalletAmt: number;
  referralCode: string | null; // this client's own permanent referral code, for sharing
  referredByClientId: string | null;
  referralPending: boolean; // true if referred AND the reward hasn't been claimed yet
  referralEarnings: number;
  unpaidAmt: number;
  assignDiscount: number;
  discountValidity: string;
  membership: string;
  cancelled: number;
  totalVisit: number;
  lastVisit: string; // formatted display string e.g. "22 Jun 2026"
  totalRevenue: number;
  noShow: number;
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
