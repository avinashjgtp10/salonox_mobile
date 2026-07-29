import {
  combineReducers,
  configureStore,
  createAction,
  type AnyAction,
} from "@reduxjs/toolkit";

import appointmentReducer from "@/store/appointment/appointment.slice";
import attendanceReducer from "@/store/attendance/attendance.slice";
import branchReducer from "@/store/branch/branch.slice";
import clientMembershipReducer from "@/store/clientMembership/clientMembership.slice";
import clientReducer from "@/store/client/client.slice";
import dashboardReducer from "@/store/dashboard/dashboard.slice";
import membershipReducer from "@/store/membership/membership.slice";
import networkReducer from "@/store/network/network.slice";
import notificationReducer from "@/store/notification/notification.slice";
import profileReducer from "@/store/profile/profile.slice";
import reportReducer from "@/store/report/report.slice";
import productReducer from "@/store/product/product.slice";
import salesReducer from "@/store/sales/sales.slice";
import salonReducer from "@/store/salon/salon.slice";
import salonCommissionsReducer from "@/store/staff/salonCommissions.slice";
import serviceReducer from "@/store/service/service.slice";
import staffReducer from "@/store/staff/staff.slice";
import staffAvailabilityReducer from "@/store/staff/staffAvailability.slice";
import staffBlockedTimesReducer from "@/store/staff/staffBlockedTimes.slice";
import staffCommissionsReducer from "@/store/staff/staffCommissions.slice";
import staffInvitationsReducer from "@/store/staff/staffInvitations.slice";
import staffLeavesReducer from "@/store/staff/staffLeaves.slice";
import staffPayRunsReducer from "@/store/staff/staffPayRuns.slice";
import staffScheduleReducer from "@/store/staff/staffSchedule.slice";
import staffWagesReducer from "@/store/staff/staffWages.slice";
import userReducer from "@/store/user/user.slice";

export const resetAppState = createAction("app/resetState");

const appReducer = combineReducers({
  appointment: appointmentReducer,
  attendance: attendanceReducer,
  branch: branchReducer,
  client: clientReducer,
  clientMembership: clientMembershipReducer,
  dashboard: dashboardReducer,
  membership: membershipReducer,
  network: networkReducer,
  notification: notificationReducer,
  profile: profileReducer,
  report: reportReducer,
  product: productReducer,
  sales: salesReducer,
  salon: salonReducer,
  salonCommissions: salonCommissionsReducer,
  service: serviceReducer,
  staff: staffReducer,
  staffAvailability: staffAvailabilityReducer,
  staffBlockedTimes: staffBlockedTimesReducer,
  staffCommissions: staffCommissionsReducer,
  staffInvitations: staffInvitationsReducer,
  staffLeaves: staffLeavesReducer,
  staffPayRuns: staffPayRunsReducer,
  staffSchedule: staffScheduleReducer,
  staffWages: staffWagesReducer,
  user: userReducer,
});

const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: AnyAction) => {
  if (resetAppState.match(action)) {
    return appReducer(undefined, action);
  }

  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
