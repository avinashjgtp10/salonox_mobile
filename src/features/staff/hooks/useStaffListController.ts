import { useCallback, useEffect } from "react";

import { DEFAULT_STAFF_LIST_QUERY } from "@/features/staff/constants/staffModule.constants";
import { deleteStaffThunk, fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectStaffDeletingIds,
  selectStaffError,
  selectStaffLoading,
  selectStaffLoadingMore,
  selectStaffMembers,
  selectStaffPagination,
  selectStaffQuery,
  selectStaffRefreshing,
} from "@/store/staff/staff.slice";

export const useStaffListController = () => {
  const dispatch = useAppDispatch();
  const staffMembers = useAppSelector(selectStaffMembers);
  const error = useAppSelector(selectStaffError);
  const loading = useAppSelector(selectStaffLoading);
  const loadingMore = useAppSelector(selectStaffLoadingMore);
  const pagination = useAppSelector(selectStaffPagination);
  const query = useAppSelector(selectStaffQuery);
  const refreshing = useAppSelector(selectStaffRefreshing);
  const deletingStaffIds = useAppSelector(selectStaffDeletingIds);

  const fetchInitial = useCallback(() => {
    void dispatch(
      fetchStaffThunk({
        limit: query.limit || DEFAULT_STAFF_LIST_QUERY.limit,
        page: 1,
        reset: true,
      }),
    );
  }, [dispatch, query.limit]);

  const refresh = useCallback(() => {
    void dispatch(
      fetchStaffThunk({
        limit: query.limit || DEFAULT_STAFF_LIST_QUERY.limit,
        page: 1,
        refresh: true,
      }),
    );
  }, [dispatch, query.limit]);

  const fetchMore = useCallback(() => {
    if (loading || loadingMore || refreshing || !pagination.hasMore) {
      return;
    }

    void dispatch(
      fetchStaffThunk({
        limit: pagination.limit,
        page: pagination.nextPage,
      }),
    );
  }, [dispatch, loading, loadingMore, pagination, refreshing]);

  const deleteStaff = useCallback(
    (staffId: string) => {
      void dispatch(deleteStaffThunk(staffId));
    },
    [dispatch],
  );

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  return {
    deleteStaff,
    deletingStaffIds,
    error,
    fetchInitial,
    fetchMore,
    loading,
    loadingMore,
    pagination,
    query,
    refresh,
    refreshing,
    staffMembers,
  };
};
