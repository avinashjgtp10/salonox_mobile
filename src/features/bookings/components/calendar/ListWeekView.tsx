import React, { useMemo } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler } from "../../hooks/useScheduler";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { getWeekDays, formatTime12 } from "../../utils/timeUtils";
import Badge from "../../../../components/ui/Badge";
import "../../styles/Scheduler.scss";

const EMPTY_BOOKINGS: any[] = [];

function payVariant(status: string): "success" | "warning" | "secondary" {
  if (status === "Paid") return "success";
  if (status === "Partial") return "warning";
  return "secondary";
}

function payLabel(status: string) {
  if (status === "Unpaid") return "Due";
  return status;
}

function chipBarColor(b: any): string {
  const ps = (b.paymentStatus || "").toLowerCase();
  const bs = (b.status || "").toLowerCase();
  const isPaid = ps === "paid" || ps === "completed" || bs === "confirmed";
  const isCancelled = bs === "cancelled";
  return isCancelled ? "#ef4444" : isPaid ? "#22c55e" : "#f59e0b";
}

interface ListWeekViewProps {
  onViewBill: (booking: Booking) => void;
}

const ListWeekViewComponent: React.FC<ListWeekViewProps> = ({ onViewBill }) => {
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
  const weekDays = getWeekDays(currentDate);

  return (
    <div className="lwv">
      {weekDays.map((day) => {
        const dayBk = getBookingsByDate(day);
        const isToday = day === today;
        const label = new Date(day + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric",
        });
        return (
          <div key={day} className="lwv__day">
            <div className={`lwv__day-header${isToday ? " lwv__day-header--today" : ""}`}>
              {label}
            </div>
            {dayBk.length === 0 ? (
              <div className="lwv__empty">No appointments</div>
            ) : (
              dayBk.map((b: any) => (
                <div key={b.id} className="lwv__card" onClick={() => onViewBill(b)}>
                  <div className="lwv__bar" style={{ background: chipBarColor(b) }} />
                  <div className="lwv__info">
                    <div className="lwv__title">
                      {b.title || b.services[0]?.service || b.clientName || "Appointment"}
                    </div>
                    <div className="lwv__meta">
                      {b.clientName} · {formatTime12(b.startTime)}
                    </div>
                  </div>
                  <Badge variant={payVariant(b.paymentStatus)}>
                    {payLabel(b.paymentStatus)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
};

const ListWeekView = React.memo(ListWeekViewComponent);
export default ListWeekView;
