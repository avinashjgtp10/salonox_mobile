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
import { useListClientPackagesQuery } from "../../../../services/api/endpoints/packages.endpoints";
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
function getStaffSegments(b: any, staffId: string): StaffSegment[] {
  const segs: StaffSegment[] = [];
  (b.services || []).forEach((s: any) => {
    if (String(s.staffId) !== String(staffId)) return;
    const time = s.time || b.startTime;
    segs.push({ time, endTime: s.endTime || addMinutes(time, s.duration || 30) });
  });
  const otherItems = [
    ...(b.packageItems || []),
    ...(b.productItems || []),
    ...(b.membershipItems || []),
  ];
  otherItems.forEach((it: any) => {
    if (String(it.staffId) !== String(staffId)) return;
    const time = it.time || b.startTime;
    segs.push({ time, endTime: addMinutes(time, 30) });
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
  const { blockedTimes, deleteBlockedTime, updateBooking, staffList, selectedStaffId, bookings, staffSchedules } = useSchedulerContext();

  const visibleStaff = useMemo(
    () => selectedStaffId ? staffList.filter((s) => s.id === selectedStaffId) : staffList,
    [staffList, selectedStaffId],
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

  // Fetch the hovered client's active packages for tooltip fallback coverage detection
  const hoveredClientId = hovered?.booking?.clientId && String(hovered.booking.clientId) !== "walk-in"
    ? String(hovered.booking.clientId) : undefined;
  const { data: hoveredPkgData } = useListClientPackagesQuery(
    { clientId: hoveredClientId, status: "Active", limit: 50 },
    { skip: !hoveredClientId }
  );
  const tooltipCoveredServices = useMemo(() => {
    const map = new Map<string, number>();
    (hoveredPkgData?.items ?? []).forEach((pkg: any) => {
      pkg.services.forEach((svc: any) => {
        if (svc.remainingSessions > 0) {
          const key = (svc.serviceName || "").toLowerCase();
          map.set(key, (map.get(key) ?? 0) + svc.remainingSessions);
        }
      });
    });
    return map;
  }, [hoveredPkgData]);

  // ── Drag / resize state ───────────────────────────────────────────────────
  const [dragging, setDragging] = useState<{
    booking: Booking; startX: number; startY: number;
    originalTop: number; currentTop: number;
    currentStaffId: string; currentStaffIndex: number;
    originalStaffId: string;
    originalStart: string;
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

  // Stable handlers for BookingChip — useCallback(fn,[]) since setters are stable
  const handleStartDragCandidate = useCallback((candidate: DragCandidate) => {
    setHovered(null);
    setDragCandidate(candidate);
  }, []);

  const handleStartResize = useCallback((state: ResizeState) => {
    setResizing(state);
  }, []);

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

  useEffect(() => {
    if (!dragging && !dragCandidate) return;

    function onMouseMove(e: MouseEvent) {
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
        });
        setDragCandidate(null);
      }
    }

    function onMouseUp() {
      if (dragging) {
        const totalMins = (dragging.currentTop / SLOT_HEIGHT) * intervalMins;
        const h = Math.floor(totalMins / 60);
        const m = Math.round(totalMins % 60);
        const newStart = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const [sh, sm] = dragging.originalStart.split(":").map(Number);
        const [eh, em] = dragging.booking.endTime.split(":").map(Number);
        const duration = eh * 60 + em - (sh * 60 + sm);
        const newEnd = addMinutes(newStart, duration);
        const orig = (dragging.booking as any)._originalBooking || dragging.booking;

        if (isTimeRangeUnavailable(dragging.currentStaffId, newStart, newEnd)) {
          setDragging(null);
          return;
        }

        const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
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
        });
        justDraggedRef.current = true;
        setTimeout(() => { justDraggedRef.current = false; }, 300);
        setDragging(null);
        return;
      }

      if (dragCandidate) {
        setDragCandidate(null);
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [dragging, dragCandidate, intervalMins, updateBooking, COL_WIDTH, visibleStaff]);

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
      if (!resizing) return;
      const [sh, sm] = resizing.booking.startTime.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const addedMins = (resizing.currentHeight / SLOT_HEIGHT) * intervalMins;
      const endMins = startMins + addedMins;
      const eh = Math.floor(endMins / 60);
      const em = Math.round(endMins % 60);
      const newEnd = `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
      const orig = (resizing.booking as any)._originalBooking || resizing.booking;

      const startStr = `${sh.toString().padStart(2, "0")}:${sm.toString().padStart(2, "0")}`;
      if (isTimeRangeUnavailable(orig.staffId || resizing.booking.staffId, startStr, newEnd)) {
        setResizing(null);
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

      updateBooking({ ...orig, endTime: newEnd, services: updatedServices });
      setResizing(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [resizing, intervalMins, updateBooking]);

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

  const nowPx = timeToPx(nowTime);
  const isInteracting = !!(dragging || resizing);
  const toMinsLocal = (t: string) => { const [hh, mm] = (t || "00:00").split(":").map(Number); return hh * 60 + mm; };
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

            {dayBookings.length === 0 && !isInteracting && (
              <div className="dv-empty-state">
                <div className="dv-empty-state__icon">📅</div>
                <div className="dv-empty-state__title">No appointments today</div>
                <div className="dv-empty-state__sub">Click any time slot to add one</div>
              </div>
            )}

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
                    const staffBookings = dayBookings
                      .filter((b) => {
                        // Only the segment actually being dragged needs special handling —
                        // hide it from its original column and show it only under the
                        // current drag-target column. A multi-staff booking's OTHER
                        // segments (e.g. a package on a different staff) are unrelated to
                        // this drag and must keep rendering normally in their own columns.
                        if (dragging?.booking.id === b.id
                            && (staff.id === dragging.originalStaffId || staff.id === dragging.currentStaffId)) {
                          return dragging.currentStaffId === staff.id;
                        }
                        // Per-item staff (service/package/product/membership): show chip
                        // under each item's own staff column.
                        if (getStaffSegments(b, staff.id).length > 0) return true;
                        // Backward compat: if NO item anywhere carries its own staffId,
                        // fall back to the appointment-level staffId.
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
                          : b.endTime;
                        return { booking: b, staffStart, staffEnd };
                      })
                      .filter(({ staffStart, staffEnd }) => !isTimeRangeUnavailable(staff.id, staffStart, staffEnd));

                    // Concurrent appointments for the same staff (e.g. hair-color processing
                    // time) are allowed — lay them out side-by-side instead of stacking.
                    const overlapLayout = computeOverlapLayout(
                      staffBookings.map(({ booking: b, staffStart, staffEnd }) => ({
                        id: `${b.id}-${staff.id}`,
                        startMin: toMinsLocal(staffStart),
                        endMin: toMinsLocal(staffEnd),
                      }))
                    );

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
                        : overlapLayout.get(key) ?? { col: 0, totalCols: 1 };
                      return (
                        <BookingChip
                          key={key}
                          booking={b}
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

      {hovered && (
        <BookingTooltipCard
          booking={hovered.booking}
          staffList={staffList}
          anchorEl={hovered.el}
          onMouseEnter={keepTip}
          onMouseLeave={closeTip}
          coveredServices={tooltipCoveredServices}
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
          <div className="dv-staff-menu__divider" />
          <button
            className="dv-staff-menu__item"
            onClick={() => handleRemoveBlockTime(staffMenu.staffId)}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            ✅ Remove Block Time
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(DayView);
