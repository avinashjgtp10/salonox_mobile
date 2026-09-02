import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  cancelAppointmentThunk,
  completeAppointmentThunk,
  confirmAppointmentThunk,
  createAppointmentThunk,
  fetchAppointmentByIdThunk,
  fetchAppointmentHistoryThunk,
  fetchAppointmentsThunk,
  rescheduleAppointmentThunk,
  startAppointmentThunk,
  updateAppointmentThunk,
  type FetchAppointmentsArgs,
} from "@/middleware/appointment/appointment.thunk";
import type { RootState } from "@/store";
import type {
  AppointmentListItem,
  AppointmentListPagination,
  AppointmentListQuery,
} from "@/types/appointment";

type AppointmentDetailsState = {
  error: string | null;
  loading: boolean;
};

type AppointmentToast = {
  message: string;
  tone: "error" | "success";
};

type AppointmentState = {
  appointments: AppointmentListItem[];
  currentRequestId: string | null;
  detailsById: Record<string, AppointmentListItem>;
  detailsStateById: Record<string, AppointmentDetailsState>;
  error: string | null;
  history: AppointmentListItem[];
  historyError: string | null;
  historyLoading: boolean;
  loading: boolean;
  loadingMore: boolean;
  mutationError: string | null;
  mutating: boolean;
  pagination: AppointmentListPagination;
  query: AppointmentListQuery;
  refreshing: boolean;
  toast: AppointmentToast | null;
  totalCount: number;
};

const initialQuery: AppointmentListQuery = {
  limit: 10,
  page: 1,
  search: "",
  sort_by: "scheduled_at",
  sort_order: "ASC",
};

const initialPagination: AppointmentListPagination = {
  hasMore: true,
  limit: 10,
  nextPage: 1,
  page: 0,
  totalCount: 0,
  totalPages: null,
};

const initialState: AppointmentState = {
  appointments: [],
  currentRequestId: null,
  detailsById: {},
  detailsStateById: {},
  error: null,
  history: [],
  historyError: null,
  historyLoading: false,
  loading: false,
  loadingMore: false,
  mutationError: null,
  mutating: false,
  pagination: initialPagination,
  query: initialQuery,
  refreshing: false,
  toast: null,
  totalCount: 0,
};

const isAppendRequest = (args?: FetchAppointmentsArgs) =>
  !args?.refresh && !args?.reset && typeof args?.page === "number" && args.page > 1;

const mergeAppointments = (
  existingAppointments: AppointmentListItem[],
  incomingAppointments: AppointmentListItem[],
) => {
  const seenIds = new Set(existingAppointments.map((appointment) => appointment.id));
  const uniqueIncoming = incomingAppointments.filter((appointment) => !seenIds.has(appointment.id));

  return [...existingAppointments, ...uniqueIncoming];
};

const upsertAppointment = (
  appointments: AppointmentListItem[],
  incomingAppointment: AppointmentListItem,
) => {
  const index = appointments.findIndex((appointment) => appointment.id === incomingAppointment.id);

  if (index === -1) {
    return [incomingAppointment, ...appointments];
  }

  const nextAppointments = [...appointments];
  nextAppointments[index] = incomingAppointment;

  return nextAppointments;
};

const getRejectedMessage = (
  action: { payload?: { message?: string }; error: { message?: string } },
  fallback: string,
) => action.payload?.message ?? action.error.message ?? fallback;

const applyMutationPending = (state: AppointmentState) => {
  state.mutationError = null;
  state.mutating = true;
  state.toast = null;
};

const applyMutationFulfilled = (
  state: AppointmentState,
  appointment: AppointmentListItem,
  message: string,
) => {
  state.appointments = upsertAppointment(state.appointments, appointment);
  state.detailsById[appointment.id] = appointment;
  state.mutationError = null;
  state.mutating = false;
  state.toast = { message, tone: "success" };
};

const applyMutationRejected = (
  state: AppointmentState,
  message: string,
) => {
  state.mutationError = message;
  state.mutating = false;
  state.toast = { message, tone: "error" };
};

const appointmentSlice = createSlice({
  name: "appointment",
  initialState,
  reducers: {
    clearAppointmentToast(state) {
      state.toast = null;
    },
    setAppointmentQuery(state, action: PayloadAction<Partial<AppointmentListQuery>>) {
      state.query = {
        ...state.query,
        ...action.payload,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAppointmentsThunk.pending, (state, action) => {
        const appendRequest = isAppendRequest(action.meta.arg);

        state.currentRequestId = action.meta.requestId;
        state.error = null;
        state.loading = !appendRequest && !action.meta.arg?.refresh;
        state.loadingMore = appendRequest;
        state.refreshing = Boolean(action.meta.arg?.refresh);
      })
      .addCase(fetchAppointmentsThunk.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        const appendRequest = isAppendRequest(action.meta.arg);

        state.appointments = appendRequest
          ? mergeAppointments(state.appointments, action.payload.appointments)
          : action.payload.appointments;
        action.payload.appointments.forEach((appointment) => {
          state.detailsById[appointment.id] = appointment;
        });
        state.currentRequestId = null;
        state.error = null;
        state.loading = false;
        state.loadingMore = false;
        state.pagination = action.payload.pagination;
        state.query = action.payload.query;
        state.refreshing = false;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchAppointmentsThunk.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) {
          return;
        }

        state.currentRequestId = null;
        state.error = getRejectedMessage(action, "Unable to load appointments.");
        state.loading = false;
        state.loadingMore = false;
        state.refreshing = false;
        state.toast = { message: state.error, tone: "error" };
      })
      .addCase(fetchAppointmentByIdThunk.pending, (state, action) => {
        state.detailsStateById[action.meta.arg] = {
          error: null,
          loading: true,
        };
      })
      .addCase(fetchAppointmentByIdThunk.fulfilled, (state, action) => {
        const appointment = action.payload.appointment;

        state.detailsById[appointment.id] = appointment;
        state.appointments = upsertAppointment(state.appointments, appointment);
        state.detailsStateById[appointment.id] = {
          error: null,
          loading: false,
        };
      })
      .addCase(fetchAppointmentByIdThunk.rejected, (state, action) => {
        state.detailsStateById[action.meta.arg] = {
          error: getRejectedMessage(action, "Unable to load appointment details."),
          loading: false,
        };
      })
      .addCase(createAppointmentThunk.pending, applyMutationPending)
      .addCase(createAppointmentThunk.fulfilled, (state, action) => {
        applyMutationFulfilled(
          state,
          action.payload.appointment,
          action.payload.message ?? "Appointment created successfully.",
        );
        state.totalCount += 1;
      })
      .addCase(createAppointmentThunk.rejected, (state, action) => {
        applyMutationRejected(
          state,
          action.payload?.message ?? action.error.message ?? "Unable to create appointment.",
        );
      })
      .addCase(updateAppointmentThunk.pending, applyMutationPending)
      .addCase(updateAppointmentThunk.fulfilled, (state, action) => {
        applyMutationFulfilled(
          state,
          action.payload.appointment,
          action.payload.message ?? "Appointment updated successfully.",
        );
      })
      .addCase(updateAppointmentThunk.rejected, (state, action) => {
        applyMutationRejected(state, action.payload?.message ?? action.error.message ?? "Unable to update appointment.");
      })
      .addCase(cancelAppointmentThunk.pending, applyMutationPending)
      .addCase(cancelAppointmentThunk.fulfilled, (state, action) => {
        const cancelledAppointment = {
          ...action.payload.appointment,
          status: "Cancelled" as const,
        };

        applyMutationFulfilled(
          state,
          cancelledAppointment,
          action.payload.message ?? "Appointment cancelled successfully.",
        );
      })
      .addCase(cancelAppointmentThunk.rejected, (state, action) => {
        applyMutationRejected(state, action.payload?.message ?? action.error.message ?? "Unable to cancel appointment.");
      })
      .addCase(rescheduleAppointmentThunk.pending, applyMutationPending)
      .addCase(rescheduleAppointmentThunk.fulfilled, (state, action) => {
        applyMutationFulfilled(
          state,
          action.payload.appointment,
          action.payload.message ?? "Appointment rescheduled successfully.",
        );
      })
      .addCase(rescheduleAppointmentThunk.rejected, (state, action) => {
        applyMutationRejected(
          state,
          action.payload?.message ?? action.error.message ?? "Unable to reschedule appointment.",
        );
      })
      .addCase(confirmAppointmentThunk.pending, applyMutationPending)
      .addCase(confirmAppointmentThunk.fulfilled, (state, action) => {
        const confirmedAppointment = {
          ...action.payload.appointment,
          status: "Confirmed" as const,
        };

        applyMutationFulfilled(
          state,
          confirmedAppointment,
          action.payload.message ?? "Appointment confirmed successfully.",
        );
      })
      .addCase(confirmAppointmentThunk.rejected, (state, action) => {
        applyMutationRejected(
          state,
          action.payload?.message ?? action.error.message ?? "Unable to confirm appointment.",
        );
      })
      .addCase(startAppointmentThunk.pending, applyMutationPending)
      .addCase(startAppointmentThunk.fulfilled, (state, action) => {
        const startedAppointment = {
          ...action.payload.appointment,
          status: "In Progress" as const,
        };

        applyMutationFulfilled(
          state,
          startedAppointment,
          action.payload.message ?? "Appointment started successfully.",
        );
      })
      .addCase(startAppointmentThunk.rejected, (state, action) => {
        applyMutationRejected(
          state,
          action.payload?.message ?? action.error.message ?? "Unable to start appointment.",
        );
      })
      .addCase(completeAppointmentThunk.pending, applyMutationPending)
      .addCase(completeAppointmentThunk.fulfilled, (state, action) => {
        const completedAppointment = {
          ...action.payload.appointment,
          status: "Completed" as const,
        };

        applyMutationFulfilled(
          state,
          completedAppointment,
          action.payload.message ?? "Appointment completed successfully.",
        );
      })
      .addCase(completeAppointmentThunk.rejected, (state, action) => {
        applyMutationRejected(
          state,
          action.payload?.message ?? action.error.message ?? "Unable to complete appointment.",
        );
      })
      .addCase(fetchAppointmentHistoryThunk.pending, (state) => {
        state.historyError = null;
        state.historyLoading = true;
      })
      .addCase(fetchAppointmentHistoryThunk.fulfilled, (state, action) => {
        state.history = action.payload.appointments;
        state.historyError = null;
        state.historyLoading = false;
      })
      .addCase(fetchAppointmentHistoryThunk.rejected, (state, action) => {
        state.historyError = getRejectedMessage(action, "Unable to load appointment history.");
        state.historyLoading = false;
      });
  },
});

export const { clearAppointmentToast, setAppointmentQuery } = appointmentSlice.actions;

export const selectAppointments = (state: RootState) => state.appointment.appointments;
export const selectAppointmentById = (state: RootState, appointmentId?: string | null) =>
  appointmentId ? state.appointment.detailsById[appointmentId] : undefined;
export const selectAppointmentDetailsState = (state: RootState, appointmentId?: string | null) =>
  appointmentId ? state.appointment.detailsStateById[appointmentId] : undefined;
export const selectAppointmentsError = (state: RootState) => state.appointment.error;
export const selectAppointmentsIsLoading = (state: RootState) => state.appointment.loading;
export const selectAppointmentsLoadingMore = (state: RootState) => state.appointment.loadingMore;
export const selectAppointmentsPagination = (state: RootState) => state.appointment.pagination;
export const selectAppointmentsQuery = (state: RootState) => state.appointment.query;
export const selectAppointmentsRefreshing = (state: RootState) => state.appointment.refreshing;
export const selectAppointmentsStatus = (state: RootState) =>
  state.appointment.loading ? "loading" : state.appointment.error ? "failed" : "succeeded";
export const selectAppointmentsTotalCount = (state: RootState) => state.appointment.totalCount;
export const selectAppointmentMutating = (state: RootState) => state.appointment.mutating;
export const selectAppointmentMutationError = (state: RootState) => state.appointment.mutationError;
export const selectAppointmentToast = (state: RootState) => state.appointment.toast;
export const selectAppointmentHistory = (state: RootState) => state.appointment.history;
export const selectAppointmentHistoryError = (state: RootState) => state.appointment.historyError;
export const selectAppointmentHistoryLoading = (state: RootState) => state.appointment.historyLoading;

export default appointmentSlice.reducer;
