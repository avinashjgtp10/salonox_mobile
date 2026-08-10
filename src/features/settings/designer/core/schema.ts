/**
 * Coupon Designer — design document schema.
 *
 * This file is the authoritative shape of a saved design. It is deliberately
 * pure: no React, no DOM, no imports. The server stores `doc` verbatim without
 * interpreting it, and the (future) server-side export renderer will consume
 * these same types, so nothing here may depend on the browser.
 *
 * Bump SCHEMA_VERSION in lockstep with the backend's
 * modules/coupon-designs/coupon-designs.service.ts, which refuses to store a
 * doc newer than it understands.
 */

export const SCHEMA_VERSION = 1;

/* ── Geometry ─────────────────────────────────────────────────────────────
 * Coordinates are design pixels at a 72-DPI base, top-left origin. `x`/`y`/
 * `w`/`h` describe the UNROTATED box; rotation is applied about its centre.
 * Export at N DPI is then just deviceScaleFactor = N/72.
 * ─────────────────────────────────────────────────────────────────────── */

export type ElementType = "text" | "shape" | "image" | "qr" | "barcode";

export interface Fill {
  kind: "solid" | "linear" | "radial" | "image";
  /** solid */
  color?: string;
  /** linear/radial — two or more stops */
  stops?: { color: string; at: number }[];
  /** linear only, degrees */
  angle?: number;
  /** image */
  src?: string;
  /** Tile at natural size instead of covering the box — for pattern fills. */
  repeat?: boolean;
}

export interface Shadow {
  x: number;
  y: number;
  blur: number;
  color: string;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  /** Shown in the layers list. */
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise, about the element's centre. */
  rotation: number;
  /** 0–1 */
  opacity: number;
  locked: boolean;
  hidden: boolean;
  /** Elements sharing a groupId transform together. Flat, not nested. */
  groupId?: string;
  shadow?: Shadow;
}

export type TextAlign = "left" | "center" | "right";

export interface TextElement extends BaseElement {
  type: "text";
  /** May contain {{Tokens}} — stored literally, resolved at render time. */
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  letterSpacing: number;
  lineHeight: number;
  color: string;
  /** Outline around the glyphs. Width 0 (or absent) means none. */
  strokeColor?: string;
  strokeWidth?: number;
  /**
   * "shrink" scales the text down until it fits its box. Essential for token
   * text: SAVE20 and NEWYEAR2026FLAT500 differ by 3x, and without it every
   * batch export overflows.
   */
  autoFit: "none" | "shrink";
}

export type ShapeKind = "rect" | "ellipse" | "line";

export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: ShapeKind;
  fill: Fill;
  stroke?: string;
  strokeWidth: number;
  /** rect only */
  radius: number;
}

/**
 * How a generated image (QR, barcode) gets its payload.
 *
 * Without this the symbol is frozen at the moment it was inserted: attach the
 * design to a different coupon and the {{CouponCode}} TEXT updates while the
 * bars keep the old code, so the card reads one code and scans as another.
 * Storing the recipe instead of only the pixels lets the editor re-render it.
 */
export interface CodeGenerator {
  kind: "qr" | "barcode";
  /** Which sample/real value feeds the symbol. */
  source: "CouponCode" | "BookingUrl";
  /** Barcode symbology; ignored for QR. */
  format?: "CODE128" | "EAN13" | "UPC";
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  /** Present only on QR/barcode images — see CodeGenerator. */
  generator?: CodeGenerator;
  fit: "cover" | "contain" | "fill";
  /** 0–1, where the image is anchored when cropped by `cover`. */
  focalX: number;
  focalY: number;
  radius: number;
  filters: { brightness: number; contrast: number; blur: number; saturate: number };
}

/** Reserved for Phase 3 — declared now so the schema version doesn't churn. */
export interface QrElement extends BaseElement {
  type: "qr";
  data: string;
  foreground: string;
  background: string;
  margin: number;
}

export interface BarcodeElement extends BaseElement {
  type: "barcode";
  data: string;
  format: "CODE128" | "EAN13" | "UPC";
  foreground: string;
  background: string;
}

export type DesignElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | QrElement
  | BarcodeElement;

export interface DesignDoc {
  schemaVersion: number;
  canvas: {
    width: number;
    height: number;
    background: Fill;
  };
  preset: PresetId;
  /** Index 0 is the BOTTOM of the z-order. Array order is the only z-order. */
  elements: DesignElement[];
  /** Families used, so the exporter knows what to preload. */
  fonts: string[];
}

/* ── Presets ──────────────────────────────────────────────────────────── */

export type PresetId =
  | "coupon_card"
  | "instagram_post"
  | "instagram_story"
  | "whatsapp_square"
  | "a4_sheet";

export const PRESETS: { id: PresetId; label: string; width: number; height: number; note: string }[] = [
  { id: "coupon_card",     label: "Coupon card",    width: 384, height: 240,  note: "4 × 2.5 in" },
  { id: "instagram_post",  label: "Instagram post", width: 1080, height: 1080, note: "1:1" },
  { id: "instagram_story", label: "Instagram story",width: 1080, height: 1920, note: "9:16" },
  { id: "whatsapp_square", label: "WhatsApp",       width: 800,  height: 800,  note: "1:1" },
  { id: "a4_sheet",        label: "A4 page",        width: 794,  height: 1123, note: "210 × 297 mm" },
];

export const getPreset = (id: PresetId) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

/* ── Tokens ───────────────────────────────────────────────────────────── */

/** Placeholders resolved from the salon + the attached coupon at render time. */
export const TOKENS = [
  "SalonName", "SalonPhone", "SalonAddress", "SalonWebsite",
  "CouponCode", "Discount", "MinOrder", "ExpiryDate",
  // From the Brand Kit rather than the salon record.
  "Tagline", "Instagram", "Facebook", "WhatsApp",
] as const;

export type TokenName = (typeof TOKENS)[number];

/* ── Factories ────────────────────────────────────────────────────────── */

const uid = () =>
  // crypto.randomUUID isn't available in every context this may run in
  // (older Safari, a headless render), so fall back to a cheap unique id.
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

const base = (name: string, x: number, y: number, w: number, h: number): Omit<BaseElement, "type"> => ({
  id: uid(),
  name,
  x, y, w, h,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false,
});

export const createText = (partial: Partial<TextElement> = {}): TextElement => {
  const fontSize = partial.fontSize ?? 32;
  const lineHeight = partial.lineHeight ?? 1.2;
  // The default box is derived from the type size rather than fixed, because a
  // fixed height overflows the moment someone asks for a large heading — the
  // box has to clear one full line plus the font's own ascender/descender slack.
  const h = partial.h ?? Math.ceil(fontSize * lineHeight) + 10;

  return {
    ...base("Text", 40, 40, 240, h),
    type: "text",
    content: "Your text",
    fontFamily: "Inter, sans-serif",
    fontSize,
    fontWeight: 700,
    italic: false,
    underline: false,
    align: "left",
    letterSpacing: 0,
    lineHeight,
    color: "#111827",
    autoFit: "none",
    ...partial,
    h,
  };
};

export const createShape = (partial: Partial<ShapeElement> = {}): ShapeElement => ({
  ...base("Shape", 40, 40, 160, 160),
  type: "shape",
  shape: "rect",
  fill: { kind: "solid", color: "#4f46e5" },
  strokeWidth: 0,
  radius: 0,
  ...partial,
});

export const createImage = (partial: Partial<ImageElement> = {}): ImageElement => ({
  ...base("Image", 40, 40, 240, 180),
  type: "image",
  src: "",
  fit: "cover",
  focalX: 0.5,
  focalY: 0.5,
  radius: 0,
  filters: { brightness: 100, contrast: 100, blur: 0, saturate: 100 },
  ...partial,
});

export const createEmptyDoc = (preset: PresetId = "coupon_card"): DesignDoc => {
  const p = getPreset(preset);
  return {
    schemaVersion: SCHEMA_VERSION,
    canvas: { width: p.width, height: p.height, background: { kind: "solid", color: "#ffffff" } },
    preset,
    elements: [],
    fonts: ["Inter"],
  };
};
