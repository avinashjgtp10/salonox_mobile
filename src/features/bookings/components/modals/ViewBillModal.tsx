import React, { useState } from "react";
import type { Booking, BookingStatus } from "../../types/scheduler-types";
import { CLIENT_LIST } from "../../utils/schedulerMockData";
import { useSchedulerContext } from "../../store/SchedulerContext";

interface Props { booking: Booking; onClose: () => void; }

const ViewBillModal: React.FC<Props> = ({ booking, onClose }) => {
  const { updateBooking } = useSchedulerContext();
  const [tab,    setTab]    = useState<"Booking Details" | "Activity Log">("Booking Details");
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const client = CLIENT_LIST.find((c: any) => c.id === booking.clientId);

  function handleStatusChange(s: BookingStatus) {
    setStatus(s);
    updateBooking({ ...booking, status: s });
  }

  function handlePrint() {
    const win = window.open("", "_blank", "width=800,height=700");
    if (!win) { alert("Please allow popups for printing."); return; }

    const rows = booking.services.map(s => `
      <tr>
        <td>${s.service}</td>
        <td>${s.staff}</td>
        <td>${s.time}</td>
        <td>${s.qty}</td>
        <td>₹${s.price.toFixed(2)}</td>
        <td>₹${s.total.toFixed(2)}</td>
      </tr>
    `).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill — ${booking.clientName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #111; }
          h1   { font-size: 22px; margin-bottom: 4px; }
          .meta { font-size: 13px; color: #666; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th, td { padding: 10px 12px; border: 1px solid #e5e7eb; font-size: 13px; text-align: left; }
          th { background: #f9fafb; font-weight: 600; }
          .totals { max-width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          .total-row.bold { font-weight: 700; font-size: 15px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          .confirmed { background: #d1fae5; color: #065f46; }
          .pending   { background: #fef3c7; color: #92400e; }
          .cancelled { background: #fef2f2; color: #ef4444; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <h1>Bill — ${booking.clientName}</h1>
        <div class="meta">
          Phone: ${booking.clientPhone} &nbsp;|&nbsp;
          Date: ${booking.billDate} &nbsp;|&nbsp;
          Status: <span class="badge ${booking.status.toLowerCase()}">${booking.status}</span> &nbsp;|&nbsp;
          Payment: ${booking.paymentStatus}
        </div>

        <table>
          <thead>
            <tr>
              <th>Service</th><th>Staff</th><th>Time</th>
              <th>Qty</th><th>Price</th><th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="totals">
          <div class="total-row"><span>Subtotal</span><span>₹${booking.subtotal.toFixed(2)}</span></div>
          ${booking.discount ? `<div class="total-row"><span>Discount</span><span>-₹${booking.discount.toFixed(2)}</span></div>` : ""}
          ${booking.gst ? `<div class="total-row"><span>GST ${booking.gst}%</span><span>₹${(booking.taxableAmount * booking.gst / 100).toFixed(2)}</span></div>` : ""}
          <div class="total-row bold"><span>Grand Total</span><span>₹${booking.grandTotal.toFixed(2)}</span></div>
          <div class="total-row"><span>Paid</span><span>₹${booking.payingNow.toFixed(2)}</span></div>
          <div class="total-row"><span>Due</span><span>₹${booking.dueAmount.toFixed(2)}</span></div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,.45)", zIndex: 1000,
        display: "flex", justifyContent: "flex-end",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: "min(700px,100vw)", background: "#f3f4f6",
        height: "100vh", display: "flex",
      }}>

        {/* Left panel */}
        <div style={{
          width: 220, background: "#fff", padding: 20,
          borderRight: "1px solid #e5e7eb",
          flexShrink: 0, overflowY: "auto",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "#6b7280", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 20, marginBottom: 8,
          }}>
            {booking.clientName ? booking.clientName.charAt(0) : "?"}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{booking.clientName}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{booking.clientPhone}</div>
          {client && (
            <div style={{
              fontSize: 11, color: "#ef4444", fontWeight: 600,
              background: "#fef2f2", borderRadius: 4,
              padding: "2px 6px", display: "inline-block", marginBottom: 10,
            }}>
              Ewallet: ₹{client.eWallet?.toFixed(2) || "0.00"}
            </div>
          )}
          <button className="btn-primary" style={{ width: "100%", marginBottom: 16, fontSize: 12 }}>
            View History
          </button>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Payment Mode</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>{booking.paymentMode || "—"}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>📝 Notes</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>{booking.notes || "—"}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🔔 Staff Alert</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>{booking.staffAlert || "—"}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Appointment Date</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{booking.billDate}</div>
          <select
            value={status}
            onChange={e => handleStatusChange(e.target.value as BookingStatus)}
            style={{
              background: status === "Confirmed" ? "#22c55e" : status === "Pending" ? "#f59e0b" : "#ef4444",
              color: "#fff", border: "none", borderRadius: 6,
              padding: "6px 10px", fontWeight: 600, fontSize: 12,
              cursor: "pointer", width: "100%", marginBottom: 16,
              fontFamily: "inherit",
            }}
          >
            <option>Confirmed</option>
            <option>Pending</option>
            <option>Cancelled</option>
          </select>
          <div style={{ height: 1, background: "#e5e7eb", margin: "8px 0" }} />
          {[["Subtotal", booking.subtotal], ["Actual Price", booking.subtotal], ["Taxable", booking.taxableAmount]].map(([l, v]) => (
            <div key={l as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}>
              <span style={{ color: "#6b7280" }}>{l}</span><span>₹{(v as number || 0).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "#e5e7eb", margin: "8px 0" }} />
          {[["Total", booking.grandTotal], ["Paid", booking.payingNow], ["Due", booking.dueAmount]].map(([l, v]) => (
            <div key={l as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", fontWeight: l === "Total" ? 700 : 400 }}>
              <span>{l}</span><span>₹{(v as number || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>✕</button>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>View Bill</h2>
            </div>
            <button
              onClick={handlePrint}
              style={{
                border: "1px solid #d1d5db", borderRadius: 6,
                padding: "6px 14px", fontSize: 13,
                cursor: "pointer", background: "#fff",
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: "inherit",
              }}
            >🖨 Print</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {(["Booking Details", "Activity Log"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "7px 16px", fontSize: 13, fontWeight: 600,
                border: "none", borderRadius: 6, cursor: "pointer",
                fontFamily: "inherit",
                background: tab === t ? "#1f2937" : "#e5e7eb",
                color: tab === t ? "#fff" : "#374151",
              }}>{t}</button>
            ))}
          </div>

          {tab === "Booking Details" ? (
            <div style={{ background: "#fff", borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Services</div>
              {booking.services.map((s, i) => (
                <div key={i} style={{
                  marginBottom: 14, paddingBottom: 14,
                  borderBottom: i < booking.services.length - 1 ? "1px solid #e5e7eb" : "none",
                }}>
                  <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
                    {s.service} · {s.time} · {s.staff}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      ["Qty", s.qty],
                      ["Price", `₹${(s.price || 0).toFixed(2)}`],
                      ["Discount", "0"],
                    ].map(([lbl, val]) => (
                      <span key={lbl as string} style={{
                        background: "#fef3c7", borderRadius: 4,
                        padding: "2px 8px", fontSize: 12, fontWeight: 600,
                      }}>{lbl}: {val}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      background: "#d1fae5", borderRadius: 4,
                      padding: "2px 8px", fontSize: 12, fontWeight: 600,
                    }}>
                      Total: ₹{(s.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>No activity recorded yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewBillModal;
