import React, { useMemo, useState, useEffect } from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler } from "../../hooks/useScheduler";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { getWeekDays, formatTime12 } from "../../utils/timeUtils";
import { computeChipStatusClass } from "../../utils/bookingStatusUtils";
import { normalizePaymentStatus } from "../../utils/bookingMapper";
import { formatDateDDMMYYYY } from "../../../../utils/dateFormat";
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

const CHIP_BAR_COLOR: Record<string, string> = {
  cancelled: "#ef4444",
  confirmed: "#22c55e",
  partial:   "#7c3aed",
  "no-show": "#0891b2",
  deleted:   "#9ca3af",
  pending:   "#f59e0b",
};

function chipBarColor(b: any, now: Date): string {
  return CHIP_BAR_COLOR[computeChipStatusClass(b, now)] ?? "#f59e0b";
}

interface ListWeekViewProps {
  onViewBill: (booking: Booking) => void;
}

const ListWeekViewComponent: React.FC<ListWeekViewProps> = ({ onViewBill }) => {
  const { currentDate } = useScheduler();
  const allBookings = useAppSelector((s: any) => s.scheduler?.bookings ?? EMPTY_BOOKINGS);
  // Ticks every minute so a still-"booked" row whose end time has now passed
  // flips to no-show live, without needing a page reload.
  const [nowTime, setNowTime] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNowTime(new Date()), 60000); return () => clearInterval(t); }, []);
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
        const label = formatDateDDMMYYYY(new Date(day + "T12:00:00"));
        return (
          <div key={day} className="lwv__day">
            <div className={`lwv__day-header${isToday ? " lwv__day-header--today" : ""}`}>
              {label}
            </div>
            {dayBk.length === 0 ? (
              <div className="lwv__empty">No appointments</div>
            ) : (
              dayBk.map((b: any) => (
                <div key={b.id} className="lwv__card" onClick={() => { if (!b.isDeleted) onViewBill(b); }}>
                  <div className="lwv__bar" style={{ background: chipBarColor(b, nowTime) }} />
                  <div className="lwv__info">
                    <div className="lwv__title">
                      {b.title || b.services[0]?.service || b.clientName || "Appointment"}
                    </div>
                    <div className="lwv__meta">
                      {b.clientName} · {formatTime12(b.startTime)}
                    </div>
                  </div>
                  <Badge variant={payVariant(normalizePaymentStatus(b.status))}>
                    {payLabel(normalizePaymentStatus(b.status))}
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
