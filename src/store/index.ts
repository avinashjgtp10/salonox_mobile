import { configureStore } from "@reduxjs/toolkit";

import appointmentReducer from "@/store/appointment/appointment.slice";
import clientReducer from "@/store/client/client.slice";
import dashboardReducer from "@/store/dashboard/dashboard.slice";
import profileReducer from "@/store/profile/profile.slice";
import salesReducer from "@/store/sales/sales.slice";
import salonReducer from "@/store/salon/salon.slice";
import salonCommissionsReducer from "@/store/staff/salonCommissions.slice";
import serviceReducer from "@/store/service/service.slice";
import staffReducer from "@/store/staff/staff.slice";
import staffBlockedTimesReducer from "@/store/staff/staffBlockedTimes.slice";
import staffCommissionsReducer from "@/store/staff/staffCommissions.slice";
import staffInvitationsReducer from "@/store/staff/staffInvitations.slice";
import staffLeavesReducer from "@/store/staff/staffLeaves.slice";
import staffPayRunsReducer from "@/store/staff/staffPayRuns.slice";
import staffScheduleReducer from "@/store/staff/staffSchedule.slice";
import staffWagesReducer from "@/store/staff/staffWages.slice";
import userReducer from "@/store/user/user.slice";
import usersReducer from "@/store/users/users.slice";

export const store = configureStore({
  reducer: {
    appointment: appointmentReducer,
    client: clientReducer,
    dashboard: dashboardReducer,
    profile: profileReducer,
    sales: salesReducer,
    salon: salonReducer,
    salonCommissions: salonCommissionsReducer,
    service: serviceReducer,
    staff: staffReducer,
    staffBlockedTimes: staffBlockedTimesReducer,
    staffCommissions: staffCommissionsReducer,
    staffInvitations: staffInvitationsReducer,
    staffLeaves: staffLeavesReducer,
    staffPayRuns: staffPayRunsReducer,
    staffSchedule: staffScheduleReducer,
    staffWages: staffWagesReducer,
    user: userReducer,
    users: usersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
