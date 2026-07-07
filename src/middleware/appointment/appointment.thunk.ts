import { createAsyncThunk } from "@reduxjs/toolkit";

import { ApiError, getApiErrorMessage } from "@/services/api";
import { appointmentService } from "@/services/appointment.service";
import type { RootState } from "@/store";
import { selectCurrentUser } from "@/store/user/user.slice";
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

const logAppointmentError = (label: string, error: unknown, extra?: Record<string, unknown>) => {
  const rejectValue = toRejectValue(error);

  console.error(`[Appointments] ${label}`, {
    ...extra,
    message: rejectValue.message,
    responseBody: rejectValue.responseBody,
    status: rejectValue.status,
  });

  return rejectValue;
};

const getSalonId = (state: RootState) => selectCurrentUser(state)?.salonId;

export const fetchAppointmentsThunk = createAsyncThunk<
  AppointmentListResponse,
  FetchAppointmentsArgs | undefined,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/fetchAppointments", async (args, { getState, rejectWithValue }) => {
  const state = getState();
  const appointmentState = state.appointment;
  const query: AppointmentListQuery = {
    date: args?.date ?? appointmentState.query.date,
    from_date: args?.from_date ?? appointmentState.query.from_date,
    limit: args?.limit ?? appointmentState.query.limit,
    page: args?.page ?? appointmentState.query.page,
    search: args?.search ?? appointmentState.query.search,
    sort_by: args?.sort_by ?? appointmentState.query.sort_by,
    sort_order: args?.sort_order ?? appointmentState.query.sort_order,
    staff_id: args?.staff_id ?? appointmentState.query.staff_id,
    status: args?.status ?? appointmentState.query.status,
    to_date: args?.to_date ?? appointmentState.query.to_date,
  };

  try {
    return await appointmentService.getAppointments(query, getSalonId(state));
  } catch (error) {
    return rejectWithValue(logAppointmentError("Fetch list failed", error, { query }));
  }
});

export const fetchAppointmentByIdThunk = createAsyncThunk<
  AppointmentDetailResponse,
  string,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/fetchAppointmentById", async (appointmentId, { rejectWithValue }) => {
  try {
    return await appointmentService.getAppointment(appointmentId);
  } catch (error) {
    return rejectWithValue(logAppointmentError("Fetch detail failed", error, { appointmentId }));
  }
});

export const createAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  Omit<CreateAppointmentRequest, "salon_id">,
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/createAppointment", async (appointmentPayload, { getState, rejectWithValue }) => {
  try {
    const salonId = getSalonId(getState());
    const payload: CreateAppointmentRequest = {
      ...appointmentPayload,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await appointmentService.createAppointment(payload);
  } catch (error) {
    return rejectWithValue(logAppointmentError("Create failed", error));
  }
});

export const updateAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  { appointmentId: string; updates: Omit<UpdateAppointmentRequest, "salon_id"> },
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/updateAppointment", async ({ appointmentId, updates }, { getState, rejectWithValue }) => {
  try {
    const salonId = getSalonId(getState());
    const payload: UpdateAppointmentRequest = {
      ...updates,
      ...(salonId ? { salon_id: salonId } : {}),
    };

    return await appointmentService.updateAppointment(appointmentId, payload);
  } catch (error) {
    return rejectWithValue(logAppointmentError("Update failed", error, { appointmentId }));
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

    return response;
  } catch (error) {
    return rejectWithValue(logAppointmentError("Cancel failed", error, { appointmentId }));
  }
});

export const rescheduleAppointmentThunk = createAsyncThunk<
  AppointmentMutationResponse,
  { appointmentId: string; updates: RescheduleAppointmentRequest },
  { rejectValue: AppointmentRejectValue; state: RootState }
>("appointment/rescheduleAppointment", async ({ appointmentId, updates }, { rejectWithValue }) => {
  try {
    return await appointmentService.rescheduleAppointment(appointmentId, updates);
  } catch (error) {
    return rejectWithValue(logAppointmentError("Reschedule failed", error, { appointmentId }));
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

    return response;
  } catch (error) {
    return rejectWithValue(logAppointmentError("Confirm failed", error, { appointmentId }));
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

    return response;
  } catch (error) {
    return rejectWithValue(logAppointmentError("Start failed", error, { appointmentId }));
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
    return rejectWithValue(logAppointmentError("Fetch history failed", error, { clientId }));
  }
});
