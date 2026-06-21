import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../store/store";
import type { Booking, BlockedTime } from "../../types/scheduler-types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useBookings } from "../../hooks/useBookings";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatTime12, getCurrentTime, addMinutes, generateTimeSlots } from "../../utils/timeUtils";
import Avatar from "../shared/Avatar";
import BookingTooltipCard from "../shared/BookingTooltipCard";
import "../../styles/DayView.scss";

interface DayViewProps {
  onSlotClick: (staffId: string, time: string) => void;
  onEditBooking: (booking: Booking) => void;
  onBlockTime: (staffId: string) => void;
  onEditBlockTime: (block: BlockedTime) => void;
}

const DayView: React.FC<DayViewProps> = ({
  onSlotClick, onEditBooking, onBlockTime, onEditBlockTime,
}) => {
  const { currentDate, timeToPx, durationToPx, intervalMins, interval } = useScheduler();
  const { blockedTimes, deleteBlockedTime, updateBooking, staffList, selectedStaffId } = useSchedulerContext();
  const { getBookingsByDate } = useBookings();

  const visibleStaff = selectedStaffId
    ? staffList.filter((s) => s.id === selectedStaffId)
    : staffList;

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
  }, []);

  const COL_WIDTH = containerWidth > 0 && visibleStaff.length > 0
  ? Math.max(160, Math.floor(containerWidth / visibleStaff.length))
  : 160;

  const [nowTime, setNowTime] = useState(getCurrentTime());
  const [staffMenu, setStaffMenu] = useState<{ staffId: string; x: number; y: number } | null>(null);

  // ── Hover tooltip ─────────────────────────────────────────────────────────
  const [hovered, setHovered] = useState<{ booking: Booking; el: HTMLElement } | null>(null);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout>>();
  function openTip(booking: Booking, el: HTMLElement) {
    clearTimeout(tipTimerRef.current);
    setHovered({ booking, el });
  }
  function closeTip() { tipTimerRef.current = setTimeout(() => setHovered(null), 150); }
  function keepTip()  { clearTimeout(tipTimerRef.current); }

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
    booking: Booking; startY: number; originalHeight: number; currentHeight: number;
  } | null>(null);

  const dayBlocked = blockedTimes.filter((b) => b.date === currentDate);

  // Read date-specific shifts so working-hour blocks only apply to weeks
  // that were explicitly configured — not recurring across all future weeks.
  const dateShifts = useSelector((s: RootState) => (s as any).shift?.shifts ?? {});

  // state.shift.shifts stores times in 12h format ("10:30 AM"); DayView's
  // toMins() expects plain 24h "HH:MM".  Convert here before returning.
  function to24h(t: string): string {
    if (!t || (!t.includes("AM") && !t.includes("PM"))) return t;
    const [timePart, period] = t.split(" ");
    let [h, m] = timePart.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  function getStaffWorkHours(staffId: string) {
    const shift = dateShifts[staffId]?.[currentDate];
    if (shift === undefined) return null; // no schedule for this date → fully available
    if (!shift.isAvailable) return { startTime: "", endTime: "", isAvailable: false };
    const startTime = to24h(shift.startTime || "");
    const endTime   = to24h(shift.endTime   || "");
    if (!startTime || !endTime) return null; // incomplete hours → don't block
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
      if (!hours.isAvailable) return true; // Entire day is blocked
      if (hours.startTime && hours.endTime) {
        const shiftStart = toMins(hours.startTime);
        const shiftEnd = toMins(hours.endTime);
        if (shiftStart <= shiftEnd) {
          if (apptStart < shiftStart || apptEnd > shiftEnd) return true;
        } else {
          // Overnight shift: 22:00 to 06:00
          if (apptStart >= shiftEnd && apptEnd <= shiftStart) return true;
        }
      }
    }
    return false;
  }

  const gutterBodyRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const staffMenuRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (staffMenuRef.current && !staffMenuRef.current.contains(e.target as Node))
        setStaffMenu(null);
    }
    if (staffMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [staffMenu]);

  useEffect(() => {
    function scrollToNow() {
      if (!scrollBodyRef.current) return;
      // clientHeight is 0 when the element is hidden (e.g., background tab).
      // Wait for layout to be computed before scrolling.
      if (scrollBodyRef.current.clientHeight === 0) {
        requestAnimationFrame(scrollToNow);
        return;
      }
      const now = new Date();
      const px = ((now.getHours() * 60 + now.getMinutes()) / intervalMins) * SLOT_HEIGHT;
      scrollBodyRef.current.scrollTop = Math.max(0, px - 150);
    }
    const t = setTimeout(() => requestAnimationFrame(scrollToNow), 150);
    return () => clearTimeout(t);
  }, [intervalMins]);

  function onBodyScroll() {
    if (syncing.current) return;
    syncing.current = true;
    if (gutterBodyRef.current && scrollBodyRef.current)
      gutterBodyRef.current.scrollTop = scrollBodyRef.current.scrollTop;
    if (headerRef.current && scrollBodyRef.current)
      headerRef.current.scrollLeft = scrollBodyRef.current.scrollLeft;
    syncing.current = false;
  }

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
            currentStaffIndex: newIndex
          };
        });
        return;
      }

      if (dragCandidate) {
        const deltaY = e.clientY - dragCandidate.initialY;
        const deltaX = e.clientX - dragCandidate.initialX;
        if (Math.abs(deltaY) < 6 && Math.abs(deltaX) < 6) return;

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

        // Shift ALL services by the time delta — only reassign staffId for services that
        // belonged to the dragged staff column (services on other staff stay on that staff).
        const updatedServices = orig.services?.map((s: any) => {
          const matchesDraggedStaff = s.staffId
            ? String(s.staffId) === String(dragging.originalStaffId)
            : String(orig.staffId) === String(dragging.originalStaffId);

          const sMins = toMins(s.time || dragging.originalStart) + deltaMins;
          const sh = Math.floor(sMins / 60);
          const sm = Math.round(sMins % 60);
          const shiftedTime = `${sh.toString().padStart(2, "0")}:${sm.toString().padStart(2, "0")}`;

          return {
            ...s,
            time: shiftedTime,
            staffId: matchesDraggedStaff ? dragging.currentStaffId : s.staffId,
          };
        }) || [];

        // Use newStart/newEnd directly — they preserve the original booking duration
        // (duration = orig.endTime - dragging.originalStart) shifted to the drop position.
        // Deriving end time from service.duration would produce a wrong height whenever
        // the service duration differs from the total booking duration.
        const newPrimaryStaffId = String(orig.staffId) === String(dragging.originalStaffId)
          ? dragging.currentStaffId
          : orig.staffId;

        const updatedPayload = {
          ...orig,
          startTime: newStart,
          endTime: newEnd,
          staffId: newPrimaryStaffId,
          services: updatedServices,
        };

        updateBooking(updatedPayload).catch((err: any) => {
          toast.error(err?.message || "Unable to reschedule appointment");
        });
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

      // Update duration of the last service
      const updatedServices = [...(orig.services || [])];
      if (updatedServices.length > 0) {
        const lastSvc = updatedServices[updatedServices.length - 1];
        updatedServices[updatedServices.length - 1] = { ...lastSvc, endTime: newEnd, end_time: newEnd };
      }

      updateBooking({ ...orig, endTime: newEnd, services: updatedServices });
      setResizing(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [resizing, intervalMins, updateBooking]);

  const rawDayBookings = getBookingsByDate(currentDate);
  const dayBookings = useMemo(() => rawDayBookings.map((b) => {
    if (!b.services || b.services.length === 0) return { ...b, _originalBooking: b };

    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
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
  }).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [rawDayBookings]);


  const slots = generateTimeSlots(interval as any);
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
      const staffServices = (b.services || []).filter((s: any) => s.staffId === staffId);
      if (staffServices.length > 0) {
        return staffServices.some((s: any) => {
          const svcStart = s.time || b.startTime;
          const svcEnd = (s as any).endTime || (s as any).end_time || addMinutes(svcStart, (s as any).duration || 30);
          return slotMins >= toMins(svcStart) && slotMins < toMins(svcEnd);
        });
      }
      if (b.staffId === staffId) {
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
  }, [dateShifts, currentDate, dayBlocked]);

  function handleRemoveBlockTime(staffId: string) {
    dayBlocked.filter((b) => b.staffId === staffId).forEach((b) => deleteBlockedTime(b.id));
    setStaffMenu(null);
  }

  return (
    <div
      className={`dv-root${isInteracting ? " dv-root--interacting" : ""}${dragging ? " dv-root--dragging" : ""}${resizing ? " dv-root--resizing" : ""}`}
      onClick={() => setStaffMenu(null)}
    >
      {/* ── Time gutter ── */}
      <div className="dv-gutter">
        <div className="dv-gutter__header" />
        <div ref={gutterBodyRef} className="dv-gutter__body">
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
      </div>

      {/* ── Staff columns ── */}
      <div ref={containerRef} className="dv-columns">
        <div ref={headerRef} className="dv-staff-header">
          <div className="dv-staff-header__inner" style={{ width: totalWidth }}>
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

        <div ref={scrollBodyRef} onScroll={onBodyScroll} className="dv-scroll-body">
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

              return (
                <div
                  key={staff.id}
                  className={`dv-staff-col${isDragTarget ? " dv-staff-col--drag-target" : ""}`}
                  style={{ width: COL_WIDTH }}
                >
                  {/* Grid Lines Layer (z-index 2) */}
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
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
                          if (unavailable || isInteracting) return;
                          onSlotClick(staff.id, t);
                        }}
                        className={`dv-slot${m === 0 ? " dv-slot--hour" : ""}${blocked ? " dv-slot--blocked" : ""}${booked ? " dv-slot--booked" : ""}${offHours ? " dv-slot--off-hours" : ""}${isInteracting ? " dv-slot--interacting" : ""}`}
                        style={isInteracting ? { cursor: "grabbing" } : undefined}
                        onMouseEnter={(e) => { if (!unavailable && !isInteracting) (e.currentTarget as HTMLElement).classList.add("dv-slot--hover"); }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).classList.remove("dv-slot--hover"); }}
                      />
                    );
                  })}

                  {/* ── Off-hours (shift) overlay — grey band outside working hours ── */}
                  {(() => {
                    const hours = getStaffWorkHours(staff.id);
                    if (!hours) return null;

                    if (!hours.isAvailable) {
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

                    if (!hours.startTime || !hours.endTime) return null;

                    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
                    const startMins = toMins(hours.startTime);
                    const endMins = toMins(hours.endTime);
                    const isOvernight = startMins > endMins;

                    if (isOvernight) {
                      // Blocked window sits between endTime and startTime (mid-day gap)
                      const midTop = timeToPx(hours.endTime);
                      const midH = timeToPx(hours.startTime) - midTop;
                      return midH > 0 ? (
                        <div
                          className="dv-off-hours-overlay"
                          style={{ top: midTop, height: midH }}
                          title={`Not available ${formatTime12(hours.endTime)} – ${formatTime12(hours.startTime)}`}
                        />
                      ) : null;
                    }

                    const preH = timeToPx(hours.startTime);
                    const postTop = timeToPx(hours.endTime);
                    const postH = totalGridHeight - postTop;

                    return (
                      <>
                        {preH > 0 && (
                          <div
                            className="dv-off-hours-overlay"
                            style={{ top: 0, height: preH }}
                            title={`Not available before ${formatTime12(hours.startTime)}`}
                          />
                        )}
                        {postH > 0 && postTop < totalGridHeight && (
                          <div
                            className="dv-off-hours-overlay"
                            style={{ top: postTop, height: postH }}
                            title={`Not available after ${formatTime12(hours.endTime)}`}
                          />
                        )}
                      </>
                    );
                  })()}

                  {dayBlocked.filter((b) => b.staffId === staff.id).map((b) => (
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

                      // ✅ Show booking in this column if the booking OR any of its services belongs to this staff
                      const bookingMatchesStaff = b.staffId === staff.id;
                      const serviceMatchesStaff = (b.services || []).some((s: any) => s.staffId === staff.id);
                      return bookingMatchesStaff || serviceMatchesStaff;
                    })
                    .map((b) => {
                      const isDraggingThis = dragging?.booking.id === b.id;
                      const isResizingThis = resizing?.booking.id === b.id;

                      // Services belonging to THIS staff column
                      const staffServices = (b.services || []).filter((s: any) => s.staffId === staff.id);

                      // Position chip at the earliest service time for this staff (not the overall booking start)
                      const toMinsLocal = (t: string) => { const [hh, mm] = t.split(":").map(Number); return hh * 60 + mm; };
                      const staffStart = staffServices.length > 0
                        ? staffServices.reduce((min: string, s: any) => {
                            const t = s.time || b.startTime;
                            return toMinsLocal(t) < toMinsLocal(min) ? t : min;
                          }, staffServices[0].time || b.startTime)
                        : b.startTime;
                      const staffEnd = staffServices.length > 0
                        ? staffServices.reduce((max: string, s: any) => {
                            const end = s.endTime || s.end_time || addMinutes(s.time || b.startTime, s.duration || 30);
                            return toMinsLocal(end) > toMinsLocal(max) ? end : max;
                          }, (() => { const s = staffServices[0] as any; return s.endTime || s.end_time || addMinutes(s.time || b.startTime, s.duration || 30); })())
                        : b.endTime;

                      if (isTimeRangeUnavailable(staff.id, staffStart, staffEnd)) return null;

                      const chipTop = isDraggingThis ? dragging!.currentTop : timeToPx(staffStart);
                      const chipHeight = isResizingThis ? resizing!.currentHeight : Math.max(durationToPx(staffStart, staffEnd), SLOT_HEIGHT);
                      const ps = (b.paymentStatus || "").toLowerCase();
                      const bs = (b.status || "").toLowerCase();
                      const rawStatus = ((b as any)._rawStatus || "").toLowerCase();
                      const isPaid = ps === "paid" || ps === "completed";
                      const isPartial = ps === "partial";
                      const isCancelled = bs === "cancelled";
                      const isCompleted = rawStatus === "completed" || rawStatus === "no_show";
                      const isReadOnly = isCancelled || isCompleted;
                      const statusClass = isCancelled ? "cancelled" : isCompleted ? "confirmed" : isPaid ? "confirmed" : isPartial ? "partial" : "pending";

                      const lastNote = b.notes || "";

                      const previewStart = isDraggingThis
                        ? (() => {
                          const totalMins = (dragging!.currentTop / SLOT_HEIGHT) * intervalMins;
                          const h = Math.floor(totalMins / 60);
                          const m = Math.round(totalMins % 60);
                          return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                        })()
                        : staffStart;

                      const previewEnd = isResizingThis
                        ? (() => {
                          const [sh, sm] = staffStart.split(":").map(Number);
                          const addedMins = (resizing!.currentHeight / SLOT_HEIGHT) * intervalMins;
                          const endMins = sh * 60 + sm + addedMins;
                          const eh = Math.floor(endMins / 60);
                          const em = Math.round(endMins % 60);
                          return `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
                        })()
                        : isDraggingThis
                          ? addMinutes(previewStart, (() => {
                            const [sh, sm] = staffStart.split(":").map(Number);
                            const [eh, em] = staffEnd.split(":").map(Number);
                            return eh * 60 + em - (sh * 60 + sm);
                          })())
                          : staffEnd;

                      // Use pre-built title, fallback to building it
                      const appointmentTitle = (b.title && b.title !== "Appointment" && b.title !== "appointment") ? b.title : [
                        ...(b.services || []).map((s: any) => s.name || s.service).filter(Boolean),
                        ...((b as any).products || []).map((p: any) => p.name || p.productName || p.product_name).filter(Boolean),
                        ...((b as any).packages || []).map((p: any) => p.name || p.packageName || p.package_name).filter(Boolean),
                        ...((b as any).memberships || []).map((p: any) => p.name || p.membershipName || p.membership_name).filter(Boolean),
                      ].join(", ") || "Appointment";

                      return (
                        <div
                          key={`${b.id}-${staff.id}`}
                          className={`dv-chip dv-chip--${statusClass}${isDraggingThis ? " dv-chip--dragging" : ""}${isResizingThis ? " dv-chip--resizing" : ""}`}
                          style={{ top: chipTop, height: chipHeight, cursor: isReadOnly ? "pointer" : undefined }}
                          onMouseEnter={(e) => { if (!isInteracting) openTip((b as any)._originalBooking || b, e.currentTarget); }}
                          onMouseLeave={closeTip}
                          onMouseDown={(e) => {
                            if (isReadOnly) return;
                            if ((e.target as HTMLElement).closest(".dv-chip__resize-handle")) return;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const fromBottom = rect.bottom - e.clientY;
                            if (fromBottom > 14) {
                              setHovered(null);
                              const origIndex = visibleStaff.findIndex((s) => s.id === staff.id);
                              setDragCandidate({
                                booking: b,
                                initialX: e.clientX,
                                initialY: e.clientY,
                                originalTop: timeToPx(staffStart),
                                currentStaffId: staff.id,
                                currentStaffIndex: origIndex,
                                startTime: staffStart,
                                endTime: staffEnd,
                                originalStaffId: staff.id,
                              });
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInteracting) return;
                            onEditBooking((b as any)._originalBooking || b);
                          }}
                        >
                          <div className="dv-chip__body">
                            <span className="dv-chip__time">{formatTime12(previewStart)} – {formatTime12(previewEnd)}</span>
                            <span className="dv-chip__service" title={appointmentTitle}>{appointmentTitle}</span>
                            <span className="dv-chip__client">👤 {b.clientName}</span>
                            {isPartial && (b as any).dueAmount > 0 && (
                              <span className="dv-chip__due">Due ₹{Number((b as any).dueAmount).toFixed(2)}</span>
                            )}
                            {lastNote && chipHeight >= SLOT_HEIGHT * 2 && (
                              <span className="dv-chip__note">📝 {lastNote}</span>
                            )}
                          </div>
                          <div
                            className="dv-chip__resize-handle"
                            onMouseDown={(e) => {
                              if (isReadOnly) return;
                              e.stopPropagation(); e.preventDefault();
                              setResizing({ booking: b, startY: e.clientY, originalHeight: Math.max(durationToPx(staffStart, staffEnd), SLOT_HEIGHT), currentHeight: Math.max(durationToPx(staffStart, staffEnd), SLOT_HEIGHT) });
                            }}
                          >
                            <div className="dv-chip__resize-bar" />
                          </div>
                        </div>
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

      {/* Staff context menu */}
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

export default DayView;