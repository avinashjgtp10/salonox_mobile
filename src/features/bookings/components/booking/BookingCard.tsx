import React from "react";
import type { Booking } from "../../types/scheduler-types";
import { formatTime12 } from "../../utils/timeUtils";

interface BookingCardProps {
  booking: Booking;
  onView: (b: Booking) => void;
  onEdit: (b: Booking) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onView, onEdit, onClose, style }) => {
  const statusColor =
    booking.status === "Confirmed" ? "#22c55e" :
    booking.status === "Pending"   ? "#f59e0b" :
    "#ef4444";

  const statusBg =
    booking.status === "Confirmed" ? "#dcfce7" :
    booking.status === "Pending"   ? "#fef3c7" :
    "#fef2f2";

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${statusColor}`,
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,.15)",
        padding: 16, width: 280, zIndex: 200,
        ...style,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: statusColor }}>
            {formatTime12(booking.startTime)} – {formatTime12(booking.endTime)}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600,
            background: statusBg,
            color: statusColor,
            borderRadius: 4, padding: "2px 8px",
            marginTop: 2, display: "inline-block",
            border: `1px solid ${statusColor}`,
          }}>
            {booking.status}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}
        >✕</button>
      </div>

      <div style={{ fontSize: 13, color: "#374151", margin: "6px 0 4px" }}>
        {booking.services.map(s => s.service).join(", ")}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        <strong>Client:</strong> {booking.clientName} ({booking.clientPhone})
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 8 }}>
        <span>
          Payment:{" "}
          <span style={{
            color: booking.paymentStatus === "Paid" ? "#22c55e" : booking.paymentStatus === "Partial" ? "#f59e0b" : "#ef4444",
            fontWeight: 600,
          }}>
            {booking.paymentStatus}
          </span>
        </span>
        <span>Bill: <strong>₹{booking.grandTotal.toFixed(2)}</strong></span>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => { onEdit(booking); onClose(); }}
          style={{
            flex: 1, background: "#4f46e5", color: "#fff",
            border: "none", borderRadius: 6, padding: "8px 0",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => { onView(booking); onClose(); }}
          style={{
            flex: 1, background: "#1f2937", color: "#fff",
            border: "none", borderRadius: 6, padding: "8px 0",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          🧾 View Bill
        </button>
      </div>
    </div>
  );
};

export default BookingCard;
