// src/features/settings/utils/couponPrintSheet.ts
//
// Builds the printable HTML for the "Print Coupon" modal — one coupon,
// repeated `quantity` times, in one of 4 design templates at one of 4 sizes.
// The SAME buildCouponSheetHtml() output backs both the modal's live preview
// (rendered scaled inside an iframe) and the actual print run (written into a
// popped-up window, same technique printCoupons.ts already uses for its
// separate "print a batch of different vouchers" flow) — so the preview can
// never drift from what actually prints.
//
// Distinct from printCoupons.ts's printCoupons(): that one prints N
// DIFFERENT bulk-created coupons (one voucher per unique code) in a single
// fixed layout. This one prints N COPIES of ONE coupon, in a chosen
// template/size — printing here never mints or changes a coupon code (see
// project_coupon_print_modal.md memory note for why "unique code per print"
// and "printing must not affect coupon data" can't both hold, and which one
// wins).
import type { Coupon } from "../../../services/api/endpoints/coupon.endpoints";
import type { Salon } from "../../../types/salon.types";

export type CouponTemplateId = "classic" | "modern" | "minimal" | "promotional";
export type CouponSizeId = "small" | "medium" | "large" | "custom";
export type CouponSizeUnit = "in" | "mm";

export interface CouponTemplateDef {
  id: CouponTemplateId;
  label: string;
  description: string;
}

// Order matches the ticket's own enumeration — the modal's picker renders
// these in this order, so "Classic" is always first/leftmost.
export const COUPON_TEMPLATES: CouponTemplateDef[] = [
  { id: "classic", label: "Classic", description: "Traditional layout with logo, code, validity and terms" },
  { id: "modern", label: "Modern", description: "Bold visual layout, large discount value" },
  { id: "minimal", label: "Minimal", description: "Just the essentials — name, discount, code, validity" },
  { id: "promotional", label: "Promotional", description: "Eye-catching banner style for offers/campaigns" },
];

export interface CouponSizePreset {
  id: Exclude<CouponSizeId, "custom">;
  label: string;
  widthIn: number;
  heightIn: number;
}

// Dimensions straight from the ticket's own example table.
export const COUPON_SIZE_PRESETS: CouponSizePreset[] = [
  { id: "small", label: "Small", widthIn: 3.5, heightIn: 2 },
  { id: "medium", label: "Medium", widthIn: 4, heightIn: 2.5 },
  { id: "large", label: "Large", widthIn: 5, heightIn: 3 },
];

// Shared by every "how many copies" input against this coupon-print system —
// the Print Coupon modal's own quantity field AND the Coupon Designer's
// Download quantity both import this one value, and the backend's own
// per-request ceiling (coupon-designs.controller.ts's exportDesign,
// coupons.service.ts's createBulk) uses the same 500 for the same reason: a
// sane bound on how much one request should ever render/create at once.
export const MAX_COUPON_QUANTITY = 500;

const MM_PER_IN = 25.4;
// A4: 210 × 297mm. 10mm margin on every side is the same safe-print margin
// printCoupons.ts's existing voucher sheet already uses — most consumer/
// office printers can't reliably print closer to the edge than that anyway.
export const SHEET_WIDTH_MM = 210;
export const SHEET_HEIGHT_MM = 297;
export const SHEET_MARGIN_MM = 10;
const CARD_GAP_MM = 6;

export interface CouponSizeSelection {
  sizeId: CouponSizeId;
  customWidth?: string; // raw text from the input, in customUnit
  customHeight?: string;
  customUnit?: CouponSizeUnit;
}

export interface ResolvedCouponSize {
  widthMm: number;
  heightMm: number;
}

/** Validates + resolves whatever size the modal has selected into physical
 *  mm — the one place unit conversion happens, so preview and print (and the
 *  "how many fit per page" arithmetic below) can never disagree on what a
 *  size actually measures. Returns null when the selection is incomplete/
 *  invalid, so the caller can show the ticket's own validation message
 *  ("Please enter a valid coupon width and height") instead of guessing. */
export function resolveCouponSize(sel: CouponSizeSelection): ResolvedCouponSize | null {
  if (sel.sizeId !== "custom") {
    const preset = COUPON_SIZE_PRESETS.find((p) => p.id === sel.sizeId);
    if (!preset) return null;
    return { widthMm: round2(preset.widthIn * MM_PER_IN), heightMm: round2(preset.heightIn * MM_PER_IN) };
  }
  const w = Number(sel.customWidth);
  const h = Number(sel.customHeight);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) return null;
  const unit = sel.customUnit ?? "in";
  const toMm = (v: number) => (unit === "in" ? v * MM_PER_IN : v);
  // A coupon under ~15mm on a side isn't printable as anything legible, and
  // one over the page itself can never fit even alone — both would otherwise
  // "succeed" numerically and then visibly fail on paper.
  const widthMm = round2(toMm(w));
  const heightMm = round2(toMm(h));
  const maxWidthMm = SHEET_WIDTH_MM - SHEET_MARGIN_MM * 2;
  const maxHeightMm = SHEET_HEIGHT_MM - SHEET_MARGIN_MM * 2;
  if (widthMm < 15 || heightMm < 15 || widthMm > maxWidthMm || heightMm > maxHeightMm) return null;
  return { widthMm, heightMm };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** How many cards fit per row/column on one A4 sheet at this size — for the
 *  modal's own "N per page" hint text. The actual print layout doesn't rely
 *  on this number (it uses a CSS grid that wraps itself, so it can never
 *  disagree with what the browser's print engine actually lays out) — this
 *  is purely informational, computed with the identical formula. */
export function couponsPerSheet(size: ResolvedCouponSize): { columns: number; rows: number; perPage: number } {
  const usableWidth = SHEET_WIDTH_MM - SHEET_MARGIN_MM * 2;
  const usableHeight = SHEET_HEIGHT_MM - SHEET_MARGIN_MM * 2;
  const columns = Math.max(1, Math.floor((usableWidth + CARD_GAP_MM) / (size.widthMm + CARD_GAP_MM)));
  const rows = Math.max(1, Math.floor((usableHeight + CARD_GAP_MM) / (size.heightMm + CARD_GAP_MM)));
  return { columns, rows, perPage: columns * rows };
}

function fmtDate(raw?: string | null): string {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return raw;
  }
}

function esc(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export interface CouponPrintContent {
  salonName: string;
  logoUrl: string;
  couponName: string;
  code: string;
  discountLabel: string; // e.g. "20% OFF" / "₹200 OFF"
  minOrderLabel: string | null; // null = not configured, omit the line
  maxDiscountLabel: string | null;
  validFromLabel: string | null; // null = valid immediately, omit the line
  validUntilLabel: string;
  terms: string | null;
  qrDataUrl: string; // "" = show_barcode is off, or QR generation failed
}

/** Assembles the display-ready strings from a real Coupon + Salon + the
 *  currency formatter already used everywhere else in this app — kept
 *  separate from the HTML-building functions below so the modal's preview
 *  pane can read the same values it's about to render, for things like the
 *  "as of now" quantity/summary line, without re-parsing HTML. */
export function buildCouponPrintContent(
  coupon: Coupon,
  salon: Salon | null,
  formatAmount: (n: number) => string,
  qrDataUrl: string,
): CouponPrintContent {
  const s = salon as (Salon & { business_name?: string; logo_url?: string | null }) | null;
  const discountLabel = coupon.type === "percentage" ? `${Number(coupon.value)}% OFF` : `${formatAmount(Number(coupon.value))} OFF`;
  return {
    salonName: s?.business_name || "Salon",
    logoUrl: s?.logo_url || "",
    couponName: coupon.name?.trim() || discountLabel,
    code: coupon.code,
    discountLabel,
    minOrderLabel: Number(coupon.min_order_amount) > 0 ? `Min. purchase ${formatAmount(Number(coupon.min_order_amount))}` : null,
    maxDiscountLabel:
      coupon.type === "percentage" && coupon.max_discount != null && Number(coupon.max_discount) > 0
        ? `Max discount ${formatAmount(Number(coupon.max_discount))}`
        : null,
    validFromLabel: coupon.valid_from ? `Valid from ${fmtDate(coupon.valid_from)}` : null,
    validUntilLabel: `Valid until ${fmtDate(coupon.expires_at)}`,
    terms: coupon.terms?.trim() || null,
    qrDataUrl: coupon.show_barcode ? qrDataUrl : "",
  };
}

// ── One card, per template ───────────────────────────────────────────────

function classicCard(c: CouponPrintContent): string {
  return `
    <div class="coupon-card coupon-card--classic">
      <div class="cc-head">
        ${c.logoUrl ? `<img class="cc-logo" src="${esc(c.logoUrl)}" alt="" onerror="this.style.display='none'">` : ""}
        <span class="cc-salon">${esc(c.salonName)}</span>
      </div>
      <div class="cc-name">${esc(c.couponName)}</div>
      <div class="cc-discount">${esc(c.discountLabel)}</div>
      <div class="cc-code">${esc(c.code)}</div>
      <div class="cc-meta">
        ${c.minOrderLabel ? `<span>${esc(c.minOrderLabel)}</span>` : ""}
        ${c.maxDiscountLabel ? `<span>${esc(c.maxDiscountLabel)}</span>` : ""}
        ${c.validFromLabel ? `<span>${esc(c.validFromLabel)}</span>` : ""}
        <span>${esc(c.validUntilLabel)}</span>
      </div>
      ${c.qrDataUrl ? `<img class="cc-qr" src="${c.qrDataUrl}" alt="QR code">` : ""}
      ${c.terms ? `<div class="cc-terms">${esc(c.terms)}</div>` : ""}
    </div>`;
}

function modernCard(c: CouponPrintContent): string {
  return `
    <div class="coupon-card coupon-card--modern">
      ${c.logoUrl ? `<img class="cc-logo cc-logo--corner" src="${esc(c.logoUrl)}" alt="" onerror="this.style.display='none'">` : ""}
      <div class="cc-discount cc-discount--hero">${esc(c.discountLabel)}</div>
      <div class="cc-name">${esc(c.couponName)}</div>
      <div class="cc-code cc-code--pill">${esc(c.code)}</div>
      <div class="cc-meta cc-meta--light">
        ${c.validFromLabel ? `<span>${esc(c.validFromLabel)}</span>` : ""}
        <span>${esc(c.validUntilLabel)}</span>
      </div>
      ${c.qrDataUrl ? `<img class="cc-qr cc-qr--corner" src="${c.qrDataUrl}" alt="QR code">` : ""}
      ${c.terms ? `<div class="cc-terms cc-terms--light">${esc(c.terms)}</div>` : ""}
    </div>`;
}

function minimalCard(c: CouponPrintContent): string {
  // Deliberately no logo, no QR/barcode, no terms — matches the ticket's own
  // Minimal field list exactly (Salon Name / Coupon Name / Discount / Code /
  // Validity only), even though show_barcode might be on for this coupon.
  return `
    <div class="coupon-card coupon-card--minimal">
      <span class="cc-salon">${esc(c.salonName)}</span>
      <div class="cc-name">${esc(c.couponName)}</div>
      <div class="cc-discount">${esc(c.discountLabel)}</div>
      <div class="cc-code">${esc(c.code)}</div>
      <div class="cc-meta">
        ${c.validFromLabel ? `<span>${esc(c.validFromLabel)}</span>` : ""}
        <span>${esc(c.validUntilLabel)}</span>
      </div>
    </div>`;
}

function promotionalCard(c: CouponPrintContent): string {
  return `
    <div class="coupon-card coupon-card--promotional">
      ${c.logoUrl ? `<img class="cc-logo" src="${esc(c.logoUrl)}" alt="" onerror="this.style.display='none'">` : ""}
      <div class="cc-heading">Limited Time Offer</div>
      <div class="cc-discount cc-discount--hero">${esc(c.discountLabel)}</div>
      <div class="cc-name">${esc(c.couponName)}</div>
      <div class="cc-code cc-code--pill">${esc(c.code)}</div>
      <div class="cc-meta cc-meta--light">
        ${c.minOrderLabel ? `<span>${esc(c.minOrderLabel)}</span>` : ""}
        ${c.maxDiscountLabel ? `<span>${esc(c.maxDiscountLabel)}</span>` : ""}
        ${c.validFromLabel ? `<span>${esc(c.validFromLabel)}</span>` : ""}
        <span>${esc(c.validUntilLabel)}</span>
      </div>
      ${c.qrDataUrl ? `<img class="cc-qr" src="${c.qrDataUrl}" alt="QR code">` : ""}
      ${c.terms ? `<div class="cc-terms cc-terms--light">${esc(c.terms)}</div>` : ""}
    </div>`;
}

const CARD_BUILDERS: Record<CouponTemplateId, (c: CouponPrintContent) => string> = {
  classic: classicCard,
  modern: modernCard,
  minimal: minimalCard,
  promotional: promotionalCard,
};

/** One card's markup — used directly by the modal's live single-card preview
 *  (which just scales this in a box, no page/sheet chrome needed). */
export function buildCouponCardHtml(templateId: CouponTemplateId, content: CouponPrintContent): string {
  return CARD_BUILDERS[templateId](content);
}

// Shared visual language every template's card sits on top of — logo/name/
// code/meta/QR/terms element rules live here ONCE so a template only needs
// to pick which of these to include and in what order (matches this app's
// other "one place visual decisions live" convention — see the Coupon
// Designer's styles.ts). Per-template rules below only override what
// actually differs (background, heading color, hero discount size).
const SHARED_CARD_CSS = `
  .coupon-card{box-sizing:border-box;width:100%;height:100%;overflow:hidden;border-radius:10px;padding:10mm 6mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1.5mm;font-family:'Segoe UI',Helvetica,Arial,sans-serif;position:relative;break-inside:avoid;page-break-inside:avoid}
  .cc-head{display:flex;align-items:center;gap:2mm;max-width:100%}
  .cc-logo{width:7mm;height:7mm;border-radius:2mm;object-fit:cover;flex-shrink:0}
  .cc-logo--corner{position:absolute;top:4mm;left:4mm;width:6mm;height:6mm}
  .cc-salon{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:0.4pt;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cc-name{font-size:9pt;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .cc-discount{font-size:16pt;font-weight:800;max-width:100%;overflow-wrap:break-word}
  .cc-discount--hero{font-size:22pt}
  .cc-code{font-family:'Courier New',monospace;font-size:12pt;font-weight:800;letter-spacing:1.5pt;padding:1.5mm 4mm;border-radius:5pt;max-width:100%;overflow-wrap:break-word;word-break:break-word}
  .cc-code--pill{border-radius:20pt}
  .cc-meta{display:flex;flex-wrap:wrap;justify-content:center;gap:1mm 3mm;font-size:7pt;max-width:100%}
  .cc-qr{width:16mm;height:16mm;margin-top:1mm}
  .cc-qr--corner{position:absolute;bottom:4mm;right:4mm;width:12mm;height:12mm;margin-top:0}
  .cc-terms{font-size:6pt;max-width:92%;overflow-wrap:break-word;margin-top:0.5mm}
  .cc-heading{font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:1pt}

  .coupon-card--classic{background:#fff;border:2px dashed #9ca3af;color:#111827}
  .coupon-card--classic .cc-salon{color:#374151}
  .coupon-card--classic .cc-code{background:#111827;color:#fff}
  .coupon-card--classic .cc-meta{color:#6b7280}
  .coupon-card--classic .cc-terms{color:#9ca3af}

  .coupon-card--modern{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none}
  .coupon-card--modern .cc-code--pill{background:rgba(255,255,255,0.16);color:#fff;border:1px solid rgba(255,255,255,0.4)}
  .coupon-card--modern .cc-meta--light{color:rgba(255,255,255,0.85)}
  .coupon-card--modern .cc-terms--light{color:rgba(255,255,255,0.65)}

  .coupon-card--minimal{background:#fff;border:1px solid #e5e7eb;color:#111827}
  .coupon-card--minimal .cc-salon{color:#6b7280;font-weight:600}
  .coupon-card--minimal .cc-code{background:#f3f4f6;color:#111827;border:1px solid #d1d5db}
  .coupon-card--minimal .cc-meta{color:#6b7280}

  .coupon-card--promotional{background:linear-gradient(135deg,#dc2626,#f97316);color:#fff;border:none}
  .coupon-card--promotional .cc-heading{color:#fef3c7}
  .coupon-card--promotional .cc-code--pill{background:#fff;color:#dc2626}
  .coupon-card--promotional .cc-meta--light{color:rgba(255,255,255,0.9)}
  .coupon-card--promotional .cc-terms--light{color:rgba(255,255,255,0.75)}
`;

export interface CouponSheetOptions {
  quantity: number;
  templateId: CouponTemplateId;
  size: ResolvedCouponSize;
}

/** The full standalone print document — N copies of the SAME card in a CSS
 *  grid that wraps itself at the card's real physical (mm) size, so "how
 *  many fit per row" is decided by the browser's own layout/print engine
 *  rather than arithmetic duplicated here that could drift from it. Same
 *  on-screen-preview-sheet / @media print reset technique printCoupons.ts's
 *  existing voucher sheet already uses, for the same reason: WYSIWYG on
 *  screen, but the real margins come from the print dialog's own page setup
 *  at print time, not a CSS @page rule (patchy cross-browser support). */
export function buildCouponSheetHtml(
  coupon: Coupon,
  salon: Salon | null,
  formatAmount: (n: number) => string,
  opts: CouponSheetOptions,
  qrDataUrl: string,
): string {
  const content = buildCouponPrintContent(coupon, salon, formatAmount, qrDataUrl);
  const card = buildCouponCardHtml(opts.templateId, content);
  const cards = Array.from({ length: Math.max(1, opts.quantity) }, () => card).join("");
  const { widthMm, heightMm } = opts.size;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(content.couponName)} — ${esc(content.salonName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#d1d5db;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding-top:50px}
  .sheet{width:${SHEET_WIDTH_MM}mm;min-height:${SHEET_HEIGHT_MM}mm;margin:12mm auto;background:#fff;padding:${SHEET_MARGIN_MM}mm;display:grid;grid-template-columns:repeat(auto-fill,${widthMm}mm);grid-auto-rows:${heightMm}mm;justify-content:center;gap:${CARD_GAP_MM}mm}
  ${SHARED_CARD_CSS}

  .print-toolbar{position:fixed;top:0;left:0;right:0;height:50px;background:#111827;display:flex;align-items:center;justify-content:space-between;padding:0 24px;z-index:9999}
  .pt-brand{font-size:13px;font-weight:700;color:#fff}
  .pt-btn{padding:7px 14px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer}
  .pt-btn--primary{background:#2563eb;color:#fff}
  .pt-btn--danger{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.25);margin-left:8px}

  @media print{
    .print-toolbar{display:none}
    body{background:#fff;padding-top:0}
    .sheet{width:100%;min-height:0;margin:0}
  }
</style>
</head>
<body>
  <div class="print-toolbar">
    <span class="pt-brand">${opts.quantity} × ${esc(content.couponName)}</span>
    <div>
      <button class="pt-btn pt-btn--primary" onclick="window.print()">Print</button>
      <button class="pt-btn pt-btn--danger" onclick="window.close()">✕ Close</button>
    </div>
  </div>
  <div class="sheet">${cards}</div>
</body>
</html>`;
}
