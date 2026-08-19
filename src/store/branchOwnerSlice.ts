import { createSlice } from "@reduxjs/toolkit";
import { fetchMySalonsThunk, fetchBranchOwnerStatsThunk, fetchBranchOwnerPaymentsThunk } from "../middleware/branchOwner/branchOwner.thunk";

export interface BranchOwnerSalon {
  id: string;
  name: string;
  owner_email?: string;
  owner_name?: string;
  status: string;
  created_at: string;
}

export interface BranchOwnerStats {
  total_salons: number;
  active_salons: number;
  inactive_salons: number;
  total_staff: number;
  total_clients: number;
  total_revenue: number;
  total_bookings: number;
  bookings_today: number;
  revenue_today: number;
  new_clients_today: number;
  active_subscriptions: number;
}

export interface BranchOwnerPayment {
  id: string;
  salon_name: string;
  salon_id?: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

interface BranchOwnerState {
  salons: BranchOwnerSalon[];
  stats: BranchOwnerStats | null;
  payments: BranchOwnerPayment[];
  loading: {
    salons: boolean;
    stats: boolean;
    payments: boolean;
  };
  error: string | null;
}

const initialState: BranchOwnerState = {
  salons: [],
  stats: null,
  payments: [],
  loading: { salons: false, stats: false, payments: false },
  error: null,
};

const branchOwnerSlice = createSlice({
  name: "branchOwner",
  initialState,
  reducers: {
    clearBranchOwnerError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMySalonsThunk.pending,   (state) => { state.loading.salons = true; })
      .addCase(fetchMySalonsThunk.fulfilled, (state, { payload }) => { state.loading.salons = false; state.salons = payload; })
      .addCase(fetchMySalonsThunk.rejected,  (state, { payload }) => { state.loading.salons = false; state.error = payload ?? null; });

    builder
      .addCase(fetchBranchOwnerStatsThunk.pending,   (state) => { state.loading.stats = true; })
      .addCase(fetchBranchOwnerStatsThunk.fulfilled, (state, { payload }) => { state.loading.stats = false; state.stats = payload; })
      .addCase(fetchBranchOwnerStatsThunk.rejected,  (state, { payload }) => { state.loading.stats = false; state.error = payload ?? null; });

    builder
      .addCase(fetchBranchOwnerPaymentsThunk.pending,   (state) => { state.loading.payments = true; })
      .addCase(fetchBranchOwnerPaymentsThunk.fulfilled, (state, { payload }) => { state.loading.payments = false; state.payments = payload; })
      .addCase(fetchBranchOwnerPaymentsThunk.rejected,  (state, { payload }) => { state.loading.payments = false; state.error = payload ?? null; });
  },
});

export const { clearBranchOwnerError } = branchOwnerSlice.actions;
export default branchOwnerSlice.reducer;
