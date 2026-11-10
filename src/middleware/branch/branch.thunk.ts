import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchAppointmentsThunk } from "@/middleware/appointment/appointment.thunk";
import { fetchAttendanceOverviewThunk } from "@/middleware/attendance/attendance.thunk";
import { fetchClientsThunk } from "@/middleware/client/client.thunk";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchMembershipsThunk } from "@/middleware/membership/membership.thunk";
import { fetchNotificationsThunk, fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { fetchBrandsThunk, fetchInventorySummaryThunk, fetchProductsThunk } from "@/middleware/product/product.thunk";
import { fetchSalesInitThunk, fetchSalesSummaryThunk, refreshSalesListInBackground } from "@/middleware/sales/sales.thunk";
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
>("branch/fetchBranches", async (_args, { rejectWithValue, getState }) => {
  const user = getState().user.user;
  const identity = `${user?.id}:${user?.salonId}`;
  try {
    const branches = await branchService.getMyBranches();
    const currentUser = getState().user.user;
    if (`${currentUser?.id}:${currentUser?.salonId}` !== identity) throw new Error("Your session changed. Please retry.");
    return branches;
  } catch (error) {
    return rejectWithValue({ message: getApiErrorMessage(error) });
  }
});

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
    refreshSalesListInBackground(dispatch, {}),
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

  if (branchId === selectActiveBranchId(state) || state.branch.isSwitching) {
    return;
  }
  if (branchId !== state.user.user?.salonId) throw new Error("Switch salons through the authenticated salon switcher.");

  dispatch(setSwitchingBranch(true));
  dispatch(setActiveBranchId(branchId));

  try {
    await branchStorage.setActiveBranchId(branchId);
    await dispatch(refreshAppDataForBranchThunk());
  } finally {
    dispatch(setSwitchingBranch(false));
  }
});
