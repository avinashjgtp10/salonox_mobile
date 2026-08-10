/**
 * Predefined festival / occasion templates.
 *
 * Each is just a DesignDoc, so a template is data — no special-casing anywhere
 * in the editor or the exporter. Applying one replaces the current document;
 * the {{tokens}} then fill from the attached coupon.
 *
 * Built entirely from shapes, text, gradients and procedural SVG ornaments, so
 * they need no asset pack and no network at render time. That is also their
 * limit: geometric and typographic designs look genuinely good, illustrated or
 * photographic ones are out of reach without uploaded artwork.
 */

import {
  createEmptyDoc, createImage, createShape, createText,
  type DesignDoc, type PresetId,
} from "./schema";
import {
  botanical, candyStripes, chevronPattern, confetti, cornerFlourish, crescentStar,
  damaskPattern, diya, dotGrid, laurel, mandala, snowflake, sparkle, starburst,
} from "./ornaments";

export interface TemplateDef {
  id: string;
  label: string;
  category: "Festival" | "Occasion" | "Style";
  build: (preset?: PresetId) => DesignDoc;
}

/* ── Diwali — black & gold ────────────────────────────────────────────── */

const diwaliGold = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "solid", color: "#0d0d0f" };
  doc.fonts = ["Cinzel", "Great Vibes", "Inter"];

  doc.elements = [
    // Faint damask texture over the whole card, as in the reference.
    createShape({ name: "Texture", x: 0, y: 0, w: W, h: H,
      fill: { kind: "image", src: damaskPattern("#c9a227", 0.10, 34), repeat: true } }),
    // Gold edge bar on the right.
    createShape({ name: "Gold edge", x: W - 10, y: 0, w: 10, h: H,
      fill: { kind: "linear", angle: 180, stops: [
        { color: "#f3d98b", at: 0 }, { color: "#c9a227", at: 50 }, { color: "#8a6b12", at: 100 }] } }),
    // Two mandalas bleeding off the left edge — the reference's signature.
    createImage({ name: "Mandala large", x: -W * 0.18, y: -H * 0.22, w: W * 0.62, h: W * 0.62,
      src: mandala({ color: "#c9a227", rings: 5 }), fit: "contain" }),
    createImage({ name: "Mandala small", x: W * 0.24, y: H * 0.30, w: W * 0.26, h: W * 0.26,
      src: mandala({ color: "#c9a227", rings: 3 }), fit: "contain" }),

    createShape({ name: "Ribbon", x: W * 0.60, y: H * 0.10, w: W * 0.30, h: 22, radius: 3,
      fill: { kind: "solid", color: "#c8102e" } }),
    createText({ name: "Happy", content: "HAPPY", x: W * 0.60, y: H * 0.10, w: W * 0.30, h: 22,
      fontFamily: "Cinzel, Georgia, serif", fontSize: 12, fontWeight: 700, color: "#ffffff",
      align: "center", letterSpacing: 3 }),
    // Script faces need a much taller box than fontSize x lineHeight: Great
    // Vibes' swashes and descenders sit well outside the nominal line box, so
    // the derived default clips them. Explicit height + shrink-to-fit.
    createText({ name: "Diwali", content: "Diwali", x: W * 0.50, y: H * 0.15, w: W * 0.46,
      h: Math.round(H * 0.34), fontFamily: "'Great Vibes', cursive",
      fontSize: Math.round(H * 0.26), fontWeight: 400, lineHeight: 1.05,
      color: "#e8c46a", align: "center", autoFit: "shrink" }),

    createText({ name: "Discount label", content: "DISCOUNT", x: W * 0.50, y: H * 0.53, w: W * 0.46, h: 18,
      fontFamily: "Cinzel, Georgia, serif", fontSize: 12, fontWeight: 700, color: "#ffffff",
      align: "center", letterSpacing: 4 }),
    // Explicit height, not the derived one: the derived box (fontSize x 1.2
    // plus slack) ran into the code chip below it.
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.50, y: H * 0.585, w: W * 0.46,
      h: Math.round(H * 0.19), fontFamily: "'Bebas Neue', Impact, sans-serif",
      fontSize: Math.round(H * 0.17), fontWeight: 400, lineHeight: 1.05,
      color: "#ffffff", align: "center", autoFit: "shrink" }),

    createShape({ name: "Code chip", x: W * 0.56, y: H * 0.80, w: W * 0.34, h: H * 0.145, radius: 4,
      fill: { kind: "solid", color: "#c9a227" } }),
    createText({ name: "Code", content: "{{CouponCode}}", x: W * 0.56, y: H * 0.79, w: W * 0.34, h: H * 0.13,
      fontFamily: "Inter, sans-serif", fontSize: Math.round(H * 0.075), fontWeight: 800,
      color: "#0d0d0f", align: "center", autoFit: "shrink", letterSpacing: 1 }),
    createText({ name: "Validity", content: "Valid until {{ExpiryDate}} · Min {{MinOrder}}",
      x: W * 0.06, y: H * 0.90, w: W * 0.46, h: 14,
      fontFamily: "Inter, sans-serif", fontSize: 9, fontWeight: 400, color: "#9a8f7a", align: "left" }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.06, y: H * 0.82, w: W * 0.46, h: 16,
      fontFamily: "Cinzel, Georgia, serif", fontSize: 11, fontWeight: 700, color: "#e8c46a",
      align: "left", letterSpacing: 1 }),
  ];
  return doc;
};

/* ── Diwali — pink & white ────────────────────────────────────────────── */

const diwaliPink = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = diwaliGold(preset);
  const { width: W } = doc.canvas;
  doc.canvas.background = { kind: "solid", color: "#ffffff" };
  doc.elements = doc.elements.map((el) => {
    if (el.name === "Texture") return { ...el, fill: { kind: "image", src: damaskPattern("#ec4899", 0.10, 34), repeat: true } } as typeof el;
    if (el.name === "Gold edge") return { ...el, fill: { kind: "solid", color: "#f9a8d4" } } as typeof el;
    if (el.name.startsWith("Mandala")) {
      return { ...el, src: mandala({ color: "#f472b6", rings: el.name.includes("large") ? 5 : 3 }) } as typeof el;
    }
    if (el.name === "Ribbon") return { ...el, fill: { kind: "solid", color: "#3f3f46" } } as typeof el;
    if (el.name === "Diwali") return { ...el, color: "#ec4899" } as typeof el;
    if (el.name === "Offer") return { ...el, color: "#6b7280" } as typeof el;
    if (el.name === "Discount label") return { ...el, color: "#9ca3af" } as typeof el;
    if (el.name === "Code chip") return { ...el, fill: { kind: "solid", color: "#ec4899" } } as typeof el;
    if (el.name === "Code") return { ...el, color: "#ffffff" } as typeof el;
    if (el.name === "Salon") return { ...el, color: "#ec4899" } as typeof el;
    if (el.name === "Validity") return { ...el, color: "#9ca3af" } as typeof el;
    return el;
  });
  // Keep the right-hand accent bar visible against white.
  doc.elements = doc.elements.map((el) =>
    el.name === "Gold edge" ? { ...el, x: W - 8, w: 8 } as typeof el : el);
  return doc;
};

/* ── Christmas gift voucher ───────────────────────────────────────────── */

const christmasVoucher = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "image", src: candyStripes(), repeat: true };
  doc.fonts = ["Playfair Display", "Dancing Script", "Inter"];

  const pad = Math.round(Math.min(W, H) * 0.055);

  doc.elements = [
    // Cream card inset on the striped ground, as in the reference.
    createShape({ name: "Card", x: pad, y: pad, w: W - pad * 2, h: H - pad * 2, radius: 6,
      fill: { kind: "solid", color: "#fbf7f0" } }),
    // Perforated stub on the right.
    createShape({ name: "Stub line", x: W * 0.70, y: pad + 8, w: 1, h: H - pad * 2 - 16,
      fill: { kind: "solid", color: "#b3202c" }, strokeWidth: 0 }),

    createImage({ name: "Snowflake", x: W * 0.74, y: H * 0.16, w: W * 0.10, h: W * 0.10,
      src: snowflake("#b3202c"), fit: "contain" }),
    createText({ name: "Merry", content: "Merry Christmas", x: W * 0.71, y: H * 0.40, w: W * 0.26,
      fontFamily: "'Dancing Script', cursive", fontSize: Math.round(H * 0.10), fontWeight: 700,
      color: "#c9a227", align: "center", autoFit: "shrink" }),

    createText({ name: "Entitles", content: "THIS VOUCHER ENTITLES YOU TO", x: pad + 14, y: H * 0.16, w: W * 0.56, h: 14,
      fontFamily: "Inter, sans-serif", fontSize: 8.5, fontWeight: 600, color: "#6b7280",
      align: "center", letterSpacing: 2 }),
    createText({ name: "Offer", content: "{{Discount}}", x: pad + 14, y: H * 0.24, w: W * 0.56,
      fontFamily: "'Playfair Display', Georgia, serif", fontSize: Math.round(H * 0.17), fontWeight: 700,
      color: "#b3202c", align: "center", autoFit: "shrink" }),
    createText({ name: "Salon", content: "AT {{SalonName}}", x: pad + 14, y: H * 0.47, w: W * 0.56, h: 16,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "#3f3f46",
      align: "center", letterSpacing: 1 }),

    createShape({ name: "Rule", x: pad + 22, y: H * 0.58, w: W * 0.52, h: 1,
      fill: { kind: "solid", color: "#d6cfc2" } }),
    createShape({ name: "Code chip", x: pad + 22, y: H * 0.63, w: W * 0.52, h: H * 0.14, radius: 4,
      fill: { kind: "solid", color: "#b3202c" } }),
    createText({ name: "Code", content: "{{CouponCode}}", x: pad + 22, y: H * 0.63, w: W * 0.52, h: H * 0.14,
      fontFamily: "Inter, sans-serif", fontSize: Math.round(H * 0.08), fontWeight: 800,
      color: "#ffffff", align: "center", autoFit: "shrink", letterSpacing: 2 }),
    createText({ name: "Terms", content: "Valid until {{ExpiryDate}} · Min spend {{MinOrder}} · Not redeemable for cash",
      x: pad + 14, y: H * 0.82, w: W * 0.56, h: 22,
      fontFamily: "Inter, sans-serif", fontSize: 7.5, fontWeight: 400, color: "#8a8578", align: "center" }),
  ];
  return doc;
};

/* ── Luxury (occasion-neutral) ────────────────────────────────────────── */

const luxury = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "linear", angle: 135,
    stops: [{ color: "#101014", at: 0 }, { color: "#26262e", at: 100 }] };
  doc.fonts = ["Cinzel", "Inter"];

  doc.elements = [
    createImage({ name: "Flourish TL", x: 12, y: 12, w: W * 0.18, h: W * 0.18,
      src: cornerFlourish("#c9a227"), fit: "contain" }),
    createImage({ name: "Flourish BR", x: W - 12 - W * 0.18, y: H - 12 - W * 0.18, w: W * 0.18, h: W * 0.18,
      src: cornerFlourish("#c9a227"), fit: "contain", rotation: 180 }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.12, y: H * 0.16, w: W * 0.76, h: 18,
      fontFamily: "Cinzel, Georgia, serif", fontSize: 12, fontWeight: 700, color: "#c9a227",
      align: "center", letterSpacing: 4 }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.12, y: H * 0.30, w: W * 0.76,
      fontFamily: "'Playfair Display', Georgia, serif", fontSize: Math.round(H * 0.22), fontWeight: 700,
      color: "#ffffff", align: "center", autoFit: "shrink" }),
    createShape({ name: "Rule", x: W * 0.32, y: H * 0.58, w: W * 0.36, h: 1,
      fill: { kind: "linear", angle: 90, stops: [{ color: "#8a6b12", at: 0 }, { color: "#f3d98b", at: 50 }, { color: "#8a6b12", at: 100 }] } }),
    createText({ name: "Code", content: "{{CouponCode}}", x: W * 0.20, y: H * 0.65, w: W * 0.60, h: H * 0.13,
      fontFamily: "Inter, sans-serif", fontSize: Math.round(H * 0.08), fontWeight: 800,
      color: "#c9a227", align: "center", autoFit: "shrink", letterSpacing: 4 }),
    createText({ name: "Terms", content: "Valid until {{ExpiryDate}}", x: W * 0.12, y: H * 0.86, w: W * 0.76, h: 14,
      fontFamily: "Inter, sans-serif", fontSize: 8.5, color: "#8f8a7d", align: "center", letterSpacing: 1 }),
  ];
  return doc;
};

/* ── Shared footer ────────────────────────────────────────────────────
 * Every design ends the same way: the code, then the small print. Factored
 * out so a change to the terms wording doesn't mean editing ten templates.
 * ────────────────────────────────────────────────────────────────────── */

const codeBlock = (
  W: number, H: number,
  o: { chip: string; codeColor: string; terms: string; font?: string; y?: number },
) => {
  const y = o.y ?? 0.68;
  return [
    createShape({ name: "Code chip", x: W * 0.2, y: H * y, w: W * 0.6, h: H * 0.14, radius: 5,
      fill: { kind: "solid", color: o.chip } }),
    createText({ name: "Code", content: "{{CouponCode}}", x: W * 0.2, y: H * y, w: W * 0.6, h: H * 0.14,
      fontFamily: o.font ?? "Inter, sans-serif", fontSize: Math.round(H * 0.078), fontWeight: 800,
      color: o.codeColor, align: "center", autoFit: "shrink", letterSpacing: 2 }),
    createText({ name: "Terms", content: "Valid until {{ExpiryDate}} · Min spend {{MinOrder}}",
      x: W * 0.1, y: H * 0.87, w: W * 0.8, h: 14,
      fontFamily: "Inter, sans-serif", fontSize: 8.5, fontWeight: 400, color: o.terms, align: "center" }),
  ];
};

/* ── Eid — green & gold ───────────────────────────────────────────────── */

const eid = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "linear", angle: 160,
    stops: [{ color: "#05372a", at: 0 }, { color: "#0b5c44", at: 100 }] };
  doc.fonts = ["Cinzel", "Great Vibes", "Inter"];

  doc.elements = [
    createShape({ name: "Texture", x: 0, y: 0, w: W, h: H,
      fill: { kind: "image", src: damaskPattern("#e8c46a", 0.09, 34), repeat: true } }),
    createImage({ name: "Crescent", x: W * 0.72, y: H * 0.06, w: W * 0.24, h: W * 0.24,
      src: crescentStar("#e8c46a"), fit: "contain" }),
    createImage({ name: "Flourish", x: 10, y: H - 10 - W * 0.16, w: W * 0.16, h: W * 0.16,
      src: cornerFlourish("#e8c46a"), fit: "contain" }),
    createText({ name: "Greeting", content: "Eid Mubarak", x: W * 0.08, y: H * 0.12, w: W * 0.6,
      h: Math.round(H * 0.2), fontFamily: "'Great Vibes', cursive",
      fontSize: Math.round(H * 0.16), color: "#e8c46a", align: "left", autoFit: "shrink" }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.08, y: H * 0.35, w: W * 0.84,
      h: Math.round(H * 0.2), fontFamily: "'Bebas Neue', Impact, sans-serif",
      fontSize: Math.round(H * 0.19), color: "#ffffff", align: "left", autoFit: "shrink" }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.08, y: H * 0.57, w: W * 0.84, h: 16,
      fontFamily: "Cinzel, Georgia, serif", fontSize: 11, fontWeight: 700, color: "#a7d3c0",
      align: "left", letterSpacing: 3 }),
    ...codeBlock(W, H, { chip: "#e8c46a", codeColor: "#05372a", terms: "#7fae9b" }),
  ];
  return doc;
};

/* ── New Year — confetti on black ─────────────────────────────────────── */

const newYear = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "solid", color: "#0b0b10" };
  doc.fonts = ["Bebas Neue", "Inter"];

  doc.elements = [
    createImage({ name: "Confetti", x: 0, y: 0, w: W, h: H * 0.55,
      src: confetti(["#f3d98b", "#c9a227", "#ffffff", "#8a6b12"], 30), fit: "cover" }),
    createImage({ name: "Sparkle", x: W * 0.06, y: H * 0.08, w: W * 0.08, h: W * 0.08,
      src: sparkle("#f3d98b"), fit: "contain" }),
    createText({ name: "Kicker", content: "NEW YEAR OFFER", x: W * 0.1, y: H * 0.2, w: W * 0.8, h: 16,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "#f3d98b",
      align: "center", letterSpacing: 5 }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.06, y: H * 0.3, w: W * 0.88,
      h: Math.round(H * 0.26), fontFamily: "'Bebas Neue', Impact, sans-serif",
      fontSize: Math.round(H * 0.24), color: "#ffffff", align: "center", autoFit: "shrink" }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.1, y: H * 0.58, w: W * 0.8, h: 15,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "#9ca3af",
      align: "center", letterSpacing: 3 }),
    ...codeBlock(W, H, { chip: "#f3d98b", codeColor: "#0b0b10", terms: "#6b7280" }),
  ];
  return doc;
};

/* ── Valentine's ──────────────────────────────────────────────────────── */

const valentine = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "linear", angle: 150,
    stops: [{ color: "#fff1f2", at: 0 }, { color: "#ffe4e6", at: 100 }] };
  doc.fonts = ["Dancing Script", "Playfair Display", "Inter"];

  doc.elements = [
    createShape({ name: "Texture", x: 0, y: 0, w: W, h: H,
      fill: { kind: "image", src: dotGrid("#e11d48", 0.10, 14), repeat: true } }),
    createShape({ name: "Card", x: W * 0.05, y: H * 0.06, w: W * 0.9, h: H * 0.88, radius: 8,
      fill: { kind: "solid", color: "#ffffff" }, stroke: "#fecdd3", strokeWidth: 1 }),
    createImage({ name: "Sparkle", x: W * 0.85, y: H * 0.11, w: W * 0.07, h: W * 0.07,
      src: sparkle("#fb7185"), fit: "contain" }),
    createText({ name: "Greeting", content: "With love", x: W * 0.1, y: H * 0.12, w: W * 0.8,
      h: Math.round(H * 0.16), fontFamily: "'Dancing Script', cursive",
      fontSize: Math.round(H * 0.13), fontWeight: 700, color: "#e11d48", align: "center", autoFit: "shrink" }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.08, y: H * 0.31, w: W * 0.84,
      h: Math.round(H * 0.22), fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: Math.round(H * 0.2), fontWeight: 700, color: "#9f1239", align: "center", autoFit: "shrink" }),
    createText({ name: "Salon", content: "AT {{SalonName}}", x: W * 0.1, y: H * 0.56, w: W * 0.8, h: 15,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "#9f1239",
      align: "center", letterSpacing: 2 }),
    ...codeBlock(W, H, { chip: "#e11d48", codeColor: "#ffffff", terms: "#a1a1aa" }),
  ];
  return doc;
};

/* ── Birthday ─────────────────────────────────────────────────────────── */

const birthday = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "solid", color: "#fffbeb" };
  doc.fonts = ["Bebas Neue", "Inter"];

  doc.elements = [
    createImage({ name: "Confetti", x: 0, y: 0, w: W, h: H,
      src: confetti(["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"], 34), fit: "cover" }),
    createShape({ name: "Card", x: W * 0.08, y: H * 0.14, w: W * 0.84, h: H * 0.72, radius: 10,
      fill: { kind: "solid", color: "#ffffff" } }),
    createText({ name: "Kicker", content: "HAPPY BIRTHDAY", x: W * 0.1, y: H * 0.2, w: W * 0.8, h: 16,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 800, color: "#a855f7",
      align: "center", letterSpacing: 4 }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.1, y: H * 0.29, w: W * 0.8,
      h: Math.round(H * 0.22), fontFamily: "'Bebas Neue', Impact, sans-serif",
      fontSize: Math.round(H * 0.21), color: "#1f2937", align: "center", autoFit: "shrink" }),
    createText({ name: "Salon", content: "a gift from {{SalonName}}", x: W * 0.1, y: H * 0.53, w: W * 0.8, h: 15,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 500, color: "#6b7280", align: "center" }),
    ...codeBlock(W, H, { chip: "#a855f7", codeColor: "#ffffff", terms: "#9ca3af", y: 0.64 }),
  ];
  return doc;
};

/* ── Holi ─────────────────────────────────────────────────────────────── */

const holi = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "solid", color: "#ffffff" };
  doc.fonts = ["Bebas Neue", "Inter"];

  // Colour "splashes" as soft translucent circles — the closest a procedural
  // renderer gets to powder without illustrated artwork.
  const splash = (name: string, x: number, y: number, r: number, color: string) =>
    createShape({ name, shape: "ellipse", x, y, w: r, h: r, opacity: 0.55,
      fill: { kind: "solid", color } });

  doc.elements = [
    splash("Splash pink",   -W * 0.1, -H * 0.15, W * 0.5, "#ec4899"),
    splash("Splash yellow",  W * 0.7, -H * 0.1,  W * 0.45, "#facc15"),
    splash("Splash green",  -W * 0.08, H * 0.62, W * 0.42, "#22c55e"),
    splash("Splash blue",    W * 0.72, H * 0.66, W * 0.4,  "#3b82f6"),
    createText({ name: "Greeting", content: "HAPPY HOLI", x: W * 0.1, y: H * 0.16, w: W * 0.8, h: 20,
      fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 800, color: "#7c3aed",
      align: "center", letterSpacing: 5 }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.08, y: H * 0.28, w: W * 0.84,
      h: Math.round(H * 0.24), fontFamily: "'Bebas Neue', Impact, sans-serif",
      fontSize: Math.round(H * 0.22), color: "#1f2937", align: "center", autoFit: "shrink" }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.1, y: H * 0.55, w: W * 0.8, h: 15,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "#4b5563",
      align: "center", letterSpacing: 2 }),
    ...codeBlock(W, H, { chip: "#7c3aed", codeColor: "#ffffff", terms: "#9ca3af" }),
  ];
  return doc;
};

/* ── Independence / Republic Day ──────────────────────────────────────── */

const tricolour = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "solid", color: "#ffffff" };
  doc.fonts = ["Bebas Neue", "Inter"];

  doc.elements = [
    createShape({ name: "Saffron band", x: 0, y: 0, w: W, h: H * 0.1,
      fill: { kind: "solid", color: "#ff9933" } }),
    createShape({ name: "Green band", x: 0, y: H * 0.9, w: W, h: H * 0.1,
      fill: { kind: "solid", color: "#138808" } }),
    createImage({ name: "Chakra", x: W * 0.44, y: H * 0.13, w: W * 0.12, h: W * 0.12,
      src: mandala({ color: "#000080", rings: 2 }), fit: "contain" }),
    createText({ name: "Kicker", content: "FREEDOM SALE", x: W * 0.1, y: H * 0.3, w: W * 0.8, h: 16,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 800, color: "#000080",
      align: "center", letterSpacing: 5 }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.08, y: H * 0.38, w: W * 0.84,
      h: Math.round(H * 0.2), fontFamily: "'Bebas Neue', Impact, sans-serif",
      fontSize: Math.round(H * 0.19), color: "#1f2937", align: "center", autoFit: "shrink" }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.1, y: H * 0.59, w: W * 0.8, h: 14,
      fontFamily: "Inter, sans-serif", fontSize: 9.5, fontWeight: 600, color: "#6b7280",
      align: "center", letterSpacing: 2 }),
    ...codeBlock(W, H, { chip: "#000080", codeColor: "#ffffff", terms: "#9ca3af", y: 0.66 }),
  ];
  return doc;
};

/* ── Bold sale ────────────────────────────────────────────────────────── */

const boldSale = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "solid", color: "#111827" };
  doc.fonts = ["Bebas Neue", "Inter"];

  doc.elements = [
    createImage({ name: "Rays", x: W * 0.5 - H * 0.75, y: -H * 0.25, w: H * 1.5, h: H * 1.5,
      src: starburst("#facc15", 28), fit: "contain", opacity: 0.22 }),
    createShape({ name: "Flash", x: 0, y: H * 0.1, w: W * 0.42, h: H * 0.11,
      fill: { kind: "solid", color: "#ef4444" } }),
    createText({ name: "Kicker", content: "LIMITED TIME", x: 0, y: H * 0.1, w: W * 0.42, h: H * 0.11,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 800, color: "#ffffff",
      align: "center", letterSpacing: 2 }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.04, y: H * 0.26, w: W * 0.92,
      h: Math.round(H * 0.3), fontFamily: "'Bebas Neue', Impact, sans-serif",
      fontSize: Math.round(H * 0.28), color: "#facc15", align: "center", autoFit: "shrink" }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.1, y: H * 0.58, w: W * 0.8, h: 15,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "#e5e7eb",
      align: "center", letterSpacing: 3 }),
    ...codeBlock(W, H, { chip: "#facc15", codeColor: "#111827", terms: "#9ca3af" }),
  ];
  return doc;
};

/* ── Spa / wellness ───────────────────────────────────────────────────── */

const spa = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "solid", color: "#f4f1ea" };
  doc.fonts = ["Playfair Display", "Inter"];

  doc.elements = [
    createShape({ name: "Texture", x: 0, y: 0, w: W, h: H,
      fill: { kind: "image", src: chevronPattern("#4d7c5f", 0.06, 24), repeat: true } }),
    createImage({ name: "Sprig left", x: W * 0.04, y: H * 0.24, w: W * 0.14, h: W * 0.14,
      src: botanical("#4d7c5f"), fit: "contain" }),
    createImage({ name: "Sprig right", x: W * 0.82, y: H * 0.24, w: W * 0.14, h: W * 0.14,
      src: botanical("#4d7c5f"), fit: "contain", rotation: 180 }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.12, y: H * 0.14, w: W * 0.76, h: 16,
      fontFamily: "'Playfair Display', Georgia, serif", fontSize: 12, fontWeight: 700,
      color: "#3f5c4a", align: "center", letterSpacing: 4 }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.14, y: H * 0.3, w: W * 0.72,
      h: Math.round(H * 0.2), fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: Math.round(H * 0.18), fontWeight: 700, color: "#2f4738", align: "center", autoFit: "shrink" }),
    createText({ name: "Sub", content: "on your next treatment", x: W * 0.12, y: H * 0.54, w: W * 0.76, h: 14,
      fontFamily: "Inter, sans-serif", fontSize: 9.5, fontWeight: 400, color: "#6f7d72", align: "center" }),
    ...codeBlock(W, H, { chip: "#4d7c5f", codeColor: "#ffffff", terms: "#8a9a8f" }),
  ];
  return doc;
};

/* ── Minimal ──────────────────────────────────────────────────────────── */

const minimal = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "solid", color: "#ffffff" };
  doc.fonts = ["Inter"];

  doc.elements = [
    createShape({ name: "Border", x: 8, y: 8, w: W - 16, h: H - 16, radius: 4,
      fill: { kind: "solid", color: "#ffffff" }, stroke: "#111827", strokeWidth: 1 }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.1, y: H * 0.14, w: W * 0.8, h: 15,
      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: "#111827",
      align: "center", letterSpacing: 5 }),
    createShape({ name: "Rule", x: W * 0.42, y: H * 0.26, w: W * 0.16, h: 2,
      fill: { kind: "solid", color: "#111827" } }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.08, y: H * 0.33, w: W * 0.84,
      h: Math.round(H * 0.22), fontFamily: "Inter, sans-serif",
      fontSize: Math.round(H * 0.2), fontWeight: 800, color: "#111827", align: "center", autoFit: "shrink" }),
    createText({ name: "Sub", content: "your next visit", x: W * 0.1, y: H * 0.56, w: W * 0.8, h: 14,
      fontFamily: "Inter, sans-serif", fontSize: 9.5, fontWeight: 400, color: "#6b7280",
      align: "center", letterSpacing: 1 }),
    ...codeBlock(W, H, { chip: "#111827", codeColor: "#ffffff", terms: "#9ca3af" }),
  ];
  return doc;
};

/* ── Award / premium ──────────────────────────────────────────────────── */

const award = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "linear", angle: 135,
    stops: [{ color: "#1c1917", at: 0 }, { color: "#3f3a34", at: 100 }] };
  doc.fonts = ["Cinzel", "Inter"];

  doc.elements = [
    createImage({ name: "Wreath", x: W * 0.5 - H * 0.34, y: H * 0.12, w: H * 0.68, h: H * 0.68,
      src: laurel("#c9a227"), fit: "contain", opacity: 0.9 }),
    createText({ name: "Kicker", content: "MEMBER REWARD", x: W * 0.1, y: H * 0.16, w: W * 0.8, h: 15,
      fontFamily: "Cinzel, Georgia, serif", fontSize: 10, fontWeight: 700, color: "#c9a227",
      align: "center", letterSpacing: 4 }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.14, y: H * 0.3, w: W * 0.72,
      h: Math.round(H * 0.2), fontFamily: "Cinzel, Georgia, serif",
      fontSize: Math.round(H * 0.17), fontWeight: 700, color: "#ffffff", align: "center", autoFit: "shrink" }),
    createText({ name: "Salon", content: "{{SalonName}}", x: W * 0.1, y: H * 0.53, w: W * 0.8, h: 14,
      fontFamily: "Inter, sans-serif", fontSize: 9.5, fontWeight: 600, color: "#a8a29e",
      align: "center", letterSpacing: 3 }),
    ...codeBlock(W, H, { chip: "#c9a227", codeColor: "#1c1917", terms: "#8a8378", font: "Cinzel, Georgia, serif" }),
  ];
  return doc;
};

/* ── Festive lamps (generic Indian festival) ──────────────────────────── */

const festiveLamps = (preset: PresetId = "coupon_card"): DesignDoc => {
  const doc = createEmptyDoc(preset);
  const { width: W, height: H } = doc.canvas;
  doc.canvas.background = { kind: "linear", angle: 180,
    stops: [{ color: "#3b0764", at: 0 }, { color: "#7c2d12", at: 100 }] };
  doc.fonts = ["Cinzel", "Bebas Neue", "Inter"];

  const lampY = H * 0.72;
  doc.elements = [
    createShape({ name: "Texture", x: 0, y: 0, w: W, h: H,
      fill: { kind: "image", src: dotGrid("#fcd34d", 0.12, 18), repeat: true } }),
    ...[0.12, 0.32, 0.52, 0.72].map((fx, i) =>
      createImage({ name: `Diya ${i + 1}`, x: W * fx, y: lampY, w: W * 0.16, h: W * 0.16,
        src: diya("#fcd34d", "#fb923c"), fit: "contain" })),
    createText({ name: "Kicker", content: "FESTIVE OFFER", x: W * 0.1, y: H * 0.12, w: W * 0.8, h: 15,
      fontFamily: "Cinzel, Georgia, serif", fontSize: 10, fontWeight: 700, color: "#fcd34d",
      align: "center", letterSpacing: 4 }),
    createText({ name: "Offer", content: "{{Discount}}", x: W * 0.08, y: H * 0.24, w: W * 0.84,
      h: Math.round(H * 0.24), fontFamily: "'Bebas Neue', Impact, sans-serif",
      fontSize: Math.round(H * 0.22), color: "#ffffff", align: "center", autoFit: "shrink" }),
    createShape({ name: "Code chip", x: W * 0.22, y: H * 0.5, w: W * 0.56, h: H * 0.13, radius: 5,
      fill: { kind: "solid", color: "#fcd34d" } }),
    createText({ name: "Code", content: "{{CouponCode}}", x: W * 0.22, y: H * 0.5, w: W * 0.56, h: H * 0.13,
      fontFamily: "Inter, sans-serif", fontSize: Math.round(H * 0.072), fontWeight: 800,
      color: "#3b0764", align: "center", autoFit: "shrink", letterSpacing: 2 }),
    createText({ name: "Salon", content: "{{SalonName}} · Valid until {{ExpiryDate}}",
      x: W * 0.08, y: H * 0.645, w: W * 0.84, h: 14,
      fontFamily: "Inter, sans-serif", fontSize: 9, fontWeight: 500, color: "#e9d5ff", align: "center" }),
  ];
  return doc;
};

export const TEMPLATES: TemplateDef[] = [
  { id: "diwali-gold",   label: "Diwali · Black & Gold", category: "Festival", build: diwaliGold },
  { id: "diwali-pink",   label: "Diwali · Pink",         category: "Festival", build: diwaliPink },
  { id: "festive-lamps", label: "Festive Lamps",         category: "Festival", build: festiveLamps },
  { id: "eid",           label: "Eid · Green & Gold",    category: "Festival", build: eid },
  { id: "holi",          label: "Holi · Colours",        category: "Festival", build: holi },
  { id: "christmas",     label: "Christmas Voucher",     category: "Festival", build: christmasVoucher },
  { id: "new-year",      label: "New Year",              category: "Festival", build: newYear },
  { id: "tricolour",     label: "Independence Day",      category: "Festival", build: tricolour },

  { id: "valentine",     label: "Valentine's",           category: "Occasion", build: valentine },
  { id: "birthday",      label: "Birthday",              category: "Occasion", build: birthday },
  { id: "award",         label: "Member Reward",         category: "Occasion", build: award },

  { id: "luxury",        label: "Luxury",                category: "Style",    build: luxury },
  { id: "bold-sale",     label: "Bold Sale",             category: "Style",    build: boldSale },
  { id: "spa",           label: "Spa & Wellness",        category: "Style",    build: spa },
  { id: "minimal",       label: "Minimal",               category: "Style",    build: minimal },
];
