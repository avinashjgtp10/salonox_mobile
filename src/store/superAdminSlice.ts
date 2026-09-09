import { createSlice } from "@reduxjs/toolkit";
import {
  fetchSuperAdminStatsThunk,
  fetchSuperAdminSalonsThunk,
  fetchSuperAdminPaymentsThunk,
  fetchSuperAdminUsersThunk,
  fetchFrequentLoginsThunk,
  fetchUsersNoPlanThunk,
  fetchSuperAdminDemoRequestsThunk,
  setDemoRequestStatusThunk,
  fetchSalonStaffThunk,
  clearSalonDataThunk,
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
  data_cleared_at?: string | null;
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

export interface SuperAdminSalonStaff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string; // "owner" for the salon owner row, else designation/"staff"
  is_active: boolean;
  last_login?: string | null;
  login_count?: number;
  revenue: number;
}

export interface SuperAdminDemoRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  salon_name: string | null;
  city: string | null;
  locations_count: string | null;
  status: "new" | "contacted" | "converted" | "closed" | "lost" | "unqualified";
  created_at: string;
  updated_at: string;
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
  new_clients_today: number;
  revenue_today: number;
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
  frequentLogins: RecentLogin[];
  usersNoPlan: RecentLogin[];
  demoRequests: SuperAdminDemoRequest[];
  salonStaff: SuperAdminSalonStaff[];
  loading: {
    stats: boolean;
    salons: boolean;
    payments: boolean;
    users: boolean;
    frequentLogins: boolean;
    usersNoPlan: boolean;
    demoRequests: boolean;
    salonStaff: boolean;
  };
  error: string | null;
}

const initialState: SuperAdminState = {
  stats: null,
  salons: [],
  payments: [],
  users: [],
  frequentLogins: [],
  usersNoPlan: [],
  demoRequests: [],
  salonStaff: [],
  loading: { stats: false, salons: false, payments: false, users: false, frequentLogins: false, usersNoPlan: false, demoRequests: false, salonStaff: false },
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
      .addCase(fetchFrequentLoginsThunk.pending,   (state) => { state.loading.frequentLogins = true; })
      .addCase(fetchFrequentLoginsThunk.fulfilled, (state, { payload }) => { state.loading.frequentLogins = false; state.frequentLogins = payload; })
      .addCase(fetchFrequentLoginsThunk.rejected,  (state, { payload }) => { state.loading.frequentLogins = false; state.error = payload ?? null; });

    builder
      .addCase(fetchUsersNoPlanThunk.pending,   (state) => { state.loading.usersNoPlan = true; })
      .addCase(fetchUsersNoPlanThunk.fulfilled, (state, { payload }) => { state.loading.usersNoPlan = false; state.usersNoPlan = payload; })
      .addCase(fetchUsersNoPlanThunk.rejected,  (state, { payload }) => { state.loading.usersNoPlan = false; state.error = payload ?? null; });

    builder
      .addCase(fetchSuperAdminDemoRequestsThunk.pending,   (state) => { state.loading.demoRequests = true; })
      .addCase(fetchSuperAdminDemoRequestsThunk.fulfilled, (state, { payload }) => { state.loading.demoRequests = false; state.demoRequests = payload; })
      .addCase(fetchSuperAdminDemoRequestsThunk.rejected,  (state, { payload }) => { state.loading.demoRequests = false; state.error = payload ?? null; });

    builder
      .addCase(fetchSalonStaffThunk.pending,   (state) => { state.loading.salonStaff = true; })
      .addCase(fetchSalonStaffThunk.fulfilled, (state, { payload }) => { state.loading.salonStaff = false; state.salonStaff = payload; })
      .addCase(fetchSalonStaffThunk.rejected,  (state, { payload }) => { state.loading.salonStaff = false; state.error = payload ?? null; });

    builder
      .addCase(setDemoRequestStatusThunk.fulfilled, (state, { payload }) => {
        const idx = state.demoRequests.findIndex((r) => r.id === payload.id);
        if (idx !== -1) state.demoRequests[idx] = payload;
      });

    // Patches only the cleared salon's row — staff/client/booking/revenue
    // counts reset to reflect the wipe. plan_name/subscription_status are
    // deliberately left untouched: the backend's clearSalonData explicitly
    // excludes billing_subscriptions/subscriptions from deletion (see
    // salons.repository.ts's SALON_CLEAR_DATA_TABLES comment), so the
    // salon's plan must keep showing here too. Every other row in
    // state.salons is untouched by this reducer.
    builder
      .addCase(clearSalonDataThunk.fulfilled, (state, { payload: salonId }) => {
        const idx = state.salons.findIndex((s) => s.id === salonId);
        if (idx !== -1) {
          state.salons[idx] = {
            ...state.salons[idx],
            staff_count: 0,
            client_count: 0,
            total_bookings: 0,
            revenue: 0,
            data_cleared_at: new Date().toISOString(),
          };
        }
      });
  },
});

export const { clearSuperAdminError } = superAdminSlice.actions;
export default superAdminSlice.reducer;
