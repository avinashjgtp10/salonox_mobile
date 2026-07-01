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
  client?: { phone?: string; email?: string; [key: string]: any } | null,
) {
  const findStaffName = (id?: string | number | null) =>
    id ? staffList.find((s) => String(s.id) === String(id))?.name ?? "" : "";

  const s = salon as any;
  const salonName    = s?.business_name || "Salon";
  // Address: try multiple field names the API might use
  const salonAddress = s?.address || s?.address_line1
    ? [s?.address || s?.address_line1, s?.address_line2, s?.city, s?.state, s?.pincode].filter(Boolean).join(", ")
    : "";
  const salonPhone   = s?.phone         || s?.phone_number  || s?.mobile        || s?.contact || "";
  const salonEmail   = s?.email         || s?.email_address || "";
  const salonWebsite = s?.website_url   || s?.website       || "";
  const gst          = s?.gst_number    || s?.gstin         || s?.gst           || "";
  const logoUrl      = s?.logo_url      || s?.logo          || "";

  // Client contact — prefer looked-up client record over booking fields
  const clientPhone    = client?.phone || client?.phone_number || client?.mobile
    || (booking as any).clientPhone || "";
  const clientEmail    = client?.email || (booking as any).clientEmail || "";
  const clientGst      = (booking as any).clientGst || (booking as any).client_gst || "";
  const membershipName = (booking as any).membershipName || (booking as any).membership_name || "";
  const loyaltyPoints  = (booking as any).loyaltyPoints ?? (booking as any).loyalty_points ?? null;

  const now = new Date();
  const printDate = now.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const printTime = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const invoiceNo = `INV-${String(booking.id).padStart(6, "0")}`;

  const apptDate = (booking as any).billDate || (booking as any).date || "—";
  const apptTime = `${formatTime12(booking.startTime)} – ${formatTime12(booking.endTime)}`;

  const isCancelled = ((booking as any).status || "").toLowerCase() === "cancelled";
  const rawPs = isCancelled ? "Cancelled" : (booking.paymentStatus ?? "Unpaid");
  const PAY_COLOR: Record<string, string> = { Paid: "#15803d", Partial: "#7c3aed", Unpaid: "#b45309", Cancelled: "#dc2626" };
  const PAY_BG:    Record<string, string> = { Paid: "#dcfce7", Partial: "#ede9fe", Unpaid: "#fef3c7", Cancelled: "#fee2e2" };
  const payColor = PAY_COLOR[rawPs] ?? "#b45309";
  const payBg    = PAY_BG[rawPs]    ?? "#fef3c7";

  const allStaffIds = Array.from(new Set(
    [booking.staffId, ...(booking.services || []).map((s: any) => s.staffId)].filter(Boolean)
  )) as string[];
  const allStaffDisplay = allStaffIds.map((id) => findStaffName(id)).filter(Boolean).join(", ") || "—";

  const services        = booking.services || [];
  const packageItems    = (booking as any).packageItems  || (booking as any).packages     || [];
  const membershipItems = (booking as any).membershipItems || (booking as any).memberships || [];
  const productItems    = (booking as any).productItems  || (booking as any).products      || [];

  // ── Currency: no symbol for calendar feature ──
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Table rows ────────────────────────────────────────────────────────────
  let srNo = 0;
  const BADGE: Record<string, [string, string]> = {
    Service:    ["#ede9fe", "#5b21b6"],
    Package:    ["#fef3c7", "#92400e"],
    Membership: ["#dcfce7", "#15803d"],
    Product:    ["#dbeafe", "#1d4ed8"],
  };

  const makeRow = (
    name: string, type: string, staff: string, time: string,
    qty: number, price: number, discount: number, total: number,
    isEven: boolean,
  ) => {
    srNo++;
    const [badgeBg, badgeColor] = BADGE[type] ?? ["#f3f4f6", "#374151"];
    const rowBg = isEven ? "#f9fafb" : "#ffffff";
    return `
    <tr style="background:${rowBg};-webkit-print-color-adjust:exact;print-color-adjust:exact">
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center;color:#6b7280;font-size:11px">${srNo}</td>
      <td style="padding:8px 10px;border:1px solid #e5e7eb;font-weight:600;color:#111827;font-size:12px">${name}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center">
        <span style="display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;background:${badgeBg};color:${badgeColor};letter-spacing:0.3px;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact">${type}</span>
      </td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center;font-size:11px;color:#374151">${staff || "—"}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center;font-size:11px;color:#374151">${time || "—"}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:center;font-size:12px;color:#111827">${qty}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:right;font-size:12px;color:#111827">${fmt(price)}</td>
      <td style="padding:8px 8px;border:1px solid #e5e7eb;text-align:right;font-size:12px;color:${discount > 0 ? "#dc2626" : "#9ca3af"}">${discount > 0 ? `−${fmt(discount)}` : "—"}</td>
      <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700;font-size:12px;color:#111827">${fmt(total)}</td>
    </tr>`;
  };

  let rowIdx = 0;
  const svcRows  = services.map((s: any) => makeRow(s.service || s.name || "", "Service", findStaffName(s.staffId) || allStaffDisplay, s.time ? formatTime12(s.time) : "—", Number(s.qty||1), Number(s.price||0), Number(s.discount||0), Number(s.total||s.price||0), (rowIdx++ % 2 === 0))).join("");
  const pkgRows  = packageItems.map((p: any) => makeRow(p.packageName||p.name||"", "Package", findStaffName(p.staffId)||"—", p.time ? formatTime12(p.time) : "—", Number(p.qty||1), Number(p.price||0), Number(p.discount||0), Number(p.total||p.price||0), (rowIdx++ % 2 === 0))).join("");
  const memRows  = membershipItems.map((m: any) => makeRow(m.membershipName||m.name||"", "Membership", findStaffName(m.staffId)||"—", "—", Number(m.qty||1), Number(m.price||0), Number(m.discount||0), Number(m.total||m.price||0), (rowIdx++ % 2 === 0))).join("");
  const prodRows = productItems.map((p: any) => makeRow(p.productName||p.name||"", "Product", findStaffName(p.staffId)||"—", p.time ? formatTime12(p.time) : "—", Number(p.qty||1), Number(p.price||0), Number(p.discount||0), Number(p.total||p.price||0), (rowIdx++ % 2 === 0))).join("");
  const allItemRows = svcRows + pkgRows + memRows + prodRows;

  // ── Payment summary ───────────────────────────────────────────────────────
  const subtotalAmt = Number((booking as any).subtotal      || 0);
  const manualDisc  = Number((booking as any).discountAmount || 0);
  const couponDisc  = Number((booking as any).couponDiscount || 0);
  const couponCode  = (booking as any).couponCode || "";
  const exCharges   = Number((booking as any).exCharges     || 0);
  const tipAmt      = Number((booking as any).tipAmount     || 0);
  const gstPct      = Number((booking as any).gst           || 0);
  const gstAmt      = Number((booking as any).gstAmount     || 0);
  const grandTotal  = Number(booking.grandTotal || 0);
  const paidAmt     = Number(booking.payingNow  || 0);
  const dueAmt      = Number(booking.dueAmount  || 0);

  const sumRow = (label: string, value: string, bold = false, color = "#111827", borderDouble = false) =>
    `<tr>
      <td style="padding:6px 12px;font-size:12px;font-weight:${bold ? 700 : 500};color:${color};border:1px solid #e5e7eb;${borderDouble ? "border-top:2px solid #111827;" : ""}">${label}</td>
      <td style="padding:6px 12px;text-align:right;font-size:12px;font-weight:${bold ? 700 : 500};color:${color};border:1px solid #e5e7eb;${borderDouble ? "border-top:2px solid #111827;" : ""}">${value}</td>
    </tr>`;

  const summaryRows = [
    subtotalAmt > 0 ? sumRow("Subtotal",        fmt(subtotalAmt)) : "",
    manualDisc  > 0 ? sumRow("Discount",         `−${fmt(manualDisc)}`, false, "#dc2626") : "",
    couponDisc  > 0 ? sumRow(`Coupon${couponCode ? ` (${couponCode})` : ""}`, `−${fmt(couponDisc)}`, false, "#dc2626") : "",
    exCharges   > 0 ? sumRow("Extra Charges",    `+${fmt(exCharges)}`) : "",
    tipAmt      > 0 ? sumRow("Tip (Staff)",       `+${fmt(tipAmt)}`) : "",
    gstAmt      > 0 ? sumRow(`GST${gstPct > 0 ? ` (${gstPct}%)` : ""}`, `+${fmt(gstAmt)}`) : "",
    sumRow("Grand Total",  fmt(grandTotal), true, "#111827", true),
    paidAmt > 0 ? sumRow("Amount Paid",   fmt(paidAmt), false, "#15803d") : "",
    dueAmt  > 0 ? sumRow("Balance Due",   fmt(dueAmt),  true,  "#dc2626") : "",
  ].filter(Boolean).join("");

  // ── Info helper ───────────────────────────────────────────────────────────
  const infoCell = (label: string, value: string) =>
    `<div style="margin-bottom:10px">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:2px">${label}</div>
      <div style="font-size:12px;font-weight:600;color:#111827;line-height:1.4">${value || "—"}</div>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${invoiceNo} — ${salonName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#111827;background:#d1d5db;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:210mm;min-height:297mm;margin:12mm auto;background:#ffffff;box-shadow:0 4px 24px rgba(0,0,0,.18);display:flex;flex-direction:column}

  /* ── Top bar: logo left, invoice title right ── */
  .inv-topbar{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 32px 20px;border-bottom:2px solid #111827}
  .inv-logo{width:68px;height:68px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;flex-shrink:0}
  .inv-logo-placeholder{width:68px;height:68px;border-radius:8px;background:#f3f4f6;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#374151;flex-shrink:0}
  .inv-salon-block{display:flex;align-items:flex-start;gap:14px}
  .inv-salon-name{font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.3px;margin-bottom:4px}
  .inv-salon-meta{font-size:10.5px;color:#6b7280;line-height:1.8}
  .inv-salon-meta span{display:block}
  .inv-title-block{text-align:right;flex-shrink:0}
  .inv-title-word{font-size:26px;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:2px;line-height:1}
  .inv-meta-table{margin-top:10px;font-size:11px;color:#374151;border-collapse:collapse}
  .inv-meta-table td{padding:2px 0 2px 16px;text-align:right}
  .inv-meta-table td:first-child{color:#6b7280;font-weight:600;text-transform:uppercase;font-size:9.5px;letter-spacing:0.4px;padding-left:0;text-align:left}

  /* ── Bill To + Appointment strip ── */
  .inv-info{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e5e7eb}
  .inv-info-col{padding:16px 32px}
  .inv-info-col+.inv-info-col{border-left:1px solid #e5e7eb}
  .inv-section-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#111827;background:#f3f4f6;display:inline-block;padding:2px 8px;border-radius:3px;margin-bottom:12px}
  .inv-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}

  /* ── Payment status badge ── */
  .pay-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;border:1px solid currentColor}

  /* ── Items table ── */
  .inv-table-section{padding:0 32px 20px}
  .inv-section-header{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#111827;margin:18px 0 10px;padding-bottom:5px;border-bottom:2px solid #111827}
  table.inv-table{width:100%;border-collapse:collapse;font-size:11.5px}
  table.inv-table thead th{padding:8px 10px;background:#f9fafb;color:#111827;font-size:9.5px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;border:1px solid #d1d5db;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table.inv-table thead th:nth-child(1){text-align:center;width:36px}
  table.inv-table thead th:nth-child(2){text-align:left}
  table.inv-table thead th:nth-child(3){text-align:center}
  table.inv-table thead th:nth-child(4){text-align:center}
  table.inv-table thead th:nth-child(5){text-align:center}
  table.inv-table thead th:nth-child(6){text-align:center;width:36px}
  table.inv-table thead th:nth-child(7){text-align:right}
  table.inv-table thead th:nth-child(8){text-align:right}
  table.inv-table thead th:nth-child(9){text-align:right}
  table.inv-table tbody td{border:1px solid #e5e7eb}
  table.inv-table tfoot td{padding:8px 12px;font-size:11.5px;font-weight:700;color:#111827;border:1px solid #d1d5db;background:#f9fafb;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* ── Summary + notes ── */
  .inv-bottom{display:grid;grid-template-columns:1fr auto;gap:32px;padding:0 32px 24px;align-items:start}
  .inv-notes{font-size:11px;color:#374151;line-height:1.7;border:1px solid #e5e7eb;border-radius:4px;padding:10px 14px}
  .inv-notes-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#374151;margin-bottom:5px}
  .inv-summary-table{width:240px;border-collapse:collapse}
  .inv-summary-table td{padding:6px 12px;font-size:12px;border:1px solid #e5e7eb;color:#111827}

  /* ── Footer ── */
  .inv-footer{margin-top:auto;border-top:2px solid #111827;padding:16px 32px 18px;display:flex;justify-content:space-between;align-items:center;gap:16px}
  .inv-footer-left{font-size:12px;color:#111827}
  .inv-footer-left strong{font-size:13px;font-weight:800}
  .inv-footer-center{font-size:10px;color:#6b7280;text-align:center;line-height:1.8}
  .inv-footer-right{font-size:10px;color:#6b7280;text-align:right;line-height:1.8}

  /* ── Screen toolbar ── */
  .print-toolbar{position:fixed;top:0;left:0;right:0;height:50px;background:#111827;display:flex;align-items:center;justify-content:space-between;padding:0 24px;z-index:9999;box-shadow:0 2px 10px rgba(0,0,0,.3)}
  .pt-brand{font-size:13px;font-weight:700;color:#fff;display:flex;align-items:center;gap:8px}
  .pt-brand span{font-size:11px;color:rgba(255,255,255,.45);font-weight:400}
  .pt-actions{display:flex;align-items:center;gap:8px}
  .pt-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:opacity .15s;white-space:nowrap}
  .pt-btn:hover{opacity:.82}
  .pt-btn--primary{background:#2563eb;color:#fff}
  .pt-btn--ghost{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18)}
  .pt-btn--danger{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.25)}
  .pt-divider{width:1px;height:22px;background:rgba(255,255,255,.14);margin:0 4px}
  body{padding-top:50px}

  @media print{
    .print-toolbar{display:none}
    body{background:#fff;padding-top:0}
    .page{width:100%;margin:0;box-shadow:none;min-height:100vh}
    table.inv-table{page-break-inside:auto}
    table.inv-table thead{display:table-header-group}
    table.inv-table tr{page-break-inside:avoid}
    .inv-bottom{page-break-inside:avoid}
    .inv-footer{page-break-inside:avoid}
  }
  #orient-style{display:none}
</style>
<style id="orient-style">@page{size:A4 portrait;margin:0}</style>
<script>
  function doPrint(){window.print();}
  function savePdf(){window.print();}
  var _landscape=false;
  function toggleLandscape(){
    _landscape=!_landscape;
    var s=document.getElementById('orient-style');
    var btn=document.getElementById('btn-landscape');
    if(_landscape){
      s.textContent='@page{size:A4 landscape;margin:0}.page{width:297mm;min-height:210mm}';
      btn.textContent='Portrait';btn.title='Switch to Portrait';
    } else {
      s.textContent='@page{size:A4 portrait;margin:0}.page{width:210mm;min-height:297mm}';
      btn.textContent='Landscape';btn.title='Switch to Landscape';
    }
  }
</script>
</head>
<body>

<!-- Screen toolbar -->
<div class="print-toolbar">
  <div class="pt-brand">Salonox &mdash; Receipt Preview <span>${invoiceNo}</span></div>
  <div class="pt-actions">
    <button class="pt-btn pt-btn--primary" onclick="doPrint()">Print</button>
    <button class="pt-btn pt-btn--ghost"   onclick="savePdf()">Save PDF</button>
    <div class="pt-divider"></div>
    <button class="pt-btn pt-btn--ghost" id="btn-landscape" onclick="toggleLandscape()">Landscape</button>
    <div class="pt-divider"></div>
    <button class="pt-btn pt-btn--danger" onclick="window.close()">&#x2715; Close</button>
  </div>
</div>

<div class="page">

  <!-- ═══ TOP BAR: Salon info left · Invoice title right ═══ -->
  <div class="inv-topbar">
    <div class="inv-salon-block">
      ${logoUrl
        ? `<img class="inv-logo" src="${logoUrl}" alt="${salonName}" onerror="this.style.display='none'">`
        : `<div class="inv-logo-placeholder">${salonName.charAt(0).toUpperCase()}</div>`}
      <div>
        <div class="inv-salon-name">${salonName}</div>
        <div class="inv-salon-meta">
          ${salonAddress ? `<span>${salonAddress}</span>` : ""}
          ${salonPhone   ? `<span>Ph: ${salonPhone}</span>` : ""}
          ${salonEmail   ? `<span>${salonEmail}</span>` : ""}
          ${salonWebsite ? `<span>${salonWebsite}</span>` : ""}
          ${gst          ? `<span>GSTIN: ${gst}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="inv-title-block">
      <div class="inv-title-word">Invoice</div>
      <table class="inv-meta-table">
        <tr><td>Invoice No</td><td><strong>${invoiceNo}</strong></td></tr>
        <tr><td>Booking #</td><td>${booking.id}</td></tr>
        <tr><td>Date</td><td>${printDate}</td></tr>
        <tr><td>Time</td><td>${printTime}</td></tr>
      </table>
    </div>
  </div>

  <!-- ═══ BILL TO + APPOINTMENT ═══ -->
  <div class="inv-info">
    <div class="inv-info-col">
      <div class="inv-section-label">Bill To</div>
      <div class="inv-info-grid">
        ${infoCell("Name",       booking.clientName  || "Walk-In")}
        ${infoCell("Phone",      clientPhone || "—")}
        ${infoCell("Email",      clientEmail         || "—")}
        ${clientGst              ? infoCell("GST No",     clientGst)                : ""}
        ${membershipName         ? infoCell("Membership", membershipName)           : ""}
        ${loyaltyPoints !== null ? infoCell("Loyalty Pts",String(loyaltyPoints))   : ""}
      </div>
    </div>
    <div class="inv-info-col">
      <div class="inv-section-label">Appointment Details</div>
      <div class="inv-info-grid">
        ${infoCell("Date",           apptDate)}
        ${infoCell("Time",           apptTime)}
        ${infoCell("Staff",          allStaffDisplay)}
        ${infoCell("Payment Method", (booking as any).paymentMode || "—")}
        ${infoCell("Booking Status", (booking as any).status       || "Confirmed")}
        ${infoCell("Payment Status", `<span class="pay-badge" style="background:${payBg};color:${payColor};-webkit-print-color-adjust:exact;print-color-adjust:exact">${rawPs}</span>`)}
      </div>
    </div>
  </div>

  <!-- ═══ ITEMS TABLE ═══ -->
  <div class="inv-table-section">
    <div class="inv-section-header">Services &amp; Items</div>
    <table class="inv-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Item Name</th>
          <th>Type</th>
          <th>Staff</th>
          <th>Time</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Disc.</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${allItemRows || `<tr><td colspan="9" style="text-align:center;padding:20px;color:#9ca3af;border:1px solid #e5e7eb">No items</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="8" style="text-align:right;padding:8px 12px;font-size:11px;color:#374151">Items Total</td>
          <td style="text-align:right;padding:8px 12px;font-weight:700;color:#111827">${fmt(Number((booking as any).subtotal || grandTotal))}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- ═══ PAYMENT SUMMARY + NOTES ═══ -->
  <div class="inv-bottom">
    <div>
      ${booking.notes ? `<div class="inv-notes"><div class="inv-notes-title">Notes</div>${booking.notes}</div>` : ""}
      ${(booking as any).staffAlert ? `<div class="inv-notes" style="margin-top:8px"><div class="inv-notes-title">Staff Alert</div>${(booking as any).staffAlert}</div>` : ""}
    </div>
    <div>
      <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#111827;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #111827">Payment Summary</div>
      <table class="inv-summary-table">
        <tbody>${summaryRows}</tbody>
      </table>
    </div>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="inv-footer">
    <div class="inv-footer-left">
      <strong>Thank you for choosing ${salonName}!</strong><br>
      <span style="font-size:11px;color:#6b7280">We look forward to seeing you again.</span>
    </div>
    <div class="inv-footer-center">
      ${[salonPhone, salonEmail].filter(Boolean).join(" &nbsp;|&nbsp; ")}<br>
      ${salonAddress || ""}
      ${gst ? `<br>GSTIN: ${gst}` : ""}
    </div>
    <div class="inv-footer-right">
      This is a computer-generated receipt.<br>
      No signature required.<br>
      <strong style="color:#374151;font-size:11px">Powered by Salonox</strong>
    </div>
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=960,height=860");
  if (!win) { alert("Please allow popups to print the receipt."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
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
                    onClick={() => { setShowDotMenu(false); printReceipt(booking, staffList, currentSalon, client); }}
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
                        {[["Qty", s.qty], ["Price", `${currencySymbol}${(s.price || 0).toFixed(2)}`], ["Disc", `${currencySymbol}${((s as any).discount || 0).toFixed(2)}`]].map(([lbl, val]) => (
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