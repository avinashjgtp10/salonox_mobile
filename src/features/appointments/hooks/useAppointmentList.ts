import { useCallback, useState } from "react";

import { todayIsoDate } from "@/features/appointments/utils/appointmentDateTime";
import { fetchAppointmentsThunk } from "@/middleware/appointment/appointment.thunk";
import { appointmentStatusToListApiValue } from "@/services/appointment.service";
import { selectAppointmentsPagination, selectAppointmentsQuery } from "@/store/appointment/appointment.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { AppointmentStatus } from "@/types/appointment";

type AppointmentListStatus = "All" | AppointmentStatus;

type FetchAppointmentsParams = {
  date?: string;
  fromDate?: string;
  limit?: number;
  page?: number;
  refresh?: boolean;
  reset?: boolean;
  search?: string;
  staffId?: string;
  status?: AppointmentListStatus;
  toDate?: string;
};

export function useAppointmentListFilters() {
  const queryState = useAppSelector(selectAppointmentsQuery);
  const [date, setDate] = useState(queryState.date ?? todayIsoDate());
  const [search, setSearch] = useState(queryState.search);
  const [status, setStatus] = useState<AppointmentListStatus>("All");

  return { date, search, setDate, setSearch, setStatus, status };
}

export function useFetchAppointments() {
  const dispatch = useAppDispatch();
  const pagination = useAppSelector(selectAppointmentsPagination);
  const query = useAppSelector(selectAppointmentsQuery);

  const fetchAppointments = useCallback(
    async ({
      date,
      fromDate,
      limit,
      page = 1,
      refresh = false,
      reset = false,
      search = "",
      staffId,
      status = "All",
      toDate,
    }: FetchAppointmentsParams = {}) => {
      await dispatch(
        fetchAppointmentsThunk({
          date: date || undefined,
          from_date: fromDate,
          limit: limit ?? query.limit,
          page,
          refresh,
          reset,
          search,
          sort_by: query.sort_by,
          sort_order: query.sort_order,
          staff_id: staffId,
          status: status !== "All" ? appointmentStatusToListApiValue(status) : undefined,
          to_date: toDate,
        }),
      );
    },
    [dispatch, query.limit, query.sort_by, query.sort_order],
  );

  const fetchNext = useCallback(
    async (params: Pick<FetchAppointmentsParams, "date" | "search" | "staffId" | "status">) => {
      if (!pagination.hasMore) {
        return;
      }

      await fetchAppointments({ ...params, page: pagination.nextPage });
    },
    [fetchAppointments, pagination.hasMore, pagination.nextPage],
  );

  return { fetchAppointments, fetchNext };
}
