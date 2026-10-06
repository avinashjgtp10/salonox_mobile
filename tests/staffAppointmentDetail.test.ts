import { configureStore } from "@reduxjs/toolkit";
import { ApiError } from "@/services/api";
import { appointmentService } from "@/services/appointment.service";
import { fetchAppointmentByIdThunk, fetchAppointmentsThunk } from "@/middleware/appointment/appointment.thunk";
import reducer from "@/store/appointment/appointment.slice";
import type { AppDispatch } from "@/store";
import type { AppointmentListItem, AppointmentListResponse } from "@/types/appointment";

jest.mock("@/services/api", () => ({
  ApiError: class extends Error {
    status?: number;
    constructor(message: string, code?: number) { super(message); this.status = code; }
  },
  getApiErrorMessage: (error: Error) => error.message,
}));
jest.mock("@/services/appointment.service", () => ({ appointmentService: { getAppointment: jest.fn() } }));
jest.mock("@/middleware/dashboard/dashboard.thunk", () => ({}));
jest.mock("@/middleware/notification/notification.thunk", () => ({}));
jest.mock("@/store/branch/branch.slice", () => ({ selectActiveBranchId: () => "salon" }));
jest.mock("@/store/user/user.slice", () => ({ selectCurrentUser: () => ({ id: "user-self", role: "staff" }) }));
jest.mock("@/store/staff/staff.slice", () => ({ selectCurrentStaff: () => ({ id: "staff-self", userId: "user-self", name: "Shubham" }) }));

const own = { id: "own", staffId: "staff-self", staffName: "Shubham", raw: { staff_id: "staff-self" } } as AppointmentListItem;
const setup = () => {
  const store = configureStore({ reducer: { appointment: reducer } });
  return { store, dispatch: store.dispatch as unknown as AppDispatch };
};
beforeEach(() => jest.clearAllMocks());

test("a staff deep link cannot put another staff appointment into the details store", async () => {
  jest.mocked(appointmentService.getAppointment).mockResolvedValue({ appointment: { ...own, id: "other", staffId: "staff-other", raw: { staff_id: "staff-other" } } });
  const { dispatch, store } = setup();
  await expect(dispatch(fetchAppointmentByIdThunk("other")).unwrap()).rejects.toMatchObject({ status: 403 });
  expect(store.getState().appointment.detailsById.other).toBeUndefined();
});

test("own read-only details can use the allowed list when the unchanged API denies detail permission", async () => {
  jest.mocked(appointmentService.getAppointment).mockRejectedValue(new ApiError("Forbidden", 403));
  const { dispatch, store } = setup();
  store.dispatch(fetchAppointmentsThunk.pending("list", undefined));
  store.dispatch(fetchAppointmentsThunk.fulfilled({
    appointments: [own], query: { limit: 10, page: 1, search: "", sort_by: "scheduled_at", sort_order: "ASC" },
    totalCount: 1, pagination: { page: 1, nextPage: 2, hasMore: false, limit: 10, totalCount: 1, totalPages: 1 },
  } as AppointmentListResponse, "list", undefined));
  const details = await dispatch(fetchAppointmentByIdThunk("own")).unwrap();
  expect(details.appointment.id).toBe("own");
  expect(details.appointment.staffName).toBe("Shubham");
});
