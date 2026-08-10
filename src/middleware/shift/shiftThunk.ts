import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import shiftApi from "./shiftApi";
import { calcTotalHours, getSundayOf, toDateKey, convertTo12h, convertTo24h, scheduleDateToYMD } from "../../components/staff-schedule/utils";

const COLOR_KEY_TO_HEX: Record<string, string> = {
  light_blue: "#7dd3fc", blue: "#3b82f6", dark_blue: "#1d4ed8",
  purple: "#a855f7", violet: "#7c3aed", pink: "#f472b6",
  hot_pink: "#ec4899", rose: "#f43f5e", orange: "#f97316",
  yellow: "#eab308", lime: "#84cc16", green: "#22c55e",
  teal: "#14b8a6", cyan: "#06b6d4",
};

export const fetchDailyShifts = createAsyncThunk(
  "shift/fetchDailyShifts",
  async (weekStartDate: string, { rejectWithValue, getState }) => {
    try {
      // Use staff already in Redux store to avoid a duplicate /api/v1/staff call
      // when the staff list page has already fetched them.
      const state = getState() as any;
      const cachedStaff: any[] = state.staff?.items ?? [];

      let rawStaff: any[];
      if (cachedStaff.length > 0) {
        rawStaff = cachedStaff;
      } else {
        const staffRes = await api.get("/api/v1/staff");
        rawStaff = staffRes.data?.data?.items || staffRes.data?.data || [];
      }

      if (!Array.isArray(rawStaff)) {
        return { staff: [], shifts: {} };
      }

      // Inactive staff still keep their configured schedule (see the schedule
      // map below) — they must not be filtered out here, otherwise their
      // working hours silently disappear from the shift grid.
      const staffList = rawStaff.map((s: any) => ({
        id: s.id,
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email,
        initials: `${(s.first_name?.[0] || "").toUpperCase()}${(s.last_name?.[0] || "").toUpperCase()}` || "?",
        avatarColor: COLOR_KEY_TO_HEX[s.calendar_color] ?? s.calendar_color ?? "#3b82f6",
        email: s.email,
        isActive: s.is_active !== false,
      }));

      // 2. Each staff record already carries its own `schedule` array,
      // embedded server-side via a LEFT JOIN LATERAL against staff_schedules
      // (see staffRepository.list on the backend) — this used to be a
      // separate GET /staff/:id/scheduled call per staff member (an N+1
      // fetch); now it's just read off the staff record already on hand.
      const staffSchedules = rawStaff.map((s: any) => ({
        staffId: s.id,
        schedules: Array.isArray(s.schedule) ? s.schedule : [],
      }));

      // 3. Map weekly schedules to specific dates
      const sunday = new Date(weekStartDate + "T12:00:00");
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        return d.toISOString().split("T")[0];
      });

      const shiftsMap: any = {};
      staffSchedules.forEach(({ staffId, schedules }) => {
        shiftsMap[staffId] = {};
        if (!Array.isArray(schedules)) return;
        
        weekDates.forEach((dateStr) => {
          const dateObj = new Date(dateStr + "T12:00:00");
          const dayOfWeek = dateObj.getDay();
          // Prefer an exact date-specific record; fall back to a recurring
          // record (no date field) only when no date-specific entry exists.
          // `sch.date` normally arrives as a JS Date object (node-postgres
          // parses DATE columns that way, not as a string) — scheduleDateToYMD
          // handles both shapes so this match doesn't silently fail.
          const daySched =
            schedules.find((sch: any) => scheduleDateToYMD(sch.date) === dateStr) ??
            schedules.find((sch: any) => !scheduleDateToYMD(sch.date) && sch.day_of_week === dayOfWeek);

          if (daySched) {
            const start12 = daySched.start_time ? convertTo12h(daySched.start_time) : "";
            const end12   = daySched.end_time   ? convertTo12h(daySched.end_time)   : "";
            const breaks = Array.isArray(daySched.breaks)
              ? daySched.breaks.map((b: any) => ({
                  start: b.start_time ? convertTo12h(b.start_time) : "",
                  end:   b.end_time   ? convertTo12h(b.end_time)   : "",
                }))
              : [];
            shiftsMap[staffId][dateStr] = {
              staffId,
              date: dateStr,
              startTime: start12,
              endTime:   end12,
              totalHours: (start12 && end12) ? calcTotalHours(start12, end12) : "",
              type: daySched.is_available ? "working" : (daySched.notes === "Blocked" ? "blocked" : "dayoff"),
              isAvailable: daySched.is_available,
              breaks,
            };
          }
        });
      });

      return {
        staff: staffList,
        shifts: shiftsMap,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Server connection failed");
    }
  }
);

export const applyCopySchedule = createAsyncThunk(
  "shift/applyCopySchedule",
  async (
    // NOTE: fromDate and type were previously not destructured here — both are now
    // extracted so the thunk can read the source shift and handle day vs week mode.
    { staffId, fromDate, toDates, type }: { staffId: string; fromDate: string; toDates: string[]; type: "day" | "week" },
    { getState }
  ) => {
    // The applyCopySchedule.pending reducer already applied the local UI update.
    // fromDate's entry is never mutated by that reducer, so getState() here gives
    // us the correct original source shift to copy from.
    const state = getState() as any;
    const allShifts = state.shift.shifts[staffId] || {};

    const items: any[] = [];

    if (type === "day") {
      // ── Single-day copy ──────────────────────────────────────────────────────
      // Build exactly one backend item per explicitly selected date.
      // Never loop the whole week — toDates is the complete set of target dates.
      const sourceShift = allShifts[fromDate];
      toDates.forEach((date) => {
        const dayOfWeek = new Date(date + "T12:00:00").getDay();
        if (!sourceShift || !sourceShift.isAvailable) {
          items.push({ date, day_of_week: dayOfWeek, is_available: false, start_time: "", end_time: "", notes: "" });
        } else {
          items.push({
            date,
            day_of_week: dayOfWeek,
            is_available: true,
            start_time: sourceShift.startTime ? convertTo24h(sourceShift.startTime) : "",
            end_time: sourceShift.endTime ? convertTo24h(sourceShift.endTime) : "",
            notes: sourceShift.type === "blocked" ? "Blocked" : "",
          });
        }
      });
    } else {
      // ── Full-week copy ───────────────────────────────────────────────────────
      // Copy the source date's schedule to all 7 days of each target week.
      const sourceShift = allShifts[fromDate];

      const targetSundays = new Set<string>();
      toDates.forEach((d) => {
        const sun = getSundayOf(new Date(d + "T12:00:00"));
        targetSundays.add(toDateKey(sun));
      });

      targetSundays.forEach((sunStr) => {
        const targetSunday = new Date(sunStr + "T12:00:00");
        for (let i = 0; i < 7; i++) {
          const targetDay = new Date(targetSunday);
          targetDay.setDate(targetSunday.getDate() + i);
          const targetDate = toDateKey(targetDay);
          const dayOfWeek = targetDay.getDay();

          if (!sourceShift || !sourceShift.isAvailable) {
            items.push({ date: targetDate, day_of_week: dayOfWeek, is_available: false, start_time: "", end_time: "", notes: "" });
          } else {
            items.push({
              date: targetDate,
              day_of_week: dayOfWeek,
              is_available: true,
              start_time: sourceShift.startTime ? convertTo24h(sourceShift.startTime) : "",
              end_time: sourceShift.endTime ? convertTo24h(sourceShift.endTime) : "",
              notes: sourceShift.type === "blocked" ? "Blocked" : "",
            });
          }
        }
      });
    }

    try {
      await shiftApi.upsertStaffSchedules(staffId, items);
      return { staffId, success: true };
    } catch (err: any) {
      console.error("[applyCopySchedule] Failed to persist:", err);
      throw err;
    }
  }
);

export const saveStaffSchedule = createAsyncThunk(
  "shift/saveStaffSchedule",
  async ({ staffId, items }: { staffId: string; items: any[] }, { rejectWithValue }) => {
    try {
      const res = await shiftApi.upsertStaffSchedules(staffId, items);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to save schedule");
    }
  }
);

export const saveSingleShiftThunk = createAsyncThunk(
  "shift/saveSingleShift",
  async (payload: { staff_id: string; date: string; start_time: string; end_time: string; breaks?: { start_time: string; end_time: string }[] }, { rejectWithValue }) => {
    try {
      const res = await shiftApi.saveSingleShift(payload);
      return { ...res.data, payload }; // Return payload so reducer can use it if needed
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to save shift");
    }
  }
);

export const deleteSingleShiftThunk = createAsyncThunk(
  "shift/deleteSingleShift",
  async (payload: { staff_id: string; date: string }, { rejectWithValue }) => {
    try {
      const res = await shiftApi.deleteSingleShift(payload);
      return { ...res.data, payload };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete shift");
    }
  }
);

export const addTimeOff = createAsyncThunk(
  "shift/addTimeOff",
  async (data: { staffId: string; date: string; reason?: string }, { rejectWithValue }) => {
    try {
      const res = await shiftApi.addTimeOff(data);
      return { ...res.data, staffId: data.staffId, date: data.date, type: "dayoff" };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to add time off");
    }
  }
);

export const addDayOff = createAsyncThunk(
  "shift/addDayOff",
  async (data: { staffId: string; date: string }, { rejectWithValue }) => {
    try {
      const res = await shiftApi.addDayOff(data);
      return { ...res.data, staffId: data.staffId, date: data.date, type: "dayoff" };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to add day off");
    }
  }
);

export const addBlockedTime = createAsyncThunk(
  "shift/addBlockedTime",
  async (data: { staffId: string; date: string; startTime?: string; endTime?: string }, { rejectWithValue }) => {
    try {
      const res = await shiftApi.addBlockedTime(data);
      return { ...res.data, staffId: data.staffId, date: data.date, type: "blocked" };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || "Failed to add blocked time");
    }
  }
);
