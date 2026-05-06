import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api/axios";
import shiftApi from "./shiftApi";
import { calcTotalHours, getSundayOf, toDateKey } from "../../components/staff-schedule/utils";

export const fetchDailyShifts = createAsyncThunk(
  "shift/fetchDailyShifts",
  async (weekStartDate: string, { rejectWithValue }) => {
    console.log("[fetchDailyShifts] Starting for week:", weekStartDate);
    try {
      // 1. Fetch all staff members
      const staffRes = await api.get("/api/v1/staff");
      
      const rawStaff = staffRes.data?.data?.items || staffRes.data?.data || [];
      if (!Array.isArray(rawStaff)) {
        console.error("[fetchDailyShifts] Invalid staff list structure:", staffRes.data);
        return { staff: [], shifts: {} };
      }

      // Map backend staff to the UI's StaffMember type
      const staffList = rawStaff.map((s: any) => ({
        id: s.id,
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.email,
        initials: `${(s.first_name?.[0] || "").toUpperCase()}${(s.last_name?.[0] || "").toUpperCase()}` || "?",
        avatarColor: s.calendar_color || "#3b82f6", // fallback to blue
        email: s.email,
      }));

      console.log(`[fetchDailyShifts] Found and mapped ${staffList.length} staff members.`);

      // 2. Fetch schedules for each staff member in parallel
      const staffSchedules = await Promise.all(
        staffList.map(async (s: any) => {
          try {
            const res = await api.get(`/api/v1/staff/${s.id}/scheduled`);
            return { staffId: s.id, schedules: res.data.data || res.data };
          } catch (err) {
            console.warn(`[fetchDailyShifts] No schedules for staff ${s.id}`);
            return { staffId: s.id, schedules: [] };
          }
        })
      );

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
          const daySched = schedules.find((sch: any) => sch.day_of_week === dayOfWeek);

          if (daySched) {
            shiftsMap[staffId][dateStr] = {
              staffId,
              date: dateStr,
              startTime: daySched.start_time || "",
              endTime: daySched.end_time || "",
              totalHours: (daySched.start_time && daySched.end_time) ? calcTotalHours(daySched.start_time, daySched.end_time) : "",
              type: daySched.is_available ? "working" : "dayoff",
              isAvailable: daySched.is_available,
            };
          }
        });
      });

      console.log("[fetchDailyShifts] Sync complete!");
      return {
        staff: staffList,
        shifts: shiftsMap,
      };
    } catch (err: any) {
      console.error("[fetchDailyShifts] Request failed:", err);
      return rejectWithValue(err.response?.data?.message || "Server connection failed");
    }
  }
);

export const applyCopySchedule = createAsyncThunk(
  "shift/applyCopySchedule",
  async (
    { staffId, fromDate, toDates, type }: { staffId: string; fromDate: string; toDates: string[]; type: "day" | "week" },
    { dispatch, getState }
  ) => {
    // 1. Local update is handled by shiftSlice.extraReducers (applyCopySchedule.pending)

    // 2. Get updated shifts from state
    const state = getState() as any;
    const updatedShifts = state.shift.shifts[staffId] || {};

    // 3. Prepare items for backend upsert
    // 3. Prepare items for backend upsert: Send 7 entries (one for each day_of_week)
    // We'll derive the 7-day pattern from the week containing the first target date
    const targetSunday = getSundayOf(new Date(toDates[0] + "T12:00:00"));
    const items = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(targetSunday);
      d.setDate(targetSunday.getDate() + i);
      const dateKey = toDateKey(d);
      const s = updatedShifts[dateKey] || { startTime: "", endTime: "", isAvailable: false, type: "dayoff" };
      
      return {
        day_of_week: d.getDay(),
        start_time: s.startTime,
        end_time: s.endTime,
        is_available: !!s.isAvailable,
        notes: s.type === "blocked" ? "Blocked" : ""
      };
    });

    // 4. Save to backend
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
