import React, { useState, useRef, useEffect } from "react";
import type { Booking, BookingStatus } from "../../types/scheduler-types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { formatTime12 } from "../../utils/timeUtils";
import Badge from "../../../../components/ui/Badge";
import "../../styles/ViewBillModal.scss";

interface Props { booking: Booking; onClose: () => void; onEdit?: (booking: Booking) => void; onCollectDue?: (booking: Booking) => void }

const STATUS_OPTIONS: { value: BookingStatus; color: string; bg: string; label: string }[] = [
  { value: "Confirmed", color: "#15803d", bg: "#22c55e", label: "✓ Confirmed" },
  { value: "Pending",   color: "#92400e", bg: "#f59e0b", label: "⏳ Pending"   },
  { value: "Cancelled", color: "#fff",    bg: "#ef4444", label: "✕ Cancelled"  },
];

function printReceipt(booking: Booking, staffList: { id: string; name: string }[]) {
  const staffName = staffList.find((s) => s.id === booking.staffId)?.name || booking.staffId || "—";
  const generatedAt = new Date().toLocaleString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const serviceRows = booking.services.map((s) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${s.service}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280">${s.staff || staffName}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${s.qty}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(s.total || 0).toFixed(2)}</td></tr>`).join("");
  const pkgRows = (booking.packageItems || []).map((p) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${p.packageName} <span style="font-size:10px;color:#f59e0b;background:#fef3c7;padding:1px 5px;border-radius:3px">PKG</span></td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280">—</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${p.qty}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">₹${(p.total || 0).toFixed(2)}</td></tr>`).join("");
  const payColor = booking.paymentStatus === "Paid" ? "#22c55e" : booking.paymentStatus === "Partial" ? "#f59e0b" : "#ef4444";
  const html = `<!DOCTYPE html><html><head><title>Receipt — ${booking.clientName}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;padding:36px;color:#111;max-width:620px;margin:0 auto}@media print{body{padding:20px}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px"><div><div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#1f2937">SalonOx</div><div style="font-size:12px;color:#9ca3af;margin-top:3px">Appointment Receipt · ${generatedAt}</div></div><div style="background:${payColor}22;color:${payColor};border:1px solid ${payColor};border-radius:6px;padding:4px 14px;font-size:12px;font-weight:700">${booking.paymentStatus}</div></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:24px"><div><div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Client</div><div style="font-size:14px;font-weight:700;margin-top:3px">${booking.clientName}</div>${booking.clientPhone ? `<div style="font-size:11px;color:#6b7280">${booking.clientPhone}</div>` : ""}</div><div><div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Staff</div><div style="font-size:13px;font-weight:600;margin-top:3px">${staffName}</div></div><div><div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Date</div><div style="font-size:13px;font-weight:600;margin-top:3px">${booking.billDate || booking.date}</div></div><div><div style="font-size:10px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Time</div><div style="font-size:13px;font-weight:600;margin-top:3px">${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}</div></div></div><table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px"><thead><tr style="background:#1f2937;color:#fff"><th style="padding:10px 12px;text-align:left">Service</th><th style="padding:10px 12px;text-align:left">Staff</th><th style="padding:10px 12px;text-align:center">Qty</th><th style="padding:10px 12px;text-align:right">Amount</th></tr></thead><tbody>${serviceRows}${pkgRows}</tbody></table><div style="display:flex;justify-content:flex-end;margin-bottom:24px"><div style="width:260px">${booking.discount ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding:4px 0">Subtotal<span>₹${(booking.subtotal || 0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;color:#ef4444;padding:4px 0">Discount<span>−₹${((booking.subtotal || 0) - (booking.taxableAmount || 0)).toFixed(2)}</span></div>` : ""}${booking.couponDiscount ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#22c55e;padding:4px 0">Coupon (${booking.couponCode})<span>−₹${booking.couponDiscount.toFixed(2)}</span></div>` : ""}${booking.exCharges ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding:4px 0">Extra Charges<span>₹${booking.exCharges.toFixed(2)}</span></div>` : ""}<div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;border-top:2px solid #1f2937;padding-top:10px;margin-top:6px">Grand Total<span>₹${(booking.grandTotal || 0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;color:#22c55e;margin-top:6px;font-weight:600">Paid<span>₹${(booking.payingNow || 0).toFixed(2)}</span></div>${(booking.dueAmount || 0) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#ef4444;margin-top:4px">Balance Due<span>₹${(booking.dueAmount || 0).toFixed(2)}</span></div>` : ""}</div></div>${booking.notes ? `<div style="padding:12px 16px;background:#f9fafb;border-radius:8px;border-left:3px solid #1f2937;margin-bottom:20px"><div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Notes</div><div style="font-size:12px;color:#374151">${booking.notes}</div></div>` : ""}<div style="text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f0f0f0;padding-top:16px">Thank you for visiting SalonOx! 🌸</div></body></html>`;
  const win = window.open("", "_blank", "width=700,height=650");
  if (!win) { alert("Please allow popups."); return; }
  win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 500);
}

const ViewBillModal: React.FC<Props> = ({ booking, onClose, onEdit, onCollectDue }) => {
  const { updateBooking, staffList, clientsList } = useSchedulerContext();
  const [tab, setTab] = useState<"Booking Details" | "Activity Log">("Booking Details");
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDotMenu) return;
    function handleOutside(e: MouseEvent) {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node))
        setShowDotMenu(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showDotMenu]);

  const client = clientsList.find((c) => c.id === booking.clientId);
  const staffName = staffList.find((s) => s.id === booking.staffId)?.name || "—";
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  const payVariant = booking.paymentStatus === "Paid" ? ("success" as const) : booking.paymentStatus === "Partial" ? ("warning" as const) : ("danger" as const);

  function handleStatusChange(s: BookingStatus) {
    setStatus(s); setShowStatusDrop(false);
    updateBooking({ ...booking, status: s });
  }

  return (
    <div className="vbm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vbm-drawer">
        <style>{`@keyframes vbmSlideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* ── Left panel ── */}
        <div className="vbm-left">
          <div className="vbm-client-hero">
            <div className="vbm-avatar">{booking.clientName?.charAt(0) || "?"}</div>
            <div className="vbm-client-name">{booking.clientName}</div>
            {booking.clientPhone && <div className="vbm-client-phone">{booking.clientPhone}</div>}
            {client && <div className="vbm-ewallet"><span>💳 eWallet: ₹{client.eWallet?.toFixed(2) || "0.00"}</span></div>}
          </div>

          <div className="vbm-section">
            <div className="vbm-section-label">Payment</div>
            <Badge variant={payVariant}>{booking.paymentStatus}</Badge>
            <div className="vbm-pay-mode mt-1">Mode: <strong>{booking.paymentMode || "—"}</strong></div>
          </div>

          <div className="vbm-section">
            <div className="vbm-section-label">Appointment</div>
            {[
              ["📅 Date", booking.billDate || booking.date],
              ["🕐 Time", `${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}`],
              ["💼 Staff", staffName],
            ].map(([l, v]) => (
              <div key={l} className="vbm-info-row">
                <div className="vbm-info-row__label">{l}</div>
                <div className="vbm-info-row__value">{v}</div>
              </div>
            ))}
          </div>

          {(booking as any).staffAlert && (
            <div className="vbm-section">
              <div className="vbm-section-label">🔔 Staff Alert</div>
              <div className="vbm-notes-text">{(booking as any).staffAlert}</div>
            </div>
          )}

          {booking.notes && (
            <div className="vbm-section">
              <div className="vbm-section-label">📝 Notes</div>
              <div className="vbm-notes-text">{booking.notes}</div>
            </div>
          )}

          <div className="vbm-section">
            <div className="vbm-section-label">Summary</div>
            {[
              ["Subtotal", booking.subtotal,     "#374151", false],
              ["Taxable",  booking.taxableAmount, "#374151", false],
              ["Total",    booking.grandTotal,    "#111827", true],
              ["Paid",     booking.payingNow,     "#22c55e", false],
              ["Due",      booking.dueAmount,     "#ef4444", false],
            ].map(([l, v, c, bold]) => (
              <div key={l as string} className={`vbm-summary-row${bold ? " vbm-summary-row--bold" : ""}`} style={{ color: c as string }}>
                <span>{l as string}</span>
                <span>₹{((v as number) || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {(booking.dueAmount || 0) > 0 && booking.paymentStatus === "Partial" && onCollectDue && (
            <div className="vbm-section">
              <button
                onClick={() => { onClose(); onCollectDue(booking); }}
                style={{
                  width: "100%", background: "#f59e0b", color: "#fff",
                  border: "none", borderRadius: 8, padding: "10px 0",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                ⏳ Collect Due — ₹{(booking.dueAmount || 0).toFixed(2)}
              </button>
            </div>
          )}

          <div className="vbm-status-section">
            <div className="vbm-section-label">Status</div>
            <div className="vbm-status-wrap position-relative">
              <button className="vbm-status-btn" style={{ background: currentStatus.bg }} onClick={() => setShowStatusDrop((v) => !v)}>
                {currentStatus.label} <span className="vbm-status-btn__arrow">▼</span>
              </button>
              {showStatusDrop && (
                <div className="vbm-status-drop">
                  {STATUS_OPTIONS.map((opt) => (
                    <button key={opt.value} className="vbm-status-drop__item" style={{ background: opt.bg, opacity: status === opt.value ? 1 : 0.82 }}
                      onClick={() => handleStatusChange(opt.value)}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = status === opt.value ? "1" : "0.82")}
                    >{opt.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="vbm-right">
          <div className="vbm-header">
            <div className="vbm-header__left">
              <button className="vbm-close-btn btn btn-sm btn-link text-dark text-decoration-none" onClick={onClose}>✕</button>
              <div>
                <h2 className="vbm-header__title mb-0">View Appointment</h2>
                <div className="vbm-header__id text-muted small">#{booking.id}</div>
              </div>
            </div>
            <div ref={dotMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowDotMenu((v) => !v)}
                style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "5px 13px", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "#374151", fontWeight: 700 }}
                title="More options"
              >⋮</button>
              {showDotMenu && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.13)", minWidth: 190, zIndex: 9999 }}>
                  <button
                    onClick={() => { setShowDotMenu(false); onClose(); onEdit?.(booking); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#111827", borderRadius: "10px 10px 0 0", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span>✏️</span> Edit Appointment
                  </button>
                  <div style={{ height: 1, background: "#f3f4f6" }} />
                  <button
                    onClick={() => { setShowDotMenu(false); printReceipt(booking, staffList); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#111827", borderRadius: "0 0 10px 10px", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span>🖨️</span> Print Receipt
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="vbm-tabs">
            <div className="vbm-tabs__inner">
              {(["Booking Details", "Activity Log"] as const).map((t) => (
                <button key={t} className={`vbm-tab-btn${tab === t ? " vbm-tab-btn--active" : ""}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="vbm-body">
            {tab === "Booking Details" ? (
              <div className="vbm-cards">
                {booking.services.map((s, i) => (
                  <div key={i} className="vbm-service-card">
                    <div className="vbm-service-card__top">
                      <div>
                        <div className="vbm-service-card__name">{s.service}</div>
                        <div className="vbm-service-card__sub">{s.staff} · {s.time}</div>
                      </div>
                      <div className="vbm-service-card__total">₹{(s.total || 0).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", s.qty], ["Price", `₹${(s.price || 0).toFixed(2)}`], ["Disc", "0"]].map(([lbl, val]) => (
                        <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {(booking.packageItems || []).map((p, i) => (
                  <div key={i} className="vbm-pkg-card">
                    <div className="vbm-pkg-card__top">
                      <div>
                        <div className="vbm-pkg-card__name">{p.packageName}</div>
                        <Badge variant="warning" className="mt-1">PACKAGE</Badge>
                      </div>
                      <div className="vbm-pkg-card__total">₹{(p.total || 0).toFixed(2)}</div>
                    </div>
                  </div>
                ))}

                <div className="vbm-breakdown-card">
                  <div className="vbm-breakdown-card__title">Payment Breakdown</div>
                  {[
                    booking.discount ? ["Discount", `−₹${Math.max(0, (booking.subtotal || 0) - (booking.taxableAmount || 0) - (booking.couponDiscount || 0)).toFixed(2)}`, "#ef4444"] : null,
                    booking.couponDiscount ? [`Coupon (${booking.couponCode})`, `−₹${(booking.couponDiscount || 0).toFixed(2)}`, "#22c55e"] : null,
                    booking.exCharges ? ["Extra Charges", `₹${(booking.exCharges || 0).toFixed(2)}`, "#374151"] : null,
                  ].filter(Boolean).map((row, i) => (
                    <div key={i} className="vbm-breakdown-row" style={{ color: row![2] as string }}>
                      <span>{row![0] as string}</span><span>{row![1] as string}</span>
                    </div>
                  ))}
                  <div className="vbm-breakdown-row vbm-breakdown-row--grand"><span>Grand Total</span><span>₹{(booking.grandTotal || 0).toFixed(2)}</span></div>
                  <div className="vbm-breakdown-row vbm-breakdown-row--paid"><span>Paid</span><span>₹{(booking.payingNow || 0).toFixed(2)}</span></div>
                  {(booking.dueAmount || 0) > 0 && (
                    <div className="vbm-breakdown-row vbm-breakdown-row--due"><span>Balance Due</span><span>₹{(booking.dueAmount || 0).toFixed(2)}</span></div>
                  )}
                </div>
              </div>
            ) : (
              <div className="vbm-activity-card">
                <div className="vbm-activity-card__title">Activity Log</div>
                {[
                  { icon: "📅", label: "Appointment Created", detail: `${booking.billDate || booking.date} · ${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}` },
                  { icon: "👤", label: "Client", detail: booking.clientName + (booking.clientPhone ? ` · ${booking.clientPhone}` : "") },
                  { icon: "💼", label: "Staff", detail: staffName },
                  { icon: "💳", label: "Payment Status", detail: booking.paymentStatus },
                  { icon: "📋", label: "Booking Status", detail: status },
                  { icon: "💰", label: "Grand Total", detail: `₹${(booking.grandTotal || 0).toFixed(2)}` },
                  ...(booking.payingNow ? [{ icon: "✅", label: "Amount Paid", detail: `₹${(booking.payingNow || 0).toFixed(2)}` }] : []),
                  ...(booking.dueAmount ? [{ icon: "⏳", label: "Balance Due", detail: `₹${(booking.dueAmount || 0).toFixed(2)}` }] : []),
                  ...((booking as any).staffAlert ? [{ icon: "🔔", label: "Staff Alert", detail: (booking as any).staffAlert }] : []),
                  ...(booking.notes ? [{ icon: "📝", label: "Notes", detail: booking.notes }] : []),
                ].map((entry, i, arr) => (
                  <div key={i} className={`vbm-log-entry${i < arr.length - 1 ? " vbm-log-entry--bordered" : ""}`}>
                    <div className="vbm-log-entry__icon">{entry.icon}</div>
                    <div className="vbm-log-entry__content">
                      <div className="vbm-log-entry__label">{entry.label}</div>
                      <div className="vbm-log-entry__detail">{entry.detail}</div>
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