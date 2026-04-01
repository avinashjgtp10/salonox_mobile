import React from "react";
import type { Booking } from "../../types/scheduler-types";
import { formatTime12 } from "../../utils/timeUtils";
import { STAFF_LIST } from "../../utils/schedulerMockData";

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
    booking.status === "Pending"   ? "#f59e0b" : "#ef4444";

  const statusBg =
    booking.status === "Confirmed" ? "#dcfce7" :
    booking.status === "Pending"   ? "#fef3c7" : "#fef2f2";

  // Show print only when status is Confirmed
  const canPrint = booking.status === "Confirmed";

  function handlePrintBill() {
    const staffName = STAFF_LIST.find(s => s.id === booking.staffId)?.name || "—";
    const servicesRows = booking.services.map(s =>
      `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6">${s.service}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;color:#6b7280">${s.staff || staffName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #f3f4f6;text-align:right">₹${(s.total || 0).toFixed(2)}</td>
      </tr>`
    ).join("");

    const html = `<!DOCTYPE html><html><head><title>Bill - ${booking.clientName}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',sans-serif;padding:28px;color:#111;max-width:420px;margin:0 auto}
      .salon-name{font-size:20px;font-weight:800;margin-bottom:2px}
      .sub{font-size:12px;color:#6b7280;margin-bottom:18px}
      .divider{border:none;border-top:1px solid #e5e7eb;margin:14px 0}
      .label{font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
      .value{font-size:14px;font-weight:600;color:#111;margin-top:2px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin:10px 0}
      th{background:#f9fafb;padding:8px 10px;font-size:11px;font-weight:700;color:#6b7280;text-align:left;text-transform:uppercase}
      .total-row{display:flex;justify-content:space-between;padding:7px 0;font-size:14px;border-top:1px dotted #e5e7eb}
      .grand{font-size:17px;font-weight:800;border-top:2px solid #111;padding-top:10px;margin-top:4px}
      .paid{background:#dcfce7;color:#15803d;display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
      .footer{margin-top:20px;font-size:11px;color:#9ca3af;text-align:center}
      @media print{body{padding:10px}}
    </style></head>
    <body>
      <div class="salon-name">SalonOx</div>
      <div class="sub">Appointment Receipt</div>
      <hr class="divider"/>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div><div class="label">Client</div><div class="value">${booking.clientName}</div></div>
        <div><div class="label">Phone</div><div class="value">${booking.clientPhone || "—"}</div></div>
        <div><div class="label">Date</div><div class="value">${booking.billDate || booking.date}</div></div>
        <div><div class="label">Time</div><div class="value">${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}</div></div>
        <div><div class="label">Staff</div><div class="value">${staffName}</div></div>
        <div><div class="label">Status</div><div class="value"><span class="paid">Paid ✓</span></div></div>
      </div>
      <hr class="divider"/>
      <table>
        <thead><tr><th>Service</th><th>Staff</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${servicesRows}</tbody>
      </table>
      <hr class="divider"/>
      <div class="total-row"><span>Subtotal</span><span>₹${(booking.subtotal || 0).toFixed(2)}</span></div>
      ${(booking.discount || 0) > 0 ? `<div class="total-row"><span>Discount</span><span style="color:#22c55e">−₹${(booking.discount || 0).toFixed(2)}</span></div>` : ""}
      ${(booking.gst || 0) > 0 ? `<div class="total-row"><span>GST (${booking.gst}%)</span><span>₹${((booking.taxableAmount || 0) * (booking.gst || 0) / 100).toFixed(2)}</span></div>` : ""}
      ${(booking.exCharges || 0) > 0 ? `<div class="total-row"><span>Extra Charges</span><span>₹${(booking.exCharges || 0).toFixed(2)}</span></div>` : ""}
      <div class="total-row grand"><span>Grand Total</span><span>₹${(booking.grandTotal || 0).toFixed(2)}</span></div>
      <div class="total-row"><span>Paid</span><span style="color:#22c55e">₹${(booking.payingNow || 0).toFixed(2)}</span></div>
      <div class="footer">Thank you for visiting SalonOx!</div>
    </body></html>`;

    const win = window.open("", "_blank", "width=500,height=700");
    if (!win) { alert("Please allow popups."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

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
          <span style={{ fontSize: 11, fontWeight: 600, background: statusBg, color: statusColor, borderRadius: 4, padding: "2px 8px", marginTop: 2, display: "inline-block", border: `1px solid ${statusColor}` }}>
            {booking.status}
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}>✕</button>
      </div>

      <div style={{ fontSize: 13, color: "#374151", margin: "6px 0 4px" }}>
        {booking.services.map(s => s.service).join(", ")}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        <strong>Client:</strong> {booking.clientName} ({booking.clientPhone || "—"})
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 8 }}>
        <span>
          Payment:{" "}
          <span style={{ color: booking.paymentStatus === "Paid" ? "#22c55e" : booking.paymentStatus === "Partial" ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>
            {booking.paymentStatus}
          </span>
        </span>
        <span>Bill: <strong>₹{(booking.grandTotal || 0).toFixed(2)}</strong></span>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button
          onClick={() => { onEdit(booking); onClose(); }}
          style={{ flex: 1, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >✏️ Edit</button>

        <button
          onClick={() => { onView(booking); onClose(); }}
          style={{ flex: 1, background: "#1f2937", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >🧾 View Bill</button>

        {/* Print — only visible when Confirmed + Paid */}
        {canPrint && (
          <button
            onClick={handlePrintBill}
            style={{ flex: 1, background: "#059669", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >🖨️ Print</button>
        )}
      </div>
    </div>
  );
};

export default BookingCard;