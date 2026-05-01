import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  updateAvailability,
  setDayOff,
  setBlocked,
  copyStaffWeek,
  refreshSeedForWeek,
} from "../../../store/shiftSlice";
import { fetchDailyShifts } from "../../../middleware/shift/shiftThunk";
import {
  ScheduleTable,
  ShiftDrawer,
  CopyScheduleDrawer,
} from "../../../components/staff-schedule";
import type { DrawerMode } from "../../../components/staff-schedule";
import {
  getSundayOf,
  toDateKey,
  getWeekDates,
  formatColHeader,
  formatNavDate,
} from "../../../components/staff-schedule/utils";
import "../../../styles/schedule.css";

/* ─────────────────────────────────────────────────────────────────────────── */

interface DrawerState {
  mode: DrawerMode;
  staffId: string | null;
  date: string | null;
}

const INITIAL_DRAWER: DrawerState = { mode: null, staffId: null, date: null };

/* ─────────────────────────────────────────────────────────────────────────── */

const ScheduledShiftsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { staffMembers, shifts, loading } = useSelector(
    (s: RootState) => s.shift
  );

  // Current week – starts on Sunday
  const [sunday, setSunday] = useState<Date>(() => getSundayOf(new Date()));
  const [drawer, setDrawer] = useState<DrawerState>(INITIAL_DRAWER);
  const [copyStaffId, setCopyStaffId] = useState<string | null>(null);

  // Compute 7 week-date objects every time sunday changes
  const weekDates = getWeekDates(sunday).map((d) => {
    const { date, day } = formatColHeader(d);
    return { date: d, dateKey: toDateKey(d), dateLabel: date, dayLabel: day };
  });

  const weekStartKey = toDateKey(sunday);

  // Fetch from API on week change; fall back to seed data on failure
  useEffect(() => {
    dispatch(fetchDailyShifts(weekStartKey));
    dispatch(refreshSeedForWeek(weekStartKey));
  }, [weekStartKey, dispatch]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToToday = () => setSunday(getSundayOf(new Date()));
  const prevWeek = () => {
    const d = new Date(sunday);
    d.setDate(d.getDate() - 7);
    setSunday(d);
  };
  const nextWeek = () => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + 7);
    setSunday(d);
  };

  // ── Drawer helpers ────────────────────────────────────────────────────────
  const openDrawer = (mode: DrawerMode, staffId: string, date: string) =>
    setDrawer({ mode, staffId, date });
  const closeDrawer = () => setDrawer(INITIAL_DRAWER);
  const closeCopy = () => setCopyStaffId(null);

  // ── Cell action handlers ──────────────────────────────────────────────────
  const handleEditWorkingHours = useCallback(
    (staffId: string, date: string) => openDrawer("edit", staffId, date),
    []
  );
  const handleAddTimeOff = useCallback(
    (staffId: string, date: string) => openDrawer("timeoff", staffId, date),
    []
  );
  const handleManageDayOff = useCallback(
    (staffId: string, date: string) => openDrawer("dayoff", staffId, date),
    []
  );
  const handleManageBlockedDay = useCallback(
    (staffId: string, date: string) => openDrawer("blocked", staffId, date),
    []
  );
  const handleEditStaff = useCallback((staffId: string) => {
    // For now, open the working hours drawer for today's date
    openDrawer("edit", staffId, toDateKey(new Date()));
  }, []);

  const handleCopy = useCallback((staffId: string) => {
    setCopyStaffId(staffId);
  }, []);

  // ── Save: Edit Working Hours ──────────────────────────────────────────────
  const handleSaveAvailability = (
    staffId: string,
    date: string,
    isAvailable: boolean,
    startTime: string,
    endTime: string
  ) => {
    if (drawer.mode === "dayoff" || !isAvailable) {
      dispatch(setDayOff({ staffId, date }));
    } else if (drawer.mode === "blocked") {
      dispatch(setBlocked({ staffId, date, startTime, endTime }));
    } else {
      dispatch(updateAvailability({ staffId, date, isAvailable, startTime, endTime }));
    }
  };

  // ── Save: Copy schedule ───────────────────────────────────────────────────
  const handleSaveCopy = (
    staffId: string,
    fromDate: string,
    toDates: string[],
    type: "day" | "week"
  ) => {
    dispatch(copyStaffWeek({ staffId, fromDate, toDates, type }));
  };

  // ── Derived: drawer staff + shift ─────────────────────────────────────────
  const drawerStaff = staffMembers.find((s) => s.id === drawer.staffId) ?? null;
  const drawerShift =
    drawer.staffId && drawer.date
      ? shifts[drawer.staffId]?.[drawer.date]
      : undefined;
  const copyStaff = staffMembers.find((s) => s.id === copyStaffId) ?? null;

  // ── Nav date display ──────────────────────────────────────────────────────
  const todayDisplay = formatNavDate(new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div className="px-6 py-5 max-w-screen-2xl mx-auto">

        {/* Page title */}
        <h1 className="text-xl font-semibold text-gray-800 mb-5 border-b border-gray-200 pb-3">
          Staff Schedule
        </h1>

        {/* Legend + navigation row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Daily Working Hours
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Blocked Hours
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-100 text-yellow-700">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              Day Off
            </span>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 text-gray-500 hover:text-gray-800 border border-gray-200 rounded hover:bg-white transition-colors"
              onClick={prevWeek}
              aria-label="Previous week"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded hover:bg-white transition-colors mx-0.5"
              onClick={goToToday}
            >
              Today
            </button>

            <div className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded bg-white min-w-[130px] text-center">
              {todayDisplay}
            </div>

            <button
              className="p-1.5 text-gray-500 hover:text-gray-800 border border-gray-200 rounded hover:bg-white transition-colors"
              onClick={nextWeek}
              aria-label="Next week"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="text-xs text-blue-500 mb-2 flex items-center gap-1">
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Syncing with server…
          </div>
        )}

        {/* ── Schedule table ─────────────────────────────────────────────── */}
        <ScheduleTable
          staffMembers={staffMembers}
          weekDates={weekDates}
          shifts={shifts}
          onEditWorkingHours={handleEditWorkingHours}
          onAddTimeOff={handleAddTimeOff}
          onManageDayOff={handleManageDayOff}
          onManageBlockedDay={handleManageBlockedDay}
          onCopy={handleCopy}
          onEditStaff={handleEditStaff}
        />
      </div>

      {/* ── ShiftDrawer ───────────────────────────────────────────────────── */}
      <ShiftDrawer
        open={drawer.mode !== null && drawer.mode !== "copy"}
        staff={drawerStaff}
        date={drawer.date}
        shift={drawerShift}
        onClose={closeDrawer}
        onSave={handleSaveAvailability}
      />

      {/* ── CopyScheduleDrawer ────────────────────────────────────────────── */}
      <CopyScheduleDrawer
        open={copyStaffId !== null}
        staff={copyStaff}
        currentWeekDates={weekDates.map((w) => w.dateKey)}
        onClose={closeCopy}
        onSave={handleSaveCopy}
      />
    </div>
  );
};

export default ScheduledShiftsPage;
