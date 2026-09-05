import { fetchStaffThunk } from "@/middleware/staff/staff.thunk";
import { useAppDispatch } from "@/store/hooks";
import { useEffect } from "react";

export function useAllStaffMembers() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;

    const loadAllPages = async () => {
      let page = 1;
      let limit: number | undefined;
      let reset = true;

      while (!cancelled) {
        const result = await dispatch(fetchStaffThunk({ limit, page, reset }));

        if (cancelled || !fetchStaffThunk.fulfilled.match(result)) return;

        const nextPagination = result.payload.pagination;

        if (!nextPagination.hasMore || nextPagination.nextPage <= page) return;

        limit = nextPagination.limit;
        page = nextPagination.nextPage;
        reset = false;
      }
    };

    void loadAllPages();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);
}
