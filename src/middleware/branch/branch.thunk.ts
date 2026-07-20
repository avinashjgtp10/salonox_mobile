import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchAppointmentsThunk } from "@/middleware/appointment/appointment.thunk";
import { fetchAttendanceOverviewThunk } from "@/middleware/attendance/attendance.thunk";
import { fetchClientsThunk } from "@/middleware/client/client.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchMembershipsThunk } from "@/middleware/membership/membership.thunk";
import { fetchNotificationsThunk, fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { fetchBrandsThunk, fetchInventorySummaryThunk, fetchProductsThunk } from "@/middleware/product/product.thunk";
import { fetchSalesInitThunk, fetchSalesSummaryThunk, fetchSalesThunk } from "@/middleware/sales/sales.thunk";
import { fetchServicesThunk } from "@/middleware/service/service.thunk";
import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { branchService } from "@/services/branch.service";
import { branchStorage } from "@/services/branchStorage";
import { getApiErrorMessage } from "@/services/api";
import { selectActiveBranchId, setActiveBranchId, setSwitchingBranch } from "@/store/branch/branch.slice";
import type { RootState } from "@/store";
import type { Branch } from "@/types/branch";

type RejectValue = { message: string };

export const fetchBranchesThunk = createAsyncThunk<
  Branch[],
  void,
  { rejectValue: RejectValue; state: RootState }
>("branch/fetchBranches", async (_args, { rejectWithValue }) => {
  try {
    return await branchService.getMyBranches();
  } catch (error) {
    return rejectWithValue({ message: getApiErrorMessage(error) });
  }
});

// Thin orchestration thunk (same pattern as fetchAttendanceOverviewThunk) —
// no reducer cases of its own; each dispatched thunk updates its own slice.
// Promise.allSettled so one module failing to refresh doesn't block the rest
// from picking up the new branch's data.
export const refreshAppDataForBranchThunk = createAsyncThunk<
  void,
  void,
  { state: RootState }
>("branch/refreshAppData", async (_args, { dispatch }) => {
  await Promise.allSettled([
    dispatch(fetchDashboardThunk()),
    dispatch(fetchAppointmentsThunk()),
    dispatch(fetchClientsThunk()),
    dispatch(fetchStaffThunk()),
    dispatch(fetchAttendanceOverviewThunk()),
    dispatch(fetchProductsThunk()),
    dispatch(fetchInventorySummaryThunk()),
    dispatch(fetchBrandsThunk({ refresh: true })),
    dispatch(fetchServicesThunk({ reset: true })),
    dispatch(fetchMembershipsThunk({ refresh: true })),
    dispatch(fetchSalesInitThunk()),
    dispatch(fetchSalesThunk()),
    dispatch(fetchSalesSummaryThunk()),
    dispatch(fetchNotificationsThunk()),
    dispatch(fetchUnreadCountThunk()),
  ]);
});

export const selectBranchThunk = createAsyncThunk<
  void,
  string,
  { state: RootState }
>("branch/selectBranch", async (branchId, { dispatch, getState }) => {
  const state = getState();

  // Selecting the already-active branch, or switching while a switch is
  // already in flight, is a no-op — avoids redundant/duplicate refetches.
  if (branchId === selectActiveBranchId(state) || state.branch.isSwitching) {
    return;
  }

  dispatch(setSwitchingBranch(true));
  dispatch(setActiveBranchId(branchId));

  try {
    await branchStorage.setActiveBranchId(branchId);
    await dispatch(refreshAppDataForBranchThunk());
  } finally {
    dispatch(setSwitchingBranch(false));
  }
});
