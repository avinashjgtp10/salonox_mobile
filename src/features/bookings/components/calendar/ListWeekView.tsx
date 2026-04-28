import React from "react";
import type { Booking } from "../../types/scheduler-types";
import { useScheduler } from "../../hooks/useScheduler";
import { useBookings } from "../../hooks/useBookings";
import { getWeekDays, formatTime12 } from "../../utils/timeUtils";
import Badge from "../../../../components/ui/Badge";

interface ListWeekViewProps {
  onViewBill: (booking: Booking) => void;
}

const ListWeekView: React.FC<ListWeekViewProps> = ({ onViewBill }) => {
  const { currentDate } = useScheduler();
  const { getBookingsByDate } = useBookings();
  const today = new Date().toISOString().slice(0, 10);
  const weekDays = getWeekDays(currentDate);

  function payVariant(status: string): "success" | "warning" | "secondary" {
    if (status === "Paid") return "success";
    if (status === "Partial") return "warning";
    return "secondary";
  }

  function payLabel(status: string) {
    if (status === "Unpaid") return "Due";
    return status;
  }

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "16px 20px",
        boxSizing: "border-box",
      }}
    >
      {weekDays.map((day) => {
        const dayBk = getBookingsByDate(day);
        const isToday = day === today;
        const label = new Date(day + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        return (
          <div key={day} style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: isToday ? "#2563eb" : "#374151",
                padding: "6px 0 4px",
                borderBottom: isToday
                  ? "2px solid #2563eb"
                  : "1px solid #e5e7eb",
                marginBottom: 8,
              }}
            >
              {label}
            </div>

            {dayBk.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  fontStyle: "italic",
                  paddingLeft: 4,
                }}
              >
                No appointments
              </div>
            ) : (
              dayBk.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onViewBill(b)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    marginBottom: 6,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f9fafb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#fff")
                  }
                >
                  <div
                    style={{
                      width: 4,
                      height: 36,
                      borderRadius: 2,
                      flexShrink: 0,
                      background: (() => {
                        const ps = (b.paymentStatus || "").toLowerCase();
                        const bs = (b.status || "").toLowerCase();
                        const isPaid = ps === "paid" || ps === "completed" || bs === "confirmed";
                        const isCancelled = bs === "cancelled";
                        return isCancelled ? "#ef4444" : isPaid ? "#22c55e" : "#f59e0b";
                      })(),
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {b.services[0]?.service}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}
                    >
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

export default ListWeekView;
