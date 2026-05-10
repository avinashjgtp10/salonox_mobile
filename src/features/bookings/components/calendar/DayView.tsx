import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import type { Booking, BlockedTime } from "../../types/scheduler-types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useBookings } from "../../hooks/useBookings";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatTime12, getCurrentTime, addMinutes, generateTimeSlots } from "../../utils/timeUtils";
import Avatar from "../shared/Avatar";
import "../../styles/DayView.scss";

interface DayViewProps {
  onSlotClick: (staffId: string, time: string) => void;
  onViewBill: (booking: Booking) => void;
  onEditBooking: (booking: Booking) => void;
  onPaymentBooking: (booking: Booking) => void;
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

  const COL_WIDTH = containerWidth > 0
    ? Math.max(160, Math.floor(containerWidth / visibleStaff.length))
    : 160;

  const [nowTime, setNowTime] = useState(getCurrentTime());
  const [staffMenu, setStaffMenu] = useState<{ staffId: string; x: number; y: number } | null>(null);

  const [dragging, setDragging] = useState<{
    booking: Booking; startX: number; startY: number;
    originalTop: number; currentTop: number;
    currentStaffId: string; currentStaffIndex: number;
  } | null>(null);

  const [resizing, setResizing] = useState<{
    booking: Booking; startY: number; originalHeight: number; currentHeight: number;
  } | null>(null);

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
    setTimeout(() => {
      if (scrollBodyRef.current) {
        const now = new Date();
        const px = ((now.getHours() * 60 + now.getMinutes()) / intervalMins) * SLOT_HEIGHT;
        scrollBodyRef.current.scrollTop = Math.max(0, px - 150);
      }
    }, 150);
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
    if (!dragging) return;
    function onMouseMove(e: MouseEvent) {
      e.preventDefault();
      setDragging((prev) => {
        if (!prev) return null;
        const deltaY = e.clientY - prev.startY;
        const rawTop = prev.originalTop + deltaY;
        const snapped = Math.round(rawTop / SLOT_HEIGHT) * SLOT_HEIGHT;
        const deltaX = e.clientX - prev.startX;
        const colShift = Math.round(deltaX / COL_WIDTH);
        const origIndex = visibleStaff.findIndex((s) => s.id === prev.booking.staffId);
        const newIndex = Math.max(0, Math.min(visibleStaff.length - 1, origIndex + colShift));
        return { ...prev, currentTop: Math.max(0, snapped), currentStaffId: visibleStaff[newIndex].id, currentStaffIndex: newIndex };
      });
    }
    function onMouseUp() {
      if (!dragging) return;
      const totalMins = (dragging.currentTop / SLOT_HEIGHT) * intervalMins;
      const h = Math.floor(totalMins / 60);
      const m = Math.round(totalMins % 60);
      const newStart = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      const [sh, sm] = dragging.booking.startTime.split(":").map(Number);
      const [eh, em] = dragging.booking.endTime.split(":").map(Number);
      const duration = eh * 60 + em - (sh * 60 + sm);
      const newEnd = addMinutes(newStart, duration);
      const orig = (dragging.booking as any)._originalBooking || dragging.booking;
      
      const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      const oldStartMins = toMins(orig.startTime);
      const newStartMins = toMins(newStart);
      const deltaMins = newStartMins - oldStartMins;

      const updatedServices = orig.services?.map((s: any) => {
        const sMins = toMins(s.time || orig.startTime) + deltaMins;
        const sh = Math.floor(sMins / 60);
        const sm = Math.round(sMins % 60);
        const shiftedTime = `${sh.toString().padStart(2, "0")}:${sm.toString().padStart(2, "0")}`;
        // Only shift the time — preserve each service's original staffId and staff name
        return { ...s, time: shiftedTime };
      }) || [];

      updateBooking({
        ...orig,
        startTime: newStart,
        endTime: newEnd,
        staffId: dragging.currentStaffId,
        services: updatedServices,
      });
      setDragging(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [dragging, intervalMins, updateBooking, COL_WIDTH]);

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
  const dayBookings = rawDayBookings.map((b) => {
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
      // ✅ staffId: prefer booking-level, then first service's staffId
      staffId: b.staffId || b.services[0]?.staffId,
    };
  // ✅ Always sort by startTime so card order is stable and independent of Redux insertion order
  }).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  const dayBlocked = blockedTimes.filter((b) => b.date === currentDate);

  // ── Smart visible hour range ─────────────────────────────────────────────
  // Default: 9 AM – 7 PM when no bookings exist.
  // With bookings: 1 hour before earliest start, 1 hour after latest end,
  // always at least a 4-hour window, clamped to 0–24.
  const DEFAULT_START = 9;
  const DEFAULT_END = 19;
  const MIN_WINDOW = 4; // minimum hours to show

  const allEvents = [
    ...dayBookings.map((b) => ({ start: b.startTime, end: b.endTime })),
    ...dayBlocked.map((b) => ({ start: b.startTime, end: b.endTime })),
  ];

  let startHour: number;
  let endHour: number;

  if (allEvents.length === 0) {
    startHour = DEFAULT_START;
    endHour = DEFAULT_END;
  } else {
    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const earliestMins = Math.min(...allEvents.map((e) => toMins(e.start)));
    const latestMins = Math.max(...allEvents.map((e) => toMins(e.end)));
    startHour = Math.max(0, Math.floor(earliestMins / 60) - 1);
    endHour = Math.min(24, Math.ceil(latestMins / 60) + 1);
    // Enforce minimum window
    if (endHour - startHour < MIN_WINDOW) endHour = Math.min(24, startHour + MIN_WINDOW);
  }

  const slots = generateTimeSlots(interval as any);
  const nowPx = timeToPx(nowTime);
  const isInteracting = !!(dragging || resizing);
  const totalWidth = visibleStaff.length * COL_WIDTH;

  function isSlotBlocked(staffId: string, time: string) {
    return dayBlocked.some((b) => b.staffId === staffId && b.startTime <= time && time < b.endTime);
  }

  function isSlotBooked(staffId: string, slotTime: string) {
    const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const slotMins = toMins(slotTime);
    return dayBookings.some((b) => {
      if ((b.status as string) === "Cancelled") return false;

      // Find services explicitly assigned to this staff member
      const staffServices = (b.services || []).filter((s: any) => s.staffId === staffId);

      if (staffServices.length > 0) {
        // Block only during the windows this staff member is actually performing a service,
        // not for the entire booking span that may include other staff members' services.
        return staffServices.some((s: any) => {
          const svcStart = s.time || b.startTime;
          const svcEnd = (s as any).endTime || (s as any).end_time || addMinutes(svcStart, (s as any).duration || 30);
          return slotMins >= toMins(svcStart) && slotMins < toMins(svcEnd);
        });
      }

      // No service-level match — fall back to booking-level staffId with overall time range
      // (covers single-service bookings where services don't carry individual staffIds)
      if (b.staffId === staffId) {
        return slotMins >= toMins(b.startTime) && slotMins < toMins(b.endTime);
      }

      return false;
    });
  }
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
                  {slots.map((t) => {
                    const [, m] = t.split(":").map(Number);
                    const blocked = isSlotBlocked(staff.id, t);
                    const booked = !blocked && isSlotBooked(staff.id, t);
                    const unavailable = blocked || booked;
                    return (
                      <div
                        key={t}
                        onClick={() => !unavailable && !isInteracting && onSlotClick(staff.id, t)}
                        className={`dv-slot${m === 0 ? " dv-slot--hour" : ""}${blocked ? " dv-slot--blocked" : ""}${booked ? " dv-slot--booked" : ""}`}
                        onMouseEnter={(e) => { if (!unavailable && !isInteracting) (e.currentTarget as HTMLElement).classList.add("dv-slot--hover"); }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).classList.remove("dv-slot--hover"); }}
                      />
                    );
                  })}

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
                      const displayServices = staffServices.length > 0 ? staffServices : b.services;

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

                      return (
                        <div
                          key={b.id}
                          className={`dv-chip dv-chip--${statusClass}${isDraggingThis ? " dv-chip--dragging" : ""}${isResizingThis ? " dv-chip--resizing" : ""}`}
                          style={{ top: chipTop, height: chipHeight, cursor: isReadOnly ? "pointer" : undefined }}
                          onMouseDown={(e) => {
                            if (isReadOnly) return;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const fromBottom = rect.bottom - e.clientY;
                            if (fromBottom > 14) {
                              e.stopPropagation(); e.preventDefault();
                              const origIndex = visibleStaff.findIndex((s) => s.id === staff.id);
                              setDragging({ booking: b, startX: e.clientX, startY: e.clientY, originalTop: timeToPx(staffStart), currentTop: timeToPx(staffStart), currentStaffId: staff.id, currentStaffIndex: origIndex });
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
                            <span className="dv-chip__service">{displayServices.map((s: any) => s.service).join(", ")}</span>
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