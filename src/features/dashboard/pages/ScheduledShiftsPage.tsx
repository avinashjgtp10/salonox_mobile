import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  updateAvailability,
  setDayOff,
  setBlocked,
  removeShiftEntry,
} from "../../../store/shiftSlice";
import { bumpScheduleVersion } from "../../../store/schedulerSlice";
import {
  fetchDailyShifts,
  applyCopySchedule,
  saveSingleShiftThunk,
  deleteSingleShiftThunk,
} from "../../../middleware/shift/shiftThunk";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  ScheduleTable,
  ShiftDrawer,
  CopyScheduleDrawer,
} from "../../../components/staff-schedule";
import type { DrawerMode } from "../../../components/staff-schedule";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";
import {
  getSundayOf,
  toDateKey,
  getWeekDates,
  formatColHeader,
  formatNavDate,
  convertTo24h,
} from "../../../components/staff-schedule/utils";
import "../../../styles/schedule.scss";

interface DrawerState {
  mode: DrawerMode;
  staffId: string | null;
  date: string | null;
}

const INITIAL_DRAWER: DrawerState = { mode: null, staffId: null, date: null };

const ScheduledShiftsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { staffMembers, shifts, staffTotal, loading } = useSelector(
    (s: RootState) => s.shift
  );

  const [sunday, setSunday] = useState<Date>(() => getSundayOf(new Date()));
  const [drawer, setDrawer] = useState<DrawerState>(INITIAL_DRAWER);
  const [deleteTarget, setDeleteTarget] = useState<{ staffId: string; date: string } | null>(null);
  const [copyStaffId, setCopyStaffId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const weekDates = getWeekDates(sunday).map((d) => {
    const { date, day } = formatColHeader(d);
    return { date: d, dateKey: toDateKey(d), dateLabel: date, dayLabel: day };
  });

  const weekStartKey = toDateKey(sunday);

  // ── Fetch (server-paginated) ────────────────────────────────────────────────
  // Same "reset to page 1 without double-fetching" shape as
  // SuppliersListPage/OrdersListPage: a week change should land back on page
  // 1, but firing the fetch once for the stale page and again for the reset
  // page would be a duplicate call — so when the week changes while not
  // already on page 1, this only resets the page and lets *that* state
  // change re-trigger the effect with the corrected page.
  const isMountedRef = useRef(false);
  const prevWeekKeyRef = useRef(weekStartKey);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      dispatch(fetchDailyShifts({ weekStartDate: weekStartKey, page, limit: pageSize }));
      return;
    }
    if (prevWeekKeyRef.current !== weekStartKey) {
      prevWeekKeyRef.current = weekStartKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }
    dispatch(fetchDailyShifts({ weekStartDate: weekStartKey, page, limit: pageSize }));
  }, [weekStartKey, page, pageSize, dispatch]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
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

  // ── Drawer helpers ────────────────────────────────────────────────────────────
  const openDrawer = (mode: DrawerMode, staffId: string, date: string) =>
    setDrawer({ mode, staffId, date });
  const closeDrawer = () => setDrawer(INITIAL_DRAWER);
  const closeCopy = () => setCopyStaffId(null);

  // ── Cell action handlers ──────────────────────────────────────────────────────
  const handleEditWorkingHours = useCallback(
    (staffId: string, date: string) => openDrawer("edit", staffId, date), []
  );
  const handleAddTimeOff = useCallback(
    (staffId: string, date: string) => openDrawer("timeoff", staffId, date), []
  );
  const handleManageDayOff = useCallback(
    (staffId: string, date: string) => openDrawer("dayoff", staffId, date), []
  );
  const handleManageBlockedDay = useCallback(
    (staffId: string, date: string) => openDrawer("blocked", staffId, date), []
  );
  const handleDeleteTimeBlock = useCallback((staffId: string, date: string) => {
    setDeleteTarget({ staffId, date });
  }, []);
  const handleEditStaff = useCallback((staffId: string) => {
    openDrawer("edit", staffId, toDateKey(new Date()));
  }, []);
  const handleCopy = useCallback((staffId: string) => {
    setCopyStaffId(staffId);
  }, []);

  const handleConfirmDeleteTimeBlock = () => {
    if (!deleteTarget) return;
    const { staffId, date } = deleteTarget;

    console.log("[DEBUG] deletingStaffId:", staffId);
    console.log("[DEBUG] deletingDate:", date);

    const payload = { staff_id: staffId, date };
    console.log("[DEBUG] delete payload:", payload);

    dispatch(removeShiftEntry({ staffId, date }));
    const remainingCount = Math.max(
      0,
      Object.values(shifts).reduce((count, staffShifts) => count + Object.keys(staffShifts).length, 0) - 1
    );
    console.log("[DEBUG] remaining schedule count:", remainingCount);

    dispatch(deleteSingleShiftThunk(payload))
      .unwrap()
      .then((res) => {
        console.log("[DEBUG] API response:", res);
        // Same cache-invalidation reason as handleSaveAvailability above.
        dispatch(bumpScheduleVersion());
      })
      .catch((err) => {
        console.error("[DEBUG] Delete failed:", err);
        showError("Failed to delete time block");
      });

    setDeleteTarget(null);
  };

  // ── Save availability ─────────────────────────────────────────────────────────
  const handleSaveAvailability = (
    staffId: string,
    date: string,
    isAvailable: boolean,
    startTime: string,
    endTime: string,
    breaks: { start: string; end: string }[]
  ) => {
    const isAddingWorkingHours = drawer.mode === "edit" && shifts[staffId]?.[date]?.type !== "working";
    // 8. Add Temporary Debug Logs
    console.log("[DEBUG] selectedDate:", date);

    if (drawer.mode === "dayoff" || !isAvailable) {
      dispatch(setDayOff({ staffId, date }));
    } else if (drawer.mode === "blocked") {
      dispatch(setBlocked({ staffId, date, startTime, endTime }));
    } else {
      dispatch(updateAvailability({ staffId, date, isAvailable, startTime, endTime, breaks }));
    }

    const isDayOff = drawer.mode === "dayoff" || !isAvailable;

    const payload = {
      staff_id: staffId,
      date: date,
      start_time: isDayOff ? "" : convertTo24h(startTime),
      end_time: isDayOff ? "" : convertTo24h(endTime),
      breaks: isDayOff ? [] : breaks.map((b) => ({
        start_time: convertTo24h(b.start),
        end_time: convertTo24h(b.end),
      })),
    };

    console.log("[DEBUG] save payload:", payload);
    console.log("[DEBUG] number of records being saved:", 1);

    dispatch(saveSingleShiftThunk(payload))
      .unwrap()
      .then((res) => {
        console.log("[DEBUG] API response:", res);
        showSuccess(isAddingWorkingHours ? "Working hours added" : "Availability updated");
        // No full-week repaint
        // Calendar/Quick Sale cache their own copy of staff working hours
        // (schedulerSlice.staffSchedules, via useStaffSchedule) and only ever
        // refetch it when scheduleVersion changes — without this, an edited
        // shift stayed invisible there for the rest of the browser session.
        dispatch(bumpScheduleVersion());
      })
      .catch((err) => {
        console.error("[DEBUG] Save failed:", err);
        showError("Failed to save changes");
        // The dispatch above already wrote the optimistic change into Redux
        // state before the API call — on failure that phantom edit would
        // otherwise sit there looking "saved" until the next full reload.
        // Re-fetch the real server state for this week to undo it.
        dispatch(fetchDailyShifts({ weekStartDate: weekStartKey, page, limit: pageSize }));
      });
  };

  // ── Copy schedule ─────────────────────────────────────────────────────────────
  const handleSaveCopy = (
    staffId: string,
    fromDate: string,
    toDates: string[],
    type: "day" | "week"
  ) => {
    dispatch(applyCopySchedule({ staffId, fromDate, toDates, type }))
      .unwrap()
      .then(() => {
        showSuccess("Schedule copied successfully");
        dispatch(fetchDailyShifts({ weekStartDate: weekStartKey, page, limit: pageSize }));
        dispatch(bumpScheduleVersion());
      })
      .catch(() => {
        showError("Failed to copy schedule");
        // Same reasoning as handleSaveAvailability's catch — applyCopySchedule.pending
        // already wrote the optimistic copy into every target week's Redux state;
        // on failure, re-sync the visible week from the server so it doesn't keep
        // showing a copy that was never actually persisted.
        dispatch(fetchDailyShifts({ weekStartDate: weekStartKey, page, limit: pageSize }));
      });
  };

  const drawerStaff = staffMembers.find((s) => s.id === drawer.staffId) ?? null;
  const drawerShift =
    drawer.staffId && drawer.date
      ? shifts[drawer.staffId]?.[drawer.date]
      : undefined;
  const isCreatingWorkingHours = drawer.mode === "edit" && drawerShift?.type !== "working";
  const drawerTitle =
    drawer.mode === "edit"
      ? isCreatingWorkingHours ? "Add Working Hours" : "Edit Working Hours"
      : drawer.mode === "timeoff"
        ? "Add Time Off"
        : drawer.mode === "dayoff"
          ? "Manage Day Off"
          : drawer.mode === "blocked"
            ? "Manage Blocked Day"
            : "Update Availability";
  const drawerSaveLabel =
    drawer.mode === "edit"
      ? isCreatingWorkingHours ? "Add Working Hours" : "Apply Changes"
      : "Apply Changes";
  const copyStaff = staffMembers.find((s) => s.id === copyStaffId) ?? null;
  const todayDisplay = formatNavDate(new Date());

  return (
    <div className="sched-page">
      {overlay}
      <div className="sched-page__content" style={deleteTarget ? { pointerEvents: "none" } : undefined}>

        <h1 className="sched-page__title">Staff Schedule</h1>

        {/* Legend + navigation */}
        <div className="sched-page__controls">
          <div className="sched-page__legend">
            <span className="sched-page__legend-item sched-page__legend-item--working">
              <span className="sched-page__legend-dot sched-page__legend-dot--working" />
              Daily Working Hours
            </span>
            <span className="sched-page__legend-item sched-page__legend-item--blocked">
              <span className="sched-page__legend-dot sched-page__legend-dot--blocked" />
              Blocked Hours
            </span>
            <span className="sched-page__legend-item sched-page__legend-item--dayoff">
              <span className="sched-page__legend-dot sched-page__legend-dot--dayoff" />
              Day Off
            </span>
          </div>

          <div className="sched-page__nav">
            <button className="sched-page__nav-btn" onClick={prevWeek} aria-label="Previous week">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button className="sched-page__nav-btn sched-page__nav-btn--today" onClick={goToToday}>
              Today
            </button>
            <span className="sched-page__nav-btn sched-page__nav-btn--date">
              {todayDisplay}
            </span>
            <button className="sched-page__nav-btn" onClick={nextWeek} aria-label="Next week">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={`sched-table-wrap${loading ? " sched-table-wrap--loading" : ""}`}>
          <ScheduleTable
            staffMembers={staffMembers}
            weekDates={weekDates}
            shifts={shifts}
            onEditWorkingHours={handleEditWorkingHours}
            onAddTimeOff={handleAddTimeOff}
            onManageDayOff={handleManageDayOff}
            onManageBlockedDay={handleManageBlockedDay}
            onDeleteTimeBlock={handleDeleteTimeBlock}
            onCopy={handleCopy}
            onEditStaff={handleEditStaff}
            isModalOpen={deleteTarget !== null}
          />
        </div>

        {/* Pagination — the shared components/ui/Pagination component already
            used by Suppliers/Orders/Products, reused here per SCRUM-2615's
            "one pagination component" requirement rather than duplicating
            the schedule-specific pagination markup this page had before. */}
        <Pagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={staffTotal}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
          className="sched-page__pagination"
        />
      </div>

      {/* Drawers */}
      <ShiftDrawer
        open={drawer.mode !== null && drawer.mode !== "copy"}
        staff={drawerStaff}
        date={drawer.date}
        shift={drawerShift}
        isCreating={isCreatingWorkingHours}
        title={drawerTitle}
        saveLabel={drawerSaveLabel}
        onClose={closeDrawer}
        onSave={handleSaveAvailability}
      />
      <CopyScheduleDrawer
        open={copyStaffId !== null}
        staff={copyStaff}
        currentWeekDates={weekDates.map((w) => w.dateKey)}
        onClose={closeCopy}
        onSave={handleSaveCopy}
      />

      <Modal
        show={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Schedule?"
        size="sm"
      >
        <p>Are you sure you want to remove this time block for the selected date?</p>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleConfirmDeleteTimeBlock}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ScheduledShiftsPage;
