import React from "react";
import type { Booking } from "../../types/booking.types";
import { formatTime12 } from "../../utils/timeUtils";
import { useCurrency } from "../../../../hooks/useCurrency";
import { normalizePaymentStatus } from "../../utils/bookingMapper";
import { maskMobile } from "../../../../utils/maskMobile";

interface BookingCardProps {
  booking: Booking;
  onEdit: (b: Booking) => void;
  onPayment: (b: Booking) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking, onEdit, onPayment, onClose, style,
}) => {
  const { formatAmount } = useCurrency();
  const bs = (booking.status || "").toLowerCase();
  const isPaid = bs === "paid";
  const isPartial = bs === "partial";
  const isCancelled = bs === "cancelled";

  const statusLabel = isCancelled ? "Cancelled" : isPaid ? "Completed" : isPartial ? "Due" : "Pending";
  const statusColor = isCancelled ? "#ef4444" : isPaid ? "#22c55e" : isPartial ? "#6d28d9" : "#d97706";
  const statusBg    = isCancelled ? "#fef2f2" : isPaid ? "#dcfce7" : isPartial ? "#ede9fe" : "#fef3c7";

  const lastNote = booking.notes || "";

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${statusColor}`,
        borderRadius: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,.15)",
        padding: 16,
        width: 290,
        zIndex: 200,
        ...style,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: statusColor }}>
            {formatTime12(booking.startTime)} – {formatTime12(booking.endTime)}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600,
            background: statusBg, color: statusColor,
            borderRadius: 4, padding: "2px 8px", marginTop: 2,
            display: "inline-block", border: `1px solid ${statusColor}`,
          }}>
            {statusLabel}
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}>✕</button>
      </div>

      {/* Services */}
      <div style={{ fontSize: 13, color: "#374151", margin: "6px 0 4px", fontWeight: 600 }}>
        {booking.services.map((s) => s.service).join(", ")}
      </div>

      {/* Client */}
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        <strong>Client:</strong> {booking.clientName} {booking.clientPhone ? `(${maskMobile(booking.clientPhone)})` : ""}
      </div>

      {/* Payment + Bill */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 8 }}>
        <span>Payment: <span style={{
          color: isPaid ? "#22c55e" : isPartial ? "#7c3aed" : "#ef4444",
          fontWeight: 600,
        }}>{normalizePaymentStatus(booking.status)}</span></span>
        <span>Bill: <strong>{formatAmount(booking.grandTotal || 0)}</strong></span>
      </div>

      {/* Last note */}
      {lastNote && (
        <div style={{
          marginTop: 8, padding: "6px 10px",
          background: "#fffbeb", borderRadius: 6,
          borderLeft: "3px solid #f59e0b", fontSize: 11, color: "#92400e",
        }}>
          📝 <strong>Last note:</strong> {lastNote}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button
          onClick={() => { onEdit(booking); onClose(); }}
          style={{
            flex: 1, background: "#4f46e5", color: "#fff",
            border: "none", borderRadius: 6, padding: "9px 0",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => { onPayment(booking); onClose(); }}
          style={{
            flex: 1, background: "#059669", color: "#fff",
            border: "none", borderRadius: 6, padding: "9px 0",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          💳 Payment
        </button>
      </div>
    </div>
  );
};

export default BookingCard;