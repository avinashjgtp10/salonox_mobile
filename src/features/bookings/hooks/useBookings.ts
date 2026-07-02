import { useEffect, useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { setBookings } from "../../../store/schedulerSlice";
import { fetchBookingsThunk } from "../../../middleware/booking/booking.thunk";
import { mapApiBooking, toLocalDateStr } from "../utils/bookingMapper";
import { selectCurrentDate, selectViewMode, selectServicesList, selectClientsList } from "../../../store/selectors/scheduler.selectors";
import { getWeekDays } from "../utils/timeUtils";

function getViewRange(viewMode: string, date: string): { startDate: string; endDate: string } {
  if (viewMode === "Week" || viewMode === "List Week") {
    const days = getWeekDays(date);
    return { startDate: days[0], endDate: days[6] };
  }
  if (viewMode === "Month") {
    const d = new Date(date + "T12:00:00");
    const year = d.getFullYear();
    const month = d.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      startDate: `${year}-${String(month + 1).padStart(2, "0")}-01`,
      endDate:   `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    };
  }
  // Day / default
  return { startDate: date, endDate: date };
}

export function useBookings(skip = false) {
  const dispatch     = useAppDispatch();
  const currentDate  = useAppSelector(selectCurrentDate);
  const viewMode     = useAppSelector(selectViewMode);
  const apiStaff     = useAppSelector((s: any) => s.scheduler?.staffList || []);
  const apiClients   = useAppSelector(selectClientsList);
  const servicesList = useAppSelector(selectServicesList);

  // Raw API items accumulated across all fetched ranges
  const [rawApiBookings, setRawApiBookings] = useState<any[]>([]);
  const fetchedRangesRef = useRef<Set<string>>(new Set());
  const pendingRangesRef = useRef<Set<string>>(new Set());

  // Re-map only when raw items change — lookup lists are secondary and cause flicker
  // payment_status comes directly from API now so lookup lists don't affect color correctness
  useEffect(() => {
    if (!rawApiBookings.length) return;
    dispatch(
      setBookings(
        rawApiBookings.map((item) => mapApiBooking(item, servicesList, apiStaff, apiClients))
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawApiBookings, dispatch]);

  const fetchRange = useCallback(async (startDate: string, endDate: string) => {
    const rangeKey = `${startDate}|${endDate}`;
    if (fetchedRangesRef.current.has(rangeKey) || pendingRangesRef.current.has(rangeKey)) return;
    pendingRangesRef.current.add(rangeKey);
    try {
      const action = await (dispatch(
        fetchBookingsThunk({ startDate, endDate })
      ) as any);
      if (fetchBookingsThunk.fulfilled.match(action)) {
        const raw = action.payload as any;
        const items: any[] = raw?.data ?? raw ?? [];
        fetchedRangesRef.current.add(rangeKey);
        setRawApiBookings((prev) => {
          // Replace items for dates within this range; keep everything outside it
          const filtered = prev.filter((p: any) => {
            const pDate = p.scheduled_at
              ? toLocalDateStr(p.scheduled_at)
              : String(p.date || "").slice(0, 10);
            return pDate < startDate || pDate > endDate;
          });
          return [...filtered, ...items];
        });
      }
    } finally {
      pendingRangesRef.current.delete(rangeKey);
    }
  }, [dispatch]);

  useEffect(() => {
    if (skip) return;
    const { startDate, endDate } = getViewRange(viewMode, currentDate);
    fetchRange(startDate, endDate);
  }, [currentDate, viewMode, fetchRange, skip]);

  const refresh = useCallback(async () => {
    const { startDate, endDate } = getViewRange(viewMode, currentDate);
    const rangeKey = `${startDate}|${endDate}`;
    fetchedRangesRef.current.delete(rangeKey);
    pendingRangesRef.current.delete(rangeKey);
    await fetchRange(startDate, endDate);
  }, [currentDate, viewMode, fetchRange]);

  return { refresh };
}
