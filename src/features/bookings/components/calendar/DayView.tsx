import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import type { Booking, BlockedTime } from "../../types/booking.types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useSchedulerContext } from "../../store/SchedulerContext";
import type { DragCandidate, ResizeState } from "../../hooks/useDragDrop";
import { formatTime12, getCurrentTime, addMinutes } from "../../utils/timeUtils";
import Avatar from "../shared/Avatar";
import BookingTooltipCard from "../shared/BookingTooltipCard";
import BookingChip from "./BookingChip";
import { computeOverlapLayout } from "../../utils/overlapLayout";
import { useStatusOverlay } from "../../../../hooks/useStatusOverlay";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useAppDispatch } from "../../../../hooks/useAppRedux";
import { showPermissionDenied } from "../../../../store/permissionDialogSlice";
import "../../styles/DayView.scss";

// Stable empty array — avoids allocating a new [] on every render for staff with no blocks
const EMPTY_BLOCKS: BlockedTime[] = [];

// Must match .dv-gutter width and .dv-header-row height in DayView.scss
const GUTTER_WIDTH = 72;
const HEADER_HEIGHT = 56;

interface StaffSegment { time: string; endTime: string; }

// Every line item (service, package, product, membership) can be assigned to its
// own staff member, independent of the appointment's top-level staffId — e.g. a
// service done by Staff A alongside a product sold by Staff B on the same visit.
// Returns the time ranges on THIS booking that belong to the given staff, across
// all four item types (previously only `services` was checked here, so products/
// packages/memberships assigned to a different staff than the main service never
// showed up under their own staff's column at all).
function toMinsOfDay(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// The single-day grid has no way to represent a segment that actually runs
// into the next day — a stray record left over from before the midnight
// guards (drag/resize/modal) were added would otherwise show endTime as a
// numerically SMALLER clock value than its own start (e.g. start 23:00, end
// "02:00"), which durationToPx reads as a huge/negative span and renders as
// a garbled or oversized chip. Clamp such a segment to the end of the visible
// day instead of letting it distort the whole column.
function clampSameDayEnd(time: string, endTime: string): string {
  // A genuinely missing/empty endTime (data not loaded yet, or simply never
  // set on this row) must NOT be treated as "00:00" — toMinsOfDay("") is 0,
  // which is <= any real start time, so an empty string used to get clamped
  // to "23:59" as if it were a midnight-wrapped value. That turned a perfectly
  // normal, just-created appointment's chip into an 8-hour block the moment
  // any render hit this fallback with no endTime yet available (e.g. before
  // per-service staffId caught up) — only clamp when there's an actual,
  // parseable endTime to compare.
  if (!endTime) return endTime;
  return toMinsOfDay(endTime) <= toMinsOfDay(time) ? "23:59" : endTime;
}

function getStaffSegments(b: any, staffId: string): StaffSegment[] {
  const segs: StaffSegment[] = [];
  (b.services || []).forEach((s: any) => {
    if (String(s.staffId) !== String(staffId)) return;
    const time = s.time || b.startTime;
    const endTime = s.endTime || addMinutes(time, s.duration || 30);
    segs.push({ time, endTime: clampSameDayEnd(time, endTime) });
  });
  const otherItems = [
    ...(b.packageItems || []),
    ...(b.productItems || []),
    ...(b.membershipItems || []),
  ];
  otherItems.forEach((it: any) => {
    if (String(it.staffId) !== String(staffId)) return;
    const time = it.time || b.startTime;
    segs.push({ time, endTime: clampSameDayEnd(time, addMinutes(time, 30)) });
  });
  return segs;
}

interface DayViewProps {
  onSlotClick: (staffId: string, time: string) => void;
  onEditBooking: (booking: Booking) => void;
  onCancelBooking: (booking: Booking) => void;
  onDeleteBooking: (booking: Booking) => void;
  onBlockTime: (staffId: string) => void;
  onEditBlockTime: (block: BlockedTime) => void;
}

const DayView: React.FC<DayViewProps> = ({
  onSlotClick, onEditBooking, onCancelBooking, onDeleteBooking, onBlockTime, onEditBlockTime,
}) => {
  const { currentDate, slots, timeToPx, durationToPx, intervalMins } = useScheduler();
  const { blockedTimes, deleteBlockedTime, updateBooking, staffList, selectedStaffIds, bookings, highlightedBookingId, staffSchedules } = useSchedulerContext();
  const { showError, overlay: dragErrorOverlay } = useStatusOverlay();
  const { can } = usePermissions();
  const dispatch = useAppDispatch();
  // Drag-reschedule and resize-duration both modify the appointment, so
  // both fall under Edit Appointment (see the Calendar permissions ticket).
  // Gated at drag/resize START, not just on the eventual PATCH call — a
  // denied staff member's chip must never even visually move before
  // snapping back, it should just not move at all.
  const requireEditForDrag = () => {
    if (can("edit_appointment")) return true;
    dispatch(showPermissionDenied(
      `Your account does not have the "edit_appointment" permission. Ask your salon owner to enable it in Settings → Roles & Permissions.`
    ));
    return false;
  };

  // Empty selection = "All Staff" — otherwise show only the selected staff
  // members' columns, side by side, so schedules can be compared directly.
  const visibleStaff = useMemo(
    () => selectedStaffIds.length > 0 ? staffList.filter((s) => selectedStaffIds.includes(s.id)) : staffList,
    [staffList, selectedStaffIds],
  );

  const today = new Date().toISOString().slice(0, 10);
  const isToday = currentDate === today;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    function measure() {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [visibleStaff.length]);

  // containerRef now measures the full dv-root width (gutter + columns), so subtract
  // the gutter's fixed width to get the space actually available to staff columns.
  const availableColsWidth = Math.max(0, containerWidth - GUTTER_WIDTH);
  const COL_WIDTH = availableColsWidth > 0 && visibleStaff.length > 0
    ? Math.max(160, Math.ceil(availableColsWidth / visibleStaff.length))
    : 160;

  const [nowTime, setNowTime] = useState(getCurrentTime());
  // Recomputed fresh on every render this triggers (nowTime ticks every
  // minute) — passed to each chip so a still-"booked" one whose end time has
  // now passed flips to no-show live, without needing a page reload.
  const nowTsForStatus = Date.now();
  const [staffMenu, setStaffMenu] = useState<{ staffId: string; x: number; y: number } | null>(null);

  // ── Hover tooltip ─────────────────────────────────────────────────────────
  const [hovered, setHovered] = useState<{ booking: Booking; el: HTMLElement } | null>(null);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const openTip = useCallback((booking: Booking, el: HTMLElement) => {
    clearTimeout(tipTimerRef.current);
    setHovered({ booking, el });
  }, []);
  const closeTip = useCallback(() => {
    tipTimerRef.current = setTimeout(() => setHovered(null), 150);
  }, []);
  const keepTip = useCallback(() => { clearTimeout(tipTimerRef.current); }, []);

  // ── Drag / resize state ───────────────────────────────────────────────────
  const [dragging, setDragging] = useState<{
    booking: Booking; startX: number; startY: number;
    originalTop: number; currentTop: number;
    currentStaffId: string; currentStaffIndex: number;
    originalStaffId: string;
    originalStart: string;
    // The dragged staff segment's own end time (not booking.endTime, which for
    // a multi-staff/multi-service appointment can legitimately differ and
    // isn't reliable enough to compute a duration from).
    originalEnd: string;
  } | null>(null);

  const [dragCandidate, setDragCandidate] = useState<{
    booking: Booking; initialX: number; initialY: number;
    originalTop: number; currentStaffId: string; currentStaffIndex: number;
    startTime: string; endTime: string;
    originalStaffId: string;
  } | null>(null);

  const [resizing, setResizing] = useState<{
    booking: Booking; startY: number; originalHeight: number; currentHeight: number; staffId: string;
  } | null>(null);
  const resizingRef = useRef(resizing);
  resizingRef.current = resizing;

  // Mirrors of dragging/dragCandidate for the window mousemove/mouseup listeners
  // below — read fresh on every render (no extra effect needed, since a render
  // always happens before the next native event can be handled). Kept separate
  // from the state itself so the listener-attaching effect can key off a stable
  // boolean instead of the drag object, which changes on every mousemove tick.
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  const dragCandidateRef = useRef(dragCandidate);
  dragCandidateRef.current = dragCandidate;

  // Stable handlers for BookingChip — useCallback(fn,[]) since setters are stable
  const handleStartDragCandidate = useCallback((candidate: DragCandidate) => {
    if (!requireEditForDrag()) return;
    setHovered(null);
    setDragCandidate(candidate);
  }, [can]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartResize = useCallback((state: ResizeState) => {
    if (!requireEditForDrag()) return;
    setResizing(state);
  }, [can]); // eslint-disable-line react-hooks/exhaustive-deps

  const justDraggedRef = useRef(false);

  // ── Pre-grouped blocked times for this date ───────────────────────────────
  const dayBlocked = useMemo(
    () => blockedTimes.filter((b) => b.date === currentDate),
    [blockedTimes, currentDate],
  );

  const dayBlockedByStaff = useMemo(() => {
    const map = new Map<string, BlockedTime[]>();
    dayBlocked.forEach((b) => {
      const list = map.get(b.staffId) ?? [];
      list.push(b);
      map.set(b.staffId, list);
    });
    return map;
  }, [dayBlocked]);

  // Date-specific shift schedules — same source WeekView uses (populated by
  // useStaffSchedule()), keyed by the exact date with a day-of-week fallback
  // for a genuinely recurring (date-less) entry. This used to read from
  // state.shift.shifts instead, which is only ever populated by the separate
  // Scheduled Shifts admin page's fetchDailyShifts — never dispatched from
  // the booking calendar itself, so work-hours blocking silently did nothing
  // here unless that other page happened to already be visited this session.
  function getStaffWorkHours(staffId: string) {
    const dayOfWeek = new Date(currentDate + "T12:00:00").getDay();
    const sch = staffSchedules?.[staffId]?.[currentDate] ?? staffSchedules?.[staffId]?.[`dow-${dayOfWeek}`];
    if (!sch) return null;
    if (!sch.isAvailable) return { startTime: "", endTime: "", isAvailable: false };
    if (!sch.startTime || !sch.endTime) return null;
    return { startTime: sch.startTime, endTime: sch.endTime, isAvailable: true };
  }

  function isTimeRangeUnavailable(staffId: string, startTime: string, endTime: string): boolean {
    const toMins = (t: string) => { const [h, m] = (t || "00:00").split(":").map(Number); return h * 60 + m; };
    const apptStart = toMins(startTime);
    const apptEnd = toMins(endTime || startTime);

    const manualBlock = dayBlocked.some(b =>
      b.staffId === staffId && apptStart < toMins(b.endTime) && apptEnd > toMins(b.startTime)
    );
    if (manualBlock) return true;

    const hours = getStaffWorkHours(staffId);
    if (hours) {
      if (!hours.isAvailable) return true;
      if (hours.startTime && hours.endTime) {
        const shiftStart = toMins(hours.startTime);
        const shiftEnd = toMins(hours.endTime);
        if (shiftStart <= shiftEnd) {
          if (apptStart < shiftStart || apptEnd > shiftEnd) return true;
        } else {
          if (apptStart >= shiftEnd && apptEnd <= shiftStart) return true;
        }
      }
    }
    return false;
  }

  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const staffMenuRef = useRef<HTMLDivElement>(null);

  // Scroll a newly-created appointment (e.g. from the public booking flow's
  // "Add to Calendar" button) into view once its chip has rendered.
  useEffect(() => {
    if (!highlightedBookingId) return;
    const el = scrollBodyRef.current?.querySelector(
      `[data-booking-id="${CSS.escape(String(highlightedBookingId))}"]`
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }, [highlightedBookingId, bookings]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (staffMenuRef.current && !staffMenuRef.current.contains(e.target as Node))
        setStaffMenu(null);
    }
    if (staffMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [staffMenu]);

  useEffect(() => {
    if (!isToday) return;
    let cancelled = false;
    function scrollToNow(attempt = 0) {
      if (cancelled || !scrollBodyRef.current) return;
      if (scrollBodyRef.current.scrollHeight <= scrollBodyRef.current.clientHeight && attempt < 50) {
        requestAnimationFrame(() => scrollToNow(attempt + 1));
        return;
      }
      const now = new Date();
      const px = ((now.getHours() * 60 + now.getMinutes()) / intervalMins) * SLOT_HEIGHT;
      // +HEADER_HEIGHT because the sticky header row now lives inside the scrollable
      // content (see dv-scroll-content), so scrollTop 0 is the top of the header, not the grid.
      scrollBodyRef.current.scrollTop = Math.max(0, px + HEADER_HEIGHT - 150);
    }
    requestAnimationFrame(() => scrollToNow());
    return () => { cancelled = true; };
  }, [isToday, intervalMins, currentDate]);

  useEffect(() => {
    const t = setInterval(() => setNowTime(getCurrentTime()), 60000);
    return () => clearInterval(t);
  }, []);

  // Listens only while a drag/candidate is active, but keyed on the *presence*
  // of one (a boolean), not the drag object itself. The object's currentTop/
  // currentStaffId change on every mousemove, and previously sat in this
  // effect's dependency array — so every mousemove tore down and re-added
  // these window listeners. Under fast mouse movement the teardown/re-add
  // cycle could lose a mouseup that landed in the gap, leaving `dragging`
  // stuck non-null forever (chip visually glued to the cursor, no more drops
  // ever registering). Reading current values from refs instead lets the
  // listeners stay attached for the whole drag session.
  const isDragActive = !!dragging || !!dragCandidate;
  useEffect(() => {
    if (!isDragActive) return;

    function onMouseMove(e: MouseEvent) {
      const dragging = draggingRef.current;
      if (dragging) {
        e.preventDefault();
        setDragging((prev) => {
          if (!prev) return null;
          const deltaY = e.clientY - prev.startY;
          const rawTop = prev.originalTop + deltaY;
          const snapped = Math.round(rawTop / SLOT_HEIGHT) * SLOT_HEIGHT;
          const deltaX = e.clientX - prev.startX;
          const colShift = Math.round(deltaX / COL_WIDTH);
          const origIndex = visibleStaff.findIndex((s) => s.id === prev.originalStaffId);
          const newIndex = Math.max(0, Math.min(visibleStaff.length - 1, origIndex + colShift));
          return {
            ...prev,
            currentTop: Math.max(0, snapped),
            currentStaffId: visibleStaff[newIndex].id,
            currentStaffIndex: newIndex,
          };
        });
        return;
      }

      const dragCandidate = dragCandidateRef.current;
      if (dragCandidate) {
        const deltaY = e.clientY - dragCandidate.initialY;
        const deltaX = e.clientX - dragCandidate.initialX;
        if (Math.abs(deltaY) < 12 && Math.abs(deltaX) < 12) return;

        const rawTop = dragCandidate.originalTop + deltaY;
        const snapped = Math.round(rawTop / SLOT_HEIGHT) * SLOT_HEIGHT;
        const colShift = Math.round(deltaX / COL_WIDTH);
        const newIndex = Math.max(0, Math.min(visibleStaff.length - 1, dragCandidate.currentStaffIndex + colShift));

        setDragging({
          booking: dragCandidate.booking,
          startX: dragCandidate.initialX,
          startY: dragCandidate.initialY,
          originalTop: dragCandidate.originalTop,
          currentTop: Math.max(0, snapped),
          currentStaffId: visibleStaff[newIndex].id,
          currentStaffIndex: newIndex,
          originalStaffId: dragCandidate.originalStaffId,
          originalStart: dragCandidate.startTime,
          originalEnd: dragCandidate.endTime,
        });
        setDragCandidate(null);
      }
    }

    function onMouseUp() {
      const dragging = draggingRef.current;
      if (dragging) {
        // A thrown error anywhere in here (e.g. a booking missing an expected
        // field) used to abort this handler before reaching setDragging(null)
        // below, leaving the chip permanently glued to the cursor with no way
        // to drop it — the try/finally guarantees the drag always ends.
        try {
          const totalMins = (dragging.currentTop / SLOT_HEIGHT) * intervalMins;
          const h = Math.floor(totalMins / 60);
          const m = Math.round(totalMins % 60);
          const newStart = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
          const [sh, sm] = dragging.originalStart.split(":").map(Number);
          const [eh, em] = dragging.originalEnd.split(":").map(Number);
          const duration = eh * 60 + em - (sh * 60 + sm);
          const newEnd = addMinutes(newStart, duration);
          const orig = (dragging.booking as any)._originalBooking || dragging.booking;

          const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
          // Same midnight-rollover guard as the resize handler above — dragging the
          // chip down far enough that its (unchanged) duration would now run past
          // midnight produces an invalid wrapped time instead of an actual next-day
          // booking, which the single-day grid can't render correctly anyway.
          if (toMins(newStart) + duration > 24 * 60) {
            showError("Appointments can't run past midnight — pick an earlier slot or shorten it first.");
            return;
          }

          if (isTimeRangeUnavailable(dragging.currentStaffId, newStart, newEnd)) {
            showError("That staff member already has an appointment or is blocked at this time — pick another slot.");
            return;
          }

          const oldStartMins = toMins(dragging.originalStart);
          const newStartMins = toMins(newStart);
          const deltaMins = newStartMins - oldStartMins;

          const shiftMins = (t: string) => {
            const mins = toMins(t) + deltaMins;
            const h = Math.floor(mins / 60);
            const m = Math.round(mins % 60);
            return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
          };

          const matchesDraggedStaff = (itemStaffId: any) => itemStaffId
            ? String(itemStaffId) === String(dragging.originalStaffId)
            : String(orig.staffId) === String(dragging.originalStaffId);

          const updatedServices = orig.services?.map((s: any) => {
            // Only shift the time of the staff/service group actually being dragged —
            // other staff's services in the same multi-staff booking must stay put.
            if (!matchesDraggedStaff(s.staffId)) return s;

            const shiftedTime = shiftMins(s.time || dragging.originalStart);
            const existingEnd = s.endTime || s.end_time;
            const shiftedEnd = existingEnd ? shiftMins(existingEnd) : undefined;

            return {
              ...s,
              time: shiftedTime,
              ...(shiftedEnd ? { endTime: shiftedEnd, end_time: shiftedEnd } : {}),
              staffId: dragging.currentStaffId,
            };
          }) || [];

          // Packages/products/memberships can each be assigned to their own staff too —
          // previously only `services` was shifted here, so dragging the chip instance
          // that only existed because of a package/product/membership assignment (no
          // service for that staff) silently updated nothing at all.
          const shiftOtherItems = (items: any[] | undefined) =>
            (items || []).map((it: any) => {
              if (!matchesDraggedStaff(it.staffId)) return it;
              return { ...it, time: shiftMins(it.time || dragging.originalStart), staffId: dragging.currentStaffId };
            });
          const updatedPackageItems    = shiftOtherItems(orig.packageItems);
          const updatedProductItems    = shiftOtherItems(orig.productItems);
          const updatedMembershipItems = shiftOtherItems(orig.membershipItems);

          const newPrimaryStaffId = String(orig.staffId) === String(dragging.originalStaffId)
            ? dragging.currentStaffId
            : orig.staffId;

          updateBooking({
            ...orig,
            startTime: newStart,
            endTime: newEnd,
            staffId: newPrimaryStaffId,
            services: updatedServices,
            packageItems: updatedPackageItems,
            productItems: updatedProductItems,
            membershipItems: updatedMembershipItems,
          }).catch((err: any) => {
            console.error("Unable to reschedule appointment", err?.message);
            showError(err?.message || "Couldn't move this appointment — it's been reverted to its original slot.");
          });
          justDraggedRef.current = true;
          setTimeout(() => { justDraggedRef.current = false; }, 300);
        } catch (err) {
          console.error("Drag-drop reschedule failed", err);
        } finally {
          setDragging(null);
        }
        return;
      }

      if (dragCandidateRef.current) {
        setDragCandidate(null);
      }
    }

    // If the mouse is released outside the browser window entirely (over
    // devtools, another app, the taskbar) no "mouseup" ever reaches window —
    // the drag would otherwise be stuck forever with no way to end it. Losing
    // focus mid-drag cancels back to the original slot rather than guessing
    // where the pointer ended up.
    function onBlur() {
      setDragging(null);
      setDragCandidate(null);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [isDragActive, intervalMins, updateBooking, COL_WIDTH, visibleStaff]);

  useEffect(() => {
    if (!resizing) return;
    function onMouseMove(e: MouseEvent) {
      e.preventDefault();
      setResizing((prev) => {
        if (!prev) return null;
        const delta = e.clientY - prev.startY;
        const rawH = prev.originalHeight + delta;
        const snapped = Math.round(rawH / SLOT_HEIGHT) * SLOT_HEIGHT;
        return { ...prev, currentHeight: Math.max(SLOT_HEIGHT, snapped) };
      });
    }
    function onMouseUp() {
      const resizing = resizingRef.current;
      if (!resizing) return;
      try {
      const [sh, sm] = resizing.booking.startTime.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const addedMins = (resizing.currentHeight / SLOT_HEIGHT) * intervalMins;
      const endMins = startMins + addedMins;
      // The calendar grid (and duration math elsewhere) assumes a single
      // calendar day — dragging past midnight produces an invalid hour
      // (e.g. "26:00") with no day rollover, which then renders as a
      // garbled/oversized chip. Reject it here, same as the "book past
      // midnight" guard in AppointmentModal's validate().
      if (endMins > 24 * 60) {
        showError("Appointments can't run past midnight — choose a shorter duration or split it into two bookings.");
        return;
      }
      const eh = Math.floor(endMins / 60);
      const em = Math.round(endMins % 60);
      const newEnd = `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
      const orig = (resizing.booking as any)._originalBooking || resizing.booking;

      const startStr = `${sh.toString().padStart(2, "0")}:${sm.toString().padStart(2, "0")}`;
      if (isTimeRangeUnavailable(orig.staffId || resizing.booking.staffId, startStr, newEnd)) {
        showError("That staff member already has an appointment or is blocked at this time — pick another duration.");
        return;
      }

      // Only extend the service(s) belonging to the staff whose chip was actually
      // resized — other staff's services in the same multi-staff booking must stay put.
      const resizedServices = (orig.services || []).filter((s: any) =>
        s.staffId ? String(s.staffId) === String(resizing.staffId) : String(orig.staffId) === String(resizing.staffId)
      );
      const lastResizedSvc = resizedServices[resizedServices.length - 1];
      const updatedServices = (orig.services || []).map((s: any) =>
        s === lastResizedSvc ? { ...s, endTime: newEnd, end_time: newEnd } : s
      );

      updateBooking({ ...orig, endTime: newEnd, services: updatedServices }).catch((err: any) => {
        console.error("Unable to resize appointment", err?.message);
        showError(err?.message || "Couldn't resize this appointment — it's been reverted.");
      });
      } catch (err) {
        console.error("Resize failed", err);
      } finally {
        setResizing(null);
      }
    }
    function onBlur() {
      setResizing(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [!!resizing, intervalMins, updateBooking]);

  const dayBookings = useMemo(() => {
    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    return bookings
      .filter((b) => b.date === currentDate)
      .map((b) => {
        if (!b.services || b.services.length === 0) return { ...b, _originalBooking: b };

        let minStartMins = Infinity;
        let maxEndMins = -Infinity;

        b.services.forEach(svc => {
          const start = svc.time || b.startTime;
          const end = (svc as any).endTime || (svc as any).end_time || addMinutes(start, (svc as any).duration || 30);
          minStartMins = Math.min(minStartMins, toMins(start));
          maxEndMins = Math.max(maxEndMins, toMins(end));
        });

        const hStart = Math.floor(minStartMins / 60);
        const mStart = Math.round(minStartMins % 60);
        const overallStartTime = `${hStart.toString().padStart(2, "0")}:${mStart.toString().padStart(2, "0")}`;

        const hEnd = Math.floor(maxEndMins / 60);
        const mEnd = Math.round(maxEndMins % 60);
        const overallEndTime = `${hEnd.toString().padStart(2, "0")}:${mEnd.toString().padStart(2, "0")}`;

        return {
          ...b,
          _originalBooking: b,
          startTime: overallStartTime,
          endTime: overallEndTime,
          staffId: b.staffId || b.services[0]?.staffId,
        };
      })
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [bookings, currentDate]);

  // Primitive identity of the current drag, extracted so the memo below only
  // recomputes when WHICH booking/column is being dragged changes — not on
  // every mousemove tick, which is when `dragging`'s own currentTop mutates.
  const draggingBookingId = dragging?.booking.id ?? null;
  const draggingOriginalStaffId = dragging?.originalStaffId ?? null;
  const draggingCurrentStaffId = dragging?.currentStaffId ?? null;

  // Precomputed once per staff column, independent of the live drag/resize
  // pixel values (currentTop/currentHeight) that change on every mousemove —
  // only the drag's booking/column IDENTITY (which booking, which columns)
  // is a dependency. Previously this filter + O(n log n) collision-layout
  // sort ran inline inside the render loop for every staff column on every
  // mousemove tick while dragging/resizing, which was the main source of
  // drag jank on a day with several staff/appointments.
  const staffLayouts = useMemo(() => {
    const map = new Map<string, { staffBookings: { booking: Booking; staffStart: string; staffEnd: string }[]; overlapLayout: Map<string, { col: number; totalCols: number }> }>();
    const toMinsLocal = (t: string) => { const [hh, mm] = (t || "00:00").split(":").map(Number); return hh * 60 + mm; };
    const clampSameDayEnd = (start: string, end: string) => (toMinsLocal(end) <= toMinsLocal(start) ? "23:59" : end);

    visibleStaff.forEach((staff) => {
      const staffBookings = dayBookings
        .filter((b) => {
          if (draggingBookingId === b.id
              && (staff.id === draggingOriginalStaffId || staff.id === draggingCurrentStaffId)) {
            return draggingCurrentStaffId === staff.id;
          }
          if (getStaffSegments(b, staff.id).length > 0) return true;
          const anyItemHasStaff =
            (b.services || []).some((s: any) => s.staffId) ||
            (b.packageItems || []).some((p: any) => p.staffId) ||
            (b.productItems || []).some((p: any) => p.staffId) ||
            (b.membershipItems || []).some((m: any) => m.staffId);
          if (b.staffId && String(b.staffId) === String(staff.id) && !anyItemHasStaff) return true;
          return false;
        })
        .map((b) => {
          const segs = getStaffSegments(b, staff.id);
          const staffStart = segs.length > 0
            ? segs.reduce((min, s) => toMinsLocal(s.time) < toMinsLocal(min) ? s.time : min, segs[0].time)
            : b.startTime;
          const staffEnd = segs.length > 0
            ? segs.reduce((max, s) => toMinsLocal(s.endTime) > toMinsLocal(max) ? s.endTime : max, segs[0].endTime)
            : clampSameDayEnd(staffStart, b.endTime);
          return { booking: b, staffStart, staffEnd };
        })
        .filter(({ staffStart, staffEnd }) => !isTimeRangeUnavailable(staff.id, staffStart, staffEnd));

      const overlapLayout = computeOverlapLayout(
        staffBookings.map(({ booking: b, staffStart, staffEnd }) => ({
          id: `${b.id}-${staff.id}`,
          startMin: toMinsLocal(staffStart),
          endMin: toMinsLocal(staffEnd),
        }))
      );

      map.set(staff.id, { staffBookings, overlapLayout });
    });

    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayBookings, visibleStaff, dayBlocked, staffSchedules, currentDate, draggingBookingId, draggingOriginalStaffId, draggingCurrentStaffId]);

  const nowPx = timeToPx(nowTime);
  const isInteracting = !!(dragging || resizing);
  const totalWidth = visibleStaff.length * COL_WIDTH;
  const totalGridHeight = slots.length * SLOT_HEIGHT;

  const isSlotBlocked = useCallback((staffId: string, time: string) => {
    return dayBlocked.some((b) => b.staffId === staffId && b.startTime <= time && time < b.endTime);
  }, [dayBlocked]);

  const isSlotBooked = useCallback((staffId: string, slotTime: string) => {
    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const slotMins = toMins(slotTime);
    return dayBookings.some((b) => {
      if ((b.status as string) === "Cancelled") return false;
      const segs = getStaffSegments(b, staffId);
      if (segs.length > 0) {
        return segs.some((s) => slotMins >= toMins(s.time) && slotMins < toMins(s.endTime));
      }
      if (String(b.staffId) === String(staffId)) {
        return slotMins >= toMins(b.startTime) && slotMins < toMins(b.endTime);
      }
      return false;
    });
  }, [dayBookings]);

  const isSlotOffHours = useCallback((staffId: string, slotTime: string): boolean => {
    const hours = getStaffWorkHours(staffId);
    if (!hours) return false;
    if (!hours.isAvailable) return true;
    if (!hours.startTime || !hours.endTime) return false;
    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const slot = toMins(slotTime);
    const start = toMins(hours.startTime);
    const end = toMins(hours.endTime);
    if (start <= end) return slot < start || slot >= end;
    return slot >= end && slot < start;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffSchedules, currentDate]);

  function handleRemoveBlockTime(staffId: string) {
    dayBlocked.filter((b) => b.staffId === staffId).forEach((b) => deleteBlockedTime(b.id));
    setStaffMenu(null);
  }

  return (
    <div
      ref={containerRef}
      className={`dv-root${isInteracting ? " dv-root--interacting" : ""}${dragging ? " dv-root--dragging" : ""}${resizing ? " dv-root--resizing" : ""}`}
      onClick={() => setStaffMenu(null)}
    >
      {/* Single scrollable container — header row and gutter are CSS position:sticky
          inside it, so the browser keeps them in sync with the grid natively (no JS
          scrollTop mirroring, which used to visibly lag behind during fast scrolling). */}
      <div ref={scrollBodyRef} className="dv-scroll-body">
        <div className="dv-scroll-content" style={{ width: totalWidth + GUTTER_WIDTH }}>
          {/* ── Sticky header row (corner + staff headers) ── */}
          <div className="dv-header-row">
            <div className="dv-gutter__header" />
            <div className="dv-staff-header" style={{ width: totalWidth }}>
              {visibleStaff.map((staff) => {
                const isDragTarget = dragging?.currentStaffId === staff.id && dragging.booking.staffId !== staff.id;
                return (
                  <div
                    key={staff.id}
                    className={`dv-staff-col-header${isDragTarget ? " dv-staff-col-header--drag-target" : ""}`}
                    style={{ width: COL_WIDTH }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setStaffMenu((prev) => prev?.staffId === staff.id ? null : { staffId: staff.id, x: rect.left, y: rect.bottom + 4 });
                    }}
                  >
                    <Avatar staff={staff} size={36} />
                    <span className="dv-staff-name" style={{ maxWidth: COL_WIDTH - 8 }}>{staff.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Sticky-left time gutter + grid columns ── */}
          <div className="dv-body-row">
            <div className="dv-gutter">
              {slots.map((t) => {
                const [, m] = t.split(":").map(Number);
                return (
                  <div key={t} className={`dv-gutter__slot${m === 0 ? " dv-gutter__slot--hour" : ""}`}>
                    <span className={`dv-gutter__label${m === 0 ? " dv-gutter__label--hour" : ""}`}>
                      {formatTime12(t)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="dv-grid" style={{ width: totalWidth }}>
            {visibleStaff.map((staff, staffIndex) => {
              const isDragTarget = dragging?.currentStaffId === staff.id && dragging.booking.staffId !== staff.id;
              const isFirstCol = staffIndex === 0;
              // Compute once per staff column — used by slot loop AND overlay
              const staffHours = getStaffWorkHours(staff.id);
              const staffBlockedList = dayBlockedByStaff.get(staff.id) ?? EMPTY_BLOCKS;

              return (
                <div
                  key={staff.id}
                  className={`dv-staff-col${isDragTarget ? " dv-staff-col--drag-target" : ""}`}
                  style={{ width: COL_WIDTH }}
                >
                  {/* Grid Lines Layer (z-index 2) */}
                  <div className="dv-grid-lines">
                    {slots.map((t) => {
                      const [, m] = t.split(":").map(Number);
                      return <div key={`grid-${t}`} className={`calendar-grid-line${m === 0 ? " calendar-grid-line--hour" : ""}`} />;
                    })}
                  </div>

                  {slots.map((t) => {
                    const [, m] = t.split(":").map(Number);
                    const offHours = isSlotOffHours(staff.id, t);
                    const blocked = isSlotBlocked(staff.id, t);
                    const booked = !blocked && !offHours && isSlotBooked(staff.id, t);
                    const unavailable = blocked || booked || offHours;
                    return (
                      <div
                        key={t}
                        onClick={() => {
                          if (justDraggedRef.current || unavailable || isInteracting) return;
                          onSlotClick(staff.id, t);
                        }}
                        className={`dv-slot${m === 0 ? " dv-slot--hour" : ""}${blocked ? " dv-slot--blocked" : ""}${booked ? " dv-slot--booked" : ""}${offHours ? " dv-slot--off-hours" : ""}${isInteracting ? " dv-slot--interacting" : ""}`}
                        style={isInteracting ? { cursor: "grabbing" } : undefined}
                        onMouseEnter={(e) => { if (!unavailable && !isInteracting) (e.currentTarget as HTMLElement).classList.add("dv-slot--hover"); }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).classList.remove("dv-slot--hover"); }}
                      />
                    );
                  })}

                  {/* ── Off-hours overlay — uses pre-computed staffHours ── */}
                  {staffHours && (() => {
                    if (!staffHours.isAvailable) {
                      return (
                        <div
                          className="dv-off-hours-overlay dv-off-hours-overlay--dayoff"
                          style={{ top: 0, height: totalGridHeight }}
                          title="Day off"
                        >
                          <div className="dv-off-hours-overlay__label">Day Off</div>
                        </div>
                      );
                    }

                    if (!staffHours.startTime || !staffHours.endTime) return null;

                    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
                    const startMins = toMins(staffHours.startTime);
                    const endMins = toMins(staffHours.endTime);
                    const isOvernight = startMins > endMins;

                    if (isOvernight) {
                      const midTop = timeToPx(staffHours.endTime);
                      const midH = timeToPx(staffHours.startTime) - midTop;
                      return midH > 0 ? (
                        <div
                          className="dv-off-hours-overlay"
                          style={{ top: midTop, height: midH }}
                          title={`Not available ${formatTime12(staffHours.endTime)} – ${formatTime12(staffHours.startTime)}`}
                        />
                      ) : null;
                    }

                    const preH = timeToPx(staffHours.startTime);
                    const postTop = timeToPx(staffHours.endTime);
                    const postH = totalGridHeight - postTop;

                    return (
                      <>
                        {preH > 0 && (
                          <div
                            className="dv-off-hours-overlay"
                            style={{ top: 0, height: preH }}
                            title={`Not available before ${formatTime12(staffHours.startTime)}`}
                          />
                        )}
                        {postH > 0 && postTop < totalGridHeight && (
                          <div
                            className="dv-off-hours-overlay"
                            style={{ top: postTop, height: postH }}
                            title={`Not available after ${formatTime12(staffHours.endTime)}`}
                          />
                        )}
                      </>
                    );
                  })()}

                  {/* ── Blocked time overlays — pre-grouped, no filter per render ── */}
                  {staffBlockedList.map((b) => (
                    <div
                      key={b.id}
                      className="dv-block-overlay"
                      style={{ top: timeToPx(b.startTime), height: durationToPx(b.startTime, b.endTime) }}
                      title={b.reason ? `Blocked: ${b.reason}` : "Blocked"}
                    >
                      <div className="dv-block-overlay__content">
                        <span className="dv-block-overlay__label">🚫 {b.reason || "Blocked"}</span>
                        <div className="dv-block-overlay__actions">
                          <button
                            className="dv-block-overlay__btn"
                            title="Edit block time"
                            onClick={(e) => { e.stopPropagation(); onEditBlockTime(b); }}
                          >
                            ✏️
                          </button>
                          <button
                            className="dv-block-overlay__btn dv-block-overlay__btn--delete"
                            title="Delete block time"
                            onClick={(e) => { e.stopPropagation(); deleteBlockedTime(b.id); }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(() => {
                    // Precomputed in staffLayouts (see its definition above) —
                    // recomputed only when the underlying data or the drag's
                    // identity changes, not on every mousemove-driven render.
                    const layout = staffLayouts.get(staff.id);
                    const staffBookings = layout?.staffBookings ?? [];
                    const overlapLayout = layout?.overlapLayout;

                    return staffBookings.map(({ booking: b, staffStart, staffEnd }) => {
                      // Match by staff column too — the same booking can render in up to
                      // one chip per staff it has items assigned to, and only the chip in
                      // the column actually being dragged/resized should track the live
                      // interaction. Matching by booking id alone made every column's chip
                      // for this booking snap to the same dragged position together.
                      const isDraggingThis = dragging?.booking.id === b.id && dragging.currentStaffId === staff.id;
                      const isResizingThis = resizing?.booking.id === b.id && resizing.staffId === staff.id;
                      const chipTop    = isDraggingThis ? dragging!.currentTop : timeToPx(staffStart);
                      const chipHeight = isResizingThis ? resizing!.currentHeight : durationToPx(staffStart, staffEnd);
                      const key = `${b.id}-${staff.id}`;
                      // Full width while being dragged/resized so layout doesn't jump mid-interaction
                      const { col, totalCols } = (isDraggingThis || isResizingThis)
                        ? { col: 0, totalCols: 1 }
                        : overlapLayout?.get(key) ?? { col: 0, totalCols: 1 };
                      return (
                        <BookingChip
                          key={key}
                          booking={b}
                          nowTs={nowTsForStatus}
                          staffStart={staffStart}
                          staffEnd={staffEnd}
                          chipTop={chipTop}
                          chipHeight={chipHeight}
                          chipCol={col}
                          chipTotalCols={totalCols}
                          slotHeight={SLOT_HEIGHT}
                          intervalMins={intervalMins}
                          isDraggingThis={isDraggingThis}
                          isResizingThis={isResizingThis}
                          dragging={dragging}
                          resizing={resizing}
                          justDraggedRef={justDraggedRef}
                          isInteracting={isInteracting}
                          isHighlighted={String(b.id) === String(highlightedBookingId)}
                          staffId={staff.id}
                          visibleStaffIndex={staffIndex}
                          onEdit={onEditBooking}
                          onCancel={onCancelBooking}
                          onDelete={onDeleteBooking}
                          onOpenTip={openTip}
                          onCloseTip={closeTip}
                          onStartDragCandidate={handleStartDragCandidate}
                          onStartResize={handleStartResize}
                        />
                      );
                    });
                  })()}

                  {isToday && (
                    <div className="dv-now-line" style={{ top: nowPx }}>
                      {isFirstCol && <div className="dv-now-line__label">{nowTime}</div>}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      {dayBookings.length === 0 && !isInteracting && (
        // Rendered as a sibling of .dv-scroll-body (the actual scrolling
        // element), not inside it — its position:absolute needs to resolve
        // against .dv-root (the fixed-size viewport), or it centers itself
        // against the FULL scrollable content height instead of the visible
        // area, drifting away as soon as the grid is scrolled.
        <div className="dv-empty-state">
          <div className="dv-empty-state__icon">📅</div>
          <div className="dv-empty-state__title">No appointments today</div>
          <div className="dv-empty-state__sub">Click any time slot to add one</div>
        </div>
      )}

      {hovered && (
        <BookingTooltipCard
          booking={hovered.booking}
          staffList={staffList}
          anchorEl={hovered.el}
          onMouseEnter={keepTip}
          onMouseLeave={closeTip}
        />
      )}

      {staffMenu && (
        <div ref={staffMenuRef} className="dv-staff-menu" style={{ top: staffMenu.y, left: staffMenu.x }}>
          <button
            className="dv-staff-menu__item"
            onClick={() => { onBlockTime(staffMenu.staffId); setStaffMenu(null); }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            🚫 Add Block Time
          </button>
          {(dayBlockedByStaff.get(staffMenu.staffId)?.length ?? 0) > 0 && (
            <>
              <div className="dv-staff-menu__divider" />
              <button
                className="dv-staff-menu__item"
                onClick={() => handleRemoveBlockTime(staffMenu.staffId)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                ✅ Remove Block Time
              </button>
            </>
          )}
        </div>
      )}
      {dragErrorOverlay}
    </div>
  );
};

export default React.memo(DayView);
