import React, { useState, useRef, useEffect } from "react";
import { currencySymbol } from "../../utils/currency";
import type { Booking, BookingStatus } from "../../types/scheduler-types";
import type { Salon } from "../../../../types/salon.types";
import { useSchedulerContext } from "../../store/SchedulerContext";
import { useAppSelector } from "../../../../hooks/useAppRedux";
import { formatTime12 } from "../../utils/timeUtils";
import Badge from "../../../../components/ui/Badge";
import "../../styles/ViewBillModal.scss";

interface Props { booking: Booking; onClose: () => void; onEdit?: (booking: Booking) => void; onCollectDue?: (booking: Booking) => void }

export function printReceipt(
  booking: Booking,
  staffList: { id: string; name: string }[],
  salon: Salon | null,
) {
  const findStaffName = (id?: string | number | null) =>
    id ? staffList.find((s) => String(s.id) === String(id))?.name ?? "" : "";

  const salonName    = salon?.business_name || "Salon";
  const salonAddress = salon?.address       || "";
  const salonPhone   = salon?.phone         || "";
  const salonEmail   = salon?.email         || "";
  const gst          = salon?.gst_number    || "";
  const logoUrl      = salon?.logo_url      || "";

  const generatedAt = new Date().toLocaleString("en-IN", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const apptDate = (booking as any).billDate || (booking as any).date || "";

  const isCancelled = ((booking as any).status || "").toLowerCase() === "cancelled";
  const ps = isCancelled ? "Cancelled" : (booking.paymentStatus ?? "Unpaid");
  const PAY_COLOR: Record<string, string> = { Paid: "#16a34a", Partial: "#7c3aed", Unpaid: "#d97706", Cancelled: "#ef4444" };
  const PAY_BG:    Record<string, string> = { Paid: "#dcfce7", Partial: "#ede9fe", Unpaid: "#fef3c7", Cancelled: "#fee2e2" };
  const payColor = PAY_COLOR[ps] ?? "#d97706";
  const payBg    = PAY_BG[ps]    ?? "#fef3c7";

  const allStaffDisplay = Array.from(new Set(
    [booking.staffId, ...(booking.services || []).map((s: any) => s.staffId)].filter(Boolean)
  )).map((id) => findStaffName(id as string)).filter(Boolean).join(", ") || "—";

  const services        = booking.services || [];
  const packageItems    = (booking as any).packageItems  || (booking as any).packages     || [];
  const membershipItems = (booking as any).membershipItems || (booking as any).memberships || [];
  const productItems    = (booking as any).productItems  || (booking as any).products      || [];

  const badgeStyle = (bg: string, color: string) =>
    `display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:0.3px;background:${bg};color:${color}`;

  const td = (content: string, extra = "") =>
    `<td style="padding:9px 11px;border-bottom:1px solid #f3f4f6;vertical-align:middle${extra ? ";" + extra : ""}">${content}</td>`;

  const makeRow = (
    itemName: string,
    badgeBg: string, badgeColor: string, badgeLabel: string,
    staffDisplay: string,
    timeDisplay: string,
    qty: number, price: number, discount: number, total: number,
  ) =>
    `<tr>
      ${td(itemName, "text-align:left")}
      ${td(`<span style="${badgeStyle(badgeBg, badgeColor)}">${badgeLabel}</span>`, "text-align:center")}
      ${td(staffDisplay || "—", "text-align:center;font-size:11px;color:#6b7280")}
      ${td(timeDisplay  || "—", "text-align:center;font-size:11px;color:#6b7280")}
      ${td(String(qty),         "text-align:center")}
      ${td(`${currencySymbol}${price.toFixed(2)}`, "text-align:right")}
      ${td(discount > 0 ? `<span style="color:#ef4444">−${currencySymbol}${discount.toFixed(2)}</span>` : "—", "text-align:right")}
      ${td(`${currencySymbol}${total.toFixed(2)}`, "text-align:right;font-weight:600")}
    </tr>`;

  const svcRows = services.map((s: any) => makeRow(
    s.service || s.name || "",
    "#ede9fe", "#5b21b6", "Service",
    findStaffName(s.staffId) || allStaffDisplay,
    s.time ? formatTime12(s.time) : "—",
    Number(s.qty || 1), Number(s.price || 0), Number(s.discount || 0), Number(s.total || s.price || 0),
  )).join("");

  const pkgRows = packageItems.map((p: any) => makeRow(
    p.packageName || p.name || "",
    "#fef3c7", "#92400e", "Package",
    findStaffName(p.staffId) || "—", "—",
    Number(p.qty || 1), Number(p.price || 0), Number(p.discount || 0), Number(p.total || p.price || 0),
  )).join("");

  const memRows = membershipItems.map((m: any) => makeRow(
    m.membershipName || m.name || "",
    "#dcfce7", "#15803d", "Membership",
    findStaffName(m.staffId) || "—", "—",
    Number(m.qty || 1), Number(m.price || 0), Number(m.discount || 0), Number(m.total || m.price || 0),
  )).join("");

  const prodRows = productItems.map((p: any) => makeRow(
    p.productName || p.name || "",
    "#dbeafe", "#1d4ed8", "Product",
    findStaffName(p.staffId) || "—",
    p.time ? formatTime12(p.time) : "—",
    Number(p.qty || 1), Number(p.price || 0), Number(p.discount || 0), Number(p.total || p.price || 0),
  )).join("");

  const allItemRows = svcRows + pkgRows + memRows + prodRows;

  const subtotalAmt = Number((booking as any).subtotal || 0);
  const couponDisc  = Number((booking as any).couponDiscount || 0);
  const manualDisc  = Number((booking as any).discountAmount || 0);
  const exCharges = Number((booking as any).exCharges || 0);
  const tipAmt    = Number((booking as any).tipAmount || 0);

  const summaryRow = (label: string, value: string, cls = "") =>
    `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;${cls}">${label}<span>${value}</span></div>`;

  const summaryHtml = [
    subtotalAmt > 0 ? summaryRow("Subtotal", `${currencySymbol}${subtotalAmt.toFixed(2)}`, "color:#6b7280") : "",
    manualDisc  > 0 ? summaryRow("Discount", `−${currencySymbol}${manualDisc.toFixed(2)}`, "color:#ef4444") : "",
    couponDisc  > 0 ? summaryRow(`Coupon (${(booking as any).couponCode || ""})`, `−${currencySymbol}${couponDisc.toFixed(2)}`, "color:#ef4444") : "",
    exCharges   > 0 ? summaryRow("Extra Charges", `${currencySymbol}${exCharges.toFixed(2)}`, "color:#6b7280") : "",
    tipAmt      > 0 ? summaryRow("Tip", `${currencySymbol}${tipAmt.toFixed(2)}`, "color:#6b7280") : "",
    `<div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;color:#1f2937;border-top:2px solid #1f2937;margin-top:8px;padding-top:10px">Grand Total<span>${currencySymbol}${(booking.grandTotal || 0).toFixed(2)}</span></div>`,
    `<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:#16a34a;margin-top:6px">Amount Paid<span>${currencySymbol}${(booking.payingNow || 0).toFixed(2)}</span></div>`,
    (booking.dueAmount || 0) > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#dc2626;margin-top:4px">Balance Due<span>${currencySymbol}${(booking.dueAmount || 0).toFixed(2)}</span></div>` : "",
  ].filter(Boolean).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt — ${salonName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5}
.receipt{max-width:700px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.10)}
.rh{background:linear-gradient(135deg,#1f2937,#374151);color:#fff;padding:28px 32px 22px}
.rh-logo{width:52px;height:52px;border-radius:50%;object-fit:cover;margin-bottom:8px;border:2px solid rgba(255,255,255,.3)}
.rh-name{font-size:22px;font-weight:800;letter-spacing:-.5px}
.rh-meta{font-size:11px;color:rgba(255,255,255,.7);margin-top:5px;line-height:1.7}
.rh-foot{display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,.15)}
.rh-id{font-size:11px;color:rgba(255,255,255,.6)}
.pay-badge{padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700}
.sec{padding:20px 32px}
.sec+.sec{border-top:1px solid #f3f4f6}
.sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#9ca3af;margin-bottom:12px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.il{font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.iv{font-size:13px;font-weight:600;color:#1f2937}
.is{font-size:11px;color:#6b7280;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px}
thead tr{background:#1f2937;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
thead th{padding:10px 11px;font-size:11px;font-weight:600;letter-spacing:.3px;white-space:nowrap}
thead th:first-child{text-align:left}
thead th:not(:first-child){text-align:center}
thead th:last-child{text-align:right}
tbody tr:nth-child(even){background:#f9fafb}
.footer{background:#1f2937;color:rgba(255,255,255,.7);text-align:center;padding:18px 32px;font-size:11px;line-height:1.8;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.footer strong{color:#fff;font-size:13px}
@media print{
  body{background:none}
  .receipt{box-shadow:none;border-radius:0;margin:0;max-width:100%}
}
@page{margin:8mm}
</style>
</head>
<body>
<div class="receipt">
  <div class="rh">
    ${logoUrl ? `<img class="rh-logo" src="${logoUrl}" alt="" onerror="this.style.display='none'">` : ""}
    <div class="rh-name">${salonName}</div>
    <div class="rh-meta">
      ${salonAddress}
      ${(salonPhone || salonEmail) ? `<br>${[salonPhone, salonEmail].filter(Boolean).join(" &nbsp;·&nbsp; ")}` : ""}
      ${gst ? `<br>GST: ${gst}` : ""}
    </div>
    <div class="rh-foot">
      <div class="rh-id">
        Booking #<strong style="color:#fff">${booking.id}</strong>
        &nbsp;·&nbsp; ${generatedAt}
      </div>
      <span class="pay-badge" style="background:${payBg};color:${payColor}">${ps}</span>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">Customer &amp; Appointment</div>
    <div class="grid3">
      <div>
        <div class="il">Client</div>
        <div class="iv">${booking.clientName || "Walk-In"}</div>
        ${booking.clientPhone ? `<div class="is">${booking.clientPhone}</div>` : ""}
      </div>
      <div>
        <div class="il">Date &amp; Time</div>
        <div class="iv">${apptDate}</div>
        <div class="is">${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}</div>
      </div>
      <div>
        <div class="il">Staff · Payment</div>
        <div class="iv">${allStaffDisplay}</div>
        <div class="is">via ${(booking as any).paymentMode || "—"}</div>
      </div>
    </div>
  </div>

  <div class="sec" style="padding-top:0;padding-bottom:0">
    <div class="sec-title" style="padding-top:20px">Services &amp; Items</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Item</th>
          <th>Type</th>
          <th>Staff</th>
          <th>Time</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Disc</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${allItemRows}</tbody>
    </table>
  </div>

  <div style="display:flex;justify-content:flex-end;padding:20px 32px;background:#f9fafb;border-top:1px solid #f3f4f6">
    <div style="width:280px">${summaryHtml}</div>
  </div>

  ${booking.notes ? `<div class="sec" style="background:#fffbeb"><div class="sec-title">Notes</div><div style="font-size:12px;color:#374151;line-height:1.6">${booking.notes}</div></div>` : ""}

  <div class="footer">
    <strong>Thank you for visiting ${salonName}!</strong><br>
    We appreciate your business and look forward to seeing you again.
    ${(salonPhone || salonEmail) ? `<br><span style="font-size:10px">${[salonPhone, salonEmail].filter(Boolean).join(" · ")}</span>` : ""}
  </div>
</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=750,height=700");
  if (!win) { alert("Please allow popups to print."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.onafterprint = () => win.close(); win.print(); }, 500);
}

const ViewBillModal: React.FC<Props> = ({ booking, onClose, onEdit, onCollectDue }) => {
  const { staffList, clientsList } = useSchedulerContext();
  const currentSalon = useAppSelector((s) => s.salon.currentSalon);
  const [tab, setTab] = useState<"Booking Details" | "Activity Log">("Booking Details");
  const [showDotMenu, setShowDotMenu] = useState(false);

  const isPaid    = booking.paymentStatus === "Paid";
  const isPartial = booking.paymentStatus === "Partial" || (booking.dueAmount ?? 0) > 0;
  const bookingStatus: BookingStatus = isPaid && !isPartial ? "Completed" : "Due";
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

  // Use String() coercion so number IDs from the API match string IDs from the form
  const findStaffName = (id?: string | number | null) =>
    id ? staffList.find((s) => String(s.id) === String(id))?.name ?? "" : "";

  // Collect all unique staff names across all item types
  const allStaffNames = (() => {
    const seen = new Set<string>();
    const names: string[] = [];
    const ids = [
      booking.staffId,
      ...(booking.services || []).map((s: any) => s.staffId || s.staff_id),
    ].filter(Boolean);
    ids.forEach((id) => {
      const key = String(id);
      if (!seen.has(key)) {
        seen.add(key);
        const n = findStaffName(id as string);
        if (n) names.push(n);
      }
    });
    return names;
  })();

  const staffName = allStaffNames.join(", ") || "—";
  const payVariant = booking.paymentStatus === "Paid" ? ("success" as const) : booking.paymentStatus === "Partial" ? ("warning" as const) : ("danger" as const);

  return (
    <div className="vbm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vbm-drawer">
        <style>{`@keyframes vbmSlideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* ── Left panel ── */}
        <div className="vbm-left">
          <div className="vbm-client-hero">
            <div className="vbm-avatar">{booking.clientName?.charAt(0) || "?"}</div>
            <div className="vbm-client-name">{booking.clientName}</div>
            {booking.clientPhone && (
              <div className="vbm-client-phone">{booking.clientPhone}</div>
            )}
            {client && <div className="vbm-ewallet"><span>💳 eWallet: {currencySymbol}{client.eWallet?.toFixed(2) || "0.00"}</span></div>}
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
              booking.subtotal       ? ["Subtotal", `${currencySymbol}${booking.subtotal.toFixed(2)}`, "#374151", false] : null,
              booking.discountAmount ? ["Discount", `−${currencySymbol}${booking.discountAmount.toFixed(2)}`, "#ef4444", false] : null,
              booking.couponDiscount ? [`Coupon (${booking.couponCode})`, `−${currencySymbol}${booking.couponDiscount.toFixed(2)}`, "#22c55e", false] : null,
              booking.exCharges      ? ["Extra Charges", `${currencySymbol}${booking.exCharges.toFixed(2)}`, "#374151", false] : null,
              booking.tipAmount      ? ["Tip", `${currencySymbol}${booking.tipAmount.toFixed(2)}`, "#374151", false] : null,
              ["Total", `${currencySymbol}${(booking.grandTotal || 0).toFixed(2)}`, "#111827", true],
              ["Paid",  `${currencySymbol}${(booking.payingNow || 0).toFixed(2)}`, "#111827", false],
              (booking.dueAmount || 0) > 0 ? ["Due", `${currencySymbol}${(booking.dueAmount || 0).toFixed(2)}`, "#ef4444", false] : null,
            ].filter((row): row is [string, string, string, boolean] => row !== null).map(([l, v, c, bold]) => (
              <div key={l as string} className={`vbm-summary-row${bold ? " vbm-summary-row--bold" : ""}`} style={{ color: c as string }}>
                <span>{l as string}</span>
                <span>{v as string}</span>
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
                ⏳ Collect Due — {currencySymbol}{(booking.dueAmount || 0).toFixed(2)}
              </button>
            </div>
          )}

          <div className="vbm-status-section">
            <div className="vbm-section-label">Status</div>
            <span
              style={{
                display: "inline-block",
                padding: "5px 16px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                background: bookingStatus === "Completed" ? "#22c55e" : "#7c3aed",
              }}
            >
              {bookingStatus === "Completed" ? "✓ Completed" : "⏳ Partial"}
            </span>
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
                    onClick={() => { setShowDotMenu(false); printReceipt(booking, staffList, currentSalon); }}
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
                {booking.services.map((s, i) => {
                  const sAny = s as any;
                  const svcStaffName = (() => {
                    const byId = findStaffName(sAny.staffId);
                    if (byId) return byId;
                    const sf = sAny.staff;
                    if (sf && typeof sf === "object" && sf.name) return sf.name;
                    if (typeof sf === "string" && sf.trim()) return sf.trim();
                    return staffName;
                  })();
                  return (
                    <div key={i} className="vbm-service-card">
                      <div className="vbm-service-card__top">
                        <div>
                          <div className="vbm-service-card__name">{(s as any).name || s.service}</div>
                          <div className="vbm-service-card__sub">
                            {svcStaffName && <span>{svcStaffName}</span>}
                            {s.time && <span>{svcStaffName ? " · " : ""}{s.time}</span>}
                          </div>
                        </div>
                        <div className="vbm-service-card__total">{currencySymbol}{(s.total || 0).toFixed(2)}</div>
                      </div>
                      <div className="vbm-service-card__pills">
                        {[["Qty", s.qty], ["Price", `${currencySymbol}${(s.price || 0).toFixed(2)}`], ["Disc", "0"]].map(([lbl, val]) => (
                          <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {(booking.packageItems || []).map((p, i) => (
                  <div key={i} className="vbm-service-card">
                    <div className="vbm-service-card__top">
                      <div>
                        <div className="vbm-service-card__name">{p.packageName || (p as any).name}</div>
                        <div className="vbm-service-card__sub">
                          <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>PACKAGE</span>
                        </div>
                      </div>
                      <div className="vbm-service-card__total">{currencySymbol}{(p.total || p.price || 0).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", p.qty || 1], ["Price", `${currencySymbol}${(p.price || 0).toFixed(2)}`]].map(([lbl, val]) => (
                        <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {((booking as any).productItems || (booking as any).products || []).map((p: any, i: number) => (
                  <div key={i} className="vbm-service-card">
                    <div className="vbm-service-card__top">
                      <div>
                        <div className="vbm-service-card__name">{p.productName || p.name}</div>
                        <div className="vbm-service-card__sub">
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>PRODUCT</span>
                        </div>
                      </div>
                      <div className="vbm-service-card__total">{currencySymbol}{(p.total || p.price || 0).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", p.qty || 1], ["Price", `${currencySymbol}${(p.price || 0).toFixed(2)}`]].map(([lbl, val]) => (
                        <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {((booking as any).membershipItems || (booking as any).memberships || []).map((m: any, i: number) => (
                  <div key={i} className="vbm-service-card">
                    <div className="vbm-service-card__top">
                      <div>
                        <div className="vbm-service-card__name">{m.membershipName || m.name}</div>
                        <div className="vbm-service-card__sub">
                          <span style={{ background: "#f0fdf4", color: "#15803d", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>MEMBERSHIP</span>
                        </div>
                      </div>
                      <div className="vbm-service-card__total">{currencySymbol}{(m.total || m.price || 0).toFixed(2)}</div>
                    </div>
                    <div className="vbm-service-card__pills">
                      {[["Qty", m.qty || 1], ["Price", `${currencySymbol}${(m.price || 0).toFixed(2)}`]].map(([lbl, val]) => (
                        <span key={lbl as string} className="vbm-pill">{lbl}: {val}</span>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="vbm-breakdown-card">
                  <div className="vbm-breakdown-card__title">Payment Breakdown</div>
                  {[
                    booking.subtotal ? ["Subtotal", `${currencySymbol}${(booking.subtotal || 0).toFixed(2)}`, "#6b7280"] : null,
                    booking.discountAmount ? ["Discount", `−${currencySymbol}${(booking.discountAmount || 0).toFixed(2)}`, "#ef4444"] : null,
                    booking.couponDiscount ? [`Coupon (${booking.couponCode})`, `−${currencySymbol}${(booking.couponDiscount || 0).toFixed(2)}`, "#22c55e"] : null,
                    booking.exCharges ? ["Extra Charges", `${currencySymbol}${(booking.exCharges || 0).toFixed(2)}`, "#374151"] : null,
                    booking.tipAmount ? ["Tip", `${currencySymbol}${(booking.tipAmount || 0).toFixed(2)}`, "#374151"] : null,
                  ].filter(Boolean).map((row, i) => (
                    <div key={i} className="vbm-breakdown-row" style={{ color: row![2] as string }}>
                      <span>{row![0] as string}</span><span>{row![1] as string}</span>
                    </div>
                  ))}
                  <div className="vbm-breakdown-row vbm-breakdown-row--grand"><span>Grand Total</span><span>{currencySymbol}{(booking.grandTotal || 0).toFixed(2)}</span></div>
                  <div className="vbm-breakdown-row vbm-breakdown-row--paid"><span>Paid</span><span>{currencySymbol}{(booking.payingNow || 0).toFixed(2)}</span></div>
                  {(booking.dueAmount || 0) > 0 && (
                    <div className="vbm-breakdown-row vbm-breakdown-row--due"><span>Balance Due</span><span>{currencySymbol}{(booking.dueAmount || 0).toFixed(2)}</span></div>
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
                  { icon: "💰", label: "Grand Total", detail: `${currencySymbol}${(booking.grandTotal || 0).toFixed(2)}` },
                  ...(booking.payingNow ? [{ icon: "✅", label: "Amount Paid", detail: `${currencySymbol}${(booking.payingNow || 0).toFixed(2)}` }] : []),
                  ...(booking.dueAmount ? [{ icon: "⏳", label: "Balance Due", detail: `${currencySymbol}${(booking.dueAmount || 0).toFixed(2)}` }] : []),
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