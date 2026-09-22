import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { setStaffList, setStaffSchedules, setBlockedTimes } from "../../../store/schedulerSlice";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import { scheduleDateToYMD } from "../../../components/staff-schedule/utils";
import type { Staff } from "../types";

const STAFF_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16",
];

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

export interface StaffDaySchedule {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

/**
 * Fetches the staff list once per salon and maps it to the frontend Staff
 * shape. Each staff record now carries its own `schedule` array (embedded
 * server-side via a LEFT JOIN LATERAL against staff_schedules — see
 * staffRepository.list on the backend), so this no longer needs a separate
 * GET /staff/:id/scheduled call per staff member: what used to be an N+1
 * fetch is now derived synchronously from data already on hand.
 */
export function useStaffSchedule(salonId?: string | null) {
  const dispatch        = useAppDispatch();
  const initialized     = useRef<string | null>(null);
  const apiStaff        = useAppSelector((s: any) => s.staff?.staff ?? s.staff?.items ?? []);
  const scheduleVersion = useAppSelector((s: any) => s.scheduler?.scheduleVersion ?? 0);
  const staffFetching   = useAppSelector((s: any) => s.staff?.loading?.fetchAll ?? false);
  const staffList       = useAppSelector((s: any) => s.scheduler?.staffList ?? []);

  // ── Fetch staff list + extract blocked times from staff API response ─────
  // The `initialized` ref is scoped to this hook INSTANCE, so navigating
  // Calendar → Quick Sale (two separately-mounted components, each calling
  // this hook) re-fetches staff even though the Calendar just loaded it
  // moments earlier — supplemented with a Redux-state check so it's treated
  // as session-cached instead.
  useEffect(() => {
    if (!salonId || initialized.current === salonId || staffList.length > 0) return;
    initialized.current = salonId;
    (dispatch(fetchStaffThunk()) as any).then((action: any) => {
      if (fetchStaffThunk.fulfilled.match(action)) {
        const staffItems: any[] = action.payload ?? [];
        const blockedTimes = staffItems.flatMap((s: any) =>
          (s.blocked_times ?? []).map((bt: any) => ({
            id: String(bt.id),
            staffId: String(bt.staff_id ?? s.id ?? ""),
            date: bt.date ?? "",
            startTime: bt.start_time ?? "",
            endTime: bt.end_time ?? "",
            reason: bt.reason ?? "",
          }))
        );
        dispatch(setBlockedTimes(blockedTimes));
      }
    }).catch(() => { /* non-critical */ });
  }, [dispatch, salonId]);

  // bumpScheduleVersion() (e.g. after Copy Schedule) used to just clear the
  // separately-fetched schedule cache to force a re-fetch. Schedule data now
  // rides along with the staff list itself, so invalidating means re-fetching
  // that list instead. Skipped on the initial mount (version 0) — the effect
  // above already covers the first load.
  useEffect(() => {
    if (scheduleVersion === 0) return;
    dispatch(fetchStaffThunk());
  }, [scheduleVersion, dispatch]);

  // ── Map raw API staff → typed Staff[] ────────────────────────────────────
  useEffect(() => {
    if (!apiStaff.length) { dispatch(setStaffList([])); return; }

    const mapped: Staff[] = apiStaff
      .filter((s: any) => s.is_active !== false && s.allow_calendar_bookings !== false)
      // Reorder Staff popup's saved sequence — scheduler_order is NULL for
      // anyone never explicitly sequenced, who then keeps their existing
      // (API default) position at the end via Array.sort's stability rather
      // than jumping to the front.
      .slice()
      .sort((a: any, b: any) => {
        const ao = a.scheduler_order, bo = b.scheduler_order;
        if (ao == null && bo == null) return 0;
        if (ao == null) return 1;
        if (bo == null) return -1;
        return ao - bo;
      })
      .map((s: any, i: number) => {
        const fromParts = `${s.first_name || ""} ${s.last_name || ""}`.trim();
        const rawFull   = s.fullName || s.full_name || "";
        const spacedFull = rawFull.includes(" ")
          ? rawFull
          : rawFull.replace(/([a-z])([A-Z])/g, "$1 $2");
        const name = fromParts || spacedFull || "";
        return {
          id: String(s.id),
          name,
          initials: getInitials(name),
          color: STAFF_COLORS[i % STAFF_COLORS.length],
          avatar: s.avatar_url || s.avatar || s.profile_photo || undefined,
        };
      });

    dispatch(setStaffList(mapped));
  }, [apiStaff, dispatch]);

  // ── Derive schedule lookup from the embedded schedule on each staff record ─
  useEffect(() => {
    if (!apiStaff.length) return;

    const schedules: Record<string, Record<string, StaffDaySchedule>> = {};

    apiStaff.forEach((s: any) => {
      const staffId = String(s.id);
      schedules[staffId] = {};
      const scheduleRows = Array.isArray(s.schedule) ? s.schedule : [];

      scheduleRows.forEach((sch: any) => {
        if (!sch.is_available) return;
        // Every shift saved from the Scheduled Shifts page carries a concrete
        // date, not just a day-of-week — keying on day-of-week alone collapsed
        // every week's shift for that weekday into a single, last-write-wins
        // entry, so the calendar showed the same hours on every occurrence of
        // that weekday instead of the one actually scheduled. Date-specific
        // rows are keyed by their real date; only a genuinely recurring row
        // (no date at all) falls back to the day-of-week key.
        const dow = Number(sch.day_of_week);
        const ymd = scheduleDateToYMD(sch.date);
        const key = ymd || (!isNaN(dow) && dow >= 0 && dow <= 6 ? `dow-${dow}` : null);
        if (!key) return;
        schedules[staffId][key] = {
          startTime: sch.start_time || "",
          endTime: sch.end_time || "",
          isAvailable: true,
        };
      });
    });

    dispatch(setStaffSchedules(schedules));
  }, [apiStaff, dispatch]);

  // staffReady = usable staff data exists AND nothing's in flight. Checking
  // ONLY `initialized.current === salonId` broke on remount: when staffList
  // is already in Redux, the fetch effect above deliberately skips
  // dispatching (see its `staffList.length > 0` guard) and so never sets
  // `initialized` for THIS mount instance — staffReady would then stay
  // false forever and the calendar would be stuck on its skeleton even
  // though the data was already there. Falling back to `staffList.length`
  // treats already-cached data as ready too.
  const staffReady = (initialized.current === salonId || staffList.length > 0) && !staffFetching;
  return { staffReady, hasStaff: staffList.length > 0 };
}
