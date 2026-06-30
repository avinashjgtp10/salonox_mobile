import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../store/store";
import type { Booking, BlockedTime } from "../../types/booking.types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useSchedulerContext } from "../../store/SchedulerContext";
import type { DragCandidate, ResizeState } from "../../hooks/useDragDrop";
import { formatTime12, getCurrentTime, addMinutes } from "../../utils/timeUtils";
import Avatar from "../shared/Avatar";
import BookingTooltipCard from "../shared/BookingTooltipCard";
import BookingChip from "./BookingChip";
import "../../styles/DayView.scss";

// Stable empty array — avoids allocating a new [] on every render for staff with no blocks
const EMPTY_BLOCKS: BlockedTime[] = [];

// Must match .dv-gutter width and .dv-header-row height in DayView.scss
const GUTTER_WIDTH = 72;
const HEADER_HEIGHT = 56;

// Moved outside component — pure function, no closure needed
function to24h(t: string): string {
  if (!t || (!t.includes("AM") && !t.includes("PM"))) return t;
  const [timePart, period] = t.split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
  const { blockedTimes, deleteBlockedTime, updateBooking, staffList, selectedStaffId, bookings } = useSchedulerContext();

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

  // Date-specific shift schedules
  const dateShifts = useSelector((s: RootState) => (s as any).shift?.shifts ?? {});

  function getStaffWorkHours(staffId: string) {
    const shift = dateShifts[staffId]?.[currentDate];
    if (shift === undefined) return null;
    if (!shift.isAvailable) return { startTime: "", endTime: "", isAvailable: false };
    const startTime = to24h(shift.startTime || "");
    const endTime   = to24h(shift.endTime   || "");
    if (!startTime || !endTime) return null;
    return { startTime, endTime, isAvailable: true };
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

        const updatedServices = orig.services?.map((s: any) => {
          const matchesDraggedStaff = s.staffId
            ? String(s.staffId) === String(dragging.originalStaffId)
            : String(orig.staffId) === String(dragging.originalStaffId);

          // Only shift the time of the staff/service group actually being dragged —
          // other staff's services in the same multi-staff booking must stay put.
          if (!matchesDraggedStaff) return s;

          const sMins = toMins(s.time || dragging.originalStart) + deltaMins;
          const sh = Math.floor(sMins / 60);
          const sm = Math.round(sMins % 60);
          const shiftedTime = `${sh.toString().padStart(2, "0")}:${sm.toString().padStart(2, "0")}`;

          return {
            ...s,
            time: shiftedTime,
            staffId: dragging.currentStaffId,
          };
        }) || [];

        const newPrimaryStaffId = String(orig.staffId) === String(dragging.originalStaffId)
          ? dragging.currentStaffId
          : orig.staffId;

        updateBooking({
          ...orig,
          startTime: newStart,
          endTime: newEnd,
          staffId: newPrimaryStaffId,
          services: updatedServices,
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
      const staffServices = (b.services || []).filter((s: any) => String(s.staffId) === String(staffId));
      if (staffServices.length > 0) {
        return staffServices.some((s: any) => {
          const svcStart = s.time || b.startTime;
          const svcEnd = (s as any).endTime || (s as any).end_time || addMinutes(svcStart, (s as any).duration || 30);
          return slotMins >= toMins(svcStart) && slotMins < toMins(svcEnd);
        });
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
  }, [dateShifts, currentDate]);

  function handleRemoveBlockTime(staffId: string) {
    dayBlocked.filter((b) => b.staffId === staffId).forEach((b) => deleteBlockedTime(b.id));
    setStaffMenu(null);
  }

  if (staffList.length === 0) {
    // Scheduler.tsx already handles the confirmed "no staff" case (staffReady && !hasStaff).
    // When DayView is rendered but staffList is empty we are still in the loading phase,
    // so always show the loader — never show "Add Staff" here.
    return (
      <div className="dv-loading">
        <div className="dv-loading__spinner" />
        <span className="dv-loading__text">Loading calendar…</span>
      </div>
    );
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

                  {dayBookings
                    .filter((b) => {
                      if (dragging?.booking.id === b.id) return dragging.currentStaffId === staff.id;
                      // Per-service staff: show chip under each service's staff column
                      if ((b.services || []).some((s: any) => String(s.staffId) === String(staff.id))) return true;
                      // Backward compat: if no service has a staffId, fall back to appointment-level staffId
                      if (b.staffId === staff.id && !(b.services || []).some((s: any) => s.staffId)) return true;
                      return false;
                    })
                    .map((b) => {
                      const isDraggingThis = dragging?.booking.id === b.id;
                      const isResizingThis = resizing?.booking.id === b.id;
                      const staffServices = (b.services || []).filter((s: any) => String(s.staffId) === String(staff.id));
                      const staffStart = staffServices.length > 0
                        ? staffServices.reduce((min: string, s: any) =>
                            toMinsLocal(s.time || b.startTime) < toMinsLocal(min) ? (s.time || b.startTime) : min,
                            staffServices[0].time || b.startTime)
                        : b.startTime;
                      const staffEnd = staffServices.length > 0
                        ? staffServices.reduce((max: string, s: any) => {
                            const end = s.endTime || addMinutes(s.time || b.startTime, s.duration || 30);
                            return toMinsLocal(end) > toMinsLocal(max) ? end : max;
                          }, (() => { const s0 = staffServices[0] as any; return s0.endTime || addMinutes(s0.time || b.startTime, s0.duration || 30); })())
                        : b.endTime;
                      if (isTimeRangeUnavailable(staff.id, staffStart, staffEnd)) return null;
                      const chipTop    = isDraggingThis ? dragging!.currentTop : timeToPx(staffStart);
                      const chipHeight = isResizingThis ? resizing!.currentHeight : durationToPx(staffStart, staffEnd);
                      return (
                        <BookingChip
                          key={`${b.id}-${staff.id}`}
                          booking={b}
                          staffStart={staffStart}
                          staffEnd={staffEnd}
                          chipTop={chipTop}
                          chipHeight={chipHeight}
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
                    })}

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
