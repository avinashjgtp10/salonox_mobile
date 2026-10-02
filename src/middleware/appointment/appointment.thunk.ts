import { createAsyncThunk } from "@reduxjs/toolkit";

import { fetchDashboardThunk } from "@/middleware/dashboard/dashboard.thunk";
import { fetchUnreadCountThunk } from "@/middleware/notification/notification.thunk";
import { ApiError, getApiErrorMessage } from "@/services/api";
import { appointmentService } from "@/services/appointment.service";
import type { RootState } from "@/store";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { selectCurrentStaff } from "@/store/staff/staff.slice";
import { selectCurrentUser } from "@/store/user/user.slice";
import { isStaffExperienceUser } from "@/utils/routeResolver";
import { isAssignedToStaff } from "@/features/appointments/utils/staffAssignment";
import type {
  AppointmentDetailResponse,
  AppointmentHistoryResponse,
  AppointmentListQuery,
  AppointmentListResponse,
  AppointmentMutationResponse,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
  UpdateAppointmentRequest,
} from "@/types/appointment";

export type FetchAppointmentsArgs = Partial<AppointmentListQuery> & {
  refresh?: boolean;
  reset?: boolean;
};

type AppointmentRejectValue = {
  message: string;
  responseBody?: unknown;
  status?: number;
};

const toRejectValue = (error: unknown): AppointmentRejectValue => ({
  message: error instanceof ApiError ? error.message : getApiErrorMessage(error),
  responseBody: error instanceof ApiError ? error.responseData : undefined,
  status: error instanceof ApiError ? error.status : undefined,
});

const getSalonId = (state: RootState) => selectActiveBranchId(state);

export const fetchAppointmentsThunk = createAsyncThunk<
  AppointmentListResponse,
  FetchAppointmentsArgs | undefined,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/fetchAppointments", async (args, { getState, rejectWithValue }) => {
  const state = getState();
  const appointmentState = state.appointment;
  const usesDateRange = Boolean(args && ("from_date" in args || "to_date" in args));
  const query: AppointmentListQuery = {
    date: usesDateRange ? undefined : args?.date ?? appointmentState.query.date,
    from_date: args?.from_date ?? appointmentState.query.from_date,
    limit: args?.limit ?? appointmentState.query.limit,
    page: args?.page ?? appointmentState.query.page,
    search: args?.search ?? appointmentState.query.search,
    sort_by: args?.sort_by ?? appointmentState.query.sort_by,
    sort_order: args?.sort_order ?? appointmentState.query.sort_order,
    staff_id: args ? args.staff_id : appointmentState.query.staff_id,
    status: args && "status" in args ? args.status : appointmentState.query.status,
    to_date: args?.to_date ?? appointmentState.query.to_date,
  };

  try {
    if (isStaffExperienceUser(selectCurrentUser(state))) {
      const staff = selectCurrentStaff(state);
      if (!staff) throw new ApiError("Your staff profile is not available yet.", 403);
      const response = await appointmentService.getStaffAppointments(query, staff, getSalonId(state));
      if (selectCurrentUser(getState())?.id !== selectCurrentUser(state)?.id || selectCurrentStaff(getState())?.id !== staff.id) {
        throw new ApiError("Your staff session has changed. Please refresh.", 403);
      }
      return response;
    }
    return await appointmentService.getAppointments(query, getSalonId(state));
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchAppointmentByIdThunk = createAsyncThunk<
  AppointmentDetailResponse,
  string,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/fetchAppointmentById", async (appointmentId, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const isStaff = isStaffExperienceUser(selectCurrentUser(state));
    const staff = selectCurrentStaff(state);
    if (isStaff && !staff) throw new ApiError("Your staff profile is not available yet.", 403);
    let response: AppointmentDetailResponse;
    try {
      response = await appointmentService.getAppointment(appointmentId);
    } catch (error) {
      const listed = state.appointment.appointments.find(item => item.id === appointmentId);
      if (!isStaff || !(error instanceof ApiError) || error.status !== 403 || !staff || !listed || !isAssignedToStaff(listed, staff)) throw error;
      response = { appointment: listed };
    }
    if (isStaff && (!staff || !isAssignedToStaff(response.appointment, staff) || selectCurrentUser(getState())?.id !== selectCurrentUser(state)?.id)) {
      throw new ApiError("This appointment is not assigned to you.", 403);
    }
    return isStaff ? { ...response, appointment: { ...response.appointment, staffName: staff!.name } } : response;
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});

export const createAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  Omit<CreateAppointmentRequest, "salon_id">,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/createAppointment", async (appointmentPayload, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = getSalonId(getState());
    const payload: CreateAppointmentRequest = {
      ...appointmentPayload,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await appointmentService.createAppointment(payload);

    // The backend fires a "New Appointment Booked" notification on create —
    // refresh the badge so it doesn't wait for the next foreground/focus tick.
    void dispatch(fetchUnreadCountThunk());
    void dispatch(fetchDashboardThunk());
    void dispatch(fetchAppointmentsThunk({ ...getState().appointment.query, refresh: true }));

    return response;
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});

export const updateAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  { appointmentId: string; updates: Omit<UpdateAppointmentRequest, "salon_id"> },
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/updateAppointment", async ({ appointmentId, updates }, { dispatch, getState, rejectWithValue }) => {
  try {
    const salonId = getSalonId(getState());
    const payload: UpdateAppointmentRequest = {
      ...updates,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    const response = await appointmentService.updateAppointment(appointmentId, payload);

    void dispatch(fetchDashboardThunk());
    void dispatch(fetchAppointmentByIdThunk(appointmentId));
    void dispatch(fetchAppointmentsThunk({ ...getState().appointment.query, refresh: true }));

    return response;
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});

export const cancelAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  { appointmentId: string; reason?: string },
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/cancelAppointment", async ({ appointmentId, reason }, { dispatch, getState, rejectWithValue }) => {
  try {
    const trimmedReason = reason?.trim();
    const payload: CancelAppointmentRequest = trimmedReason
      ? { cancellation_reason: trimmedReason }
      : {};
    const response = await appointmentService.cancelAppointment(appointmentId, payload);
    const query = getState().appointment.query;

    void dispatch(fetchAppointmentByIdThunk(appointmentId));
    void dispatch(
      fetchAppointmentsThunk({
        ...query,
        refresh: true,
      }),
    );
    // The backend fires an "Appointment Cancelled" notification here too.
    void dispatch(fetchUnreadCountThunk());
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});

export const rescheduleAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  { appointmentId: string; updates: RescheduleAppointmentRequest },
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/rescheduleAppointment", async ({ appointmentId, updates }, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await appointmentService.rescheduleAppointment(appointmentId, updates);

    void dispatch(fetchAppointmentByIdThunk(appointmentId));
    void dispatch(fetchAppointmentsThunk({ ...getState().appointment.query, refresh: true }));
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});

export const confirmAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  string,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/confirmAppointment", async (appointmentId, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await appointmentService.confirmAppointment(appointmentId);
    const query = getState().appointment.query;

    void dispatch(fetchAppointmentByIdThunk(appointmentId));
    void dispatch(
      fetchAppointmentsThunk({
        ...query,
        refresh: true,
      }),
    );
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});

export const startAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  string,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/startAppointment", async (appointmentId, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await appointmentService.startAppointment(appointmentId);
    const query = getState().appointment.query;

    void dispatch(fetchAppointmentByIdThunk(appointmentId));
    void dispatch(
      fetchAppointmentsThunk({
        ...query,
        refresh: true,
      }),
    );
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});

export const completeAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  string,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/completeAppointment", async (appointmentId, { dispatch, getState, rejectWithValue }) => {
  try {
    const response = await appointmentService.completeAppointment(appointmentId);
    const query = getState().appointment.query;

    void dispatch(fetchAppointmentByIdThunk(appointmentId));
    void dispatch(
      fetchAppointmentsThunk({
        ...query,
        refresh: true,
      }),
    );
    void dispatch(fetchDashboardThunk());

    return response;
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});

export const fetchAppointmentHistoryThunk = createAsyncThunk<
  AppointmentHistoryResponse,
  string | undefined,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/fetchAppointmentHistory", async (clientId, { rejectWithValue }) => {
  try {
    return await appointmentService.getAppointmentHistory(clientId);
  } catch (error) {
    return rejectWithValue(toRejectValue(error));
  }
});
