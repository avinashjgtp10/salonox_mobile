import type { Salon } from "../../../types/salon.types";
import type { Coupon } from "../../../services/api/endpoints/coupon.endpoints";

function fmtDate(raw?: string | null): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return raw; }
}

/**
 * Prints a sheet of cut-out voucher cards, one per coupon — for handing a
 * freshly bulk-created batch of single-use codes out to customers.
 */
export function printCoupons(
  coupons: Coupon[],
  salon: Salon | null,
  formatAmount: (n: number) => string = (n) => `₹${n}`,
) {
  const s = salon as any;
  const salonName = s?.business_name || "Salon";
  const logoUrl = s?.logo_url || "";

  const cards = coupons.map((c) => {
    const valueText = c.type === "percentage" ? `${Number(c.value)}% OFF` : `${formatAmount(Number(c.value))} OFF`;
    const minOrderText = Number(c.min_order_amount) > 0 ? `On orders above ${formatAmount(Number(c.min_order_amount))}` : "No minimum order";
    return `
    <div class="voucher">
      <div class="voucher__salon">
        ${logoUrl ? `<img src="${logoUrl}" alt="${salonName}" onerror="this.style.display='none'">` : ""}
        <span>${salonName}</span>
      </div>
      <div class="voucher__value">${valueText}</div>
      <div class="voucher__code">${c.code}</div>
      <div class="voucher__min">${minOrderText}</div>
      <div class="voucher__expiry">Valid until ${fmtDate(c.expires_at)}</div>
    </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Coupon Vouchers — ${salonName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#d1d5db;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding-top:50px}
  // Fixed physical column width (90mm) instead of 1fr — 1fr only guarantees
  // columns are equal to *each other*, not that a card is the same size
  // across print runs (a batch of 1 coupon vs. a full grid of them still
  // renders identically now). justify-content centers the row(s) so a
  // partial last row doesn't stretch to fill the sheet.
  .sheet{width:210mm;min-height:297mm;margin:12mm auto;background:#fff;padding:14mm;display:grid;grid-template-columns:repeat(2,90mm);justify-content:center;gap:6mm}

  .voucher{
    width:90mm;box-sizing:border-box;
    border:2px dashed #9ca3af;border-radius:10px;padding:16px;
    display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;
    break-inside:avoid;
  }
  // Long business names / coupon codes wrap or truncate instead of
  // overflowing the fixed-width card and throwing off its dimensions.
  .voucher__salon{display:flex;align-items:center;gap:6px;max-width:100%;font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.4px}
  .voucher__salon img{width:20px;height:20px;border-radius:4px;object-fit:cover;flex-shrink:0}
  .voucher__salon span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .voucher__value{font-size:22px;font-weight:800;color:#111827;margin-top:4px;max-width:100%;overflow-wrap:break-word}
  .voucher__code{
    font-size:20px;font-weight:800;letter-spacing:2px;color:#fff;background:#111827;
    padding:6px 18px;border-radius:6px;margin:6px 0;font-family:'Courier New',monospace;
    max-width:100%;overflow-wrap:break-word;word-break:break-word;
  }
  .voucher__min{font-size:11px;color:#6b7280;max-width:100%;overflow-wrap:break-word}
  .voucher__expiry{font-size:11px;color:#9ca3af}

  .print-toolbar{position:fixed;top:0;left:0;right:0;height:50px;background:#111827;display:flex;align-items:center;justify-content:space-between;padding:0 24px;z-index:9999}
  .pt-brand{font-size:13px;font-weight:700;color:#fff}
  .pt-btn{padding:7px 14px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer}
  .pt-btn--primary{background:#2563eb;color:#fff}
  .pt-btn--danger{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.25);margin-left:8px}

  @media print{
    .print-toolbar{display:none}
    body{background:#fff;padding-top:0}
    .sheet{width:100%;margin:0}
  }
</style>
</head>
<body>
  <div class="print-toolbar">
    <span class="pt-brand">${coupons.length} Coupon Voucher${coupons.length === 1 ? "" : "s"}</span>
    <div>
      <button class="pt-btn pt-btn--primary" onclick="window.print()">Print</button>
      <button class="pt-btn pt-btn--danger" onclick="window.close()">✕ Close</button>
    </div>
  </div>
  <div class="sheet">${cards}</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=960,height=860");
  if (!win) { alert("Please allow popups to print the vouchers."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
}
