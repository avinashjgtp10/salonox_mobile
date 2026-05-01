import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ShiftMap, StaffMember, ShiftEntry } from "../components/staff-schedule/types";
import { SEED_STAFF, buildSeedShifts, getSundayOf, calcTotalHours } from "../components/staff-schedule/utils";
import {
  fetchDailyShifts,
  addTimeOff,
  addDayOff,
  addBlockedTime,
  saveStaffSchedule,
} from "../middleware/shift/shiftThunk";

interface ShiftState {
  staffMembers: StaffMember[];
  shifts: ShiftMap;
  loading: boolean;
  error: string | null;
  apiConnected: boolean;
}

const initialSunday = getSundayOf(new Date());

const initialState: ShiftState = {
  staffMembers: SEED_STAFF,
  shifts: buildSeedShifts(initialSunday),
  loading: false,
  error: null,
  apiConnected: false,
};

const shiftSlice = createSlice({
  name: "shift",
  initialState,
  reducers: {
    setShiftEntry(state, { payload }: PayloadAction<ShiftEntry>) {
      if (!state.shifts[payload.staffId]) state.shifts[payload.staffId] = {};
      state.shifts[payload.staffId][payload.date] = payload;
    },
    removeShiftEntry(state, { payload }: PayloadAction<{ staffId: string; date: string }>) {
      delete state.shifts[payload.staffId]?.[payload.date];
    },
    setDayOff(state, { payload }: PayloadAction<{ staffId: string; date: string }>) {
      if (!state.shifts[payload.staffId]) state.shifts[payload.staffId] = {};
      state.shifts[payload.staffId][payload.date] = {
        staffId: payload.staffId,
        date: payload.date,
        startTime: "",
        endTime: "",
        totalHours: "",
        type: "dayoff",
        isAvailable: false,
      };
    },
    setBlocked(state, { payload }: PayloadAction<{ staffId: string; date: string; startTime: string; endTime: string }>) {
      if (!state.shifts[payload.staffId]) state.shifts[payload.staffId] = {};
      state.shifts[payload.staffId][payload.date] = {
        staffId: payload.staffId,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        totalHours: calcTotalHours(payload.startTime, payload.endTime),
        type: "blocked",
        isAvailable: false,
      };
    },
    updateAvailability(
      state,
      { payload }: PayloadAction<{ staffId: string; date: string; isAvailable: boolean; startTime?: string; endTime?: string }>
    ) {
      const entry = state.shifts[payload.staffId]?.[payload.date];
      if (!payload.isAvailable) {
        // Mark as day off
        if (!state.shifts[payload.staffId]) state.shifts[payload.staffId] = {};
        state.shifts[payload.staffId][payload.date] = {
          staffId: payload.staffId, date: payload.date,
          startTime: "", endTime: "", totalHours: "",
          type: "dayoff", isAvailable: false,
        };
      } else if (payload.startTime && payload.endTime) {
        const newEntry: ShiftEntry = {
          ...(entry ?? {}),
          staffId: payload.staffId,
          date: payload.date,
          startTime: payload.startTime,
          endTime: payload.endTime,
          totalHours: calcTotalHours(payload.startTime, payload.endTime),
          type: "working",
          isAvailable: true,
        };
        if (!state.shifts[payload.staffId]) state.shifts[payload.staffId] = {};
        state.shifts[payload.staffId][payload.date] = newEntry;
      }
    },
    copyStaffWeek(
      state,
      { payload }: PayloadAction<{ staffId: string; fromDate: string; toDates: string[]; type: "day" | "week" }>
    ) {
      if (!state.shifts[payload.staffId]) state.shifts[payload.staffId] = {};
      
      if (payload.type === "day") {
        const sourceShift = state.shifts[payload.staffId]?.[payload.fromDate];
        if (!sourceShift) return;
        payload.toDates.forEach((date) => {
          state.shifts[payload.staffId][date] = { ...sourceShift, date };
        });
      } else {
        // Week Mode: Copy 7 days from the week containing fromDate to each week containing a toDate
        const sourceSunday = getSundayOf(new Date(payload.fromDate + "T12:00:00"));
        const sourceDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(sourceSunday);
          d.setDate(d.getDate() + i);
          return d.toISOString().split("T")[0];
        });

        const weekShifts = sourceDays.map(d => state.shifts[payload.staffId]?.[d]).filter(Boolean);
        if (weekShifts.length === 0) return;

        payload.toDates.forEach((targetDate) => {
          const targetSunday = getSundayOf(new Date(targetDate + "T12:00:00"));
          sourceDays.forEach((srcDate, i) => {
            const shift = state.shifts[payload.staffId]?.[srcDate];
            if (shift) {
              const targetDay = new Date(targetSunday);
              targetDay.setDate(targetDay.getDate() + i);
              const targetDayStr = targetDay.toISOString().split("T")[0];
              state.shifts[payload.staffId][targetDayStr] = { ...shift, date: targetDayStr };
            }
          });
        });
      }
    },
    refreshSeedForWeek(state, { payload }: PayloadAction<string>) {
      // payload = sunday ISO date key
      const sunday = new Date(payload + "T12:00:00");
      const newShifts = buildSeedShifts(sunday);
      // Merge without overriding user edits — only fill missing
      Object.entries(newShifts).forEach(([staffId, dates]) => {
        if (!state.shifts[staffId]) state.shifts[staffId] = {};
        Object.entries(dates).forEach(([date, entry]) => {
          if (!state.shifts[staffId][date]) {
            state.shifts[staffId][date] = entry;
          }
        });
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailyShifts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDailyShifts.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.apiConnected = true;
        if (payload?.staff) state.staffMembers = payload.staff;
        if (payload?.shifts) state.shifts = payload.shifts;
      })
      .addCase(fetchDailyShifts.rejected, (state) => {
        state.loading = false;
        state.apiConnected = false;
        // Keep seed data on API failure
      })
      .addCase(addTimeOff.fulfilled, (state, { payload }) => {
        if (payload?.staffId && payload?.date) {
          if (!state.shifts[payload.staffId]) state.shifts[payload.staffId] = {};
          state.shifts[payload.staffId][payload.date] = {
            staffId: payload.staffId, date: payload.date,
            startTime: "", endTime: "", totalHours: "",
            type: "dayoff", isAvailable: false,
          };
        }
      })
      .addCase(addDayOff.fulfilled, (state, { payload }) => {
        if (payload?.staffId && payload?.date) {
          if (!state.shifts[payload.staffId]) state.shifts[payload.staffId] = {};
          state.shifts[payload.staffId][payload.date] = {
            staffId: payload.staffId, date: payload.date,
            startTime: "", endTime: "", totalHours: "",
            type: "dayoff", isAvailable: false,
          };
        }
      })
      .addCase(addBlockedTime.fulfilled, (state, { payload }) => {
        if (payload?.staffId && payload?.date) {
          if (!state.shifts[payload.staffId]) state.shifts[payload.staffId] = {};
          state.shifts[payload.staffId][payload.date] = {
            staffId: payload.staffId, date: payload.date,
            startTime: payload.startTime || "", endTime: payload.endTime || "",
            totalHours: payload.startTime && payload.endTime ? calcTotalHours(payload.startTime, payload.endTime) : "",
            type: "blocked", isAvailable: false,
          };
        }
      })
      .addCase(saveStaffSchedule.pending, (state) => { state.loading = true; })
      .addCase(saveStaffSchedule.fulfilled, (state) => { state.loading = false; })
      .addCase(saveStaffSchedule.rejected, (state, { payload }) => { 
        state.loading = false; 
        state.error = payload as string; 
      });
  },
});

export const {
  setShiftEntry, removeShiftEntry, setDayOff, setBlocked,
  updateAvailability, copyStaffWeek, refreshSeedForWeek,
} = shiftSlice.actions;

export default shiftSlice.reducer;
