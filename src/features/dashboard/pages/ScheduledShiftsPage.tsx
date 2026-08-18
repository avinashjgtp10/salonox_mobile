import React, { useState, useEffect, useCallback } from "react";
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

const PAGE_SIZE = 8;

const ScheduledShiftsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { staffMembers, shifts } = useSelector(
    (s: RootState) => s.shift
  );

  const [sunday, setSunday] = useState<Date>(() => getSundayOf(new Date()));
  const [drawer, setDrawer] = useState<DrawerState>(INITIAL_DRAWER);
  const [deleteTarget, setDeleteTarget] = useState<{ staffId: string; date: string } | null>(null);
  const [copyStaffId, setCopyStaffId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { showSuccess, showError, overlay } = useStatusOverlay();

  const weekDates = getWeekDates(sunday).map((d) => {
    const { date, day } = formatColHeader(d);
    return { date: d, dateKey: toDateKey(d), dateLabel: date, dayLabel: day };
  });

  const weekStartKey = toDateKey(sunday);

  useEffect(() => {
    dispatch(fetchDailyShifts(weekStartKey));
    setPage(1); // reset to first page on week change
  }, [weekStartKey, dispatch]);

  // ── Pagination ────────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(staffMembers.length / PAGE_SIZE));
  const pagedStaff = staffMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = staffMembers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, staffMembers.length);

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
        dispatch(fetchDailyShifts(weekStartKey));
        dispatch(bumpScheduleVersion());
      })
      .catch(() => {
        showError("Failed to copy schedule");
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
        <ScheduleTable
          staffMembers={pagedStaff}
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

        {/* Pagination */}
        {staffMembers.length > 0 && (
          <div className="sched-pagination">
            <span className="sched-pagination__info">
              Showing <strong>{from}–{to}</strong> of <strong>{staffMembers.length}</strong> staff members
            </span>

            <div className="sched-pagination__controls">
              {/* Prev */}
              <button
                className="sched-pagination__btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "…" ? (
                    <span key={`ellipsis-${idx}`} className="sched-pagination__ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`sched-pagination__btn${page === p ? " sched-pagination__btn--active" : ""}`}
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </button>
                  )
                )}

              {/* Next */}
              <button
                className="sched-pagination__btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}
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
