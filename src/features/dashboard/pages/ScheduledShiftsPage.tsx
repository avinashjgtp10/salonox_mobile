import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { usePermissions } from "../../../hooks/usePermissions";
import { showPermissionDenied } from "../../../store/permissionDialogSlice";
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
  const navigate = useNavigate();
  const { staffMembers, shifts, staffTotal, loading } = useSelector(
    (s: RootState) => s.shift
  );

  // Live clock for the header's date/time pill — ticks every minute, which
  // is as fine-grained as the pill's display (HH:MM) actually shows.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [sunday, setSunday] = useState<Date>(() => getSundayOf(new Date()));
  const [drawer, setDrawer] = useState<DrawerState>(INITIAL_DRAWER);
  const [deleteTarget, setDeleteTarget] = useState<{ staffId: string; date: string } | null>(null);
  const [copyStaffId, setCopyStaffId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const { can } = usePermissions();
  const denyPerm = (permKey: string) => dispatch(showPermissionDenied(
    `Your account does not have the "${permKey}" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
  ));

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

  // Header's "+ Add Shift" — opens the same working-hours drawer every
  // per-cell "+" already uses, for the first staff member on the current
  // page and today's date. Not a staff/date picker (there isn't one yet);
  // the admin can still change staff/date the normal way via that cell's own
  // "+" once the drawer's open, or by clicking a different cell directly.
  const handleAddShift = () => {
    const first = staffMembers.find((s) => s.isActive !== false);
    if (!first) return;
    const isAdding = shifts[first.id]?.[toDateKey(new Date())]?.type !== "working";
    const permKey = isAdding ? "add_working_hours" : "edit_working_hours";
    if (!can(permKey)) { denyPerm(permKey); return; }
    openDrawer("edit", first.id, toDateKey(new Date()));
  };

  // ── Cell action handlers ──────────────────────────────────────────────────────
  // "edit" mode covers both Add Working Hours (no shift yet) and Edit
  // Working Hours (one already exists) — mirrors isCreatingWorkingHours
  // below, checked here so the right one of the two permissions applies.
  const handleEditWorkingHours = useCallback(
    (staffId: string, date: string) => {
      const isAdding = shifts[staffId]?.[date]?.type !== "working";
      const permKey = isAdding ? "add_working_hours" : "edit_working_hours";
      if (!can(permKey)) { denyPerm(permKey); return; }
      openDrawer("edit", staffId, date);
    },
    [shifts, can] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const handleAddTimeOff = useCallback(
    (staffId: string, date: string) => {
      if (!can("add_time_off")) { denyPerm("add_time_off"); return; }
      openDrawer("timeoff", staffId, date);
    },
    [can] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const handleManageDayOff = useCallback(
    (staffId: string, date: string) => {
      if (!can("manage_day_off")) { denyPerm("manage_day_off"); return; }
      openDrawer("dayoff", staffId, date);
    },
    [can] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const handleManageBlockedDay = useCallback(
    (staffId: string, date: string) => {
      if (!can("manage_blocked_day")) { denyPerm("manage_blocked_day"); return; }
      openDrawer("blocked", staffId, date);
    },
    [can] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const handleDeleteTimeBlock = useCallback((staffId: string, date: string) => {
    if (!can("edit_working_hours")) { denyPerm("edit_working_hours"); return; }
    setDeleteTarget({ staffId, date });
  }, [can]); // eslint-disable-line react-hooks/exhaustive-deps
  const handleEditStaff = useCallback((staffId: string) => {
    if (!can("edit_working_hours")) { denyPerm("edit_working_hours"); return; }
    openDrawer("edit", staffId, toDateKey(new Date()));
  }, [can]); // eslint-disable-line react-hooks/exhaustive-deps
  const handleCopy = useCallback((staffId: string) => {
    if (!can("copy_schedule")) { denyPerm("copy_schedule"); return; }
    setCopyStaffId(staffId);
  }, [can]); // eslint-disable-line react-hooks/exhaustive-deps

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
    breaks: { start: string; end: string }[],
    repeatWeekly = false
  ) => {
    const isAddingWorkingHours = drawer.mode === "edit" && shifts[staffId]?.[date]?.type !== "working";
    const savePermKey = drawer.mode === "dayoff" ? "manage_day_off"
      : drawer.mode === "blocked" ? "manage_blocked_day"
      : drawer.mode === "timeoff" ? "add_time_off"
      : isAddingWorkingHours ? "add_working_hours" : "edit_working_hours";
    if (!can(savePermKey)) { denyPerm(savePermKey); return; }
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
      // Also writes the recurring weekly baseline for this weekday, which is
      // what Online Booking falls back to on dates with no row of their own.
      repeat_weekly: repeatWeekly,
    };

    console.log("[DEBUG] save payload:", payload);
    console.log("[DEBUG] number of records being saved:", 1);

    dispatch(saveSingleShiftThunk(payload))
      .unwrap()
      .then((res) => {
        console.log("[DEBUG] API response:", res);
        showSuccess(
          repeatWeekly
            ? `${isAddingWorkingHours ? "Working hours added" : "Availability updated"} and set to repeat weekly`
            : isAddingWorkingHours ? "Working hours added" : "Availability updated"
        );
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
    if (!can("copy_schedule")) { denyPerm("copy_schedule"); return; }
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
  const weekRangeDisplay = `${formatNavDate(weekDates[0].date).slice(0, 5)} – ${formatNavDate(weekDates[6].date)}`;
  const nowTimeDisplay = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="sched-page">
      {overlay}
      <div className="sched-page__content" style={deleteTarget ? { pointerEvents: "none" } : undefined}>

        {/* Breadcrumb */}
        <nav className="sched-page__breadcrumb" aria-label="Breadcrumb">
          <button type="button" className="sched-page__breadcrumb-link" onClick={() => navigate("/dashboard/team/members")}>
            Staff
          </button>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sched-page__breadcrumb-sep">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="sched-page__breadcrumb-current">Schedule</span>
        </nav>

        <div className="sched-page__heading-row">
          <div>
            <h1 className="sched-page__title">Staff Schedule</h1>
            <p className="sched-page__subtitle">Manage and track your team's working hours and shifts.</p>
          </div>

          <div className="sched-page__heading-right">
            <span className="sched-page__now-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {todayDisplay}
              <span className="sched-page__now-pill-sep" />
              {nowTimeDisplay}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sched-page__now-pill-chevron">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
            <button
              className="sched-page__add-shift-btn"
              onClick={handleAddShift}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Shift
            </button>
          </div>
        </div>

        {/* Legend + navigation */}
        <div className="sched-page__controls">
          <div className="sched-page__legend">
            <span className="sched-page__legend-item sched-page__legend-item--working">
              <span className="sched-page__legend-dot sched-page__legend-dot--working" />
              Working Hours
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
            <button className="sched-page__nav-btn sched-page__nav-btn--date" onClick={goToToday}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {weekRangeDisplay}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
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
        // Only working hours and a day off describe a repeatable weekly
        // pattern. A blocked time or a one-off time off is by definition
        // specific to that date — repeating one would write a weekly baseline
        // saying "works 2–3pm every Tuesday", which Online Booking would then
        // treat as this staff member's real Tuesday schedule.
        allowRepeatWeekly={drawer.mode === "edit" || drawer.mode === "dayoff"}
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
