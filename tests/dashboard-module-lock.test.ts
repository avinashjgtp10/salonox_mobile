import { configureStore } from "@reduxjs/toolkit";
import { ApiError } from "@/services/api";
import { dashboardService } from "@/services/dashboard.service";
import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import reducer from "@/store/dashboard/dashboard.slice";
import type { AppDispatch } from "@/store";
import React from "react";
import { Linking } from "react-native";
import { DashboardUpgradeRequired } from "@/components/dashboard/DashboardUpgradeRequired";

const renderer = jest.requireActual("react-test-renderer");
jest.mock("@/components/pearl/ui", () => ({
  EmptyState: ({ action, ...props }: { action: React.ReactNode }) => require("react").createElement("EmptyState", props, action),
  SmallButton: "SmallButton",
}));
jest.mock("@/services/appAlert", () => ({ appAlert: { alert: jest.fn() } }));

jest.mock("@/services/api", () => ({
  ApiError: class extends Error {
    status?: number;
    responseData?: unknown;
    code?: string;
    constructor(message: string, status?: number, _details?: unknown, responseData?: unknown, code?: string) {
      super(message);
      this.status = status;
      this.responseData = responseData;
      this.code = code;
    }
  },
  getApiErrorMessage: (error: Error) => error.message,
}));
jest.mock("@/services/dashboard.service", () => ({ dashboardService: { getOwnerDashboard: jest.fn() } }));
jest.mock("@/services/authLifecycle", () => ({ isUserLogoutInProgress: () => false }));
jest.mock("@/services/networkStatus", () => ({ isNetworkOnline: () => true }));
jest.mock("@/store/branch/branch.slice", () => ({ selectActiveBranchId: () => "salon-1" }));
jest.mock("@/store/user/user.slice", () => ({ selectCurrentUser: () => ({ role: "salon_owner" }) }));
jest.mock("@/middleware/appointment/appointment.thunk", () => Object.fromEntries(
  ["cancel", "confirm", "create", "reschedule", "start", "update"].map(name => [`${name}AppointmentThunk`, { fulfilled: { type: `appointment/${name}` } }]),
));
jest.mock("@/middleware/staff/staff.thunk", () => Object.fromEntries(
  ["create", "delete", "update"].map(name => [`${name}StaffThunk`, { fulfilled: { type: `staff/${name}` } }]),
));

const load = jest.mocked(dashboardService.getOwnerDashboard);
const result = {
  inventoryAlerts: [], metrics: { allTimeRevenue: 100, bookings: 1, lastMonthRevenue: 0, monthlyRevenue: 100, revenueChange: 0, todaysRevenue: 100 },
  quickSaleRevenueToday: 100, quickSaleServices: [], requestedDate: "2026-11-10", todayAppointments: [], topClient: null,
};

beforeEach(() => jest.clearAllMocks());

it("recognizes the backend lock code, clears cached data, and recovers after an upgrade", async () => {
  const store = configureStore({ reducer: { dashboard: reducer } });
  const dispatch = store.dispatch as AppDispatch;
  load.mockResolvedValueOnce(result);
  await dispatch(fetchDashboardThunk());
  load.mockRejectedValueOnce(new ApiError("Upgrade required", 403, undefined, { error: { code: "MODULE_LOCKED" } }, "ERR_BAD_REQUEST"));
  await dispatch(fetchDashboardThunk());
  expect(store.getState().dashboard).toMatchObject({ isModuleLocked: true, lastFetchedAt: null, metrics: { monthlyRevenue: 0 } });
  load.mockResolvedValueOnce(result);
  await dispatch(fetchDashboardThunk());
  expect(store.getState().dashboard).toMatchObject({ isModuleLocked: false, status: "succeeded" });
});

it.each([403, 500])("keeps ordinary HTTP %s errors as loading failures", async status => {
  const store = configureStore({ reducer: { dashboard: reducer } });
  load.mockRejectedValueOnce(new ApiError("Request failed", status));
  await (store.dispatch as AppDispatch)(fetchDashboardThunk());
  expect(store.getState().dashboard).toMatchObject({ isModuleLocked: false, status: "failed", error: "Request failed" });
});

it("shows one Explore plans action opening production pricing", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  let screen: ReturnType<typeof renderer.create>;
  await renderer.act(async () => { screen = renderer.create(React.createElement(DashboardUpgradeRequired)); });
  expect(screen.root.findByType("EmptyState").props.title).toBe("Upgrade required");
  const button = screen.root.findByType("SmallButton");
  expect(button.props.title).toBe("Explore plans");
  await renderer.act(async () => { button.props.onPress(); });
  expect(open).toHaveBeenCalledWith("https://www.salonox.com/#pricing");
  await renderer.act(async () => { screen.unmount(); });
  open.mockRestore();
});
