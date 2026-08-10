export interface ReceiptData {
  salon: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
    logoUrl?: string;
  };
  invoice: {
    invoiceNumber: string;
    date: string;
    time: string;
    paymentMethod: string;
  };
  /** Per-method amounts when paymentMethod === "split" — parsed straight from
   *  the backend's stored { [method]: amount } JSON, never computed locally. */
  paymentBreakdown?: Array<{ method: string; amount: number }>;
  client: {
    name: string;
    phone?: string;
    email?: string;
  };
  staffName?: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    total: number;
    discount?: number;
  }>;
  pricing: {
    subtotal: number;
    itemDiscountTotal?: number;
    manualDiscount?: number;
    couponDiscount?: number;
    taxableAmount?: number;
    gstAmount: number;
    taxBreakdown?: Array<{
      name: string;
      rate: number;
      amount: number;
      inclusive: boolean;
    }>;
    exCharges?: number;
    tipAmount?: number;
    roundOff?: number;
    grandTotal: number;
    amountPaid?: number;
    dueAmount?: number;
  };
  paperSize?: "80mm" | "58mm";
  footerMessage?: string;
  upiQrUrl?: string;
}

export function generateReceiptHtml(data: ReceiptData): string {
  const paperWidth = data.paperSize === "58mm" ? "54mm" : "76mm";
  const fontSize = data.paperSize === "58mm" ? "11px" : "12px";

  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="text-align: left; padding: 4px 0;">
          <div style="font-weight: 600;">${item.name}</div>
          <div style="font-size: 10px; color: #555;">${item.qty} x ₹${item.price.toFixed(2)}</div>
        </td>
        <td style="text-align: right; vertical-align: top; padding: 4px 0; font-weight: 600;">
          ₹${item.total.toFixed(2)}
        </td>
      </tr>
    `,
    )
    .join("");

  const taxBreakdownHtml =
    data.pricing.taxBreakdown && data.pricing.taxBreakdown.length > 0
      ? data.pricing.taxBreakdown
          .map(
            (tax) => `
        <tr>
          <td style="text-align: left; padding: 2px 0;">${tax.name} (${tax.rate}%)${tax.inclusive ? " (Incl.)" : ""}</td>
          <td style="text-align: right; padding: 2px 0;">₹${tax.amount.toFixed(2)}</td>
        </tr>
      `,
          )
          .join("")
      : data.pricing.gstAmount > 0
        ? `
        <tr>
          <td style="text-align: left; padding: 2px 0;">Tax (GST)</td>
          <td style="text-align: right; padding: 2px 0;">₹${data.pricing.gstAmount.toFixed(2)}</td>
        </tr>
      `
        : "";

  const paymentBreakdownHtml =
    data.paymentBreakdown && data.paymentBreakdown.length > 0
      ? data.paymentBreakdown
          .map(
            (entry) => `
        <tr>
          <td style="text-align: left; padding: 2px 0;">Paid via ${entry.method}</td>
          <td style="text-align: right; padding: 2px 0;">₹${entry.amount.toFixed(2)}</td>
        </tr>
      `,
          )
          .join("")
      : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page {
            margin: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: ${fontSize};
            line-height: 1.4;
            color: #000;
            background: #fff;
            margin: 0 auto;
            padding: 12px 8px;
            max-width: ${paperWidth};
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .salon-name { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-bottom: 2px solid #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          .summary-table td { padding: 2px 0; }
          .grand-total { font-size: 15px; font-weight: bold; padding: 6px 0; }
        </style>
      </head>
      <body>
        <div class="text-center">
          ${data.salon.logoUrl ? `<img src="${data.salon.logoUrl}" style="max-height: 48px; margin-bottom: 4px;" />` : ""}
          <div class="salon-name">${data.salon.name}</div>
          ${data.salon.address ? `<div>${data.salon.address}${data.salon.city ? `, ${data.salon.city}` : ""}</div>` : ""}
          ${data.salon.phone ? `<div>Phone: ${data.salon.phone}</div>` : ""}
          ${data.salon.email ? `<div>${data.salon.email}</div>` : ""}
          ${data.salon.website ? `<div>${data.salon.website}</div>` : ""}
          ${data.salon.gstin ? `<div class="bold">GSTIN: ${data.salon.gstin}</div>` : ""}
        </div>

        <div class="divider"></div>

        <div>
          <div><span class="bold">Invoice #:</span> ${data.invoice.invoiceNumber}</div>
          <div><span class="bold">Date:</span> ${data.invoice.date} ${data.invoice.time}</div>
          <div><span class="bold">Customer:</span> ${data.client.name} ${data.client.phone ? `(${data.client.phone})` : ""}</div>
          ${data.staffName ? `<div><span class="bold">Staff:</span> ${data.staffName}</div>` : ""}
          <div><span class="bold">Payment:</span> ${data.invoice.paymentMethod.toUpperCase()}</div>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; padding-bottom: 4px;">Item</th>
              <th style="text-align: right; padding-bottom: 4px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table class="summary-table">
          <tr>
            <td style="text-align: left;">Subtotal</td>
            <td style="text-align: right;">₹${data.pricing.subtotal.toFixed(2)}</td>
          </tr>
          ${
            data.pricing.itemDiscountTotal && data.pricing.itemDiscountTotal > 0
              ? `<tr><td style="text-align: left;">Item Discount</td><td style="text-align: right;">- ₹${data.pricing.itemDiscountTotal.toFixed(2)}</td></tr>`
              : ""
          }
          ${
            data.pricing.manualDiscount && data.pricing.manualDiscount > 0
              ? `<tr><td style="text-align: left;">Discount</td><td style="text-align: right;">- ₹${data.pricing.manualDiscount.toFixed(2)}</td></tr>`
              : ""
          }
          ${
            data.pricing.couponDiscount && data.pricing.couponDiscount > 0
              ? `<tr><td style="text-align: left;">Coupon Discount</td><td style="text-align: right;">- ₹${data.pricing.couponDiscount.toFixed(2)}</td></tr>`
              : ""
          }
          ${
            data.pricing.taxableAmount && data.pricing.taxableAmount > 0
              ? `<tr><td style="text-align: left;">Taxable Amount</td><td style="text-align: right;">₹${data.pricing.taxableAmount.toFixed(2)}</td></tr>`
              : ""
          }
          ${taxBreakdownHtml}
          ${
            data.pricing.exCharges && data.pricing.exCharges > 0
              ? `<tr><td style="text-align: left;">Extra Charges</td><td style="text-align: right;">₹${data.pricing.exCharges.toFixed(2)}</td></tr>`
              : ""
          }
          ${
            data.pricing.tipAmount && data.pricing.tipAmount > 0
              ? `<tr><td style="text-align: left;">Tip</td><td style="text-align: right;">₹${data.pricing.tipAmount.toFixed(2)}</td></tr>`
              : ""
          }
          ${
            data.pricing.roundOff && Math.abs(data.pricing.roundOff) > 0.001
              ? `<tr><td style="text-align: left;">Round Off</td><td style="text-align: right;">${data.pricing.roundOff > 0 ? "+" : "-"} ₹${Math.abs(data.pricing.roundOff).toFixed(2)}</td></tr>`
              : ""
          }
        </table>

        <div class="double-divider"></div>

        <table class="summary-table">
          <tr class="grand-total">
            <td style="text-align: left;">GRAND TOTAL</td>
            <td style="text-align: right;">₹${data.pricing.grandTotal.toFixed(2)}</td>
          </tr>
        </table>

        <div class="double-divider"></div>

        ${
          paymentBreakdownHtml ||
          (data.pricing.amountPaid && data.pricing.amountPaid > 0) ||
          (data.pricing.dueAmount && data.pricing.dueAmount > 0)
            ? `
        <table class="summary-table">
          ${paymentBreakdownHtml}
          ${
            data.pricing.amountPaid && data.pricing.amountPaid > 0
              ? `<tr><td style="text-align: left;">Amount Paid</td><td style="text-align: right;">₹${data.pricing.amountPaid.toFixed(2)}</td></tr>`
              : ""
          }
          ${
            data.pricing.dueAmount && data.pricing.dueAmount > 0
              ? `<tr><td style="text-align: left; font-weight: bold;">Balance Due</td><td style="text-align: right; font-weight: bold;">₹${data.pricing.dueAmount.toFixed(2)}</td></tr>`
              : ""
          }
        </table>

        <div class="divider"></div>
        `
            : ""
        }

        <div class="text-center" style="margin-top: 12px; font-size: 11px;">
          ${data.upiQrUrl ? `<img src="${data.upiQrUrl}" style="max-height: 80px; margin-bottom: 6px;" /><br/>` : ""}
          ${data.footerMessage || "Thank you for visiting! Please come again."}
        </div>
      </body>
    </html>
  `;
}
