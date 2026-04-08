import React, { useState } from "react";
import type { Booking, BookingStatus } from "../../types/scheduler-types";
import { CLIENT_LIST, STAFF_LIST } from "../../utils/schedulerMockData";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatTime12 } from "../../utils/timeUtils";
import Button from "../../../../components/ui/Button";
import Badge from "../../../../components/ui/Badge";

interface Props {
  booking: Booking;
  onClose: () => void;
}

const STATUS_OPTIONS: {
  value: BookingStatus;
  color: string;
  bg: string;
  label: string;
}[] = [
  { value: "Confirmed", color: "#15803d", bg: "#22c55e", label: "✓ Confirmed" },
  { value: "Pending", color: "#92400e", bg: "#f59e0b", label: "⏳ Pending" },
  { value: "Cancelled", color: "#fff", bg: "#ef4444", label: "✕ Cancelled" },
];

function printReceipt(booking: Booking) {
  const staffName =
    STAFF_LIST.find((s) => s.id === booking.staffId)?.name ||
    booking.staffId ||
    "—";
  const generatedAt = new Date().toLocaleString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const serviceRows = booking.services
    .map(
      (s) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${s.service}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280">${s.staff || staffName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${s.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(s.total || 0).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const pkgRows = (booking.packageItems || [])
    .map(
      (p) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${p.packageName} <span style="font-size:10px;color:#f59e0b;background:#fef3c7;padding:1px 5px;border-radius:3px">PKG</span></td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280">—</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${p.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(p.total || 0).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const payColor =
    booking.paymentStatus === "Paid"
      ? "#22c55e"
      : booking.paymentStatus === "Partial"
        ? "#f59e0b"
        : "#ef4444";

  const html = `<!DOCTYPE html><html><head><title>Receipt — ${booking.clientName}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;padding:36px;color:#111;max-width:620px;margin:0 auto}@media print{body{padding:20px}}</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
    <div><div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#1f2937">SalonOx</div>
    <div style="font-size:12px;color:#9ca3af;margin-top:3px">Appointment Receipt · ${generatedAt}</div></div>
    <div style="background:${payColor}22;color:${payColor};border:1px solid ${payColor};border-radius:6px;padding:4px 14px;font-size:12px;font-weight:700">${booking.paymentStatus}</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:24px">
    <div><div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Client</div><div style="font-size:14px;font-weight:700;margin-top:3px">${booking.clientName}</div>${booking.clientPhone ? `<div style="font-size:11px;color:#6b7280">${booking.clientPhone}</div>` : ""}</div>
    <div><div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Staff</div><div style="font-size:13px;font-weight:600;margin-top:3px">${staffName}</div></div>
    <div><div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Date</div><div style="font-size:13px;font-weight:600;margin-top:3px">${booking.billDate || booking.date}</div></div>
    <div><div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Time</div><div style="font-size:13px;font-weight:600;margin-top:3px">${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}</div></div>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <thead><tr style="background:#1f2937;color:#fff"><th style="padding:10px 12px;text-align:left">Service</th><th style="padding:10px 12px;text-align:left">Staff</th><th style="padding:10px 12px;text-align:center">Qty</th><th style="padding:10px 12px;text-align:right">Amount</th></tr></thead>
    <tbody>${serviceRows}${pkgRows}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
    <div style="width:260px">
      ${booking.discount ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding:4px 0">Subtotal<span>₹${(booking.subtotal || 0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;color:#ef4444;padding:4px 0">Discount<span>−₹${((booking.subtotal || 0) - (booking.taxableAmount || 0)).toFixed(2)}</span></div>` : ""}
      ${booking.couponDiscount ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#22c55e;padding:4px 0">Coupon (${booking.couponCode})<span>−₹${booking.couponDiscount.toFixed(2)}</span></div>` : ""}
      ${booking.gst ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding:4px 0">GST (${booking.gst}%)<span>₹${((booking.grandTotal || 0) - (booking.taxableAmount || 0) - (booking.exCharges || 0)).toFixed(2)}</span></div>` : ""}
      ${booking.exCharges ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding:4px 0">Extra Charges<span>₹${booking.exCharges.toFixed(2)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;border-top:2px solid #1f2937;padding-top:10px;margin-top:6px">Grand Total<span>₹${(booking.grandTotal || 0).toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#22c55e;margin-top:6px;font-weight:600">Paid<span>₹${(booking.payingNow || 0).toFixed(2)}</span></div>
      ${(booking.dueAmount || 0) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#ef4444;margin-top:4px">Balance Due<span>₹${(booking.dueAmount || 0).toFixed(2)}</span></div>` : ""}
    </div>
  </div>
  ${booking.notes ? `<div style="padding:12px 16px;background:#f9fafb;border-radius:8px;border-left:3px solid #1f2937;margin-bottom:20px"><div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Notes</div><div style="font-size:12px;color:#374151">${booking.notes}</div></div>` : ""}
  <div style="text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f0f0f0;padding-top:16px">Thank you for visiting SalonOx! 🌸</div>
  </body></html>`;

  const win = window.open("", "_blank", "width=700,height=650");
  if (!win) {
    alert("Please allow popups.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

const ViewBillModal: React.FC<Props> = ({ booking, onClose }) => {
  const { updateBooking } = useSchedulerContext();
  const [tab, setTab] = useState<"Booking Details" | "Activity Log">(
    "Booking Details",
  );
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [showStatusDrop, setShowStatusDrop] = useState(false);

  const client = CLIENT_LIST.find((c: any) => c.id === booking.clientId);
  const staffName =
    STAFF_LIST.find((s) => s.id === booking.staffId)?.name || "—";
  const currentStatus =
    STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

  const payVariant =
    booking.paymentStatus === "Paid"
      ? ("success" as const)
      : booking.paymentStatus === "Partial"
        ? ("warning" as const)
        : ("danger" as const);

  function handleStatusChange(s: BookingStatus) {
    setStatus(s);
    setShowStatusDrop(false);
    updateBooking({ ...booking, status: s });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "min(740px,100vw)",
          background: "#f8fafc",
          height: "100vh",
          display: "flex",
          boxShadow: "-8px 0 40px rgba(0,0,0,.18)",
          animation: "slideIn .25s ease",
        }}
      >
        <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* ── Left panel ── */}
        <div
          style={{
            width: 230,
            background: "#fff",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #e5e7eb",
            overflowY: "auto",
          }}
        >
          {/* Client hero */}
          <div
            style={{
              padding: "24px 20px 16px",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#1f2937,#374151)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 22,
                marginBottom: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              {booking.clientName?.charAt(0) || "?"}
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
              {booking.clientName}
            </div>
            {booking.clientPhone && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                {booking.clientPhone}
              </div>
            )}
            {client && (
              <div
                style={{
                  marginTop: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#fef2f2",
                  borderRadius: 5,
                  padding: "3px 8px",
                }}
              >
                <span
                  style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}
                >
                  💳 eWallet: ₹{client.eWallet?.toFixed(2) || "0.00"}
                </span>
              </div>
            )}
          </div>

          {/* Payment status */}
          <div
            style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0" }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginBottom: 6,
              }}
            >
              Payment
            </div>
            <Badge variant={payVariant}>{booking.paymentStatus}</Badge>
            <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
              Mode: <strong>{booking.paymentMode || "—"}</strong>
            </div>
          </div>

          {/* Appointment info */}
          <div
            style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0" }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginBottom: 8,
              }}
            >
              Appointment
            </div>
            {[
              ["📅 Date", booking.billDate || booking.date],
              [
                "🕐 Time",
                `${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}`,
              ],
              ["💼 Staff", staffName],
            ].map(([l, v]) => (
              <div key={l} style={{ marginBottom: 6 }}>
                <div
                  style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}
                >
                  {l}
                </div>
                <div
                  style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {booking.notes && (
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: ".5px",
                  marginBottom: 4,
                }}
              >
                📝 Notes
              </div>
              <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                {booking.notes}
              </div>
            </div>
          )}

          {/* Summary */}
          <div
            style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0" }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginBottom: 8,
              }}
            >
              Summary
            </div>
            {[
              ["Subtotal", booking.subtotal, "#374151", false],
              ["Taxable", booking.taxableAmount, "#374151", false],
              ["Total", booking.grandTotal, "#111827", true],
              ["Paid", booking.payingNow, "#22c55e", false],
              ["Due", booking.dueAmount, "#ef4444", false],
            ].map(([l, v, c, bold]) => (
              <div
                key={l as string}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: bold ? 14 : 12,
                  fontWeight: bold ? 800 : 500,
                  color: c as string,
                  padding: "3px 0",
                  borderTop: bold ? "1px solid #e5e7eb" : "none",
                  marginTop: bold ? 4 : 0,
                  paddingTop: bold ? 8 : 3,
                }}
              >
                <span>{l as string}</span>
                <span>₹{((v as number) || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Status dropdown */}
          <div style={{ padding: "12px 20px", marginTop: "auto" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: ".5px",
                marginBottom: 6,
              }}
            >
              Status
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowStatusDrop((v) => !v)}
                style={{
                  width: "100%",
                  background: currentStatus.bg,
                  color: "#fff",
                  border: "none",
                  borderRadius: 7,
                  padding: "8px 12px",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 6px rgba(0,0,0,.12)",
                }}
              >
                {currentStatus.label}{" "}
                <span style={{ fontSize: 10, opacity: 0.8 }}>▼</span>
              </button>
              {showStatusDrop && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    borderRadius: 7,
                    overflow: "hidden",
                    boxShadow: "0 4px 20px rgba(0,0,0,.15)",
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "9px 12px",
                        background: opt.bg,
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: 12,
                        fontFamily: "inherit",
                        textAlign: "left",
                        opacity: status === opt.value ? 1 : 0.82,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity =
                          status === opt.value ? "1" : "0.82")
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              background: "#fff",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: "#6b7280",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  View Bill
                </h2>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                  #{booking.id}
                </div>
              </div>
            </div>
            <Button
              variant="dark"
              size="sm"
              iconLeft={<span>🖨️</span>}
              onClick={() => printReceipt(booking)}
            >
              Print Receipt
            </Button>
          </div>

          {/* Tabs */}
          <div
            style={{
              padding: "12px 20px 0",
              background: "#fff",
              borderBottom: "1px solid #e5e7eb",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              {(["Booking Details", "Activity Log"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "7px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "6px 6px 0 0",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: tab === t ? "#1f2937" : "transparent",
                    color: tab === t ? "#fff" : "#6b7280",
                    borderBottom:
                      tab === t ? "2px solid #1f2937" : "2px solid transparent",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {tab === "Booking Details" ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {booking.services.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#fff",
                      borderRadius: 10,
                      padding: 16,
                      boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#111827",
                          }}
                        >
                          {s.service}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                            marginTop: 2,
                          }}
                        >
                          {s.staff} · {s.time}
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 15,
                          color: "#1f2937",
                        }}
                      >
                        ₹{(s.total || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        ["Qty", s.qty],
                        ["Price", `₹${(s.price || 0).toFixed(2)}`],
                        ["Disc", "0"],
                      ].map(([lbl, val]) => (
                        <span
                          key={lbl as string}
                          style={{
                            background: "#f3f4f6",
                            borderRadius: 5,
                            padding: "3px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#374151",
                          }}
                        >
                          {lbl}: {val}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {(booking.packageItems || []).map((p, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#fffbeb",
                      borderRadius: 10,
                      padding: 16,
                      boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                      border: "1px solid #fde68a",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#92400e",
                          }}
                        >
                          {p.packageName}
                        </div>
                        <Badge variant="warning" className="mt-1">
                          PACKAGE
                        </Badge>
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 15,
                          color: "#92400e",
                        }}
                      >
                        ₹{(p.total || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Totals card */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 10,
                    padding: 16,
                    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: ".5px",
                      marginBottom: 10,
                    }}
                  >
                    Payment Breakdown
                  </div>
                  {[
                    booking.discount
                      ? [
                          "Discount",
                          `−₹${((booking.subtotal || 0) - (booking.taxableAmount || 0)).toFixed(2)}`,
                          "#ef4444",
                        ]
                      : null,
                    booking.couponDiscount
                      ? [
                          `Coupon (${booking.couponCode})`,
                          `−₹${(booking.couponDiscount || 0).toFixed(2)}`,
                          "#22c55e",
                        ]
                      : null,
                    booking.gst
                      ? [
                          `GST (${booking.gst}%)`,
                          `₹${((booking.grandTotal || 0) - (booking.taxableAmount || 0) - (booking.exCharges || 0)).toFixed(2)}`,
                          "#374151",
                        ]
                      : null,
                    booking.exCharges
                      ? [
                          "Extra Charges",
                          `₹${(booking.exCharges || 0).toFixed(2)}`,
                          "#374151",
                        ]
                      : null,
                  ]
                    .filter(Boolean)
                    .map((row, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: row![2] as string,
                          padding: "3px 0",
                        }}
                      >
                        <span>{row![0] as string}</span>
                        <span>{row![1] as string}</span>
                      </div>
                    ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#111827",
                      borderTop: "1px solid #e5e7eb",
                      paddingTop: 10,
                      marginTop: 6,
                    }}
                  >
                    <span>Grand Total</span>
                    <span>₹{(booking.grandTotal || 0).toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "#22c55e",
                      fontWeight: 600,
                      marginTop: 6,
                    }}
                  >
                    <span>Paid</span>
                    <span>₹{(booking.payingNow || 0).toFixed(2)}</span>
                  </div>
                  {(booking.dueAmount || 0) > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: "#ef4444",
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    >
                      <span>Balance Due</span>
                      <span>₹{(booking.dueAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: 16,
                  boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                  border: "1px solid #f0f0f0",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#111827",
                    marginBottom: 14,
                  }}
                >
                  Activity Log
                </div>
                {[
                  {
                    icon: "📅",
                    label: "Appointment Created",
                    detail: `${booking.billDate || booking.date} · ${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}`,
                  },
                  {
                    icon: "👤",
                    label: "Client",
                    detail:
                      booking.clientName +
                      (booking.clientPhone ? ` · ${booking.clientPhone}` : ""),
                  },
                  { icon: "💼", label: "Staff", detail: staffName },
                  {
                    icon: "💳",
                    label: "Payment Status",
                    detail: booking.paymentStatus,
                  },
                  { icon: "📋", label: "Booking Status", detail: status },
                  {
                    icon: "💰",
                    label: "Grand Total",
                    detail: `₹${(booking.grandTotal || 0).toFixed(2)}`,
                  },
                  ...(booking.payingNow
                    ? [
                        {
                          icon: "✅",
                          label: "Amount Paid",
                          detail: `₹${(booking.payingNow || 0).toFixed(2)}`,
                        },
                      ]
                    : []),
                  ...(booking.dueAmount
                    ? [
                        {
                          icon: "⏳",
                          label: "Balance Due",
                          detail: `₹${(booking.dueAmount || 0).toFixed(2)}`,
                        },
                      ]
                    : []),
                  ...(booking.notes
                    ? [{ icon: "📝", label: "Notes", detail: booking.notes }]
                    : []),
                ].map((entry, i, arr) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: "10px 0",
                      borderBottom:
                        i < arr.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "#f3f4f6",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                      }}
                    >
                      {entry.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#9ca3af",
                          textTransform: "uppercase",
                          letterSpacing: ".4px",
                        }}
                      >
                        {entry.label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#111827",
                          marginTop: 3,
                          fontWeight: 500,
                        }}
                      >
                        {entry.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBillModal;
