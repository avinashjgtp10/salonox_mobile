/**
 * Element → CSS mapping. THE single source of truth for how a design looks.
 *
 * This module is pure (no React, no DOM) for one specific reason: the editor
 * canvas renders `<div style={elementToCss(el)}>`, and the server-side export
 * renderer will build the same declarations into an HTML string. If the two
 * ever diverge, users get "the download doesn't match what I designed" — the
 * single most likely failure mode of this architecture. Keep every visual
 * decision in here, never in a component.
 *
 * Returns plain objects rather than React.CSSProperties so this stays usable
 * from Node.
 */

import type {
  DesignElement,
  Fill,
  ImageElement,
  Shadow,
  ShapeElement,
  TextElement,
} from "./schema";

export type CssDecls = Record<string, string | number>;

/* ── Primitives ───────────────────────────────────────────────────────── */

export function fillToCss(fill: Fill | undefined): string {
  if (!fill) return "transparent";
  switch (fill.kind) {
    case "solid":
      return fill.color ?? "transparent";
    case "linear": {
      const stops = (fill.stops ?? []).map((s) => `${s.color} ${s.at}%`).join(", ");
      return stops ? `linear-gradient(${fill.angle ?? 90}deg, ${stops})` : "transparent";
    }
    case "radial": {
      const stops = (fill.stops ?? []).map((s) => `${s.color} ${s.at}%`).join(", ");
      return stops ? `radial-gradient(circle, ${stops})` : "transparent";
    }
    case "image":
      return fill.src ? `url('${fill.src}')` : "transparent";
    default:
      return "transparent";
  }
}

export const shadowToCss = (s: Shadow | undefined): string =>
  s ? `${s.x}px ${s.y}px ${s.blur}px ${s.color}` : "none";

/* ── Layout ───────────────────────────────────────────────────────────── */

/**
 * Position/size/rotation shared by every element type.
 *
 * rotate() is applied about the centre (the CSS default transform-origin), so
 * x/y always describe the unrotated box — that keeps the geometry maths in the
 * canvas honest and matches how the schema documents itself.
 */
export function layoutToCss(el: DesignElement): CssDecls {
  const css: CssDecls = {
    position: "absolute",
    left: `${el.x}px`,
    top: `${el.y}px`,
    width: `${el.w}px`,
    height: `${el.h}px`,
    opacity: el.opacity,
  };
  if (el.rotation) css.transform = `rotate(${el.rotation}deg)`;
  if (el.hidden) css.display = "none";
  if (el.shadow) css.filter = `drop-shadow(${shadowToCss(el.shadow)})`;
  return css;
}

/* ── Per-type ─────────────────────────────────────────────────────────── */

function textToCss(el: TextElement): CssDecls {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    // Horizontal alignment has to be set on BOTH axes: text-align handles the
    // glyphs, align-items handles the flex line box when the text wraps short.
    alignItems: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
    textAlign: el.align,
    fontFamily: el.fontFamily,
    fontSize: `${el.fontSize}px`,
    fontWeight: el.fontWeight,
    fontStyle: el.italic ? "italic" : "normal",
    textDecoration: el.underline ? "underline" : "none",
    letterSpacing: `${el.letterSpacing}px`,
    lineHeight: String(el.lineHeight),
    color: el.color,
    // Long words must break rather than escape the box — an overflowing coupon
    // code is the difference between a usable voucher and a reprint.
    overflowWrap: "break-word",
    whiteSpace: "pre-wrap",
    // -webkit-text-stroke centres the stroke on the glyph outline and is
    // supported in every Chromium-based renderer, including the headless one
    // used for export — so the editor and the PDF agree.
    ...(el.strokeWidth && el.strokeWidth > 0
      ? { WebkitTextStrokeWidth: `${el.strokeWidth}px`, WebkitTextStrokeColor: el.strokeColor ?? "#000" }
      : {}),
  };
}

function shapeToCss(el: ShapeElement): CssDecls {
  if (el.shape === "line") {
    // A line is a filled bar rather than an SVG stroke, so it resizes and
    // rotates with exactly the same maths as every other element.
    return {
      background: fillToCss(el.fill),
      borderRadius: `${el.radius}px`,
    };
  }
  return {
    background: fillToCss(el.fill),
    ...(el.fill.kind === "image"
      ? el.fill.repeat
        ? { backgroundRepeat: "repeat", backgroundSize: "auto" }
        : { backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }
      : {}),
    borderRadius: el.shape === "ellipse" ? "50%" : `${el.radius}px`,
    border: el.strokeWidth > 0 ? `${el.strokeWidth}px solid ${el.stroke ?? "#111827"}` : "none",
    boxSizing: "border-box",
  };
}

function imageToCss(el: ImageElement): CssDecls {
  const f = el.filters;
  // Only emit a filter when something is actually off-default — an always-on
  // filter forces a compositing layer per element and makes the canvas crawl.
  const parts: string[] = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturate !== 100) parts.push(`saturate(${f.saturate}%)`);
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`);

  return {
    backgroundImage: el.src ? `url('${el.src}')` : "none",
    backgroundSize: el.fit === "fill" ? "100% 100%" : el.fit,
    backgroundPosition: `${el.focalX * 100}% ${el.focalY * 100}%`,
    backgroundRepeat: "no-repeat",
    backgroundColor: el.src ? "transparent" : "#f2f4f7",
    borderRadius: `${el.radius}px`,
    ...(parts.length ? { filter: parts.join(" ") } : {}),
  };
}

/** Full declaration set for one element. */
export function elementToCss(el: DesignElement): CssDecls {
  const layout = layoutToCss(el);
  switch (el.type) {
    case "text":  return { ...layout, ...textToCss(el) };
    case "shape": return { ...layout, ...shapeToCss(el) };
    case "image": return { ...layout, ...imageToCss(el) };
    default:      return layout;
  }
}

/* ── Serialisation for the export renderer ────────────────────────────── */

const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Turns a declaration object into an inline `style="..."` string. */
export function cssToInline(decls: CssDecls): string {
  return Object.entries(decls)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${kebab(k)}:${typeof v === "number" && k !== "opacity" && k !== "fontWeight" ? `${v}px` : v}`)
    .join(";");
}

export const canvasBackgroundCss = (fill: Fill): CssDecls => ({
  background: fillToCss(fill),
  ...(fill.kind === "image" ? { backgroundSize: "cover", backgroundPosition: "center" } : {}),
});
