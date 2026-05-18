import { createSlice } from "@reduxjs/toolkit";
import { fetchDashboardAll } from "../middleware/dashboard/dashboard.thunk";
import type { DashboardAllResponse } from "../middleware/dashboard/dashboard.thunk";

interface DashboardState {
  data: DashboardAllResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  data: null,
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboard: (state) => {
      state.data = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardAll.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardAll.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDashboardAll.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;
