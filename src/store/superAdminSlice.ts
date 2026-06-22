import { createSlice } from "@reduxjs/toolkit";
import {
  fetchSuperAdminStatsThunk,
  fetchSuperAdminSalonsThunk,
  fetchSuperAdminPaymentsThunk,
  fetchSuperAdminUsersThunk,
  fetchSuperAdminSubscriptionsThunk,
  fetchSuperAdminPlansThunk,
  fetchRecentLoginsThunk,
  fetchFrequentLoginsThunk,
  fetchUsersNoPlanThunk,
} from "../middleware/superAdmin/superAdmin.thunk";

export interface SuperAdminSalon {
  id: string;
  name: string;
  owner_email: string;
  owner_name?: string;
  plan_name?: string;
  status: string;
  created_at: string;
  total_bookings?: number;
  staff_count?: number;
  client_count?: number;
  revenue?: number;
  is_onboarding_complete?: boolean;
  subscription_status?: string;
}

export interface SuperAdminPayment {
  id: string;
  salon_name: string;
  salon_id?: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  salon_name?: string;
  salon_id?: string;
  created_at: string;
  status: string;
  is_active: boolean;
  last_login?: string;
  login_count?: number;
}

export interface RecentLogin {
  id: string;
  name: string;
  email: string;
  role: string;
  last_login: string;
  login_count?: number;
  is_active: boolean;
  salon_name?: string;
  salon_id?: string;
}

export interface SuperAdminStats {
  total_salons: number;
  active_salons: number;
  inactive_salons: number;
  total_users: number;
  total_owners: number;
  total_staff: number;
  total_clients: number;
  total_revenue: number;
  mrr: number;
  total_bookings: number;
  bookings_today: number;
  signups_today: number;
  signups_this_week: number;
  signups_this_month: number;
  failed_payments: number;
  new_salons_this_month: number;
  active_subscriptions: number;
}

interface SuperAdminState {
  stats: SuperAdminStats | null;
  salons: SuperAdminSalon[];
  payments: SuperAdminPayment[];
  users: SuperAdminUser[];
  subscriptions: any[];
  plans: any[];
  recentLogins: RecentLogin[];
  frequentLogins: RecentLogin[];
  usersNoPlan: RecentLogin[];
  loading: {
    stats: boolean;
    salons: boolean;
    payments: boolean;
    users: boolean;
    subscriptions: boolean;
    plans: boolean;
    recentLogins: boolean;
    frequentLogins: boolean;
    usersNoPlan: boolean;
  };
  error: string | null;
}

const initialState: SuperAdminState = {
  stats: null,
  salons: [],
  payments: [],
  users: [],
  subscriptions: [],
  plans: [],
  recentLogins: [],
  frequentLogins: [],
  usersNoPlan: [],
  loading: { stats: false, salons: false, payments: false, users: false, subscriptions: false, plans: false, recentLogins: false, frequentLogins: false, usersNoPlan: false },
  error: null,
};

const superAdminSlice = createSlice({
  name: "superAdmin",
  initialState,
  reducers: {
    clearSuperAdminError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuperAdminStatsThunk.pending,    (state) => { state.loading.stats = true; })
      .addCase(fetchSuperAdminStatsThunk.fulfilled,  (state, { payload }) => { state.loading.stats = false; state.stats = payload; })
      .addCase(fetchSuperAdminStatsThunk.rejected,   (state, { payload }) => { state.loading.stats = false; state.error = payload ?? null; });

    builder
      .addCase(fetchSuperAdminSalonsThunk.pending,   (state) => { state.loading.salons = true; })
      .addCase(fetchSuperAdminSalonsThunk.fulfilled, (state, { payload }) => { state.loading.salons = false; state.salons = payload; })
      .addCase(fetchSuperAdminSalonsThunk.rejected,  (state, { payload }) => { state.loading.salons = false; state.error = payload ?? null; });

    builder
      .addCase(fetchSuperAdminPaymentsThunk.pending,   (state) => { state.loading.payments = true; })
      .addCase(fetchSuperAdminPaymentsThunk.fulfilled, (state, { payload }) => { state.loading.payments = false; state.payments = payload; })
      .addCase(fetchSuperAdminPaymentsThunk.rejected,  (state, { payload }) => { state.loading.payments = false; state.error = payload ?? null; });

    builder
      .addCase(fetchSuperAdminUsersThunk.pending,   (state) => { state.loading.users = true; })
      .addCase(fetchSuperAdminUsersThunk.fulfilled, (state, { payload }) => { state.loading.users = false; state.users = payload; })
      .addCase(fetchSuperAdminUsersThunk.rejected,  (state, { payload }) => { state.loading.users = false; state.error = payload ?? null; });

    builder
      .addCase(fetchSuperAdminSubscriptionsThunk.pending,   (state) => { state.loading.subscriptions = true; })
      .addCase(fetchSuperAdminSubscriptionsThunk.fulfilled, (state, { payload }) => { state.loading.subscriptions = false; state.subscriptions = payload; })
      .addCase(fetchSuperAdminSubscriptionsThunk.rejected,  (state, { payload }) => { state.loading.subscriptions = false; state.error = payload ?? null; });

    builder
      .addCase(fetchSuperAdminPlansThunk.pending,   (state) => { state.loading.plans = true; })
      .addCase(fetchSuperAdminPlansThunk.fulfilled, (state, { payload }) => { state.loading.plans = false; state.plans = payload; })
      .addCase(fetchSuperAdminPlansThunk.rejected,  (state, { payload }) => { state.loading.plans = false; state.error = payload ?? null; });

    builder
      .addCase(fetchRecentLoginsThunk.pending,   (state) => { state.loading.recentLogins = true; })
      .addCase(fetchRecentLoginsThunk.fulfilled, (state, { payload }) => { state.loading.recentLogins = false; state.recentLogins = payload; })
      .addCase(fetchRecentLoginsThunk.rejected,  (state, { payload }) => { state.loading.recentLogins = false; state.error = payload ?? null; });

    builder
      .addCase(fetchFrequentLoginsThunk.pending,   (state) => { state.loading.frequentLogins = true; })
      .addCase(fetchFrequentLoginsThunk.fulfilled, (state, { payload }) => { state.loading.frequentLogins = false; state.frequentLogins = payload; })
      .addCase(fetchFrequentLoginsThunk.rejected,  (state, { payload }) => { state.loading.frequentLogins = false; state.error = payload ?? null; });

    builder
      .addCase(fetchUsersNoPlanThunk.pending,   (state) => { state.loading.usersNoPlan = true; })
      .addCase(fetchUsersNoPlanThunk.fulfilled, (state, { payload }) => { state.loading.usersNoPlan = false; state.usersNoPlan = payload; })
      .addCase(fetchUsersNoPlanThunk.rejected,  (state, { payload }) => { state.loading.usersNoPlan = false; state.error = payload ?? null; });
  },
});

export const { clearSuperAdminError } = superAdminSlice.actions;
export default superAdminSlice.reducer;
