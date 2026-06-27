import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler, SLOT_HEIGHT } from "../../hooks/useScheduler";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { getWeekDays, DAYS_SHORT, formatTime12, getCurrentTime } from "../../utils/timeUtils";
import BookingTooltipCard from "../shared/BookingTooltipCard";
import "../../styles/WeekView.scss";

// Stable empty fallback — prevents allocating a new [] on every Map miss
const EMPTY_BOOKINGS: any[] = [];

interface WeekViewProps {
  onSlotClick: (staffId: string, time: string) => void;
  onViewBill: (booking: Booking) => void;
}

const WeekViewComponent: React.FC<WeekViewProps> = ({ onSlotClick, onViewBill }) => {
  const { currentDate, slots, timeToPx, durationToPx, intervalMins } = useScheduler();
  const allBookings = useAppSelector((s: any) => s.scheduler?.bookings ?? []);
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    allBookings.forEach((b: any) => {
      const arr = map.get(b.date) ?? [];
      arr.push(b);
      map.set(b.date, arr);
    });
    return map;
  }, [allBookings]);
  const getBookingsByDate = (date: string) => bookingsByDate.get(date) ?? EMPTY_BOOKINGS;
  const { staffSchedules, staffList, selectedStaffId } = useSchedulerContext();
  const today = new Date().toISOString().slice(0, 10);
  const weekDays = getWeekDays(currentDate);

  // O(1) staff lookup by id
  const staffById = useMemo(() => {
    const m = new Map<string, (typeof staffList)[0]>();
    staffList.forEach((s) => m.set(s.id, s));
    return m;
  }, [staffList]);

  const [nowTime, setNowTime] = useState(getCurrentTime());
  const gutterRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const [hovered, setHovered] = useState<{ booking: Booking; el: HTMLElement } | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const openTip = useCallback((booking: Booking, el: HTMLElement) => { clearTimeout(closeTimerRef.current); setHovered({ booking, el }); }, []);
  const closeTip = useCallback(() => { closeTimerRef.current = setTimeout(() => setHovered(null), 150); }, []);
  const keepTip = useCallback(() => { clearTimeout(closeTimerRef.current); }, []);

  useEffect(() => { const t = setInterval(() => setNowTime(getCurrentTime()), 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    let cancelled = false;
    function scrollToNow(attempt = 0) {
      if (cancelled || !bodyRef.current) return;
      if (bodyRef.current.scrollHeight <= bodyRef.current.clientHeight && attempt < 50) {
        requestAnimationFrame(() => scrollToNow(attempt + 1));
        return;
      }
      const now = new Date();
      const px = ((now.getHours() * 60 + now.getMinutes()) / intervalMins) * SLOT_HEIGHT;
      bodyRef.current.scrollTop = Math.max(0, px - 150);
    }
    requestAnimationFrame(() => scrollToNow());
    return () => { cancelled = true; };
  }, [intervalMins, currentDate]);

  function onBodyScroll() {
    if (syncing.current) return;
    syncing.current = true;
    if (gutterRef.current && bodyRef.current) gutterRef.current.scrollTop = bodyRef.current.scrollTop;
    syncing.current = false;
  }

  const toMins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const minsToTime = (mins: number) => `${Math.floor(mins / 60).toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;

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
    <>
    <div className="wv-root">
      <div className="wv-gutter">
        <div className="wv-gutter__corner" />
        <div ref={gutterRef} className="wv-gutter__body">
          {slots.map((t) => {
            const [, m] = t.split(":").map(Number);
            return (
              <div key={t} className="wv-gutter__slot">
                {m === 0 && <span className="wv-gutter__time">{formatTime12(t).replace(":00 ", " ")}</span>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="wv-days">
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
                        onClick={() => !offHours && onSlotClick(selectedStaffId || staffList[0]?.id || "", t)}
                        className={`wv-slot${offHours ? " wv-slot--off-hours" : ""}`}
                        onMouseEnter={(e) => { if (!offHours) (e.currentTarget as HTMLElement).classList.add("wv-slot--hover"); }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).classList.remove("wv-slot--hover"); }}
                      />
                    );
                  })}
                  {salonHours && (() => {
                    const startMins = toMins(salonHours.startTime);
                    const endMins   = toMins(salonHours.endTime);
                    const isOvernight = startMins > endMins;
                    if (isOvernight) {
                      const midTop = timeToPx(salonHours.endTime);
                      const midH   = timeToPx(salonHours.startTime) - midTop;
                      return midH > 0 ? <div className="wv-off-hours-overlay" style={{ top: midTop, height: midH }} /> : null;
                    }
                    const preH    = timeToPx(salonHours.startTime);
                    const postTop = timeToPx(salonHours.endTime);
                    const postH   = totalGridHeight - postTop;
                    return (
                      <>
                        {preH > 0 && <div className="wv-off-hours-overlay" style={{ top: 0, height: preH }} />}
                        {postH > 0 && postTop < totalGridHeight && <div className="wv-off-hours-overlay" style={{ top: postTop, height: postH }} />}
                      </>
                    );
                  })()}
                  {dayBookings.map((b: any) => {
                    const ps = (b.paymentStatus || "").toLowerCase();
                    const bs = (b.status || "").toLowerCase();
                    const isPaid = ps === "paid" || ps === "completed";
                    const isPartial = ps === "partial";
                    const isConfirmed = bs === "confirmed" || bs === "completed";
                    const isCancelled = bs === "cancelled";
                    const statusClass = isCancelled ? "cancelled" : isPaid ? "confirmed" : isPartial ? "partial" : isConfirmed ? "confirmed" : "pending";
                    const chipH = Math.max(durationToPx(b.startTime, b.endTime), 28);
                    const primaryStaffName = staffById.get(b.staffId)?.name ?? "";
                    return (
                      <div
                        key={b.id}
                        className={`wv-chip wv-chip--${statusClass}`}
                        style={{ top: timeToPx(b.startTime), height: chipH, overflow: "hidden" }}
                        onMouseEnter={(e) => openTip(b, e.currentTarget)}
                        onMouseLeave={closeTip}
                        onClick={(e) => { e.stopPropagation(); onViewBill(b); }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatTime12(b.startTime)}</div>
                        <div style={{ fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: 0.95 }}>{b.clientName}</div>
                        {chipH > 44 && primaryStaffName && <div style={{ fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: 0.8 }}>{primaryStaffName}</div>}
                        {chipH > 58 && <div style={{ fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: 0.75 }}>{b.title || b.services[0]?.service || "Appointment"}</div>}
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
    {hovered && <BookingTooltipCard booking={hovered.booking} staffList={staffList} anchorEl={hovered.el} onMouseEnter={keepTip} onMouseLeave={closeTip} />}
    </>
  );
};

const WeekView = React.memo(WeekViewComponent);
export default WeekView;