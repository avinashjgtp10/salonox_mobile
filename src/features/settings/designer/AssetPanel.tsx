import React, { useState } from "react";
import {
  LayoutTemplate, Image as ImageIcon, Type, Square, Sparkles,
  QrCode, Circle, Minus,
} from "lucide-react";
import * as Lucide from "lucide-react";
import type { EditorAction, EditorState } from "./core/editorReducer";
import {
  createImage, createShape, createText, type DesignElement, type Fill,
} from "./core/schema";
import { TEMPLATES } from "./core/templates";
import {
  damaskPattern, candyStripes, chevronPattern, dotGrid, mandala, snowflake, cornerFlourish,
  diya, crescentStar, starburst, sparkle, laurel, confetti, botanical,
} from "./core/ornaments";
import { makeBarcodeDataUri, makeQrDataUri, type BarcodeFormat } from "./core/codes";

/**
 * Left rail + swapping panel, in place of one long stacked sidebar.
 *
 * Clicking a rail icon REPLACES the panel's contents rather than opening a
 * dropdown: these are visual pickers (template thumbnails, sticker grids) that
 * need room and scrolling, and an overlay would cover the very canvas you're
 * choosing against.
 */

type SectionId =
  | "templates" | "backgrounds" | "text" | "shapes"
  | "stickers" | "codes";

const SECTIONS: { id: SectionId; label: string; Icon: React.ElementType }[] = [
  { id: "templates",   label: "Templates",   Icon: LayoutTemplate },
  { id: "backgrounds", label: "Backgrounds", Icon: ImageIcon },
  { id: "text",        label: "Text",        Icon: Type },
  { id: "shapes",      label: "Shapes",      Icon: Square },
  { id: "stickers",    label: "Stickers",    Icon: Sparkles },
  { id: "codes",       label: "QR / Barcode", Icon: QrCode },
];

interface Props {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  designName: string;
  onRename: (name: string) => void;
  couponCode: string;
  bookingUrl: string;
  /** False when no real coupon is attached — the code shown is only a sample. */
  couponAttached: boolean;
}

const AssetPanel: React.FC<Props> = ({ state, dispatch, designName, onRename, couponCode, bookingUrl, couponAttached }) => {
  const [active, setActive] = useState<SectionId>("templates");
  const add = (el: DesignElement) => dispatch({ type: "addElement", element: el });

  return (
    <div className="dz-aside">
      <nav className="dz-rail">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`dz-rail__btn${active === id ? " dz-rail__btn--on" : ""}`}
            onClick={() => setActive(id)}
            title={label}
            aria-label={label}
          >
            <Icon size={18} />
            <span>{label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>

      <div className="dz-panel-col">
        <h4 className="dz-panel-col__title">
          {SECTIONS.find((s) => s.id === active)?.label}
        </h4>

        {active === "templates" && (
          <TemplatesPanel state={state} dispatch={dispatch} designName={designName} onRename={onRename} />
        )}
        {active === "backgrounds" && <BackgroundsPanel dispatch={dispatch} />}
        {active === "text" && <TextPanel add={add} />}
        {active === "shapes" && <ShapesPanel add={add} />}
        {active === "stickers" && <StickersPanel add={add} />}
        {active === "codes" && <CodesPanel add={add} couponCode={couponCode} bookingUrl={bookingUrl} couponAttached={couponAttached} />}
      </div>
    </div>
  );
};

/* ── Templates ────────────────────────────────────────────────────────── */

const TemplatesPanel: React.FC<{
  state: EditorState; dispatch: React.Dispatch<EditorAction>;
  designName: string; onRename: (n: string) => void;
}> = ({ state, dispatch, designName, onRename }) => {
  const apply = (t: (typeof TEMPLATES)[number]) => {
    // Replacing the document is destructive, so it asks once there is
    // actually something to lose.
    if (state.doc.elements.length > 0 &&
        !window.confirm("Apply this template? It replaces everything on the canvas.")) return;
    dispatch({ type: "load", doc: t.build(state.doc.preset) });
    if (designName === "Untitled design") onRename(t.label);
  };

  // Grouped, because a flat list of fifteen is a wall of near-identical rows.
  const categories = ["Festival", "Occasion", "Style"] as const;

  return (
    <div className="dz-templates">
      {categories.map((cat) => {
        const items = TEMPLATES.filter((t) => t.category === cat);
        if (items.length === 0) return null;
        return (
          <React.Fragment key={cat}>
            <p className="dz-panel-col__label">{cat}</p>
            {items.map((t) => (
              <button key={t.id} onClick={() => apply(t)}>
                <span className={`dz-tpl-swatch dz-tpl-swatch--${t.id}`} />
                <span>{t.label}</span>
              </button>
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── Backgrounds ──────────────────────────────────────────────────────── */

const SOLIDS = ["#ffffff", "#0d0d0f", "#0f172a", "#b3202c", "#065f46", "#4f46e5", "#fbf7f0", "#fce7f3"];
const GRADIENTS: { label: string; fill: Fill }[] = [
  { label: "Midnight", fill: { kind: "linear", angle: 135, stops: [{ color: "#101014", at: 0 }, { color: "#26262e", at: 100 }] } },
  { label: "Gold",     fill: { kind: "linear", angle: 135, stops: [{ color: "#8a6b12", at: 0 }, { color: "#f3d98b", at: 100 }] } },
  { label: "Rose",     fill: { kind: "linear", angle: 135, stops: [{ color: "#be185d", at: 0 }, { color: "#fbcfe8", at: 100 }] } },
  { label: "Ocean",    fill: { kind: "linear", angle: 135, stops: [{ color: "#0e7490", at: 0 }, { color: "#a5f3fc", at: 100 }] } },
];
const PATTERNS: { label: string; src: () => string }[] = [
  { label: "Damask gold",  src: () => damaskPattern("#c9a227", 0.18, 34) },
  { label: "Damask pink",  src: () => damaskPattern("#ec4899", 0.18, 34) },
  { label: "Damask green", src: () => damaskPattern("#34d399", 0.18, 34) },
  { label: "Candy stripe", src: () => candyStripes() },
  { label: "Dot grid",     src: () => dotGrid("#ffffff", 0.35, 16) },
  { label: "Chevron",      src: () => chevronPattern("#ffffff", 0.3, 24) },
  { label: "Confetti",     src: () => confetti(["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6"], 26) },
];

const BackgroundsPanel: React.FC<{ dispatch: React.Dispatch<EditorAction> }> = ({ dispatch }) => {
  const set = (fill: Fill) => dispatch({ type: "setCanvasBackground", fill });
  return (
    <>
      <p className="dz-panel-col__label">Solid</p>
      <div className="dz-swatches">
        {SOLIDS.map((c) => (
          <button key={c} style={{ background: c }} title={c}
            onClick={() => set({ kind: "solid", color: c })} />
        ))}
      </div>
      <p className="dz-panel-col__label">Gradient</p>
      <div className="dz-swatches">
        {GRADIENTS.map((g) => (
          <button key={g.label} title={g.label}
            style={{ background: `linear-gradient(${g.fill.angle}deg, ${g.fill.stops![0].color}, ${g.fill.stops![1].color})` }}
            onClick={() => set(g.fill)} />
        ))}
      </div>
      <p className="dz-panel-col__label">Pattern</p>
      <div className="dz-swatches">
        {PATTERNS.map((p) => (
          <button key={p.label} title={p.label}
            style={{ backgroundImage: `url('${p.src()}')`, backgroundColor: "#1f2937" }}
            // repeat:true tiles at natural size; without it a 34px tile is
            // stretched across the whole canvas.
            onClick={() => set({ kind: "image", src: p.src(), repeat: true })} />
        ))}
      </div>
      <p className="dz-panel-col__label">Custom</p>
      <input type="color" className="dz-color-wide" defaultValue="#ffffff"
        onChange={(e) => set({ kind: "solid", color: e.target.value })} />
    </>
  );
};

/* ── Text ─────────────────────────────────────────────────────────────── */

const TextPanel: React.FC<{ add: (el: DesignElement) => void }> = ({ add }) => (
  <div className="dz-stack">
    <button className="dz-add-row" onClick={() => add(createText({
      name: "Heading", content: "Your heading", fontSize: 44, fontWeight: 800,
      fontFamily: "'Playfair Display', Georgia, serif" }))}>
      <span style={{ fontSize: 19, fontWeight: 800 }}>Heading</span>
    </button>
    <button className="dz-add-row" onClick={() => add(createText({
      name: "Subheading", content: "Your subheading", fontSize: 22, fontWeight: 600 }))}>
      <span style={{ fontSize: 15, fontWeight: 600 }}>Subheading</span>
    </button>
    <button className="dz-add-row" onClick={() => add(createText({
      name: "Body", content: "Body text", fontSize: 13, fontWeight: 400 }))}>
      <span style={{ fontSize: 12 }}>Body text</span>
    </button>
    <button className="dz-add-row" onClick={() => add(createText({
      name: "Script", content: "Celebrate", fontSize: 42, fontWeight: 400,
      fontFamily: "'Great Vibes', cursive", h: 74, lineHeight: 1.05, autoFit: "shrink" }))}>
      <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: 22 }}>Script</span>
    </button>
    <p className="dz-panel-col__label">Coupon fields</p>
    {/* These insert {{tokens}}, which fill from the coupon chosen in the
        toolbar rather than being typed. */}
    <button className="dz-add-row" onClick={() => add(createText({
      name: "Discount", content: "{{Discount}}", fontSize: 40, fontWeight: 800,
      fontFamily: "'Bebas Neue', Impact, sans-serif", align: "center", autoFit: "shrink" }))}>
      <span>Discount &nbsp;<code>{"{{Discount}}"}</code></span>
    </button>
    <button className="dz-add-row" onClick={() => add(createText({
      name: "Coupon code", content: "{{CouponCode}}", fontSize: 28, fontWeight: 800,
      align: "center", autoFit: "shrink", letterSpacing: 2 }))}>
      <span>Code &nbsp;<code>{"{{CouponCode}}"}</code></span>
    </button>
    <button className="dz-add-row" onClick={() => add(createText({
      name: "Expiry", content: "Valid until {{ExpiryDate}}", fontSize: 11, fontWeight: 400 }))}>
      <span>Expiry &nbsp;<code>{"{{ExpiryDate}}"}</code></span>
    </button>
    <button className="dz-add-row" onClick={() => add(createText({
      name: "Salon", content: "{{SalonName}}", fontSize: 14, fontWeight: 700, letterSpacing: 1 }))}>
      <span>Salon &nbsp;<code>{"{{SalonName}}"}</code></span>
    </button>
  </div>
);

/* ── Shapes ───────────────────────────────────────────────────────────── */

const ShapesPanel: React.FC<{ add: (el: DesignElement) => void }> = ({ add }) => (
  <div className="dz-grid3">
    <button onClick={() => add(createShape())} title="Rectangle"><Square size={18} /></button>
    <button onClick={() => add(createShape({ name: "Rounded", radius: 16 }))} title="Rounded"><Square size={18} style={{ borderRadius: 6 }} /></button>
    <button onClick={() => add(createShape({ name: "Ellipse", shape: "ellipse" }))} title="Ellipse"><Circle size={18} /></button>
    <button onClick={() => add(createShape({ name: "Line", shape: "line", h: 4, w: 200 }))} title="Line"><Minus size={18} /></button>
    <button onClick={() => add(createShape({ name: "Divider", shape: "line", h: 2, w: 160, fill: { kind: "linear", angle: 90, stops: [{ color: "#8a6b12", at: 0 }, { color: "#f3d98b", at: 50 }, { color: "#8a6b12", at: 100 }] } }))} title="Gold rule"><Minus size={18} color="#c9a227" /></button>
    <button onClick={() => add(createShape({ name: "Badge", shape: "ellipse", w: 110, h: 110, fill: { kind: "solid", color: "#b3202c" } }))} title="Badge"><Circle size={18} color="#b3202c" /></button>
  </div>
);

/* ── Stickers ─────────────────────────────────────────────────────────── */

// lucide is already a dependency, so its glyphs cost nothing extra. Rendered
// to an SVG data URI so the stored design carries the artwork itself.
const LUCIDE_STICKERS = [
  "Scissors", "Gift", "Star", "Heart", "Sparkles", "PartyPopper", "Crown", "Flower2",
  "BadgePercent", "Tag", "Ticket", "Award", "Cake", "Bell", "Clock", "CalendarDays",
  "MapPin", "Phone", "Instagram", "Facebook", "Leaf", "Droplet", "Flame", "Sun",
  "Smile", "ThumbsUp", "ShoppingBag", "Brush", "Palette", "Zap", "Percent", "Wand2",
] as const;

/**
 * Turn a lucide icon into a standalone SVG data URI.
 *
 * It renders the real component rather than reading its path data: as of
 * lucide-react 0.468 the icon node array is captured inside createLucideIcon's
 * closure and is not exposed anywhere — `Lucide.icons[name]` is the component,
 * not the paths. Reading it returned nothing and every icon sticker silently
 * produced an empty src, which looks identical to "no icons available".
 *
 * react-dom/server is imported lazily so its weight lands only on the click
 * that actually needs it, not on opening the designer.
 */
const lucideDataUri = async (name: string, color: string): Promise<string> => {
  const Comp = (Lucide as unknown as Record<string, React.ElementType>)[name];
  if (!Comp) return "";
  const { renderToStaticMarkup } = await import("react-dom/server");
  const svg = renderToStaticMarkup(
    React.createElement(Comp, { color, size: 96, strokeWidth: 1.6 }),
  );
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
};

const StickersPanel: React.FC<{ add: (el: DesignElement) => void }> = ({ add }) => {
  const [color, setColor] = useState("#c9a227");
  // Each takes the picked colour, so one swatch restyles the whole sheet.
  // Confetti is the exception: it's multi-colour by definition.
  const ornaments: { label: string; w?: number; src: () => string }[] = [
    { label: "Mandala", src: () => mandala({ color }) },
    { label: "Snowflake", src: () => snowflake(color) },
    { label: "Flourish", src: () => cornerFlourish(color) },
    { label: "Diya", src: () => diya(color) },
    { label: "Crescent", src: () => crescentStar(color) },
    { label: "Starburst", src: () => starburst(color), w: 200 },
    { label: "Sparkle", src: () => sparkle(color), w: 70 },
    { label: "Laurel", src: () => laurel(color), w: 170 },
    { label: "Botanical", src: () => botanical(color), w: 110 },
    { label: "Confetti", src: () => confetti(), w: 200 },
  ];
  return (
    <>
      <p className="dz-panel-col__label">Colour</p>
      <input type="color" className="dz-color-wide" value={color} onChange={(e) => setColor(e.target.value)} />
      <p className="dz-panel-col__label">Ornaments</p>
      <div className="dz-grid3">
        {ornaments.map((o) => (
          <button key={o.label} title={o.label}
            onClick={() => add(createImage({ name: o.label, src: o.src(), w: o.w ?? 140, h: o.w ?? 140, fit: "contain" }))}>
            <img src={o.src()} alt="" />
          </button>
        ))}
      </div>
      <p className="dz-panel-col__label">Icons</p>
      <div className="dz-grid3">
        {LUCIDE_STICKERS.map((n) => {
          // The thumbnail renders the component directly — no encoding needed
          // to just look at it. The data URI is built only on click.
          const Icon = (Lucide as unknown as Record<string, React.ElementType>)[n];
          if (!Icon) return null;
          return (
            <button key={n} title={n} onClick={async () => {
              const src = await lucideDataUri(n, color);
              if (src) add(createImage({ name: n, src, w: 90, h: 90, fit: "contain" }));
            }}>
              <Icon size={26} color={color} strokeWidth={1.6} />
            </button>
          );
        })}
      </div>
    </>
  );
};

/* ── QR / Barcode ─────────────────────────────────────────────────────── */

const CodesPanel: React.FC<{ add: (el: DesignElement) => void; couponCode: string; bookingUrl: string; couponAttached: boolean }> = ({ add, couponCode, bookingUrl, couponAttached }) => {
  const [qrTarget, setQrTarget] = useState<"booking" | "code">("booking");
  const [format, setFormat] = useState<BarcodeFormat>("CODE128");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const addQr = async () => {
    setBusy(true); setErr("");
    try {
      const src = await makeQrDataUri(qrTarget === "booking" ? bookingUrl : couponCode);
      add(createImage({
        name: "QR code", src, w: 110, h: 110, fit: "contain",
        generator: { kind: "qr", source: qrTarget === "booking" ? "BookingUrl" : "CouponCode" },
      }));
    } catch { setErr("Could not generate that QR code."); }
    finally { setBusy(false); }
  };

  const addBarcode = () => {
    setErr("");
    const src = makeBarcodeDataUri(couponCode, format);
    // Empty means the code can't be encoded in this symbology — say so rather
    // than dropping a corrupt symbol that scans as the wrong thing.
    if (!src) {
      setErr(format === "CODE128"
        ? "That coupon code can't be encoded."
        : `${format} needs digits only (EAN-13: 12–13, UPC: 11–12). Try Code 128.`);
      return;
    }
    add(createImage({
      name: "Barcode", src, w: 190, h: 80, fit: "contain",
      generator: { kind: "barcode", source: "CouponCode", format },
    }));
  };

  return (
    <>
      <p className="dz-panel-col__label">QR code</p>
      <select className="dz-select" value={qrTarget} onChange={(e) => setQrTarget(e.target.value as "booking" | "code")}>
        <option value="booking">Links to online booking</option>
        <option value="code">Contains the coupon code</option>
      </select>
      <button className="dz-add-row" disabled={busy} onClick={addQr}>
        <QrCode size={15} /> <span>{busy ? "Generating…" : "Add QR code"}</span>
      </button>

      <p className="dz-panel-col__label">Barcode</p>
      <select className="dz-select" value={format} onChange={(e) => setFormat(e.target.value as BarcodeFormat)}>
        <option value="CODE128">Code 128 (any code)</option>
        <option value="EAN13">EAN-13 (digits)</option>
        <option value="UPC">UPC (digits)</option>
      </select>
      <button className="dz-add-row" onClick={addBarcode}>
        <span>Add barcode for {couponCode || "—"}</span>
      </button>

      {err && <p className="dz-panel-col__warn">{err}</p>}
      {!couponAttached && (
        <p className="dz-panel-col__warn">
          No coupon attached, so <b>{couponCode}</b> is only a sample. Pick a coupon
          in the toolbar and the code will re-generate — don't print this as it is.
        </p>
      )}
      <p className="dz-panel-col__note">
        Both are generated as vector SVG, so they stay sharp in printed PDFs, and
        they follow the attached coupon if you switch it.
      </p>
    </>
  );
};


export default AssetPanel;
