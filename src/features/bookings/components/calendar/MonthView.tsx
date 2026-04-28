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
  const days = getMonthDays(currentDate);

  function chipColor(b: Booking) {
    const ps = (b.paymentStatus || "").toLowerCase();
    const bs = (b.status || "").toLowerCase();
    const isPaid = ps === "paid" || ps === "completed" || bs === "confirmed";
    const isCancelled = bs === "cancelled";
    return isCancelled ? "#ef4444" : isPaid ? "#22c55e" : "#f59e0b";
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        {DAYS_SHORT.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              padding: "10px 0",
              fontSize: 12,
              fontWeight: 600,
              color: "#6b7280",
              letterSpacing: "0.3px",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          flex: 1,
        }}
      >
        {days.map((day, i) => {
          const isToday = day === today;
          const dayBk = day ? getBookingsByDate(day) : [];
          return (
            <div
              key={i}
              onClick={() => day && onDayClick(day)}
              style={{
                minHeight: 115, // ← increased from 100 to 115
                border: "1px solid #f0f0f0",
                padding: "6px 8px",
                cursor: day ? "pointer" : "default",
                background: !day ? "#fafafa" : isToday ? "#eff6ff" : "#fff",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (day)
                  (e.currentTarget as HTMLDivElement).style.background = isToday
                    ? "#dbeafe"
                    : "#f9fafb";
              }}
              onMouseLeave={(e) => {
                if (day)
                  (e.currentTarget as HTMLDivElement).style.background = isToday
                    ? "#eff6ff"
                    : "#fff";
              }}
            >
              {day && (
                <>
                  {/* Date number */}
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      background: isToday ? "#3b82f6" : "transparent",
                      color: isToday ? "#fff" : "#374151",
                      marginBottom: 4,
                    }}
                  >
                    {new Date(day + "T12:00:00").getDate()}
                  </div>

                  {/* Booking chips — colored by status */}
                  {dayBk.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewBill(b);
                      }}
                      style={{
                        fontSize: 10,
                        background: chipColor(b),
                        color: "#fff",
                        borderRadius: 4,
                        padding: "2px 5px",
                        marginTop: 2,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                      }}
                    >
                      {b.services[0]?.service}
                    </div>
                  ))}

                  {/* +more */}
                  {dayBk.length > 3 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#6b7280",
                        marginTop: 2,
                        fontWeight: 600,
                      }}
                    >
                      +{dayBk.length - 3} more
                    </div>
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
