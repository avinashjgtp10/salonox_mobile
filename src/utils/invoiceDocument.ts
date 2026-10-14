import type { ReceiptData } from "./receiptGenerator";
import { invoiceStyles } from "./invoiceStyles";
import { receiptPaper } from "./receiptPaper";
import { buildThermalDocument } from "./receiptThermal";

export const invoiceMoney = (amount: number) => `₹${amount.toFixed(2)}`;
const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export const invoiceStatus = (data: ReceiptData) => data.invoice.paymentStatus || ((data.pricing.dueAmount ?? 0) > 0 ? ((data.pricing.amountPaid ?? 0) > 0 ? "Partial" : "Unpaid") : "Paid");

/** Present saved amounts without recalculating the bill from today's prices. */
export function invoiceSummary(data: ReceiptData) {
  const p = data.pricing;
  const rows: { label: string; value: string; bold?: boolean }[] = [];
  const add = (label: string, amount: number | undefined, sign = "") => {
    if (amount) rows.push({ label, value: sign + invoiceMoney(amount) });
  };
  if (p.itemDiscountTotal) {
    add("Items Total", data.items.reduce((sum, item) => sum + item.price * item.qty, 0));
    add("Item Discount", p.itemDiscountTotal, "−");
  }
  rows.push({ label: "Subtotal", value: invoiceMoney(p.subtotal) });
  add(`Coupon${data.couponCode ? ` (${data.couponCode})` : ""}`, p.couponDiscount, "−");
  if (p.taxBreakdown?.length) {
    p.taxBreakdown.forEach(t => add(`${t.name} ${t.rate}%${t.inclusive ? " (incl.)" : ""}`, t.amount, t.inclusive ? "" : "+"));
    add("Total Tax", p.gstAmount);
  } else add("GST", p.gstAmount, "+");
  add("Extra Charges", p.exCharges, "+");
  add("Bill Discount", p.manualDiscount, "−");
  if (p.roundOff) add("Round Off", Math.abs(p.roundOff), p.roundOff > 0 ? "+" : "−");
  rows.push({ label: "Grand Total", value: invoiceMoney(p.grandTotal), bold: true });
  rows.push({ label: "Amount to Pay", value: invoiceMoney(p.grandTotal), bold: true });
  add("Staff Tip", p.tipAmount);
  data.paymentBreakdown?.forEach(entry => add(`Paid via ${entry.method}`, entry.amount));
  // Zero is meaningful on an unpaid invoice.
  if (p.amountPaid !== undefined) rows.push({ label: "Amount Paid", value: invoiceMoney(p.amountPaid) });
  if (p.dueAmount) rows.push({ label: "Balance Due", value: invoiceMoney(p.dueAmount), bold: true });
  return rows;
}

export function generateInvoiceDocument(data: ReceiptData): string {
  const profile = receiptPaper(data.paperSize);
  const address = [data.salon.address, data.salon.city, data.salon.state, data.salon.postalCode, data.salon.country].filter(Boolean).join(", ");
  const summary = invoiceSummary(data);
  if (profile.isThermal) {
    const totalIndex = summary.findIndex(row => row.label === "Grand Total");
    return buildThermalDocument(profile, {
      salonName: data.salon.name, salonAddress: address, salonPhone: data.salon.phone,
      gstNumber: data.salon.gstin, logoUrl: data.salon.logoUrl,
      invoiceNo: data.invoice.invoiceNumber, dateTime: data.invoice.date,
      clientName: data.client.name, clientPhone: data.client.phone || "—", staffName: data.staffName || "—",
      paymentMethod: data.invoice.paymentMethod,
      items: data.items.map(item => ({ name: item.name, qty: item.qty, amount: invoiceMoney(item.total), meta: item.staffName || data.staffName })),
      summary: summary.slice(0, totalIndex),
      grandTotal: { label: "TOTAL", value: invoiceMoney(data.pricing.grandTotal) },
      payments: summary.slice(totalIndex + 2).map(row => ({ ...row, label: row.label === "Amount Paid" ? "Paid" : row.label })), footerNote: data.footerMessage || "Thank You!",
      qrDataUrl: data.upiQrUrl,
    }, { title: `Invoice ${data.invoice.invoiceNumber}`, withToolbar: false });
  }
  const info = (label: string, value?: string) => `<div class="info-cell"><div class="info-label">${esc(label)}</div><div class="info-value">${esc(value || "—")}</div></div>`;
  const rows = data.items.map((item, index) => `<tr style="background:${index % 2 ? "#f9fafb" : "#fff"}">
    <td>${index + 1}</td><td style="font-weight:600;text-align:left">${esc(item.name)}</td>
    <td><span class="item-type">${esc(item.type || "—")}</span></td><td>${esc(item.staffName || data.staffName || "—")}</td>
    <td>${esc(data.invoice.time)}</td><td>${item.qty}</td><td class="money">${invoiceMoney(item.price)}</td>
    <td class="money">${invoiceMoney(item.discount ?? 0)}</td><td class="money">${item.tax === undefined ? "—" : invoiceMoney(item.tax)}</td><td class="money">${invoiceMoney(item.total)}</td>
  </tr>`).join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invoice ${esc(data.invoice.invoiceNumber)}</title><style>
  ${invoiceStyles}
  @page{size:A4 portrait;margin:0}
  body{background:#fff} .page{margin:0;box-shadow:none;width:100%;min-height:296mm}
  .info-cell{margin-bottom:10px}.info-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin-bottom:2px}.info-value{font-size:12px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}
  .inv-table td{padding:8px 6px;text-align:center;font-size:10px;overflow-wrap:anywhere}.inv-table .money{text-align:right;white-space:nowrap}.item-type{text-transform:uppercase;font-size:9px;background:#f3f4f6;padding:2px 4px;border-radius:3px}
  .inv-salon-block{max-width:62%}.inv-salon-meta{overflow-wrap:anywhere}.inv-table thead{display:table-header-group}.inv-table tr,.inv-bottom,.inv-footer{break-inside:avoid}.inv-summary-table td:last-child{text-align:right;white-space:nowrap}
  </style></head><body><div class="page">
  <div class="inv-watermark">${esc(data.salon.name)}</div>
  <div class="inv-topbar"><div class="inv-salon-block">
  ${data.salon.logoUrl ? `<img class="inv-logo" src="${esc(data.salon.logoUrl)}" alt="">` : `<div class="inv-logo-placeholder">${esc(data.salon.name.charAt(0).toUpperCase())}</div>`}
  <div><div class="inv-salon-name">${esc(data.salon.name)}</div><div class="inv-salon-meta">${[address, data.salon.phone && `Ph: ${data.salon.phone}`, data.salon.email, data.salon.website, data.salon.gstin && `GSTIN: ${data.salon.gstin}`].filter(Boolean).map(line => `<span>${esc(line)}</span>`).join("")}</div></div></div>
  <div class="inv-title-block"><div class="inv-title-word">Invoice</div><table class="inv-meta-table"><tr><td>Invoice No</td><td><strong>${esc(data.invoice.invoiceNumber)}</strong></td></tr><tr><td>Invoice Date</td><td>${esc(data.invoice.date)}</td></tr><tr><td>Payment Status</td><td>${esc(invoiceStatus(data))}</td></tr></table></div></div>
  <div class="inv-info"><div class="inv-info-col"><div class="inv-section-label">Bill To</div>${info("Name", data.client.name)}${info("Phone", data.client.phone)}${info("Email", data.client.email)}</div>
  <div class="inv-info-col"><div class="inv-section-label">Appointment Details</div>${info("Date", data.invoice.date)}${info("Time", data.invoice.time)}${info("Staff", data.staffName)}${info("Payment Method", data.invoice.paymentMethod)}${info("Payment Status", invoiceStatus(data))}</div></div>
  <div class="inv-table-section"><div class="inv-section-header">Services &amp; Items</div><table class="inv-table"><thead><tr>${["#", "Item Name", "Type", "Staff", "Time", "Qty", "Rate", "Disc.", "Tax", "Amount"].map(label => `<th>${label}</th>`).join("")}</tr></thead><tbody>${rows || '<tr><td colspan="10">No items</td></tr>'}</tbody><tfoot><tr><td colspan="9" style="text-align:right">Items Total</td><td class="money">${invoiceMoney(data.items.reduce((sum, item) => sum + item.total, 0))}</td></tr></tfoot></table></div>
  <div class="inv-bottom"><div>${data.notes ? `<div class="inv-notes"><div class="inv-notes-title">Notes</div>${esc(data.notes)}</div>` : ""}</div><div><div class="inv-section-header">Payment Summary</div><table class="inv-summary-table">${summary.map(row => `<tr style="font-weight:${row.bold ? 700 : 400}"><td>${esc(row.label)}</td><td>${esc(row.value)}</td></tr>`).join("")}</table></div></div>
  <div class="inv-footer"><div class="inv-footer-left"><strong>Thank you for choosing ${esc(data.salon.name)}!</strong><br><span>We look forward to seeing you again.</span></div><div class="inv-footer-right">This is a computer-generated receipt.<br>No signature required.<br><strong>Powered by SalonoX</strong></div></div>
  </div></body></html>`;
}
