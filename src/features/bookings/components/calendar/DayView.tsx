import React, { useState, useEffect, useRef } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useBookings } from "../../hooks/useBookings";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { STAFF_LIST } from "../../utils/schedulerMockData";
import { formatTime12, getCurrentTime, addMinutes } from "../../utils/timeUtils";
import Avatar from "../shared/Avatar";
import BookingCard from "../booking/BookingCard";

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

  const today   = new Date().toISOString().slice(0, 10);
  const isToday = currentDate === today;

  // ── Auto column width ─────────────────────────────────────────────────────
  const [COL_WIDTH, setCOL_WIDTH] = useState(
    Math.max(160, Math.floor((window.innerWidth - 70) / STAFF_LIST.length))
  );

  useEffect(() => {
    function handleResize() {
      setCOL_WIDTH(Math.max(160, Math.floor((window.innerWidth - 70) / STAFF_LIST.length)));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [STAFF_LIST.length]);

  const [nowTime,      setNowTime]      = useState(getCurrentTime());
  const [popupBooking, setPopupBooking] = useState<Booking | null>(null);
  const [popupPos,     setPopupPos]     = useState({ top: 0, left: 0 });
  const [staffMenu,    setStaffMenu]    = useState<{ staffId: string; x: number; y: number } | null>(null);

  // ── Drag (move) state ─────────────────────────────────────────────────────
  const [dragging, setDragging] = useState<{
    booking: Booking;
    startY: number;
    originalTop: number;
    currentTop: number;
  } | null>(null);

  // ── Resize state ──────────────────────────────────────────────────────────
  const [resizing, setResizing] = useState<{
    booking: Booking;
    startY: number;
    originalHeight: number;
    currentHeight: number;
  } | null>(null);

  const gutterBodyRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const headerRef     = useRef<HTMLDivElement>(null);
  const syncing       = useRef(false);

  useEffect(() => {
    setTimeout(() => {
      if (scrollBodyRef.current) {
        const now = new Date();
        const px  = ((now.getHours() * 60 + now.getMinutes()) / intervalMins) * SLOT_HEIGHT;
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

  // ── Mouse events for DRAG (move) ──────────────────────────────────────────
  useEffect(() => {
    if (!dragging) return;
    function onMouseMove(e: MouseEvent) {
      e.preventDefault();
      setDragging(prev => {
        if (!prev) return null;
        const delta   = e.clientY - prev.startY;
        const rawTop  = prev.originalTop + delta;
        const snapped = Math.round(rawTop / SLOT_HEIGHT) * SLOT_HEIGHT;
        return { ...prev, currentTop: Math.max(0, snapped) };
      });
    }
    function onMouseUp() {
      if (!dragging) return;
      const totalMins = (dragging.currentTop / SLOT_HEIGHT) * intervalMins;
      const h         = Math.floor(totalMins / 60);
      const m         = Math.round(totalMins % 60);
      const newStart  = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`;
      const [sh, sm]  = dragging.booking.startTime.split(":").map(Number);
      const [eh, em]  = dragging.booking.endTime.split(":").map(Number);
      const duration  = (eh * 60 + em) - (sh * 60 + sm);
      const newEnd    = addMinutes(newStart, duration);
      updateBooking({ ...dragging.booking, startTime: newStart, endTime: newEnd });
      setDragging(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [dragging, intervalMins, updateBooking]);

  // ── Mouse events for RESIZE (extend bottom) ───────────────────────────────
  useEffect(() => {
    if (!resizing) return;
    function onMouseMove(e: MouseEvent) {
      e.preventDefault();
      setResizing(prev => {
        if (!prev) return null;
        const delta   = e.clientY - prev.startY;
        const rawH    = prev.originalHeight + delta;
        const snapped = Math.round(rawH / SLOT_HEIGHT) * SLOT_HEIGHT;
        return { ...prev, currentHeight: Math.max(SLOT_HEIGHT, snapped) };
      });
    }
    function onMouseUp() {
      if (!resizing) return;
      const [sh, sm]  = resizing.booking.startTime.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const addedMins = (resizing.currentHeight / SLOT_HEIGHT) * intervalMins;
      const endMins   = startMins + addedMins;
      const eh        = Math.floor(endMins / 60);
      const em        = Math.round(endMins % 60);
      const newEnd    = `${eh.toString().padStart(2,"0")}:${em.toString().padStart(2,"0")}`;
      updateBooking({ ...resizing.booking, endTime: newEnd });
      setResizing(null);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [resizing, intervalMins, updateBooking]);

  const dayBookings   = getBookingsByDate(currentDate);
  const dayBlocked    = blockedTimes.filter(b => b.date === currentDate);
  const nowPx         = timeToPx(nowTime);
  const isInteracting = !!(dragging || resizing);
  const totalWidth    = STAFF_LIST.length * COL_WIDTH;

  function isSlotBlocked(staffId: string, time: string) {
    return dayBlocked.some(b => b.staffId === staffId && b.startTime <= time && time < b.endTime);
  }
  function handleRemoveBlockTime(staffId: string) {
    dayBlocked.filter(b => b.staffId === staffId).forEach(b => deleteBlockedTime(b.id));
    setStaffMenu(null);
  }

  return (
    <div
      style={{
        display: "flex", width: "100%", height: "100%",
        overflow: "hidden", position: "relative",
        userSelect: isInteracting ? "none" : "auto",
        cursor: dragging ? "grabbing" : resizing ? "ns-resize" : "default",
      }}
      onClick={() => { setPopupBooking(null); setStaffMenu(null); }}
    >

      {/* ── Time gutter ── */}
      <div style={{
        width: 70, flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderRight: "1px solid #e5e7eb",
        background: "#fafafa", zIndex: 2,
      }}>
        <div style={{ height: 64, flexShrink: 0, borderBottom: "1px solid #e5e7eb", background: "#fff" }} />
        <div ref={gutterBodyRef} style={{ flex: 1, overflowY: "hidden" }}>
          {slots.map(t => {
            const [, m] = t.split(":").map(Number);
            return (
              <div key={t} style={{
                height: SLOT_HEIGHT, position: "relative",
                borderBottom: m === 0 ? "1px solid #d1d5db" : "1px solid #f0f0f0",
                background: m === 0 ? "#f9fafb" : "transparent",
              }}>
                <span style={{
                  position: "absolute", top: -8, right: 6,
                  fontSize: 10, color: m === 0 ? "#6b7280" : "#c4c4c4",
                  fontWeight: m === 0 ? 600 : 400, whiteSpace: "nowrap",
                }}>
                  {formatTime12(t)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Staff columns ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Staff header */}
        <div ref={headerRef} style={{
          flexShrink: 0, height: 64,
          overflowX: "hidden", overflowY: "hidden",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff", zIndex: 5,
        }}>
          <div style={{ display: "flex", width: totalWidth, height: "100%" }}>
            {STAFF_LIST.map(staff => (
              <div key={staff.id} style={{
                width: COL_WIDTH, flexShrink: 0, height: "100%",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
                borderRight: "1px solid #e5e7eb",
              }}>
                <div style={{ cursor: "pointer" }}
                  onClick={e => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setStaffMenu(prev =>
                      prev?.staffId === staff.id ? null
                        : { staffId: staff.id, x: rect.left, y: rect.bottom + 4 }
                    );
                  }}
                >
                  <Avatar staff={staff} size={36} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{staff.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={scrollBodyRef} onScroll={onBodyScroll}
          style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
          <div style={{ display: "flex", width: totalWidth, position: "relative" }}>

            {STAFF_LIST.map(staff => (
              <div key={staff.id} style={{
                width: COL_WIDTH, flexShrink: 0,
                borderRight: "1px solid #e5e7eb",
                position: "relative",
              }}>

                {/* Slot cells */}
                {slots.map(t => {
                  const [, m]   = t.split(":").map(Number);
                  const blocked = isSlotBlocked(staff.id, t);
                  return (
                    <div key={t}
                      onClick={() => !blocked && !isInteracting && onSlotClick(staff.id, t)}
                      style={{
                        height: SLOT_HEIGHT,
                        borderBottom: m === 0 ? "1px solid #d1d5db" : "1px solid #f0f0f0",
                        background: m === 0 ? "#fafafa" : "transparent",
                        cursor: blocked ? "default" : "pointer",
                      }}
                      onMouseEnter={e => { if (!blocked && !isInteracting) (e.currentTarget as HTMLElement).style.background = "#f0f9ff"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = m === 0 ? "#fafafa" : "transparent"; }}
                    />
                  );
                })}

                {/* Block overlays */}
                {dayBlocked.filter(b => b.staffId === staff.id).map(b => (
                  <div key={b.id} style={{
                    position: "absolute", left: 0, right: 0,
                    top: timeToPx(b.startTime),
                    height: durationToPx(b.startTime, b.endTime),
                    background: "repeating-linear-gradient(45deg,#fef2f2,#fef2f2 6px,#fee2e2 6px,#fee2e2 12px)",
                    borderLeft: "3px solid #ef4444",
                    zIndex: 3, display: "flex",
                    alignItems: "flex-start", padding: "4px 8px",
                    pointerEvents: "none",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      🚫 {b.reason || "Blocked"}
                    </span>
                  </div>
                ))}

                {/* ── Booking chips ── */}
                {dayBookings.filter(b => b.staffId === staff.id).map(b => {
                  const isDraggingThis = dragging?.booking.id === b.id;
                  const isResizingThis = resizing?.booking.id === b.id;

                  const chipTop    = isDraggingThis ? dragging!.currentTop : timeToPx(b.startTime);
                  const chipHeight = isResizingThis
                    ? resizing!.currentHeight
                    : Math.max(durationToPx(b.startTime, b.endTime), SLOT_HEIGHT);

                  const chipColor =
                    b.status === "Confirmed" ? "linear-gradient(135deg,#22c55e,#16a34a)" :
                    b.status === "Pending"   ? "linear-gradient(135deg,#f59e0b,#d97706)" :
                                               "linear-gradient(135deg,#ef4444,#dc2626)";

                  const previewStart = isDraggingThis ? (() => {
                    const totalMins = (dragging!.currentTop / SLOT_HEIGHT) * intervalMins;
                    const h = Math.floor(totalMins / 60);
                    const m = Math.round(totalMins % 60);
                    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`;
                  })() : b.startTime;

                  const previewEnd = isResizingThis ? (() => {
                    const [sh, sm]  = b.startTime.split(":").map(Number);
                    const addedMins = (resizing!.currentHeight / SLOT_HEIGHT) * intervalMins;
                    const endMins   = sh * 60 + sm + addedMins;
                    const eh = Math.floor(endMins / 60);
                    const em = Math.round(endMins % 60);
                    return `${eh.toString().padStart(2,"0")}:${em.toString().padStart(2,"0")}`;
                  })() : isDraggingThis ? addMinutes(previewStart, (() => {
                    const [sh,sm] = b.startTime.split(":").map(Number);
                    const [eh,em] = b.endTime.split(":").map(Number);
                    return (eh*60+em)-(sh*60+sm);
                  })()) : b.endTime;

                  return (
                    <div
                      key={b.id}
                      style={{
                        position: "absolute",
                        left: 3, right: 3,
                        top: chipTop,
                        height: chipHeight,
                        background: chipColor,
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 11, fontWeight: 600,
                        boxShadow: isDraggingThis || isResizingThis
                          ? "0 8px 24px rgba(0,0,0,.3)"
                          : "0 2px 6px rgba(0,0,0,.15)",
                        overflow: "hidden",
                        zIndex: isDraggingThis || isResizingThis ? 100 : 5,
                        opacity: isDraggingThis ? 0.92 : 1,
                        cursor: isDraggingThis ? "grabbing" : "grab",
                        transition: isInteracting ? "none" : "box-shadow .1s",
                      }}
                      onMouseDown={e => {
                        const rect       = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const fromBottom = rect.bottom - e.clientY;
                        if (fromBottom > 14) {
                          e.stopPropagation();
                          e.preventDefault();
                          setPopupBooking(null);
                          setDragging({
                            booking: b,
                            startY: e.clientY,
                            originalTop: timeToPx(b.startTime),
                            currentTop:  timeToPx(b.startTime),
                          });
                        }
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        if (isInteracting) return;
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setPopupPos({ top: rect.top, left: rect.right + 8 });
                        setPopupBooking(b);
                      }}
                    >
                      <div style={{ padding: "4px 8px" }}>
                        <span style={{ display: "block" }}>
                          {formatTime12(previewStart)} – {formatTime12(previewEnd)}
                        </span>
                        <span style={{ display: "block", opacity: .9 }}>
                          {b.services[0]?.service}
                        </span>
                      </div>

                      {/* Resize handle */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0, left: 0, right: 0, height: 14,
                          cursor: "ns-resize",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(0,0,0,.15)",
                          borderRadius: "0 0 6px 6px",
                        }}
                        onMouseDown={e => {
                          e.stopPropagation();
                          e.preventDefault();
                          setPopupBooking(null);
                          setResizing({
                            booking: b,
                            startY: e.clientY,
                            originalHeight: Math.max(durationToPx(b.startTime, b.endTime), SLOT_HEIGHT),
                            currentHeight:  Math.max(durationToPx(b.startTime, b.endTime), SLOT_HEIGHT),
                          });
                        }}
                      >
                        <div style={{ width: 28, height: 3, background: "rgba(255,255,255,.6)", borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}

                {/* Now line */}
                {isToday && (
                  <div style={{
                    position: "absolute", top: nowPx, left: 0, right: 0,
                    height: 2, background: "#ef4444", zIndex: 8, pointerEvents: "none",
                  }}>
                    <div style={{
                      position: "absolute", left: -68, top: -10,
                      background: "#ef4444", color: "#fff",
                      borderRadius: 4, padding: "1px 4px",
                      fontSize: 10, fontWeight: 700,
                    }}>{nowTime}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff menu */}
      {staffMenu && (
        <div onClick={e => e.stopPropagation()} style={{
          position: "fixed", top: staffMenu.y, left: staffMenu.x,
          zIndex: 9999, background: "#fff",
          border: "1px solid #e5e7eb", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,.15)",
          overflow: "hidden", minWidth: 200,
        }}>
          <button onClick={() => { onBlockTime(staffMenu.staffId); setStaffMenu(null); }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", width: "100%", background: "#fff", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >🚫 Add Block Time</button>
          <div style={{ height: 1, background: "#f0f0f0" }} />
          <button onClick={() => handleRemoveBlockTime(staffMenu.staffId)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", width: "100%", background: "#fff", border: "none", cursor: "pointer", fontSize: 13, textAlign: "left", fontFamily: "inherit" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >✅ Remove Block Time</button>
        </div>
      )}

      {/* Booking popup */}
      {popupBooking && !isInteracting && (
        <BookingCard
          booking={popupBooking}
          onView={onViewBill}
          onEdit={onEditBooking}
          onClose={() => setPopupBooking(null)}
          style={{
            position: "fixed",
            top:  Math.min(popupPos.top,  window.innerHeight - 360),
            left: Math.min(popupPos.left, window.innerWidth  - 300),
          }}
        />
      )}
    </div>
  );
};

export default DayView;
