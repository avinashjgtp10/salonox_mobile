import React, { useMemo } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler } from "../../hooks/useScheduler";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { getMonthDays, DAYS_SHORT } from "../../utils/timeUtils";
import "../../styles/Scheduler.scss";

const EMPTY_BOOKINGS: any[] = [];

function chipColor(b: Booking) {
  const ps = (b.paymentStatus || "").toLowerCase();
  const bs = (b.status || "").toLowerCase();
  const isPaid = ps === "paid" || ps === "completed" || bs === "confirmed";
  const isCancelled = bs === "cancelled";
  return isCancelled ? "#ef4444" : isPaid ? "#22c55e" : "#f59e0b";
}

interface MonthViewProps {
  onDayClick: (date: string) => void;
  onViewBill: (booking: Booking) => void;
}

const MonthViewComponent: React.FC<MonthViewProps> = ({ onDayClick, onViewBill }) => {
  const { currentDate } = useScheduler();
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
  const today = new Date().toISOString().slice(0, 10);
  const days = getMonthDays(currentDate);

  return (
    <div className="month-view">
      <div className="month-view__header">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="month-view__day-label">{d}</div>
        ))}
      </div>
      <div className="month-view__grid">
        {days.map((day, i) => {
          const isToday = day === today;
          const dayBk = day ? getBookingsByDate(day) : [];
          const cellClass = [
            "month-view__cell",
            isToday ? "month-view__cell--today" : "",
            !day   ? "month-view__cell--empty"  : "",
          ].filter(Boolean).join(" ");

          return (
            <div
              key={i}
              onClick={() => day && onDayClick(day)}
              className={cellClass}
            >
              {day && (
                <>
                  <div className={`month-view__date-num${isToday ? " month-view__date-num--today" : ""}`}>
                    {new Date(day + "T12:00:00").getDate()}
                  </div>
                  {dayBk.slice(0, 3).map((b: any) => (
                    <div
                      key={b.id}
                      onClick={(e) => { e.stopPropagation(); onViewBill(b); }}
                      className="month-view__chip"
                      style={{ background: chipColor(b) }}
                    >
                      {b.title || b.services[0]?.service || b.clientName || "Appointment"}
                    </div>
                  ))}
                  {dayBk.length > 3 && (
                    <div className="month-view__more">+{dayBk.length - 3} more</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MonthView = React.memo(MonthViewComponent);
export default MonthView;
