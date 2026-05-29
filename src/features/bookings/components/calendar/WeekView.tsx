import React, { useState, useEffect, useRef } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useBookings } from "../../hooks/useBookings";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { getWeekDays, DAYS_SHORT, formatTime12, getCurrentTime } from "../../utils/timeUtils";
import "../../styles/WeekView.scss";

interface WeekViewProps {
  onSlotClick: (staffId: string, time: string) => void;
  onViewBill: (booking: Booking) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ onSlotClick, onViewBill }) => {
  const { currentDate, slots, timeToPx, durationToPx, intervalMins } = useScheduler();
  const { getBookingsByDate } = useBookings();
  const { staffSchedules, staffList } = useSchedulerContext();
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
        const px = ((now.getHours() * 60 + now.getMinutes()) / intervalMins) * SLOT_HEIGHT;
        bodyRef.current.scrollTop = Math.max(0, px - 150);
      }
    }, 150);
  }, [intervalMins]);

  function onBodyScroll() {
    if (syncing.current) return;
    syncing.current = true;
    if (gutterRef.current && bodyRef.current) gutterRef.current.scrollTop = bodyRef.current.scrollTop;
    syncing.current = false;
  }

  const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const minsToTime = (mins: number) =>
    `${Math.floor(mins / 60).toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;

  // Compute the union of all staff working hours for a given day-of-week.
  // Returns the earliest start and latest end across all staff, or null if no data.
  function getSalonHours(dayOfWeek: number): { startTime: string; endTime: string } | null {
    let earliest: number | null = null;
    let latest: number | null = null;
    staffList.forEach((staff) => {
      const sch = staffSchedules?.[staff.id]?.[dayOfWeek];
      if (!sch || !sch.isAvailable || !sch.startTime || !sch.endTime) return;
      const s = toMins(sch.startTime);
      const e = toMins(sch.endTime);
      if (earliest === null || s < earliest) earliest = s;
      if (latest === null || e > latest) latest = e;
    });
    if (earliest === null || latest === null) return null;
    return { startTime: minsToTime(earliest), endTime: minsToTime(latest) };
  }

  function isSlotOffHours(dayOfWeek: number, slotTime: string): boolean {
    const hours = getSalonHours(dayOfWeek);
    if (!hours) return false;
    const slot = toMins(slotTime);
    const start = toMins(hours.startTime);
    const end = toMins(hours.endTime);
    if (start <= end) return slot < start || slot >= end;
    return slot >= end && slot < start;
  }

  const totalGridHeight = slots.length * SLOT_HEIGHT;
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
              const dayOfWeek = new Date(day + "T12:00:00").getDay();
              const salonHours = getSalonHours(dayOfWeek);

              return (
                <div key={day} className="wv-day-col">
                  {slots.map((t) => {
                    const offHours = isSlotOffHours(dayOfWeek, t);
                    return (
                      <div
                        key={t}
                        onClick={() => !offHours && onSlotClick("1", t)}
                        className={`wv-slot${offHours ? " wv-slot--off-hours" : ""}`}
                        onMouseEnter={(e) => { if (!offHours) (e.currentTarget as HTMLElement).classList.add("wv-slot--hover"); }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).classList.remove("wv-slot--hover"); }}
                      />
                    );
                  })}

                  {/* ── Off-hours overlay (grey band outside salon working hours) ── */}
                  {salonHours && (() => {
                    const startMins = toMins(salonHours.startTime);
                    const endMins   = toMins(salonHours.endTime);
                    const isOvernight = startMins > endMins;

                    if (isOvernight) {
                      const midTop = timeToPx(salonHours.endTime);
                      const midH   = timeToPx(salonHours.startTime) - midTop;
                      return midH > 0 ? (
                        <div className="wv-off-hours-overlay" style={{ top: midTop, height: midH }} />
                      ) : null;
                    }

                    const preH    = timeToPx(salonHours.startTime);
                    const postTop = timeToPx(salonHours.endTime);
                    const postH   = totalGridHeight - postTop;

                    return (
                      <>
                        {preH > 0 && (
                          <div className="wv-off-hours-overlay" style={{ top: 0, height: preH }} />
                        )}
                        {postH > 0 && postTop < totalGridHeight && (
                          <div className="wv-off-hours-overlay" style={{ top: postTop, height: postH }} />
                        )}
                      </>
                    );
                  })()}

                  {dayBookings.map((b) => {
                    const ps = (b.paymentStatus || "").toLowerCase();
                    const bs = (b.status || "").toLowerCase();
                    const isPaid = ps === "paid" || ps === "completed";
                    const isPartial = ps === "partial";
                    const isConfirmed = bs === "confirmed" || bs === "completed";
                    const isCancelled = bs === "cancelled";
                    const statusClass = isCancelled ? "cancelled" : isPaid ? "confirmed" : isPartial ? "partial" : isConfirmed ? "confirmed" : "pending";
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
