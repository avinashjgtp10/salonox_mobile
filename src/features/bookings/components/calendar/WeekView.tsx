import React, { useState, useEffect, useRef } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useBookings } from "../../hooks/useBookings";
import {
  getWeekDays,
  DAYS_SHORT,
  formatTime12,
  getCurrentTime,
} from "../../utils/timeUtils";

interface WeekViewProps {
  onSlotClick: (staffId: string, time: string) => void;
  onViewBill: (booking: Booking) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ onSlotClick, onViewBill }) => {
  const { currentDate, slots, timeToPx, durationToPx } = useScheduler();
  const { getBookingsByDate } = useBookings();
  const today = new Date().toISOString().slice(0, 10);
  const weekDays = getWeekDays(currentDate);

  const [nowTime, setNowTime] = useState(getCurrentTime());
  const gutterRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNowTime(getCurrentTime()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (bodyRef.current) {
        const now = new Date();
        const px =
          ((now.getHours() * 60 + now.getMinutes()) / 30) * SLOT_HEIGHT;
        bodyRef.current.scrollTop = Math.max(0, px - 150);
      }
    }, 150);
  }, []);

  function onBodyScroll() {
    if (syncing.current) return;
    syncing.current = true;
    if (gutterRef.current && bodyRef.current) {
      gutterRef.current.scrollTop = bodyRef.current.scrollTop;
    }
    syncing.current = false;
  }

  const nowPx = timeToPx(nowTime);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Time gutter ── */}
      <div
        style={{
          width: 70,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid #e5e7eb",
          background: "#fafafa",
        }}
      >
        {/* Blank corner */}
        <div
          style={{
            height: 48,
            flexShrink: 0,
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
          }}
        />
        {/* Synced time labels */}
        <div ref={gutterRef} style={{ flex: 1, overflowY: "hidden" }}>
          {slots.map((t) => {
            const [, m] = t.split(":").map(Number);
            return (
              <div
                key={t}
                style={{
                  height: SLOT_HEIGHT,
                  position: "relative",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                {m === 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -8,
                      right: 6,
                      fontSize: 11,
                      color: "#9ca3af",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatTime12(t).replace(":00 ", " ")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Day columns ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Day headers — always visible */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            height: 48,
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          {weekDays.map((day, di) => {
            const isToday2 = day === today;
            return (
              <div
                key={day}
                style={{
                  flex: 1,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRight: "1px solid #e5e7eb",
                  background: isToday2 ? "#eff6ff" : "#fff",
                }}
              >
                <span
                  style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}
                >
                  {DAYS_SHORT[di]}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isToday2 ? "#3b82f6" : "#374151",
                  }}
                >
                  {new Date(day + "T12:00:00").getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div
          ref={bodyRef}
          onScroll={onBodyScroll}
          style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
        >
          <div style={{ display: "flex" }}>
            {weekDays.map((day) => {
              const isToday2 = day === today;
              const dayBookings = getBookingsByDate(day);
              return (
                <div
                  key={day}
                  style={{
                    flex: 1,
                    borderRight: "1px solid #e5e7eb",
                    position: "relative",
                  }}
                >
                  {/* Slots */}
                  {slots.map((t) => (
                    <div
                      key={t}
                      onClick={() => onSlotClick("1", t)}
                      style={{
                        height: SLOT_HEIGHT,
                        borderBottom: "1px solid #f0f0f0",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "#f0f9ff")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "transparent")
                      }
                    />
                  ))}

                  {/* Booking chips */}
                  {dayBookings.map((b) => {
                    const chipColor =
                      b.status === "Confirmed"
                        ? "linear-gradient(135deg,#22c55e,#16a34a)"
                        : b.status === "Pending"
                          ? "linear-gradient(135deg,#f59e0b,#d97706)"
                          : b.status === "Cancelled"
                            ? "linear-gradient(135deg,#ef4444,#dc2626)"
                            : "linear-gradient(135deg,#22c55e,#16a34a)";

                    return (
                      <div
                        key={b.id}
                        style={{
                          position: "absolute",
                          left: 2,
                          right: 2,
                          top: timeToPx(b.startTime),
                          height: Math.max(
                            durationToPx(b.startTime, b.endTime),
                            28,
                          ),
                          background: chipColor,
                          borderRadius: 4,
                          padding: "2px 4px",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: "pointer",
                          zIndex: 5,
                          overflow: "hidden",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewBill(b);
                        }}
                      >
                        {formatTime12(b.startTime)}
                        <br />
                        {b.services[0]?.service?.slice(0, 12)}
                      </div>
                    );
                  })}

                  {/* Now line */}
                  {isToday2 && (
                    <div
                      style={{
                        position: "absolute",
                        top: nowPx,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: "#ef4444",
                        zIndex: 8,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekView;
