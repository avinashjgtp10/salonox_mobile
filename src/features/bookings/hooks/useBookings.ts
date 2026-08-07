import { useEffect, useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { setBookings } from "../../../store/schedulerSlice";
import { fetchBookingsThunk } from "../../../middleware/booking/booking.thunk";
import { mapApiBooking, toLocalDateStr } from "../utils/bookingMapper";
import { selectCurrentDate, selectViewMode, selectServicesList, selectClientsList } from "../../../store/selectors/scheduler.selectors";
import { getWeekDays } from "../utils/timeUtils";
import { getSocket } from "../../../services/socket/socket";

// Exported for Scheduler.tsx's handleRefresh, which needs the same
// view-aware range (previously hardcoded to a single day regardless of
// viewMode — see the comment at its call site).
export function getViewRange(viewMode: string, date: string): { startDate: string; endDate: string } {
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
  // True only while the CURRENTLY-VIEWED range has never been fetched before —
  // i.e. first load of a date/view the user hasn't visited yet. Manual
  // refresh() and socket-triggered refetches always run silently (the range
  // is already cached, so there's real content on screen already) so a live
  // update from another device never blanks the calendar back to a skeleton.
  const [loading, setLoading] = useState(true);

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

  const fetchRange = useCallback(async (startDate: string, endDate: string, opts?: { silent?: boolean }) => {
    const rangeKey = `${startDate}|${endDate}`;
    if (fetchedRangesRef.current.has(rangeKey) || pendingRangesRef.current.has(rangeKey)) {
      if (!opts?.silent) setLoading(false);
      return;
    }
    pendingRangesRef.current.add(rangeKey);
    try {
      // Calendar views need every booking in the visible range, not a
      // paginated slice — without an explicit limit the backend defaults to
      // 50, so a busy month (or week) silently lost whichever days' bookings
      // fell past the first page until that specific day was opened directly.
      // 200/page is the backend's own hard cap (appointments.controller.ts),
      // so a month can still exceed one page — keep requesting subsequent
      // pages until the server reports there are none left. Capped at 10
      // pages (2000 records) as a sanity limit against a runaway loop.
      let allItems: any[] = [];
      for (let page = 1; page <= 10; page++) {
        const action = await (dispatch(
          fetchBookingsThunk({ startDate, endDate, limit: 200, page })
        ) as any);
        if (!fetchBookingsThunk.fulfilled.match(action)) break;
        const raw = action.payload as any;
        const items: any[] = raw?.data ?? raw ?? [];
        allItems = allItems.concat(items);
        const totalPages = raw?.totalPages ?? 1;
        if (page >= totalPages || items.length === 0) break;
      }
      fetchedRangesRef.current.add(rangeKey);
      setRawApiBookings((prev) => {
        // Replace items for dates within this range; keep everything outside it
        const filtered = prev.filter((p: any) => {
          const pDate = p.scheduled_at
            ? toLocalDateStr(p.scheduled_at)
            : String(p.date || "").slice(0, 10);
          return pDate < startDate || pDate > endDate;
        });
        return [...filtered, ...allItems];
      });
    } finally {
      pendingRangesRef.current.delete(rangeKey);
      if (!opts?.silent) setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (skip) return;
    const { startDate, endDate } = getViewRange(viewMode, currentDate);
    const rangeKey = `${startDate}|${endDate}`;
    if (fetchedRangesRef.current.has(rangeKey)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchRange(startDate, endDate);
  }, [currentDate, viewMode, fetchRange, skip]);

  const refresh = useCallback(async () => {
    const { startDate, endDate } = getViewRange(viewMode, currentDate);
    const rangeKey = `${startDate}|${endDate}`;
    fetchedRangesRef.current.delete(rangeKey);
    pendingRangesRef.current.delete(rangeKey);
    await fetchRange(startDate, endDate, { silent: true });
  }, [currentDate, viewMode, fetchRange]);

  // Live calendar updates — appointments.service.ts already emits a socket
  // "notification" event (type: "appointment") on every create/cancel,
  // including LUNOX WhatsApp bookings. The socket connection itself is
  // already established by DashboardTopbar for the notification bell; this
  // just also refetches the visible range so the calendar doesn't require
  // a manual page refresh to show bookings made from another channel.
  //
  // Scoped to the currently-visible date range: previously ANY appointment/
  // payment event anywhere in the salon forced a refetch regardless of its
  // own date, so one staff member paying an appointment on a totally
  // different day made every other staff member's Calendar refetch whatever
  // date THEY happened to be looking at. The event payload now carries the
  // affected appointment's scheduled_at (see notifications.service.ts /
  // payments.service.ts) — skip the refresh when that date falls outside
  // this session's visible range. Fails open (refreshes anyway) when
  // scheduled_at is missing, so an old-backend/new-frontend rollout mismatch
  // never under-refreshes.
  useEffect(() => {
    if (skip) return;
    const socket = getSocket();
    const isEventInVisibleRange = (scheduled_at?: string): boolean => {
      if (!scheduled_at) return true; // fail open — no date info to check against
      const { startDate, endDate } = getViewRange(viewMode, currentDate);
      const eventDate = toLocalDateStr(scheduled_at);
      return eventDate >= startDate && eventDate <= endDate;
    };
    const onNotification = (notification: { type?: string; scheduled_at?: string }) => {
      if (notification?.type === "appointment" && isEventInVisibleRange(notification.scheduled_at)) refresh();
    };
    // payments.service.ts emits this directly (no bell-notification DB row,
    // unlike "notification" above — a payment happens far more often than a
    // create/cancel) so a Paid/Partial status change on another device also
    // live-updates this calendar instead of needing a manual refresh.
    const onPaymentUpdated = (payload?: { scheduled_at?: string }) => {
      if (isEventInVisibleRange(payload?.scheduled_at)) refresh();
    };
    socket.on("notification", onNotification);
    socket.on("payment_updated", onPaymentUpdated);
    return () => {
      socket.off("notification", onNotification);
      socket.off("payment_updated", onPaymentUpdated);
    };
  }, [skip, refresh, viewMode, currentDate]);

  return { refresh, loading };
}
