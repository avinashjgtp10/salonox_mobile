import React, { useState, useEffect, useRef } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useBookings } from "../../hooks/useBookings";
import { getWeekDays, DAYS_SHORT, formatTime12, getCurrentTime } from "../../utils/timeUtils";
import "../../styles/WeekView.scss";

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
        const px = ((now.getHours() * 60 + now.getMinutes()) / 30) * SLOT_HEIGHT;
        bodyRef.current.scrollTop = Math.max(0, px - 150);
      }
    }, 150);
  }, []);

  function onBodyScroll() {
    if (syncing.current) return;
    syncing.current = true;
    if (gutterRef.current && bodyRef.current) gutterRef.current.scrollTop = bodyRef.current.scrollTop;
    syncing.current = false;
  }

  const nowPx = timeToPx(nowTime);

  return (
    <div className="wv-root">
      {/* ── Time gutter ── */}
      <div className="wv-gutter">
        <div className="wv-gutter__corner" />
        <div ref={gutterRef} className="wv-gutter__body">
          {slots.map((t) => {
            const [, m] = t.split(":").map(Number);
            return (
              <div key={t} className="wv-gutter__slot">
                {m === 0 && (
                  <span className="wv-gutter__time">{formatTime12(t).replace(":00 ", " ")}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Day columns ── */}
      <div className="wv-days">
        {/* Day headers */}
        <div className="wv-day-headers">
          {weekDays.map((day, di) => {
            const isToday2 = day === today;
            return (
              <div key={day} className={`wv-day-header${isToday2 ? " wv-day-header--today" : ""}`}>
                <span className="wv-day-header__name">{DAYS_SHORT[di]}</span>
                <span className={`wv-day-header__num${isToday2 ? " wv-day-header__num--today" : ""}`}>
                  {new Date(day + "T12:00:00").getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div ref={bodyRef} onScroll={onBodyScroll} className="wv-scroll-body">
          <div className="wv-grid">
            {weekDays.map((day) => {
              const isToday2 = day === today;
              const dayBookings = getBookingsByDate(day);
              return (
                <div key={day} className="wv-day-col">
                  {slots.map((t) => (
                    <div
                      key={t}
                      onClick={() => onSlotClick("1", t)}
                      className="wv-slot"
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).classList.add("wv-slot--hover"))}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).classList.remove("wv-slot--hover"))}
                    />
                  ))}

                  {dayBookings.map((b) => {
                    const statusClass = b.status === "Confirmed" ? "confirmed" : b.status === "Pending" ? "pending" : "cancelled";
                    return (
                      <div
                        key={b.id}
                        className={`wv-chip wv-chip--${statusClass}`}
                        style={{ top: timeToPx(b.startTime), height: Math.max(durationToPx(b.startTime, b.endTime), 28) }}
                        onClick={(e) => { e.stopPropagation(); onViewBill(b); }}
                      >
                        {formatTime12(b.startTime)}<br />
                        {b.services[0]?.service?.slice(0, 12)}
                      </div>
                    );
                  })}

                  {isToday2 && <div className="wv-now-line" style={{ top: nowPx }} />}
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