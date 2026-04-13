import React, { useState, useEffect, useRef } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useBookings } from "../../hooks/useBookings";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { STAFF_LIST } from "../../utils/schedulerMockData";
import { formatTime12, getCurrentTime, addMinutes } from "../../utils/timeUtils";
import Avatar from "../shared/Avatar";
import BookingCard from "../booking/BookingCard";
import "../../styles/DayView.scss";

interface DayViewProps {
  onSlotClick: (staffId: string, time: string) => void;
  onViewBill: (booking: Booking) => void;
  onEditBooking: (booking: Booking) => void;
  onBlockTime: (staffId: string) => void;
}

const DayView: React.FC<DayViewProps> = ({ onSlotClick, onViewBill, onEditBooking, onBlockTime }) => {
  const { currentDate, slots, timeToPx, durationToPx, intervalMins } = useScheduler();
  const { blockedTimes, deleteBlockedTime, updateBooking } = useSchedulerContext();
  const { getBookingsByDate } = useBookings();

  const today = new Date().toISOString().slice(0, 10);
  const isToday = currentDate === today;

  const containerRef = useRef<HTMLDivElement>(null);
  const [COL_WIDTH, setCOL_WIDTH] = useState(160);

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const available = containerRef.current.clientWidth;
        setCOL_WIDTH(Math.max(160, Math.floor(available / STAFF_LIST.length)));
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const [nowTime, setNowTime] = useState(getCurrentTime());
  const [popupBooking, setPopupBooking] = useState<Booking | null>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
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
        const origIndex = STAFF_LIST.findIndex((s) => s.id === prev.booking.staffId);
        const newIndex = Math.max(0, Math.min(STAFF_LIST.length - 1, origIndex + colShift));
        return {
          ...prev,
          currentTop: Math.max(0, snapped),
          currentStaffId: STAFF_LIST[newIndex].id,
          currentStaffIndex: newIndex,
        };
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
      const newStaff = STAFF_LIST.find((s) => s.id === dragging.currentStaffId);
      updateBooking({
        ...dragging.booking,
        startTime: newStart,
        endTime: newEnd,
        staffId: dragging.currentStaffId,
        services: dragging.booking.services.map((s) => ({
          ...s,
          staffId: dragging.currentStaffId,
          staff: newStaff?.name || s.staff,
        })),
      });
      setDragging(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
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
      updateBooking({ ...resizing.booking, endTime: newEnd });
      setResizing(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizing, intervalMins, updateBooking]);

  const dayBookings = getBookingsByDate(currentDate);
  const dayBlocked = blockedTimes.filter((b) => b.date === currentDate);
  const nowPx = timeToPx(nowTime);
  const isInteracting = !!(dragging || resizing);
  const totalWidth = STAFF_LIST.length * COL_WIDTH;

  function isSlotBlocked(staffId: string, time: string) {
    return dayBlocked.some((b) => b.staffId === staffId && b.startTime <= time && time < b.endTime);
  }
  function handleRemoveBlockTime(staffId: string) {
    dayBlocked.filter((b) => b.staffId === staffId).forEach((b) => deleteBlockedTime(b.id));
    setStaffMenu(null);
  }

  return (
    <div
      className={`dv-root${isInteracting ? " dv-root--interacting" : ""}${dragging ? " dv-root--dragging" : ""}${resizing ? " dv-root--resizing" : ""}`}
      onClick={() => { setPopupBooking(null); setStaffMenu(null); }}
    >
      {/* ── Time gutter ── */}
      <div className="dv-gutter">
        <div className="dv-gutter__header" />
        <div ref={gutterBodyRef} className="dv-gutter__body">
          {slots.map((t) => {
            const [, m] = t.split(":").map(Number);
            return (
              <div
                key={t}
                className={`dv-gutter__slot${m === 0 ? " dv-gutter__slot--hour" : ""}`}
              >
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

        {/* Staff header */}
        <div ref={headerRef} className="dv-staff-header">
          <div className="dv-staff-header__inner" style={{ width: totalWidth }}>
            {STAFF_LIST.map((staff) => {
              const isDragTarget = dragging?.currentStaffId === staff.id && dragging.booking.staffId !== staff.id;
              return (
                <div
                  key={staff.id}
                  className={`dv-staff-col-header${isDragTarget ? " dv-staff-col-header--drag-target" : ""}`}
                  style={{ width: COL_WIDTH }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setStaffMenu((prev) =>
                      prev?.staffId === staff.id ? null : { staffId: staff.id, x: rect.left, y: rect.bottom + 4 }
                    );
                  }}
                >
                  <Avatar staff={staff} size={36} />
                  <span className="dv-staff-name" style={{ maxWidth: COL_WIDTH - 8 }}>
                    {staff.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={scrollBodyRef} onScroll={onBodyScroll} className="dv-scroll-body">

          {/* Empty state */}
          {dayBookings.length === 0 && !isInteracting && (
            <div className="dv-empty-state">
              <div className="dv-empty-state__icon">📅</div>
              <div className="dv-empty-state__title">No appointments today</div>
              <div className="dv-empty-state__sub">Click any time slot to add one</div>
            </div>
          )}

          <div className="dv-grid" style={{ width: totalWidth }}>
            {STAFF_LIST.map((staff, staffIndex) => {
              const isDragTarget = dragging?.currentStaffId === staff.id && dragging.booking.staffId !== staff.id;
              const isFirstCol = staffIndex === 0;

              return (
                <div
                  key={staff.id}
                  className={`dv-staff-col${isDragTarget ? " dv-staff-col--drag-target" : ""}`}
                  style={{ width: COL_WIDTH }}
                >
                  {/* Slot cells */}
                  {slots.map((t) => {
                    const [, m] = t.split(":").map(Number);
                    const blocked = isSlotBlocked(staff.id, t);
                    return (
                      <div
                        key={t}
                        onClick={() => !blocked && !isInteracting && onSlotClick(staff.id, t)}
                        className={`dv-slot${m === 0 ? " dv-slot--hour" : ""}${blocked ? " dv-slot--blocked" : ""}`}
                        onMouseEnter={(e) => {
                          if (!blocked && !isInteracting)
                            (e.currentTarget as HTMLElement).classList.add("dv-slot--hover");
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).classList.remove("dv-slot--hover");
                        }}
                      />
                    );
                  })}

                  {/* Block overlays */}
                  {dayBlocked.filter((b) => b.staffId === staff.id).map((b) => (
                    <div
                      key={b.id}
                      className="dv-block-overlay"
                      style={{ top: timeToPx(b.startTime), height: durationToPx(b.startTime, b.endTime) }}
                    >
                      <span className="dv-block-overlay__label">🚫 {b.reason || "Blocked"}</span>
                    </div>
                  ))}

                  {/* Booking chips */}
                  {dayBookings
                    .filter((b) => {
                      if (dragging?.booking.id === b.id) return dragging.currentStaffId === staff.id;
                      return b.staffId === staff.id;
                    })
                    .map((b) => {
                      const isDraggingThis = dragging?.booking.id === b.id;
                      const isResizingThis = resizing?.booking.id === b.id;
                      const chipTop = isDraggingThis ? dragging!.currentTop : timeToPx(b.startTime);
                      const chipHeight = isResizingThis
                        ? resizing!.currentHeight
                        : Math.max(durationToPx(b.startTime, b.endTime), SLOT_HEIGHT);

                      const statusClass =
                        b.status === "Confirmed" ? "confirmed"
                        : b.status === "Pending" ? "pending"
                        : "cancelled";

                      const previewStart = isDraggingThis
                        ? (() => {
                            const totalMins = (dragging!.currentTop / SLOT_HEIGHT) * intervalMins;
                            const h = Math.floor(totalMins / 60);
                            const m = Math.round(totalMins % 60);
                            return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                          })()
                        : b.startTime;

                      const previewEnd = isResizingThis
                        ? (() => {
                            const [sh, sm] = b.startTime.split(":").map(Number);
                            const addedMins = (resizing!.currentHeight / SLOT_HEIGHT) * intervalMins;
                            const endMins = sh * 60 + sm + addedMins;
                            const eh = Math.floor(endMins / 60);
                            const em = Math.round(endMins % 60);
                            return `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
                          })()
                        : isDraggingThis
                          ? addMinutes(previewStart, (() => {
                              const [sh, sm] = b.startTime.split(":").map(Number);
                              const [eh, em] = b.endTime.split(":").map(Number);
                              return eh * 60 + em - (sh * 60 + sm);
                            })())
                          : b.endTime;

                      return (
                        <div
                          key={b.id}
                          className={`dv-chip dv-chip--${statusClass}${isDraggingThis ? " dv-chip--dragging" : ""}${isResizingThis ? " dv-chip--resizing" : ""}`}
                          style={{ top: chipTop, height: chipHeight }}
                          onMouseDown={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const fromBottom = rect.bottom - e.clientY;
                            if (fromBottom > 14) {
                              e.stopPropagation();
                              e.preventDefault();
                              setPopupBooking(null);
                              const origIndex = STAFF_LIST.findIndex((s) => s.id === b.staffId);
                              setDragging({
                                booking: b,
                                startX: e.clientX,
                                startY: e.clientY,
                                originalTop: timeToPx(b.startTime),
                                currentTop: timeToPx(b.startTime),
                                currentStaffId: b.staffId,
                                currentStaffIndex: origIndex,
                              });
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInteracting) return;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setPopupPos({ top: rect.top, left: rect.right + 8 });
                            setPopupBooking(b);
                          }}
                        >
                          <div className="dv-chip__body">
                            <span className="dv-chip__time">
                              {formatTime12(previewStart)} – {formatTime12(previewEnd)}
                            </span>
                            <span className="dv-chip__service">{b.services[0]?.service}</span>
                            <span className="dv-chip__client">👤 {b.clientName}</span>
                          </div>
                          <div
                            className="dv-chip__resize-handle"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPopupBooking(null);
                              setResizing({
                                booking: b,
                                startY: e.clientY,
                                originalHeight: Math.max(durationToPx(b.startTime, b.endTime), SLOT_HEIGHT),
                                currentHeight: Math.max(durationToPx(b.startTime, b.endTime), SLOT_HEIGHT),
                              });
                            }}
                          >
                            <div className="dv-chip__resize-bar" />
                          </div>
                        </div>
                      );
                    })}

                  {/* ── Now line — label ONLY on first column, bleeds into gutter ── */}
                  {isToday && (
                    <div className="dv-now-line" style={{ top: nowPx }}>
                      {isFirstCol && (
                        <div className="dv-now-line__label">{nowTime}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Staff context menu ── */}
      {staffMenu && (
        <div
          ref={staffMenuRef}
          className="dv-staff-menu"
          style={{ top: staffMenu.y, left: staffMenu.x }}
        >
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

      {/* ── Booking popup ── */}
      {popupBooking && !isInteracting && (
        <BookingCard
          booking={popupBooking}
          onView={onViewBill}
          onEdit={onEditBooking}
          onClose={() => setPopupBooking(null)}
          style={{
            position: "fixed",
            top: Math.min(popupPos.top, window.innerHeight - 360),
            left: Math.min(popupPos.left, window.innerWidth - 300),
          }}
        />
      )}
    </div>
  );
};

export default DayView;