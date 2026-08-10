import React from "react";
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Copy, Trash2,
} from "lucide-react";
import type {
  DesignElement,
  ImageElement,
  ShapeElement,
  TextElement,
} from "./core/schema";
import { TOKENS } from "./core/schema";
import type { EditorAction, EditorState } from "./core/editorReducer";
import { soleSelected } from "./core/editorReducer";

/**
 * Right sidebar — context-sensitive properties for the selected element.
 * With nothing selected it falls back to canvas-level settings, so the panel
 * is never just empty space.
 */

interface Props {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="dz-prop">
    <span className="dz-prop__label">{label}</span>
    <span className="dz-prop__control">{children}</span>
  </label>
);

const PropertyPanel: React.FC<Props> = ({ state, dispatch }) => {
  const el = soleSelected(state);

  const patch = (p: Partial<DesignElement>) => {
    if (!el) return;
    dispatch({ type: "updateElement", id: el.id, patch: p });
  };

  if (!el) {
    const bg = state.doc.canvas.background;
    return (
      <aside className="dz-panel">
        <h3 className="dz-panel__title">Canvas</h3>
        <Row label="Background">
          <input
            type="color"
            value={bg.color ?? "#ffffff"}
            onChange={(e) =>
              dispatch({ type: "setCanvasBackground", fill: { kind: "solid", color: e.target.value } })
            }
          />
        </Row>
        <Row label="Size">
          <span className="dz-prop__static">
            {state.doc.canvas.width} × {state.doc.canvas.height} px
          </span>
        </Row>
        <p className="dz-panel__hint">
          {state.selectedIds.length > 1
            ? `${state.selectedIds.length} elements selected — editing multiple at once comes with multi-select in the next phase.`
            : "Select an element to edit its properties."}
        </p>
      </aside>
    );
  }

  return (
    <aside className="dz-panel">
      <h3 className="dz-panel__title">{el.name}</h3>

      {/* Position/size apply to every element type. */}
      <div className="dz-prop-grid">
        <Row label="X">
          <input type="number" value={Math.round(el.x)}
            onChange={(e) => patch({ x: Number(e.target.value) || 0 })} />
        </Row>
        <Row label="Y">
          <input type="number" value={Math.round(el.y)}
            onChange={(e) => patch({ y: Number(e.target.value) || 0 })} />
        </Row>
        <Row label="W">
          <input type="number" min={8} value={Math.round(el.w)}
            onChange={(e) => patch({ w: Math.max(8, Number(e.target.value) || 8) })} />
        </Row>
        <Row label="H">
          <input type="number" min={8} value={Math.round(el.h)}
            onChange={(e) => patch({ h: Math.max(8, Number(e.target.value) || 8) })} />
        </Row>
      </div>

      <div className="dz-prop-grid">
        <Row label="Rotation°">
          <input type="number" value={Math.round(el.rotation)}
            onChange={(e) => patch({ rotation: ((Number(e.target.value) % 360) + 360) % 360 })} />
        </Row>
        <Row label="Opacity">
          <input type="range" min={0} max={100} value={Math.round(el.opacity * 100)}
            onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })} />
        </Row>
      </div>

      {/* Shadow is on the base element, so it works for text, shapes and
          images alike — it's a drop-shadow filter, which follows the element's
          actual silhouette rather than its box. */}
      <Row label="Shadow">
        <span className="dz-shadow-row">
          <button
            className={`dz-chip${el.shadow ? " dz-chip--on" : ""}`}
            onClick={() => patch({ shadow: el.shadow ? undefined : { x: 0, y: 4, blur: 12, color: "rgba(0,0,0,0.35)" } })}
          >
            {el.shadow ? "On" : "Off"}
          </button>
          {el.shadow && (
            <input type="range" min={0} max={40} value={el.shadow.blur}
              onChange={(e) => patch({ shadow: { ...el.shadow!, blur: Number(e.target.value) } })} />
          )}
        </span>
      </Row>

      <div className="dz-prop-toggles">
        <button className={`dz-chip${el.locked ? " dz-chip--on" : ""}`}
          onClick={() => patch({ locked: !el.locked })}>
          {el.locked ? "Locked" : "Lock"}
        </button>
        <button className={`dz-chip${el.hidden ? " dz-chip--on" : ""}`}
          onClick={() => patch({ hidden: !el.hidden })}>
          {el.hidden ? "Hidden" : "Hide"}
        </button>
      </div>

      {/* Align lives here rather than in a status bar: it's an action on the
          current selection, not a state to report. One element aligns to the
          canvas; several align to each other. Distribute needs three. */}
      <h4 className="dz-panel__sub">Align</h4>
      <div className="dz-align">
        <button onClick={() => dispatch({ type: "align", edge: "left" })} title="Align left"><AlignStartVertical size={14} /></button>
        <button onClick={() => dispatch({ type: "align", edge: "hcenter" })} title="Centre horizontally"><AlignCenterVertical size={14} /></button>
        <button onClick={() => dispatch({ type: "align", edge: "right" })} title="Align right"><AlignEndVertical size={14} /></button>
        <button onClick={() => dispatch({ type: "align", edge: "top" })} title="Align top"><AlignStartHorizontal size={14} /></button>
        <button onClick={() => dispatch({ type: "align", edge: "vcenter" })} title="Centre vertically"><AlignCenterHorizontal size={14} /></button>
        <button onClick={() => dispatch({ type: "align", edge: "bottom" })} title="Align bottom"><AlignEndHorizontal size={14} /></button>
        <button disabled={state.selectedIds.length < 3} onClick={() => dispatch({ type: "distribute", axis: "h" })} title="Distribute horizontally"><AlignHorizontalSpaceAround size={14} /></button>
        <button disabled={state.selectedIds.length < 3} onClick={() => dispatch({ type: "distribute", axis: "v" })} title="Distribute vertically"><AlignVerticalSpaceAround size={14} /></button>
      </div>

      {/* Stacking and object actions live here now that the Layers panel is
          gone — otherwise bring-forward, duplicate and delete would only be
          reachable by keyboard, which is undiscoverable. */}
      <h4 className="dz-panel__sub">Arrange</h4>
      <div className="dz-layer-actions">
        <button onClick={() => dispatch({ type: "reorder", id: el.id, direction: "front" })} title="Bring to front"><ChevronsUp size={14} /></button>
        <button onClick={() => dispatch({ type: "reorder", id: el.id, direction: "forward" })} title="Bring forward"><ChevronUp size={14} /></button>
        <button onClick={() => dispatch({ type: "reorder", id: el.id, direction: "backward" })} title="Send backward"><ChevronDown size={14} /></button>
        <button onClick={() => dispatch({ type: "reorder", id: el.id, direction: "back" })} title="Send to back"><ChevronsDown size={14} /></button>
        <button onClick={() => dispatch({ type: "duplicateSelected" })} title="Duplicate (Ctrl+D)"><Copy size={14} /></button>
        <button className="dz-danger" onClick={() => dispatch({ type: "removeSelected" })} title="Delete"><Trash2 size={14} /></button>
      </div>

      {el.type === "text" && <TextProps el={el as TextElement} patch={patch} />}
      {el.type === "shape" && <ShapeProps el={el as ShapeElement} patch={patch} />}
      {el.type === "image" && <ImageProps el={el as ImageElement} patch={patch} />}
    </aside>
  );
};

/* ── Text ─────────────────────────────────────────────────────────────── */

// Self-hosted faces (see the @fontsource imports in CouponDesignerPage). The
// display/script ones are what make a festival coupon read as festive — in
// Inter, a Diwali design is just a spreadsheet with gold in it.
const FONTS = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', Georgia, serif" },
  { label: "Cinzel (luxury caps)", value: "Cinzel, Georgia, serif" },
  { label: "Bebas Neue (display)", value: "'Bebas Neue', Impact, sans-serif" },
  { label: "Great Vibes (script)", value: "'Great Vibes', cursive" },
  { label: "Dancing Script", value: "'Dancing Script', cursive" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier", value: "'Courier New', monospace" },
];

const TextProps: React.FC<{ el: TextElement; patch: (p: Partial<DesignElement>) => void }> = ({ el, patch }) => (
  <>
    <h4 className="dz-panel__sub">Text</h4>
    <Row label="Content">
      <textarea rows={3} value={el.content}
        onChange={(e) => patch({ content: e.target.value } as Partial<DesignElement>)} />
    </Row>
    {/* A {{token}} is filled from the attached coupon, so what's on the canvas
        is a preview, not a typed value. Without saying so, "20% OFF" reads as
        hardcoded and un-editable. */}
    {/\{\{\w+\}\}/.test(el.content) && (
      <p className="dz-token-note">
        This text contains a placeholder — the canvas shows a preview. It fills
        from the coupon selected in the toolbar. Type over it to use fixed text
        instead, or double-click it on the canvas.
      </p>
    )}

    {/* Tokens are inserted as literal text so they survive further editing —
        the same convention wa_templates uses for its body placeholders. */}
    <Row label="Insert field">
      <select
        value=""
        onChange={(e) => {
          if (!e.target.value) return;
          patch({ content: `${el.content}{{${e.target.value}}}` } as Partial<DesignElement>);
        }}
      >
        <option value="">Add a field…</option>
        {TOKENS.map((t) => <option key={t} value={t}>{`{{${t}}}`}</option>)}
      </select>
    </Row>

    <div className="dz-prop-grid">
      <Row label="Font">
        <select value={el.fontFamily}
          onChange={(e) => patch({ fontFamily: e.target.value } as Partial<DesignElement>)}>
          {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </Row>
      <Row label="Size">
        <input type="number" min={6} value={el.fontSize}
          onChange={(e) => patch({ fontSize: Math.max(6, Number(e.target.value) || 6) } as Partial<DesignElement>)} />
      </Row>
      <Row label="Weight">
        <select value={el.fontWeight}
          onChange={(e) => patch({ fontWeight: Number(e.target.value) } as Partial<DesignElement>)}>
          {[300, 400, 500, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </Row>
      <Row label="Colour">
        <input type="color" value={el.color}
          onChange={(e) => patch({ color: e.target.value } as Partial<DesignElement>)} />
      </Row>
    </div>

    <Row label="Align">
      <span className="dz-seg">
        {(["left", "center", "right"] as const).map((a) => (
          <button key={a} className={el.align === a ? "dz-seg__on" : ""}
            onClick={() => patch({ align: a } as Partial<DesignElement>)}>{a[0].toUpperCase()}</button>
        ))}
      </span>
    </Row>

    <div className="dz-prop-toggles">
      <button className={`dz-chip${el.italic ? " dz-chip--on" : ""}`}
        onClick={() => patch({ italic: !el.italic } as Partial<DesignElement>)}>Italic</button>
      <button className={`dz-chip${el.underline ? " dz-chip--on" : ""}`}
        onClick={() => patch({ underline: !el.underline } as Partial<DesignElement>)}>Underline</button>
      {/* Shrink-to-fit matters most for token text: a coupon code can be 6 or
          20 characters and a fixed size overflows the card on the long ones. */}
      <button className={`dz-chip${el.autoFit === "shrink" ? " dz-chip--on" : ""}`}
        onClick={() => patch({ autoFit: el.autoFit === "shrink" ? "none" : "shrink" } as Partial<DesignElement>)}>
        Shrink to fit
      </button>
    </div>

    <div className="dz-prop-grid">
      <Row label="Letter sp.">
        <input type="number" step={0.5} value={el.letterSpacing}
          onChange={(e) => patch({ letterSpacing: Number(e.target.value) || 0 } as Partial<DesignElement>)} />
      </Row>
      <Row label="Line height">
        <input type="number" step={0.1} min={0.8} value={el.lineHeight}
          onChange={(e) => patch({ lineHeight: Number(e.target.value) || 1.2 } as Partial<DesignElement>)} />
      </Row>
      <Row label="Outline">
        <input type="number" min={0} step={0.5} value={el.strokeWidth ?? 0}
          onChange={(e) => patch({ strokeWidth: Math.max(0, Number(e.target.value) || 0) } as Partial<DesignElement>)} />
      </Row>
      <Row label="Outline colour">
        <input type="color" value={el.strokeColor ?? "#000000"}
          onChange={(e) => patch({ strokeColor: e.target.value } as Partial<DesignElement>)} />
      </Row>
    </div>
  </>
);

/* ── Shape ────────────────────────────────────────────────────────────── */

const ShapeProps: React.FC<{ el: ShapeElement; patch: (p: Partial<DesignElement>) => void }> = ({ el, patch }) => (
  <>
    <h4 className="dz-panel__sub">Shape</h4>
    <Row label="Type">
      <select value={el.shape}
        onChange={(e) => patch({ shape: e.target.value as ShapeElement["shape"] } as Partial<DesignElement>)}>
        <option value="rect">Rectangle</option>
        <option value="ellipse">Ellipse</option>
        <option value="line">Line</option>
      </select>
    </Row>
    {/* Solid vs gradient. A gradient keeps two stops — enough for every
        coupon background anyone actually asks for, and it avoids a stop
        editor that would dwarf the rest of this panel. */}
    <Row label="Fill">
      <span className="dz-seg">
        <button className={el.fill.kind === "solid" ? "dz-seg__on" : ""}
          onClick={() => patch({ fill: { kind: "solid", color: el.fill.stops?.[0]?.color ?? "#4f46e5" } } as Partial<DesignElement>)}>Solid</button>
        <button className={el.fill.kind !== "solid" ? "dz-seg__on" : ""}
          onClick={() => patch({ fill: { kind: "linear", angle: el.fill.angle ?? 90,
            stops: el.fill.stops ?? [{ color: el.fill.color ?? "#4f46e5", at: 0 }, { color: "#a78bfa", at: 100 }] } } as Partial<DesignElement>)}>Gradient</button>
      </span>
    </Row>

    {el.fill.kind === "solid" ? (
      <Row label="Colour">
        <input type="color" value={el.fill.color ?? "#4f46e5"}
          onChange={(e) => patch({ fill: { kind: "solid", color: e.target.value } } as Partial<DesignElement>)} />
      </Row>
    ) : (
      <>
        <div className="dz-prop-grid">
          <Row label="From">
            <input type="color" value={el.fill.stops?.[0]?.color ?? "#4f46e5"}
              onChange={(e) => patch({ fill: { ...el.fill,
                stops: [{ color: e.target.value, at: 0 }, el.fill.stops?.[1] ?? { color: "#a78bfa", at: 100 }] } } as Partial<DesignElement>)} />
          </Row>
          <Row label="To">
            <input type="color" value={el.fill.stops?.[1]?.color ?? "#a78bfa"}
              onChange={(e) => patch({ fill: { ...el.fill,
                stops: [el.fill.stops?.[0] ?? { color: "#4f46e5", at: 0 }, { color: e.target.value, at: 100 }] } } as Partial<DesignElement>)} />
          </Row>
        </div>
        <Row label="Angle°">
          <input type="range" min={0} max={360} value={el.fill.angle ?? 90}
            onChange={(e) => patch({ fill: { ...el.fill, angle: Number(e.target.value) } } as Partial<DesignElement>)} />
        </Row>
      </>
    )}
    {el.shape !== "ellipse" && (
      <Row label="Corner radius">
        <input type="number" min={0} value={el.radius}
          onChange={(e) => patch({ radius: Math.max(0, Number(e.target.value) || 0) } as Partial<DesignElement>)} />
      </Row>
    )}
    <div className="dz-prop-grid">
      <Row label="Border">
        <input type="color" value={el.stroke ?? "#111827"}
          onChange={(e) => patch({ stroke: e.target.value } as Partial<DesignElement>)} />
      </Row>
      <Row label="Width">
        <input type="number" min={0} value={el.strokeWidth}
          onChange={(e) => patch({ strokeWidth: Math.max(0, Number(e.target.value) || 0) } as Partial<DesignElement>)} />
      </Row>
    </div>
  </>
);

/* ── Image ────────────────────────────────────────────────────────────── */

const ImageProps: React.FC<{ el: ImageElement; patch: (p: Partial<DesignElement>) => void }> = ({ el, patch }) => (
  <>
    <h4 className="dz-panel__sub">Image</h4>
    <Row label="Image URL">
      <input type="text" value={el.src} placeholder="https://…"
        onChange={(e) => patch({ src: e.target.value } as Partial<DesignElement>)} />
    </Row>
    <Row label="Fit">
      <select value={el.fit}
        onChange={(e) => patch({ fit: e.target.value as ImageElement["fit"] } as Partial<DesignElement>)}>
        <option value="cover">Cover</option>
        <option value="contain">Contain</option>
        <option value="fill">Stretch</option>
      </select>
    </Row>
    <Row label="Corner radius">
      <input type="number" min={0} value={el.radius}
        onChange={(e) => patch({ radius: Math.max(0, Number(e.target.value) || 0) } as Partial<DesignElement>)} />
    </Row>
    {/* Brightness/contrast/blur are literally CSS `filter`, so they cost
        nothing and render identically in the export. Interactive crop is
        deliberately not here — focal point covers most of its value. */}
    {(["brightness", "contrast", "saturate"] as const).map((k) => (
      <Row key={k} label={k[0].toUpperCase() + k.slice(1)}>
        <input type="range" min={0} max={200} value={el.filters[k]}
          onChange={(e) => patch({ filters: { ...el.filters, [k]: Number(e.target.value) } } as Partial<DesignElement>)} />
      </Row>
    ))}
    <Row label="Blur">
      <input type="range" min={0} max={20} value={el.filters.blur}
        onChange={(e) => patch({ filters: { ...el.filters, blur: Number(e.target.value) } } as Partial<DesignElement>)} />
    </Row>
  </>
);

export default PropertyPanel;
