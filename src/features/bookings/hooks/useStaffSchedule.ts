import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { setStaffList, setStaffSchedules } from "../../../store/schedulerSlice";
import { fetchStaffThunk } from "../../../middleware/staff/staff.thunk";
import api from "../../../services/api/axios";
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
 * Fetches the staff list once per salon, maps to the frontend Staff shape,
 * and fetches each staff member's weekly schedule pattern.
 */
export function useStaffSchedule(salonId?: string | null) {
  const dispatch        = useAppDispatch();
  const initialized     = useRef<string | null>(null);
  const apiStaff        = useAppSelector((s: any) => s.staff?.staff ?? s.staff?.items ?? []);
  const staffSchedules  = useAppSelector((s: any) => s.scheduler?.staffSchedules ?? {});
  const scheduleVersion = useAppSelector((s: any) => s.scheduler?.scheduleVersion ?? 0);
  const staffFetching   = useAppSelector((s: any) => s.staff?.loading?.fetchAll ?? false);
  const staffList       = useAppSelector((s: any) => s.scheduler?.staffList ?? []);

  // ── Fetch staff list once per salonId ─────────────────────────────────────
  useEffect(() => {
    if (!salonId || initialized.current === salonId) return;
    initialized.current = salonId;
    dispatch(fetchStaffThunk());
  }, [dispatch, salonId]);

  // ── Map raw API staff → typed Staff[] ────────────────────────────────────
  useEffect(() => {
    if (!apiStaff.length) { dispatch(setStaffList([])); return; }

    const mapped: Staff[] = apiStaff
      .filter((s: any) => s.is_active !== false)
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
          avatar: s.avatar || s.profile_photo || undefined,
        };
      });

    dispatch(setStaffList(mapped));
  }, [apiStaff, dispatch]);

  // ── Fetch weekly schedule patterns (once per scheduleVersion) ─────────────
  // staffSchedules persists in Redux across remounts. bumpScheduleVersion()
  // clears it in the reducer, causing this effect to re-fetch.
  useEffect(() => {
    if (!apiStaff.length) return;
    if (Object.keys(staffSchedules).length > 0) return;

    Promise.all(
      apiStaff.map((s: any) =>
        api
          .get(`/api/v1/staff/${s.id}/scheduled`)
          .then((res: any) => ({
            staffId: String(s.id),
            data: res.data?.data || res.data || [],
            failed: false,
          }))
          .catch(() => ({ staffId: String(s.id), data: [], failed: true }))
      )
    ).then((results) => {
      const schedules: Record<string, Record<number, StaffDaySchedule>> = { ...staffSchedules };

      results.forEach(({ staffId, data, failed }) => {
        if (failed) return; // keep cached schedule on failure
        schedules[staffId] = {};
        if (Array.isArray(data)) {
          data.forEach((sch: any) => {
            const dow = Number(sch.day_of_week);
            if (!isNaN(dow) && dow >= 0 && dow <= 6 && sch.is_available) {
              schedules[staffId][dow] = {
                startTime: sch.start_time || "",
                endTime: sch.end_time || "",
                isAvailable: true,
              };
            }
          });
        }
      });

      dispatch(setStaffSchedules(schedules));
    }).catch(() => { /* non-critical */ });
  }, [apiStaff, scheduleVersion, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // staffReady = fetch was dispatched for this salon AND is no longer loading
  const staffReady = initialized.current === salonId && !staffFetching;
  return { staffReady, hasStaff: staffList.length > 0 };
}
