import React from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler } from "../../hooks/useScheduler";
import { useBookings } from "../../hooks/useBookings";
import { getMonthDays, DAYS_SHORT } from "../../utils/timeUtils";

interface MonthViewProps {
  onDayClick: (date: string) => void;
  onViewBill: (booking: Booking) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ onDayClick, onViewBill }) => {
  const { currentDate } = useScheduler();
  const { getBookingsByDate } = useBookings();
  const today = new Date().toISOString().slice(0, 10);
  const days  = getMonthDays(currentDate);

  return (
    <div className="month-view">
      <div className="month-view__header">
        {DAYS_SHORT.map(d => (
          <div key={d} className="month-view__day-label">{d}</div>
        ))}
      </div>
      <div className="month-view__grid">
        {days.map((day, i) => {
          const isToday2  = day === today;
          const dayBk     = day ? getBookingsByDate(day) : [];
          return (
            <div
              key={i}
              onClick={() => day && onDayClick(day)}
              className={`month-view__cell ${
                !day ? "month-view__cell--empty" :
                isToday2 ? "month-view__cell--today" : ""
              }`}
            >
              {day && (
                <>
                  <div className={`month-view__date-num ${isToday2 ? "month-view__date-num--today" : ""}`}>
                    {new Date(day + "T12:00:00").getDate()}
                  </div>
                  {dayBk.slice(0, 2).map(b => (
                    <div
                      key={b.id}
                      className="month-view__chip"
                      onClick={e => { e.stopPropagation(); onViewBill(b); }}
                    >
                      {b.services[0]?.service}
                    </div>
                  ))}
                  {dayBk.length > 2 && (
                    <div className="month-view__more">+{dayBk.length - 2} more</div>
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

export default MonthView;
