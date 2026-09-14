import type { PaperProfile } from "../../settings/utils/printSettings";

/**
 * Template engine for printed receipts.
 *
 * One set of invoice data renders into different layouts by swapping the
 * stylesheet and the body template, rather than each printer type getting its
 * own print function. Two layout families:
 *
 *   - A4 (and any custom paper wider than the thermal ceiling): the existing
 *     full tabular invoice, untouched.
 *   - Thermal (58mm / 80mm / narrow custom): a single-column receipt with no
 *     table borders, no colour fills and no watermark — none of which a
 *     monochrome roll printer can render, and all of which waste paper.
 *
 * Everything dimensional derives from PaperProfile, so a custom size needs no
 * new code path.
 */

/** Provisional page length for a continuous roll, replaced at runtime by
 *  PAGE_FIT_SCRIPT with the measured height of the actual receipt. */
const ROLL_PROVISIONAL_HEIGHT_MM = 297;

/** Page geometry + @page rule for the chosen paper. */
export function buildPageCss(profile: PaperProfile): string {
  const { widthMm, heightMm, margins } = profile;

  // A continuous roll (height 0) must NOT be given a fixed page height: a
  // fixed height pads every receipt out to that length, which on a roll
  // printer feeds blank paper after each one.
  //
  // This used to emit `size:80mm auto` for a roll, which looks like exactly
  // that intent but is INVALID CSS and was silently thrown away. The grammar
  // for the `size` property is `<length>{1,2} | auto | <page-size> ...` — one
  // or two lengths, or the bare keyword `auto`, never a length mixed with
  // `auto`. With the declaration dropped, the page fell back to the driver's
  // default sheet (Letter/A4), so every 80mm receipt was laid out on a ~297mm
  // page and the printer fed the whole thing: the "too much blank paper"
  // report. The width was being ignored as well, for the same reason.
  //
  // So a roll gets a VALID provisional height here, and PAGE_FIT_SCRIPT
  // (buildThermalDocument) measures the rendered receipt and rewrites this
  // rule with the real height before the print dialog opens. The provisional
  // is deliberately generous rather than tight: if the script somehow doesn't
  // run, a too-long page wastes paper, while a too-short one would break a
  // receipt across two pages mid-total.
  const pageSize = heightMm > 0 ? `${widthMm}mm ${heightMm}mm` : `${widthMm}mm ${ROLL_PROVISIONAL_HEIGHT_MM}mm`;

  // Margins live on @page rather than on .page's padding so the printer driver
  // knows the real printable area — padding alone would let content sit inside
  // the driver's own unprintable edge and get clipped.
  const pageMargin = `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`;

  return `@page{size:${pageSize};margin:${pageMargin}}`;
}

/** Screen preview geometry — mirrors the print rule so preview matches output. */
export function buildPreviewCss(profile: PaperProfile): string {
  const { heightMm, margins, isThermal } = profile;
  const contentW = `${profile.contentWidthMm}mm`;
  return `
  .page{
    width:${contentW};
    ${heightMm > 0 ? `min-height:${heightMm - margins.top - margins.bottom}mm;` : ""}
    padding:${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    box-sizing:content-box;
    margin:${isThermal ? "8mm" : "12mm"} auto;
    background:#fff;
    box-shadow:0 4px 24px rgba(0,0,0,.18);
  }
  @media print{
    .page{
      width:auto;
      min-height:0;
      margin:0;
      padding:0;
      box-shadow:none;
    }
  }`;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Thermal ───────────────────────────────────────────────────────────────────

/** Data the thermal template needs. Deliberately a flat, presentation-ready
 *  shape: receipt.ts already does all the money maths, so the template only
 *  formats — no totals are recomputed here where they could drift from the A4
 *  version of the same bill. */
export interface ThermalReceiptData {
  salonName: string;
  salonAddress?: string;
  salonPhone?: string;
  gstNumber?: string;
  logoUrl?: string;
  invoiceNo?: string;
  dateTime?: string;
  clientName?: string;
  clientPhone?: string;
  staffName?: string;
  /** Already display-ready ("Cash", "UPI") — receipt.ts tidies the raw
   *  lowercase enum, the template only formats. */
  paymentMethod?: string;
  items: Array<{ name: string; qty: number; amount: string; meta?: string }>;
  /** Label/value rows under the items — subtotal, discount, GST lines, etc. */
  summary: Array<{ label: string; value: string; bold?: boolean; muted?: boolean }>;
  grandTotal: { label: string; value: string };
  payments?: Array<{ label: string; value: string }>;
  footerNote?: string;
  qrDataUrl?: string;
}

export function buildThermalCss(profile: PaperProfile): string {
  const f = (px: number) => `${(px * profile.fontScale).toFixed(2)}px`;
  return `
  body{
    font-family:'Segoe UI',Helvetica,Arial,sans-serif;
    font-size:${f(12)};
    color:#000;
    background:#d1d5db;
    margin:0;
    /* Roll printers are monochrome — force pure black text so a light grey
       renders as solid ink rather than a faint dither pattern. */
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  .t-center{text-align:center}
  .t-right{text-align:right}
  /* Bounded on BOTH axes. Width alone let the image keep its full intrinsic
     aspect ratio vertically, so a portrait- or banner-shaped logo rendered as
     a very deep block at the top of the receipt — and because a roll printer
     is monochrome, a light or colour logo prints faint or not at all. The
     symptom is a long stretch of apparently blank paper feeding out before
     any text appears. A4's .inv-logo has always been bounded both ways
     (68x68); this is the same guarantee, but letterboxed via object-fit
     rather than cropped, so a wide logo isn't cut off. width/height:auto so
     the max-* pair does the constraining and the aspect ratio is kept. */
  .t-logo{
    max-width:${profile.logoPx}px;max-height:${profile.logoPx}px;
    width:auto;height:auto;
    margin:0 auto 4px;display:block;object-fit:contain;
  }
  .t-salon{font-size:${f(15)};font-weight:800;line-height:1.25;margin-bottom:2px}
  .t-meta{font-size:${f(10)};line-height:1.45;color:#000}
  /* Dashed rules instead of solid: a solid 1px line prints as a heavy ink bar
     on thermal paper and slows the head down. */
  .t-rule{border:0;border-top:1px dashed #000;margin:6px 0}
  .t-kv{display:flex;justify-content:space-between;gap:6px;font-size:${f(10.5)};line-height:1.5}
  .t-kv span:first-child{color:#000}
  .t-items{width:100%;border-collapse:collapse;font-size:${f(11)}}
  .t-items th{
    text-align:left;font-size:${f(9.5)};text-transform:uppercase;letter-spacing:.3px;
    padding:2px 0;border-bottom:1px dashed #000;font-weight:700;
  }
  .t-items td{padding:3px 0;vertical-align:top;line-height:1.35}
  .t-items .t-qty{width:12%;text-align:center}
  .t-items .t-amt{width:32%;text-align:right;white-space:nowrap}
  /* The name column wraps rather than truncating — a receipt has the vertical
     room, and a clipped service name is worse than a two-line one. */
  .t-items .t-name{word-break:break-word}
  .t-item-meta{font-size:${f(9)};color:#000;opacity:.75}
  .t-sum{width:100%;border-collapse:collapse;font-size:${f(11)}}
  .t-sum td{padding:2px 0}
  .t-sum td:last-child{text-align:right;white-space:nowrap}
  .t-sum .t-bold td{font-weight:700}
  .t-sum .t-muted td{opacity:.75}
  .t-total{
    display:flex;justify-content:space-between;gap:8px;
    font-size:${f(14)};font-weight:800;
    border-top:1px dashed #000;border-bottom:1px dashed #000;
    padding:5px 0;margin:5px 0;
  }
  .t-foot{font-size:${f(10)};line-height:1.5;margin-top:6px}
  .t-qr{width:${Math.round(profile.logoPx * 0.8)}px;max-width:100%;margin:6px auto 0;display:block}
  @media print{ body{background:#fff} }`;
}

export function buildThermalBody(d: ThermalReceiptData): string {
  const metaLines = [d.salonAddress, d.salonPhone && `Ph: ${d.salonPhone}`, d.gstNumber && `GSTIN: ${d.gstNumber}`]
    .filter(Boolean)
    .map((l) => `<div>${esc(l)}</div>`)
    .join("");

  const kv = (label: string, value?: string) =>
    value ? `<div class="t-kv"><span>${esc(label)}</span><span>${esc(value)}</span></div>` : "";

  const items = d.items
    .map(
      (it) => `<tr>
      <td class="t-name">${esc(it.name)}${it.meta ? `<div class="t-item-meta">${esc(it.meta)}</div>` : ""}</td>
      <td class="t-qty">${esc(it.qty)}</td>
      <td class="t-amt">${esc(it.amount)}</td>
    </tr>`,
    )
    .join("");

  const summary = d.summary
    .map(
      (s) =>
        `<tr class="${s.bold ? "t-bold" : ""}${s.muted ? " t-muted" : ""}"><td>${esc(s.label)}</td><td>${esc(s.value)}</td></tr>`,
    )
    .join("");

  const payments = (d.payments ?? [])
    .map((p) => `<tr><td>${esc(p.label)}</td><td>${esc(p.value)}</td></tr>`)
    .join("");

  return `
<div class="page">
  <div class="t-center">
    ${d.logoUrl ? `<img class="t-logo" src="${esc(d.logoUrl)}" alt="" onerror="this.style.display='none'"/>` : ""}
    <div class="t-salon">${esc(d.salonName)}</div>
    <div class="t-meta">${metaLines}</div>
  </div>

  <hr class="t-rule"/>
  ${kv("Invoice", d.invoiceNo)}
  ${kv("Date", d.dateTime)}
  ${kv("Client", d.clientName)}
  ${kv("Phone", d.clientPhone)}
  ${kv("Staff", d.staffName)}
  ${kv("Payment Method", d.paymentMethod)}

  <hr class="t-rule"/>
  <table class="t-items">
    <thead><tr><th>Item</th><th class="t-qty">Qty</th><th class="t-amt">Amount</th></tr></thead>
    <tbody>${items || `<tr><td colspan="3">—</td></tr>`}</tbody>
  </table>

  <hr class="t-rule"/>
  <table class="t-sum"><tbody>${summary}</tbody></table>

  <div class="t-total"><span>${esc(d.grandTotal.label)}</span><span>${esc(d.grandTotal.value)}</span></div>

  ${payments ? `<table class="t-sum"><tbody>${payments}</tbody></table>` : ""}
  ${d.qrDataUrl ? `<img class="t-qr" src="${esc(d.qrDataUrl)}" alt=""/>` : ""}

  <div class="t-center t-foot">${d.footerNote ? esc(d.footerNote) : "Thank You!"}</div>
</div>`;
}

/**
 * Shrinks the @page box to the height the receipt actually occupies, so a
 * continuous roll advances by the length of the receipt and no further.
 *
 * Needed because `size` has no valid "this width, whatever height" form (see
 * buildPageCss) — the height has to be a real length, and only the rendered
 * document knows what it is. `.page` is measured rather than `body` because
 * body carries the preview toolbar's padding, which prints as nothing.
 *
 * offsetHeight includes `.page`'s screen padding, which buildPreviewCss sets
 * to the same values as the @page margins — so the measured box already equals
 * content + top margin + bottom margin, which is exactly what `size` wants
 * (the page box includes its margins). Screen and print lay the content out
 * at the same width (72mm on an 80mm roll: `width:auto` inside the print page
 * box resolves to the same 80mm − 4mm − 4mm), so the measurement carries over.
 *
 * Runs three times on purpose: inline at parse time (so a print fired
 * immediately still gets a sized page), on `load` (once the logo has real
 * dimensions — an unmeasured image is the one thing that would leave the page
 * short), and on `beforeprint` (covers the toolbar's Print button, a Ctrl+P,
 * and the hidden-iframe auto-print path, all of which fire it).
 */
function buildPageFitScript(profile: PaperProfile): string {
  const pageMargin = `${profile.margins.top}mm ${profile.margins.right}mm ${profile.margins.bottom}mm ${profile.margins.left}mm`;
  return `<script>(function(){
  function fit(){
    var el=document.querySelector('.page'), st=document.getElementById('page-style');
    if(!el||!st) return;
    var h=el.offsetHeight;
    if(!h) return;
    // CSS px are 1/96in by definition, so this conversion is exact. +1mm
    // guards against a sub-pixel remainder spilling a hairline onto a second
    // page — which on a roll costs another whole feed.
    var mm=Math.ceil(h*25.4/96)+1;
    st.textContent='@page{size:${profile.widthMm}mm '+mm+'mm;margin:${pageMargin}}';
  }
  fit();
  window.addEventListener('load',fit);
  window.addEventListener('beforeprint',fit);
})();</script>`;
}

/** Full standalone document for a thermal receipt. */
export function buildThermalDocument(
  profile: PaperProfile,
  data: ThermalReceiptData,
  opts: { title?: string; withToolbar?: boolean } = {},
): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>${esc(opts.title ?? "Receipt")}</title>
<style>
${buildThermalCss(profile)}
${buildPreviewCss(profile)}
${opts.withToolbar ? TOOLBAR_CSS : ""}
</style>
<style id="page-style">${buildPageCss(profile)}</style>
</head>
<body>
${opts.withToolbar ? TOOLBAR_HTML : ""}
${buildThermalBody(data)}
${profile.heightMm > 0 ? "" : buildPageFitScript(profile)}
</body></html>`;
}

const TOOLBAR_CSS = `
  .print-toolbar{
    position:fixed;top:0;left:0;right:0;height:44px;background:#111827;color:#fff;
    display:flex;align-items:center;justify-content:center;gap:8px;z-index:99;font-size:13px;
  }
  .print-toolbar button{
    background:#2563eb;color:#fff;border:0;border-radius:6px;padding:7px 16px;
    font-size:13px;font-weight:600;cursor:pointer;
  }
  body{padding-top:56px}
  @media print{ .print-toolbar{display:none} body{padding-top:0} }`;

const TOOLBAR_HTML = `
<div class="print-toolbar">
  <span>Print preview</span>
  <button onclick="window.print()">Print</button>
</div>`;
