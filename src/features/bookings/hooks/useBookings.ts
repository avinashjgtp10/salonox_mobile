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

// Module-scoped (not per-hook-instance) so the "already fetched" bookkeeping
// survives Scheduler.tsx unmounting/remounting on navigation away and back —
// previously these were useRefs inside the hook, so every remount forgot
// everything and re-ran the full sequential paginated fetch from scratch
// even though Redux already had the data, which is what made navigating
// away from Calendar and back take ~1 minute on a busy week/month.
//
// `cachedRawBookings` must be module-scoped too, alongside the two Sets
// above, not just per-mount useState — setBookings() below REPLACES Redux's
// whole bookings array rather than merging it. If only the two Sets were
// module-scoped, a fresh mount's local accumulator would start at [], so
// fetching a brand-new (never-cached) range after a remount would dispatch
// ONLY that range's items and silently wipe out every other range's
// bookings that Redux still claimed (via the Sets) to have already fetched
// — the calendar would then show blank for any previously-visited date
// until a full page reload. Keeping the accumulated raw items themselves at
// module scope means a fresh mount always re-dispatches everything fetched
// so far this session, so Redux and the "already fetched" bookkeeping never
// drift apart.
const fetchedRangesRef: { current: Set<string> } = { current: new Set() };
const pendingRangesRef: { current: Set<string> } = { current: new Set() };
let cachedRawBookings: any[] = [];

// A save/payment/cancel can trigger TWO independent refreshes of the same
// visible range almost simultaneously: the caller's own explicit onRefresh()
// chain (Scheduler.tsx's handleRefresh) AND the backend's socket event for
// that same mutation (useBookings's own "notification"/"payment_updated"
// listener below, which calls refresh()). Both used to run their full
// paginated GET /appointments fetch independently, so every save/payment
// showed up as two identical requests in the Network tab. Whichever fires
// first claims the range for this short window; the other is a no-op — the
// data it would have fetched is already in flight or just landed.
const recentRefreshRanges = new Map<string, number>();
const REFRESH_DEDUPE_MS = 2000;

/**
 * True (and claims the range) the first time it's called for a given range
 * within REFRESH_DEDUPE_MS; false on any call for that same range within the
 * window. Used to collapse the two independent same-range refreshes above
 * into one actual network request without touching either caller's own
 * merge/patch logic.
 */
export function claimRefresh(startDate: string, endDate: string): boolean {
  const key = `${startDate}|${endDate}`;
  const now = Date.now();
  const last = recentRefreshRanges.get(key);
  if (last !== undefined && now - last < REFRESH_DEDUPE_MS) return false;
  recentRefreshRanges.set(key, now);
  return true;
}

export function useBookings(skip = false) {
  const dispatch     = useAppDispatch();
  const currentDate  = useAppSelector(selectCurrentDate);
  const viewMode     = useAppSelector(selectViewMode);
  const apiStaff     = useAppSelector((s: any) => s.scheduler?.staffList || []);
  const apiClients   = useAppSelector(selectClientsList);
  const servicesList = useAppSelector(selectServicesList);

  // Raw API items accumulated across all fetched ranges — seeded from the
  // module-scoped cache so a remount immediately re-syncs Redux with
  // everything already fetched this session (see comment above).
  const [rawApiBookings, setRawApiBookings] = useState<any[]>(() => cachedRawBookings);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
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
      // Merge against the module-scoped accumulator (not this instance's
      // local `prev` state) so the result is correct even if this fetch was
      // started by a since-unmounted instance, or a fresher mount already
      // holds newer accumulated data than this instance's own closure.
      const filtered = cachedRawBookings.filter((p: any) => {
        const pDate = p.scheduled_at
          ? toLocalDateStr(p.scheduled_at)
          : String(p.date || "").slice(0, 10);
        return pDate < startDate || pDate > endDate;
      });
      cachedRawBookings = [...filtered, ...allItems];
      // The component that started this fetch may have unmounted (nav away)
      // before the sequential page loop above finished — the module-scoped
      // cache above is updated regardless (so the NEXT mount picks it up),
      // but skip touching this instance's own state to avoid a "set state
      // on unmounted component" warning.
      if (isMountedRef.current) {
        setRawApiBookings(cachedRawBookings);
      }
    } finally {
      pendingRangesRef.current.delete(rangeKey);
      if (!opts?.silent && isMountedRef.current) setLoading(false);
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

  // ── Refetch on every (re)mount — i.e. every navigation back to the Calendar
  // The range bookkeeping above is deliberately module-scoped so returning to
  // the Calendar repaints instantly from cache instead of re-running the whole
  // paginated fetch. The cost of that is staleness: the effect above sees the
  // range in `fetchedRangesRef` and fetches NOTHING, so anything that changed
  // while the user was on Clients (or any other page) stayed invisible until a
  // manual browser refresh.
  //
  // The socket listener below doesn't cover this — it only runs while the
  // Calendar is mounted, so changes made while it was unmounted are missed
  // entirely, as are changes made from the very page being navigated from.
  //
  // Silent on purpose: the cached rows are already painted, so this updates
  // them in place rather than blanking back to a skeleton. Skipped when the
  // range was never fetched (first-ever load, hard reload) because the effect
  // above is already fetching it — refreshing here too would just double the
  // request.
  const didMountRefreshRef = useRef(false);
  useEffect(() => {
    if (skip || didMountRefreshRef.current) return;
    didMountRefreshRef.current = true;
    const { startDate, endDate } = getViewRange(viewMode, currentDate);
    const visibleKey = `${startDate}|${endDate}`;

    // Every OTHER range cached earlier this session is stale for the same
    // reason the visible one was: it was fetched before the user navigated
    // away. Dropping their keys doesn't refetch anything now — it just means
    // the fetch effect above will refetch each one lazily, the first time the
    // user actually navigates back to that date. Redux still holds their rows,
    // so the grid keeps showing the old data while the refetch lands rather
    // than going blank. `cachedRawBookings` is deliberately left intact: it's
    // what keeps Redux and this bookkeeping from drifting apart (see the
    // module-scope comment at the top of this file).
    for (const key of Array.from(fetchedRangesRef.current)) {
      if (key !== visibleKey) fetchedRangesRef.current.delete(key);
    }

    if (!fetchedRangesRef.current.has(visibleKey)) return;
    refresh();
    // Mount-once (once `skip` clears), NOT on every date/view change — those
    // are already handled by the fetch effect above, and re-running here would
    // turn each date arrow-click into two requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

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
    // claimRefresh de-dupes against Scheduler.tsx's own handleRefresh: a save/
    // payment made in THIS tab triggers both that direct onRefresh() call and
    // this same socket event for the mutation it just made, so without this
    // guard the exact same GET /appointments range was fetched twice back to
    // back. Whichever of the two fires first wins; a genuine live update from
    // another device/tab isn't affected since nothing else claims its range.
    const onNotification = (notification: { type?: string; scheduled_at?: string }) => {
      if (notification?.type !== "appointment" || !isEventInVisibleRange(notification.scheduled_at)) return;
      const { startDate, endDate } = getViewRange(viewMode, currentDate);
      if (claimRefresh(startDate, endDate)) refresh();
    };
    // payments.service.ts emits this directly (no bell-notification DB row,
    // unlike "notification" above — a payment happens far more often than a
    // create/cancel) so a Paid/Partial status change on another device also
    // live-updates this calendar instead of needing a manual refresh.
    const onPaymentUpdated = (payload?: { scheduled_at?: string }) => {
      if (!isEventInVisibleRange(payload?.scheduled_at)) return;
      const { startDate, endDate } = getViewRange(viewMode, currentDate);
      if (claimRefresh(startDate, endDate)) refresh();
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
