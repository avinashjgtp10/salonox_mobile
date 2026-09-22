/**
 * Design → standalone HTML.
 *
 * Used by Preview and by print/PDF export today, and it is the exact function
 * the server-side exporter will run under puppeteer in Phase 4. That's the
 * point: Preview shows the real export output, so a mismatch between "what I
 * designed" and "what I downloaded" is visible before anyone downloads
 * anything.
 *
 * Pure — no React, no DOM APIs — so it can run in Node unchanged.
 */

import type { DesignDoc, DesignElement, TextElement } from "./schema";
import { canvasBackgroundCss, cssToInline, elementToCss } from "./styles";

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Replaces {{Token}} with a value; unknown tokens become "" and are reported. */
export function resolveTokens(
  raw: string,
  values: Record<string, string>,
): { text: string; missing: string[] } {
  const missing: string[] = [];
  const text = raw.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const v = values[key];
    if (v === undefined || v === "") { missing.push(key); return ""; }
    return v;
  });
  return { text, missing };
}

function renderElement(el: DesignElement, values: Record<string, string>): string {
  if (el.hidden) return "";
  const style = cssToInline(elementToCss(el));

  if (el.type === "text") {
    const t = el as TextElement;
    const { text } = resolveTokens(t.content, values);
    // data-autofit is read by the shrink script injected below, so the same
    // fitting logic runs in preview and in the real export.
    const autofit = t.autoFit === "shrink" ? ' data-autofit="1"' : "";
    return `<div style="${style}"${autofit}><span>${esc(text)}</span></div>`;
  }

  // Shapes and images are fully described by their CSS — background, radius,
  // border and filters all come from elementToCss.
  return `<div style="${style}"></div>`;
}

/**
 * Shrinks any [data-autofit] element's font until its content fits.
 *
 * Runs inside the rendered document rather than being computed in JS beforehand,
 * so the editor preview and the headless export agree by construction instead
 * of by two implementations happening to match.
 */
const AUTOFIT_SCRIPT = `
<script>
(function () {
  var nodes = document.querySelectorAll('[data-autofit]');
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    var size = parseFloat(getComputedStyle(n).fontSize);
    var guard = 0;
    while (
      (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1) &&
      size > 6 && guard < 200
    ) {
      size -= 1; guard++;
      n.style.fontSize = size + 'px';
    }
  }
  document.documentElement.setAttribute('data-autofit-done', '1');
})();
</script>`;

export interface RenderOptions {
  /** Token values. Sample data at design time, real data at export. */
  values?: Record<string, string>;
  /** Adds a print toolbar + auto-print behaviour for the browser print path. */
  printable?: boolean;
  title?: string;
  /**
   * Raw @font-face CSS to drop into <head>. This window/document is separate
   * from the app's own — it doesn't inherit the @fontsource imports
   * CouponDesignerPage.tsx pulls in, so without this every decorative font
   * (Cinzel, Great Vibes, ...) silently falls back to the browser default and
   * the popup no longer matches the editor. Collected by the DOM-touching
   * caller (printDesign) rather than here, since this function stays pure.
   */
  extraCss?: string;
}

export function renderDesignToHtml(doc: DesignDoc, opts: RenderOptions = {}): string {
  const values = opts.values ?? {};
  const { width, height } = doc.canvas;

  const body = doc.elements.map((el) => renderElement(el, values)).join("");
  const canvasStyle = cssToInline({
    position: "relative",
    width: `${width}px`,
    height: `${height}px`,
    overflow: "hidden",
    ...canvasBackgroundCss(doc.canvas.background),
  });

  const toolbar = opts.printable
    ? `<div class="pt">
         <span>${esc(opts.title ?? "Design")} — ${width}×${height}px</span>
         <span>
           <button onclick="window.print()">Print / Save as PDF</button>
           <button class="x" onclick="window.close()">Close</button>
         </span>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${esc(opts.title ?? "Design")}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e5e7eb;-webkit-print-color-adjust:exact;print-color-adjust:exact;
       font-family:Inter,'Segoe UI',Helvetica,Arial,sans-serif}
  .stage{display:flex;justify-content:center;padding:${opts.printable ? "70px 20px 20px" : "0"}}
  .design{box-shadow:${opts.printable ? "0 4px 24px rgba(0,0,0,.15)" : "none"}}
  .pt{position:fixed;top:0;left:0;right:0;height:50px;background:#101828;color:#fff;display:flex;
      align-items:center;justify-content:space-between;padding:0 20px;font-size:13px;font-weight:600;z-index:9}
  .pt button{padding:7px 14px;border:none;border-radius:6px;font-size:12px;font-weight:600;
             cursor:pointer;background:#2563eb;color:#fff}
  .pt button.x{background:rgba(239,68,68,.15);color:#fca5a5;margin-left:8px}
  @media print{
    .pt{display:none}
    body{background:#fff}
    .stage{padding:0}
    .design{box-shadow:none}
    /* Page box matches the artboard exactly so the browser doesn't scale or
       letterbox the design onto a default A4 sheet. */
    @page{size:${width}px ${height}px;margin:0}
  }
</style>
${opts.extraCss ? `<style>${opts.extraCss}</style>` : ""}
</head>
<body>
  ${toolbar}
  <div class="stage"><div class="design" style="${canvasStyle}">${body}</div></div>
  ${AUTOFIT_SCRIPT}
</body></html>`;
}

/**
 * Pulls the already-loaded @font-face rules for this design's decorative
 * fonts (Cinzel, Great Vibes, ...) out of the app's own stylesheets.
 *
 * They're self-hosted via @fontsource imports in CouponDesignerPage.tsx, so
 * the browser has already fetched them into THIS document — a popup opened
 * with window.open("", ...) starts blank and shares none of that, so without
 * copying the rules across it silently falls back to a default sans-serif.
 */
function collectFontFaceCss(families: string[] | undefined): string {
  if (!families?.length) return "";
  const wanted = new Set(families.map((f) => f.replace(/^['"]|['"]$/g, "")));
  const blocks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin sheet — can't read it, nothing to copy
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSFontFaceRule) {
        const family = rule.style.getPropertyValue("font-family").replace(/^['"]|['"]$/g, "");
        if (wanted.has(family)) blocks.push(rule.cssText);
      }
    }
  }
  return blocks.join("\n");
}

/** Opens the design in a new window with the browser's own print dialog. */
export function printDesign(doc: DesignDoc, values: Record<string, string>, title?: string) {
  const extraCss = collectFontFaceCss(doc.fonts);
  const html = renderDesignToHtml(doc, { values, printable: true, title, extraCss });
  const win = window.open("", "_blank", "width=1000,height=880");
  if (!win) { alert("Please allow popups to print this design."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
}

/**
 * Shows an already-exported file (the server-rendered PDF, not this file's
 * own client-side render) inside a popup window with the same dark toolbar
 * `printDesign` uses, instead of just navigating a bare tab to the raw file —
 * so Download reads as an in-app "print preview" rather than leaving the app.
 *
 * `win` is a window opened SYNCHRONOUSLY inside the triggering click (see
 * CouponDesignerPage's handleDownload) — writing into it isn't subject to the
 * popup-blocker's user-activation window the way a fresh window.open() is.
 */
export function showExportedFile(win: Window, fileUrl: string, fileName: string) {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${esc(fileName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;background:#e5e7eb;font-family:Inter,'Segoe UI',Helvetica,Arial,sans-serif}
  .pt{position:fixed;top:0;left:0;right:0;height:50px;background:#101828;color:#fff;display:flex;
      align-items:center;justify-content:space-between;padding:0 20px;font-size:13px;font-weight:600;z-index:9}
  .pt button{padding:7px 14px;border:none;border-radius:6px;font-size:12px;font-weight:600;
             cursor:pointer;background:#2563eb;color:#fff}
  .pt button.x{background:rgba(239,68,68,.15);color:#fca5a5;margin-left:8px}
  .pt a{text-decoration:none}
  iframe{position:fixed;top:50px;left:0;right:0;bottom:0;width:100%;height:calc(100% - 50px);border:none;background:#fff}
</style></head>
<body>
  <div class="pt">
    <span>${esc(fileName)}</span>
    <span>
      <a href="${esc(fileUrl)}" download="${esc(fileName)}"><button>Download</button></a>
      <button class="x" onclick="window.close()">Close</button>
    </span>
  </div>
  <iframe src="${esc(fileUrl)}"></iframe>
</body></html>`;
  win.document.write(html);
  win.document.close();
  win.focus();
}
