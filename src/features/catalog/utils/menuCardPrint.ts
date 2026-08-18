import type { Salon } from "../../../types/salon.types";
import type { Service } from "../types/catalog.types";

// ═══════════════════════════════════════════════════════════════════════════
// Print Menu Card — Service Menu page's "hand this to a customer" printout.
// Follows the same plain-HTML-string + window.print() convention as
// receipt.ts / printCoupons.ts (this codebase's established print pattern —
// no PDF library, no server round-trip). buildMenuCardDocument() is shared by
// both the in-modal live preview (rendered in an iframe, toolbar omitted) and
// the actual print window (toolbar included), so what the owner previews is
// exactly what prints.
//
// Templates are data, not 15 hand-written layouts: one shared renderer
// (renderMenuCardBody) reads a small style config per template (colors,
// font, column count, category/row treatment, logo shape) and produces a
// genuinely distinct-looking card from it. Adding a 16th template later is
// adding one config object, not another whole render function.
// ═══════════════════════════════════════════════════════════════════════════

export interface MenuCardTemplateConfig {
  id: string;
  label: string;
  description: string;
  fontFamily: string;
  pageBg: string;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  headerAlign: "center" | "left";
  columns: 1 | 2;
  categoryStyle: "underline" | "pill" | "boxed";
  rowDivider: "dotted" | "line" | "none";
  logoShape: "circle" | "rounded";
}

export const MENU_CARD_TEMPLATES = [
  { id: "classic",   label: "Classic",        description: "Traditional list with dotted price lines.",     fontFamily: "Georgia,'Times New Roman',serif",       pageBg: "#f3f1ec", cardBg: "#fffdf8", textColor: "#2d2416", mutedColor: "#8a7f66", accentColor: "#7c6a4d", headerAlign: "center", columns: 1, categoryStyle: "underline", rowDivider: "dotted", logoShape: "circle"  },
  { id: "elegant",   label: "Elegant",        description: "Centered branding, two-column boutique layout.", fontFamily: "'Playfair Display',Georgia,serif",      pageBg: "#efece6", cardBg: "#ffffff", textColor: "#111827", mutedColor: "#9ca3af", accentColor: "#b08d57", headerAlign: "center", columns: 2, categoryStyle: "boxed",     rowDivider: "line",   logoShape: "circle"  },
  { id: "minimal",   label: "Minimal",        description: "Clean and modern, plenty of white space.",       fontFamily: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif", pageBg: "#ffffff", cardBg: "#ffffff", textColor: "#101828", mutedColor: "#98a2b3", accentColor: "#4f46e5", headerAlign: "left",   columns: 1, categoryStyle: "pill",      rowDivider: "line",   logoShape: "rounded" },
  { id: "modern-dark", label: "Modern Dark",  description: "Dark background with a warm accent.",            fontFamily: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif", pageBg: "#0b0f19", cardBg: "#111827", textColor: "#f9fafb", mutedColor: "#9ca3af", accentColor: "#f59e0b", headerAlign: "center", columns: 1, categoryStyle: "pill",      rowDivider: "line",   logoShape: "rounded" },
  { id: "boutique-rose", label: "Boutique Rose", description: "Soft blush tones for a beauty salon feel.",    fontFamily: "'Playfair Display',Georgia,serif",      pageBg: "#fdf2f8", cardBg: "#ffffff", textColor: "#831843", mutedColor: "#c9829f", accentColor: "#db2777", headerAlign: "center", columns: 2, categoryStyle: "boxed",     rowDivider: "dotted", logoShape: "circle"  },
  { id: "ocean-breeze", label: "Ocean Breeze", description: "Cool blues, left-aligned header.",               fontFamily: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif", pageBg: "#f0f9ff", cardBg: "#ffffff", textColor: "#0c4a6e", mutedColor: "#7dabc4", accentColor: "#0284c7", headerAlign: "left",   columns: 1, categoryStyle: "underline", rowDivider: "line",   logoShape: "rounded" },
  { id: "emerald-spa", label: "Emerald Spa",  description: "Fresh greens, two-column layout.",                fontFamily: "Georgia,'Times New Roman',serif",       pageBg: "#f0fdf4", cardBg: "#ffffff", textColor: "#14532d", mutedColor: "#6ea37f", accentColor: "#16a34a", headerAlign: "center", columns: 2, categoryStyle: "boxed",     rowDivider: "line",   logoShape: "circle"  },
  { id: "gold-luxe", label: "Gold Luxe",      description: "Black background, gold accents.",                 fontFamily: "'Playfair Display',Georgia,serif",      pageBg: "#000000", cardBg: "#0a0a0a", textColor: "#f5f5f4", mutedColor: "#a3a3a3", accentColor: "#d4af37", headerAlign: "center", columns: 1, categoryStyle: "underline", rowDivider: "dotted", logoShape: "circle"  },
  { id: "sunny-citrus", label: "Sunny Citrus", description: "Warm citrus tones, left-aligned header.",        fontFamily: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif", pageBg: "#fffbeb", cardBg: "#ffffff", textColor: "#78350f", mutedColor: "#c99a5b", accentColor: "#ea580c", headerAlign: "left",   columns: 1, categoryStyle: "pill",      rowDivider: "line",   logoShape: "rounded" },
  { id: "monochrome", label: "Monochrome",   description: "Black, white and gray, two columns.",             fontFamily: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif", pageBg: "#ffffff", cardBg: "#ffffff", textColor: "#111827", mutedColor: "#6b7280", accentColor: "#374151", headerAlign: "center", columns: 2, categoryStyle: "underline", rowDivider: "line",   logoShape: "rounded" },
  { id: "lavender-bliss", label: "Lavender Bliss", description: "Soft purples, centered branding.",          fontFamily: "'Playfair Display',Georgia,serif",      pageBg: "#faf5ff", cardBg: "#ffffff", textColor: "#581c87", mutedColor: "#b48fd1", accentColor: "#9333ea", headerAlign: "center", columns: 1, categoryStyle: "boxed",     rowDivider: "dotted", logoShape: "circle"  },
  { id: "bold-contrast", label: "Bold Contrast", description: "High-contrast black, white and red.",         fontFamily: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif", pageBg: "#ffffff", cardBg: "#ffffff", textColor: "#0a0a0a", mutedColor: "#737373", accentColor: "#dc2626", headerAlign: "left",   columns: 1, categoryStyle: "pill",      rowDivider: "line",   logoShape: "rounded" },
  { id: "vintage-parlor", label: "Vintage Parlor", description: "Warm tans and a double border.",            fontFamily: "Georgia,'Times New Roman',serif",       pageBg: "#f5f0e6", cardBg: "#fbf7ee", textColor: "#4b3621", mutedColor: "#a9906f", accentColor: "#b45309", headerAlign: "center", columns: 1, categoryStyle: "underline", rowDivider: "dotted", logoShape: "circle"  },
  { id: "clean-card", label: "Clean Card",    description: "Soft gray background, two-column layout.",       fontFamily: "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif", pageBg: "#f8fafc", cardBg: "#ffffff", textColor: "#0f172a", mutedColor: "#94a3b8", accentColor: "#2563eb", headerAlign: "left",   columns: 2, categoryStyle: "pill",      rowDivider: "line",   logoShape: "rounded" },
  { id: "terracotta", label: "Terracotta",   description: "Earthy warm tones, two-column layout.",           fontFamily: "'Playfair Display',Georgia,serif",      pageBg: "#fdf8f3", cardBg: "#ffffff", textColor: "#7c2d12", mutedColor: "#c58f6f", accentColor: "#c2410c", headerAlign: "center", columns: 2, categoryStyle: "boxed",     rowDivider: "dotted", logoShape: "circle"  },
] as const satisfies readonly MenuCardTemplateConfig[];

export type MenuCardTemplateId = typeof MENU_CARD_TEMPLATES[number]["id"];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDuration(mins: number): string {
  const n = Number(mins) || 0;
  if (n <= 0) return "";
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

// Mirrors ServiceCard's own price display rules (price_type / discounted_price)
// so the menu card never shows a number the Service Menu page itself wouldn't.
// Exported for the picker list in PrintMenuCardModal.tsx to show the same
// price text next to each checkbox as will actually print.
export function formatServicePrice(svc: Service, formatAmount: (n: number) => string): string {
  if (svc.price_type === "free") return "Free";
  const effective = svc.discounted_price != null && svc.discounted_price !== ""
    ? Number(svc.discounted_price)
    : Number(svc.price) || 0;
  const amount = formatAmount(effective);
  return svc.price_type === "from" ? `From ${amount}` : amount;
}

function groupByCategory(services: Service[]): { category: string; services: Service[] }[] {
  const map = new Map<string, Service[]>();
  services.forEach((s) => {
    const key = s.category_name?.trim() || "Other Services";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });
  return Array.from(map.entries()).map(([category, services]) => ({ category, services }));
}

export interface BuildMenuCardParams {
  services: Service[];
  salon: Salon | null;
  templateId: MenuCardTemplateId;
  /** Combined active tax rate applicable to services (see taxSettings.ts's
   *  getActiveTaxes, filtered to applicable_for.service) — 0 hides the GST
   *  note entirely rather than printing "+0% GST". */
  gstPercent: number;
  formatAmount: (n: number) => string;
  /** Owner-controlled text-size multiplier (see the Text size control in
   *  PrintMenuCardModal.tsx) — every font-size below is in `rem` precisely so
   *  this one root font-size (set in buildMenuCardDocument) scales all of
   *  them together, headings and body text alike, without touching the
   *  fixed A4 page dimensions or spacing. 1 = normal. */
  fontScale: number;
}

// ── Single shared renderer, driven entirely by a template's style config ──

function renderCategorySection(
  group: { category: string; services: Service[] },
  cfg: MenuCardTemplateConfig,
  p: BuildMenuCardParams,
): string {
  const catClass = `mc-cat mc-cat--${cfg.categoryStyle}`;
  const catHtml = `<div class="${catClass}">${esc(group.category)}</div>`;

  const rows = group.services.map((s) => {
    const priceBlock = `
      <span class="mc-price">${formatServicePrice(s, p.formatAmount)}</span>
      ${p.gstPercent > 0 ? `<span class="mc-gst">+${p.gstPercent}% GST</span>` : ""}`;
    const durationHtml = formatDuration(s.duration) ? `<div class="mc-duration">${formatDuration(s.duration)}</div>` : "";

    if (cfg.rowDivider === "dotted") {
      return `
      <div class="mc-row mc-row--dotted">
        <div class="mc-row__left">
          <span class="mc-name">${esc(s.name)}</span>
          <span class="mc-dots"></span>
        </div>
        <div class="mc-row__right">${priceBlock}</div>
        ${durationHtml}
      </div>`;
    }
    return `
    <div class="mc-row mc-row--${cfg.rowDivider}">
      <div class="mc-row__info">
        <span class="mc-name">${esc(s.name)}</span>
        ${durationHtml}
      </div>
      <div class="mc-row__right">${priceBlock}</div>
    </div>`;
  }).join("");

  return `<div class="mc-section">${catHtml}${rows}</div>`;
}

function renderMenuCardBody(
  cfg: MenuCardTemplateConfig,
  p: BuildMenuCardParams,
  salonName: string,
  logoUrl: string,
  address: string,
): string {
  const groups = groupByCategory(p.services);
  const sections = groups.map((g) => renderCategorySection(g, cfg, p)).join("");

  const logoHtml = logoUrl
    ? `<img class="mc-logo" src="${logoUrl}" alt="${esc(salonName)}" onerror="this.style.display='none'">`
    : `<div class="mc-logo-fallback">${esc(salonName.charAt(0).toUpperCase())}</div>`;

  const headerHtml = cfg.headerAlign === "left"
    ? `<div class="mc-header mc-header--left">
        ${logoHtml}
        <div>
          <div class="mc-salon">${esc(salonName)}</div>
          ${address ? `<div class="mc-address">${esc(address)}</div>` : ""}
        </div>
      </div>`
    : `<div class="mc-header mc-header--center">
        ${logoHtml}
        <div class="mc-salon">${esc(salonName)}</div>
        ${address ? `<div class="mc-address">${esc(address)}</div>` : ""}
        <div class="mc-title">Service Menu</div>
      </div>`;

  const logoRadius = cfg.logoShape === "circle" ? "50%" : "12px";

  return `
  <style>
    body{font-family:${cfg.fontFamily};background:${cfg.pageBg}}
    .mc-page{width:210mm;min-height:297mm;margin:12mm auto;background:${cfg.cardBg};padding:20mm 18mm;box-shadow:0 4px 20px rgba(0,0,0,.08);color:${cfg.textColor}}

    .mc-header{margin-bottom:28px}
    .mc-header--center{text-align:center}
    .mc-header--left{display:flex;align-items:center;gap:14px;text-align:left}
    .mc-logo{width:56px;height:56px;object-fit:cover;border-radius:${logoRadius};flex-shrink:0}
    .mc-header--center .mc-logo{margin:0 auto 10px}
    .mc-logo-fallback{width:56px;height:56px;border-radius:${logoRadius};background:${cfg.accentColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex-shrink:0}
    .mc-header--center .mc-logo-fallback{margin:0 auto 10px}
    .mc-salon{font-size:1.7rem;font-weight:700;color:${cfg.textColor}}
    .mc-address{font-size:0.6875rem;color:${cfg.mutedColor};margin-top:4px}
    .mc-title{font-size:0.8125rem;letter-spacing:3px;text-transform:uppercase;color:${cfg.accentColor};margin-top:10px}

    .mc-grid{${cfg.columns === 2 ? "display:grid;grid-template-columns:1fr 1fr;gap:0 30px" : ""}}
    .mc-section{margin-bottom:20px;${cfg.columns === 2 ? "break-inside:avoid" : ""}}

    .mc-cat{margin-bottom:10px;font-size:0.875rem;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${cfg.accentColor};page-break-after:avoid;break-after:avoid}
    .mc-cat--underline{border-bottom:1px solid ${cfg.mutedColor}66;padding-bottom:6px}
    .mc-cat--pill{display:inline-block;background:${cfg.accentColor}1f;padding:4px 12px;border-radius:999px}
    .mc-cat--boxed{text-align:center;padding-bottom:2px}

    .mc-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:7px 0;page-break-inside:avoid}
    .mc-row--line{border-bottom:1px solid ${cfg.mutedColor}33}
    .mc-row--dotted{flex-wrap:wrap;align-items:baseline}
    .mc-row__left{display:flex;align-items:baseline;flex:1;min-width:0;gap:6px;overflow:hidden}
    .mc-row__info{flex:1;min-width:0}
    .mc-name{font-size:0.875rem;color:${cfg.textColor};${cfg.rowDivider === "dotted" ? "white-space:nowrap" : ""}}
    .mc-dots{flex:1;border-bottom:1px dotted ${cfg.mutedColor};height:1px;transform:translateY(-4px)}
    .mc-row__right{display:flex;align-items:baseline;gap:8px;white-space:nowrap;margin-left:8px}
    .mc-price{font-size:0.875rem;font-weight:700;color:${cfg.textColor}}
    .mc-gst{font-size:0.625rem;color:${cfg.mutedColor}}
    .mc-duration{font-size:0.6875rem;color:${cfg.mutedColor};margin-top:1px;width:100%}

    .mc-footer{text-align:center;margin-top:28px;font-size:0.6875rem;color:${cfg.mutedColor};border-top:1px solid ${cfg.mutedColor}33;padding-top:14px}
  </style>
  <div class="mc-page">
    ${headerHtml}
    <div class="${cfg.columns === 2 ? "mc-grid" : ""}">${sections}</div>
    <div class="mc-footer">Prices are subject to change without prior notice.${p.gstPercent > 0 ? " GST applicable as indicated." : ""}</div>
  </div>`;
}

/**
 * Builds the full standalone HTML document for a menu card — used both as the
 * in-modal preview iframe's srcDoc (withToolbar: false) and the actual print
 * window (withToolbar: true), so the preview is exactly what prints.
 */
export function buildMenuCardDocument(params: BuildMenuCardParams, withToolbar: boolean): string {
  const s = params.salon as any;
  const salonName = s?.business_name || "Salon";
  const logoUrl   = s?.logo_url || "";
  const address   = [s?.address, s?.city, s?.state].filter(Boolean).join(", ");

  const cfg = MENU_CARD_TEMPLATES.find((t) => t.id === params.templateId) ?? MENU_CARD_TEMPLATES[0];
  const body = renderMenuCardBody(cfg, params, salonName, logoUrl, address);

  const toolbar = withToolbar ? `
    <style>
      body{padding-top:50px}
      .print-toolbar{position:fixed;top:0;left:0;right:0;height:50px;background:#111827;display:flex;align-items:center;justify-content:space-between;padding:0 24px;z-index:9999;box-shadow:0 2px 10px rgba(0,0,0,.3)}
      .pt-brand{font-size:13px;font-weight:700;color:#fff}
      .pt-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;margin-left:8px}
      .pt-btn--primary{background:#2563eb;color:#fff}
      .pt-btn--danger{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.25)}
      @media print{ .print-toolbar{display:none} body{padding-top:0} }
    </style>
    <script>function doPrint(){window.print();}</script>
    <div class="print-toolbar">
      <div class="pt-brand">${esc(salonName)} — Menu Card Preview</div>
      <div>
        <button class="pt-btn pt-btn--primary" onclick="doPrint()">Print</button>
        <button class="pt-btn pt-btn--danger" onclick="window.close()">Close</button>
      </div>
    </div>` : "";

  // Every template's font sizes are in rem — scaling the root is all that's
  // needed for the owner's Text size control to resize every line together
  // (headings included) without touching the fixed A4 page dimensions.
  const rootFontSize = 16 * (params.fontScale || 1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(salonName)} — Service Menu</title>
<style>
  html{font-size:${rootFontSize}px}
  *{box-sizing:border-box;margin:0;padding:0}
  @media print{
    /* Real multi-page pagination: the on-screen "sheet of paper" look
       (fixed width/height, its own padding, drop shadow) only makes sense
       for a single simulated page. For print, each physical page's margin
       comes from @page below instead, so a selection longer than one A4
       page flows across as many pages as it needs with a consistent
       margin on every one of them, not just the first. */
    .mc-page{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}
    .mc-section,.mc-row{page-break-inside:avoid;break-inside:avoid}
  }
  @page{size:A4 portrait;margin:16mm 18mm}
</style>
</head>
<body>
${toolbar}
${body}
</body>
</html>`;
}

// Opens the print window and writes the document — mirrors receipt.ts /
// printCoupons.ts's window.open + document.write convention exactly.
export function openMenuCardPrintWindow(html: string) {
  const win = window.open("", "_blank", "width=960,height=860");
  if (!win) { alert("Please allow popups to print the menu card."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
}
