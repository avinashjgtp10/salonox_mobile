import type { Salon } from "../../../types/salon.types";

// Salary receipt printer for the Payroll page — mirrors the bookings
// receipt.ts pattern (build an HTML invoice, open it in a new window, let the
// printed page's own buttons call window.print()) so the same "Save as PDF
// via browser print dialog" flow works here without pulling in the
// items-table-shaped Booking receipt.

export interface PayrollReceiptEntry {
  staffName: string;
  role?: string;
  base_salary: number;
  commission: number;
  tips: number;
  bonus: number;
  salary_advance: number;
  deductions: number;
  half_day_deduction: number;
  late_deduction: number;
  paid_amount: number;
  payment_method?: string;
  payment_date?: string;
  status?: string;
}

export function printPayrollReceipt(
  entry: PayrollReceiptEntry,
  salon: Salon | null,
  periodLabel: string,
  net: number,
  pending: number,
  opts?: { formatAmount?: (n: number) => string },
) {
  const s = salon as any;
  const salonName = s?.business_name || "Salon";
  const salonAddress = s?.address || s?.address_line1
    ? [s?.address || s?.address_line1, s?.address_line2, s?.city, s?.state, s?.pincode].filter(Boolean).join(", ")
    : "";
  const salonPhone = s?.phone || s?.phone_number || s?.mobile || s?.contact || "";
  const salonEmail = s?.email || s?.email_address || "";
  const logoUrl = s?.logo_url || s?.logo || "";

  const fmt = opts?.formatAmount
    ?? ((n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  const isPaid = entry.paid_amount > 0 && pending <= 0;
  const payStatus = isPaid ? "Paid" : entry.paid_amount > 0 ? "Partial" : "Unpaid";
  const PAY_COLOR: Record<string, string> = { Paid: "#15803d", Partial: "#7c3aed", Unpaid: "#b45309" };
  const PAY_BG: Record<string, string> = { Paid: "#dcfce7", Partial: "#ede9fe", Unpaid: "#fef3c7" };

  const fmtDate = (raw?: string) => {
    if (!raw) return "—";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const row = (label: string, value: string, bold = false, color = "#111827") =>
    `<tr>
      <td style="padding:7px 12px;font-size:12.5px;font-weight:${bold ? 700 : 500};color:${color};border:1px solid #e5e7eb">${label}</td>
      <td style="padding:7px 12px;text-align:right;font-size:12.5px;font-weight:${bold ? 700 : 500};color:${color};border:1px solid #e5e7eb">${value}</td>
    </tr>`;

  const summaryRows = [
    row("Base Salary", fmt(entry.base_salary)),
    entry.commission > 0 ? row("Commission", `+${fmt(entry.commission)}`) : "",
    entry.tips > 0 ? row("Tips", `+${fmt(entry.tips)}`) : "",
    entry.bonus > 0 ? row("Bonus", `+${fmt(entry.bonus)}`) : "",
    entry.salary_advance > 0 ? row("Salary Advance", `−${fmt(entry.salary_advance)}`, false, "#dc2626") : "",
    entry.deductions > 0 ? row("Deductions", `−${fmt(entry.deductions)}`, false, "#dc2626") : "",
    entry.half_day_deduction > 0 ? row("Half-Day Deduction", `−${fmt(entry.half_day_deduction)}`, false, "#dc2626") : "",
    entry.late_deduction > 0 ? row("Late Deduction", `−${fmt(entry.late_deduction)}`, false, "#dc2626") : "",
    row("Net Pay", fmt(net), true, "#111827"),
    row("Amount Paid", fmt(entry.paid_amount), false, "#15803d"),
    pending > 0 ? row("Balance Due", fmt(pending), true, "#dc2626") : "",
  ].filter(Boolean).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Salary Receipt — ${entry.staffName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;overflow-x:hidden}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#111827;background:#d1d5db;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding-top:50px}
  .page{width:100%;max-width:210mm;min-height:auto;margin:12mm auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.18);padding:32px}
  .topbar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:20px;border-bottom:2px solid #111827;margin-bottom:20px}
  .logo{width:60px;height:60px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;flex-shrink:0}
  .logo-placeholder{width:60px;height:60px;border-radius:8px;background:#f3f4f6;border:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#374151;flex-shrink:0}
  .salon-block{display:flex;gap:14px;align-items:flex-start;min-width:0}
  .salon-name{font-size:19px;font-weight:800;color:#111827;margin-bottom:4px}
  .salon-meta{font-size:10.5px;color:#6b7280;line-height:1.8;word-break:break-word}
  .title-block{text-align:right;flex-shrink:0}
  .title{font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#111827;white-space:nowrap}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  .info-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:2px}
  .info-value{font-size:13px;font-weight:600;color:#111827}
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;border:1px solid currentColor}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  .footer{margin-top:28px;padding-top:16px;border-top:2px solid #111827;font-size:11px;color:#6b7280;text-align:center}
  .toolbar{position:fixed;top:0;left:0;right:0;height:50px;background:#111827;display:flex;align-items:center;justify-content:space-between;padding:0 24px;z-index:9999}
  .brand{font-size:13px;font-weight:700;color:#fff}
  .actions{display:flex;gap:8px}
  .btn{padding:7px 14px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer}
  .btn--primary{background:#2563eb;color:#fff}
  .btn--ghost{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18)}
  @media print{ .toolbar{display:none} body{background:#fff;padding-top:0} .page{margin:0;box-shadow:none;width:100%} }
</style>
</head>
<body>
<div class="toolbar">
  <div class="brand">Salonox &mdash; Salary Receipt Preview</div>
  <div class="actions">
    <button class="btn btn--primary" onclick="window.print()">Print</button>
    <button class="btn btn--ghost" onclick="window.close()">Close</button>
  </div>
</div>
<div class="page">
  <div class="topbar">
    <div class="salon-block">
      ${logoUrl
        ? `<img class="logo" src="${logoUrl}" alt="${salonName}" onerror="this.style.display='none'">`
        : `<div class="logo-placeholder">${salonName.charAt(0).toUpperCase()}</div>`}
      <div>
        <div class="salon-name">${salonName}</div>
        <div class="salon-meta">
          ${salonAddress ? `<div>${salonAddress}</div>` : ""}
          ${salonPhone ? `<div>Ph: ${salonPhone}</div>` : ""}
          ${salonEmail ? `<div>${salonEmail}</div>` : ""}
        </div>
      </div>
    </div>
    <div class="title-block">
      <div class="title">Salary Receipt</div>
      <div style="margin-top:8px;font-size:11px;color:#6b7280">Pay Period: ${periodLabel}</div>
      <div style="margin-top:4px;font-size:11px;color:#6b7280">Generated: ${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="info">
    <div>
      <div class="info-label">Staff Name</div>
      <div class="info-value">${entry.staffName}</div>
      ${entry.role ? `<div class="info-label" style="margin-top:8px">Role</div><div class="info-value">${entry.role}</div>` : ""}
    </div>
    <div>
      <div class="info-label">Payment Method</div>
      <div class="info-value">${entry.payment_method || "—"}</div>
      <div class="info-label" style="margin-top:8px">Payment Date</div>
      <div class="info-value">${fmtDate(entry.payment_date)}</div>
      <div class="info-label" style="margin-top:8px">Status</div>
      <div class="info-value"><span class="badge" style="background:${PAY_BG[payStatus]};color:${PAY_COLOR[payStatus]}">${payStatus}</span></div>
    </div>
  </div>

  <table>
    <tbody>${summaryRows}</tbody>
  </table>

  <div class="footer">
    This is a computer-generated salary receipt. No signature required.
  </div>
</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=880,height=900");
  if (!win) {
    alert("Please allow popups to print the receipt.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
}
