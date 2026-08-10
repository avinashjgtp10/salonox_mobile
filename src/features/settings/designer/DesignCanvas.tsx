import React, { useCallback, useRef, useState } from "react";
import type { DesignElement, TextElement } from "./core/schema";
import { canvasBackgroundCss, elementToCss } from "./core/styles";
import type { EditorAction, EditorState } from "./core/editorReducer";
import {
  aabb, angleTo, boxesIntersect, centreOf, computeSnap, resizeRotated,
  snapToGrid as snapVal, unionBounds,
  type Box, type HandleId, type SnapLine,
} from "./core/geometry";

/**
 * The design surface.
 *
 * Elements are absolutely-positioned DOM nodes styled entirely by
 * core/styles.ts — the same module the export renderer uses — so what's on
 * screen and what gets exported come from one place.
 */

const HANDLES: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const SNAP_PX = 6;

interface Props {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  resolveText: (raw: string) => string;
}

type DragMode = "move" | "resize" | "rotate" | "marquee";

interface DragState {
  mode: DragMode;
  handle?: HandleId;
  startX: number;
  startY: number;
  origin: Box;
  rotation: number;
  id: string;
  /** Group drag: every selected id and where each started. */
  groupIds: string[];
  lastDx: number;
  lastDy: number;
}

/**
 * The shared elementToCss() sets display:none for hidden elements, which is
 * right for export but wrong on canvas: an element with no box cannot be
 * clicked, and with the layers list gone that made Hide a one-way door. On
 * canvas we drop the display rule (falling back to the per-type value, e.g.
 * flex for text) and ghost it instead. The export renderers skip hidden
 * elements outright, so nothing leaks into the output.
 */
function editorCss(el: DesignElement): React.CSSProperties {
  const css = elementToCss(el) as React.CSSProperties;
  if (!el.hidden) return css;
  const { display, ...rest } = css;
  return { ...rest, opacity: 0.25 };
}

const DesignCanvas: React.FC<Props> = ({ state, dispatch, resolveText }) => {
  const { doc, selectedIds, zoom, showGrid, snapToGrid, snapToElements, gridSize } = state;
  const dragRef = useRef<DragState | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<SnapLine[]>([]);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editRef = useRef<HTMLSpanElement | null>(null);

  const selected = doc.elements.filter((el) => selectedIds.includes(el.id));
  const sole = selected.length === 1 ? selected[0] : null;
  const groupBox = selected.length > 1 ? unionBounds(selected) : null;

  /** Pointer position in DESIGN coordinates (undoes the canvas scale). */
  const toDesign = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const r = surfaceRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
  }, [zoom]);

  /* ── Move ─────────────────────────────────────────────────────────── */

  const applyMove = (drag: DragState, dxRaw: number, dyRaw: number) => {
    let dx = dxRaw, dy = dyRaw;
    let lines: SnapLine[] = [];

    if (snapToGrid) {
      dx = snapVal(drag.origin.x + dx, gridSize) - drag.origin.x;
      dy = snapVal(drag.origin.y + dy, gridSize) - drag.origin.y;
    } else if (snapToElements) {
      const moving: Box = { ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy };
      const others = doc.elements
        .filter((el) => !drag.groupIds.includes(el.id) && !el.hidden)
        .map(aabb);
      // Threshold divided by zoom so the pull feels the same on screen
      // whether you're at 40% or 300%.
      const snap = computeSnap(moving, others, doc.canvas, SNAP_PX / zoom);
      dx += snap.dx;
      dy += snap.dy;
      lines = snap.lines;
    }
    setGuides(lines);

    // moveMany applies a DELTA, so send only what changed since the last frame.
    dispatch({
      type: "moveMany",
      ids: drag.groupIds,
      dx: dx - drag.lastDx,
      dy: dy - drag.lastDy,
      transient: true,
    });
    drag.lastDx = dx;
    drag.lastDy = dy;
  };

  /* ── Pointer handling ─────────────────────────────────────────────── */

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = (e.clientX - drag.startX) / zoom;
    const dy = (e.clientY - drag.startY) / zoom;

    if (drag.mode === "marquee") {
      const p = toDesign(e);
      setMarquee({
        x: Math.min(drag.origin.x, p.x),
        y: Math.min(drag.origin.y, p.y),
        w: Math.abs(p.x - drag.origin.x),
        h: Math.abs(p.y - drag.origin.y),
      });
      return;
    }

    if (drag.mode === "move") { applyMove(drag, dx, dy); return; }

    if (drag.mode === "rotate") {
      const c = centreOf(drag.origin);
      const p = toDesign(e);
      let deg = Math.round(angleTo(c, p));
      // Shift snaps to 15° steps — the usual way to get a clean 45°.
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      dispatch({
        type: "updateElement",
        id: drag.id,
        patch: { rotation: ((deg % 360) + 360) % 360 },
        transient: true,
      });
      return;
    }

    // Resize. Shift keeps the aspect ratio.
    const box = resizeRotated(drag.origin, drag.rotation, drag.handle!, dx, dy, e.shiftKey);
    dispatch({
      type: "updateElement",
      id: drag.id,
      patch: {
        x: Math.round(box.x), y: Math.round(box.y),
        w: Math.round(box.w), h: Math.round(box.h),
      },
      transient: true,
    });
  }, [dispatch, zoom, toDesign, doc.elements, doc.canvas, snapToGrid, snapToElements, gridSize]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "marquee" && marquee) {
      // Marquee picks anything it touches, using rotation-aware bounds so a
      // rotated element is caught by what you can actually see.
      const hit = doc.elements
        .filter((el) => !el.hidden && !el.locked && boxesIntersect(marquee, aabb(el)))
        .map((el) => el.id);
      dispatch({ type: "select", ids: hit });
    }

    dragRef.current = null;
    setMarquee(null);
    setGuides([]);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    dispatch({ type: "commit" });
  }, [dispatch, marquee, doc.elements]);

  const beginDrag = (
    e: React.PointerEvent,
    mode: DragMode,
    el: DesignElement | null,
    handle?: HandleId,
  ) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);

    if (mode === "marquee") {
      const p = toDesign(e);
      dragRef.current = {
        mode, startX: e.clientX, startY: e.clientY,
        origin: { x: p.x, y: p.y, w: 0, h: 0 },
        rotation: 0, id: "", groupIds: [], lastDx: 0, lastDy: 0,
      };
      return;
    }

    if (!el || el.locked) return;

    // Shift-click adds to the selection instead of replacing it.
    let ids = selectedIds;
    if (mode === "move") {
      if (e.shiftKey) {
        dispatch({ type: "toggleSelect", id: el.id });
        ids = selectedIds.includes(el.id)
          ? selectedIds.filter((x) => x !== el.id)
          : [...selectedIds, el.id];
      } else if (!selectedIds.includes(el.id)) {
        dispatch({ type: "select", ids: [el.id] });
        ids = [el.id];
      }
    } else if (!selectedIds.includes(el.id)) {
      dispatch({ type: "select", ids: [el.id] });
      ids = [el.id];
    }

    // A group move uses the union bounds as its origin so snapping applies to
    // the whole selection rather than to whichever element was grabbed.
    const groupEls = doc.elements.filter((x) => ids.includes(x.id));
    const origin = mode === "move" && groupEls.length > 1
      ? (unionBounds(groupEls) ?? { x: el.x, y: el.y, w: el.w, h: el.h })
      : { x: el.x, y: el.y, w: el.w, h: el.h };

    dragRef.current = {
      mode, handle, startX: e.clientX, startY: e.clientY,
      origin, rotation: el.rotation, id: el.id,
      groupIds: mode === "move" ? ids : [el.id],
      lastDx: 0, lastDy: 0,
    };
  };

  /* ── Render ───────────────────────────────────────────────────────── */

  /**
   * Commits in-place text editing.
   *
   * While editing we show the RAW content (with its {{tokens}}) rather than the
   * resolved preview — otherwise typing over "20% OFF" would silently replace
   * the {{Discount}} placeholder with a literal, and the design would stop
   * following the coupon.
   */
  const commitEdit = useCallback(() => {
    setEditingId((current) => {
      if (!current) return null;
      const el = doc.elements.find((e) => e.id === current);
      const text = editRef.current?.innerText ?? "";
      if (el && el.type === "text" && text !== (el as TextElement).content) {
        dispatch({ type: "updateElement", id: current, patch: { content: text } });
      }
      return null;
    });
  }, [dispatch, doc.elements]);

  const renderContent = (el: DesignElement) => {
    if (el.type !== "text") return null;
    const t = el as TextElement;

    if (editingId === el.id) {
      return (
        <span
          ref={(n) => {
            editRef.current = n;
            if (n && document.activeElement !== n) {
              n.focus();
              // Select everything so typing replaces the placeholder outright,
              // which is what someone double-clicking a sample value expects.
              const r = document.createRange();
              r.selectNodeContents(n);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(r);
            }
          }}
          contentEditable
          suppressContentEditableWarning
          className="dz-edit"
          onBlur={commitEdit}
          // Keys must not reach the page-level shortcuts while typing —
          // Delete would remove the element out from under the caret.
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") { e.preventDefault(); commitEdit(); }
          }}
        >
          {t.content}
        </span>
      );
    }
    return <span>{resolveText(t.content)}</span>;
  };

  const frame = sole
    ? { x: sole.x, y: sole.y, w: sole.w, h: sole.h, rotation: sole.rotation, locked: sole.locked }
    : groupBox
      ? { ...groupBox, rotation: 0, locked: false }
      : null;

  return (
    <div className="dz-canvas-scroll">
      <div className="dz-canvas-wrap" style={{ width: doc.canvas.width * zoom, height: doc.canvas.height * zoom }}>
        <div
          ref={surfaceRef}
          className="dz-canvas"
          style={{
            width: doc.canvas.width,
            height: doc.canvas.height,
            transform: `scale(${zoom})`,
            ...(canvasBackgroundCss(doc.canvas.background) as React.CSSProperties),
          }}
          onPointerDown={(e) => {
            // Clicking empty canvas clears the selection and starts a marquee.
            if (e.target === e.currentTarget) {
              if (!e.shiftKey) dispatch({ type: "select", ids: [] });
              beginDrag(e, "marquee", null);
            }
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {showGrid && (
            <div
              className="dz-grid"
              style={{ backgroundSize: `${gridSize}px ${gridSize}px` }}
            />
          )}

          {doc.elements.map((el) => (
            <div
              key={el.id}
              data-element-id={el.id}
              className={`dz-el${selectedIds.includes(el.id) ? " dz-el--selected" : ""}${el.locked ? " dz-el--locked" : ""}${editingId === el.id ? " dz-el--editing" : ""}${el.hidden ? " dz-el--ghost" : ""}`}
              // Hidden elements are ghosted in the editor rather than removed:
              // the renderers drop them from the export, but on canvas an
              // element with display:none is unselectable and — now that the
              // layers list is gone — unrecoverable. Ghosting keeps Hide
              // reversible.
              style={editorCss(el)}
              // Double-click a text element to type into it directly. Without
              // this the only way to change wording was the right-hand panel,
              // which nobody looks for.
              onDoubleClick={(e) => {
                if (el.type === "text" && !el.locked) { e.stopPropagation(); setEditingId(el.id); }
              }}
              onPointerDown={(e) => {
                if (editingId === el.id) { e.stopPropagation(); return; } // let the caret work
                if (editingId) commitEdit();
                beginDrag(e, "move", el);
              }}
            >
              {renderContent(el)}
            </div>
          ))}

          {/* Snap guides */}
          {guides.map((g, i) => (
            <div
              key={i}
              className={`dz-guide dz-guide--${g.axis}`}
              style={g.axis === "x"
                ? { left: g.at, ["--dz-inv" as string]: String(1 / zoom) }
                : { top: g.at, ["--dz-inv" as string]: String(1 / zoom) }}
            />
          ))}

          {marquee && (
            <div className="dz-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />
          )}

          {frame && (
            <div
              className={`dz-frame${groupBox ? " dz-frame--group" : ""}`}
              style={{
                left: frame.x, top: frame.y, width: frame.w, height: frame.h,
                transform: frame.rotation ? `rotate(${frame.rotation}deg)` : undefined,
                ["--dz-inv" as string]: String(1 / zoom),
              }}
            >
              {/* Handles only for a single element — group resize is a
                  different problem (scaling rotated children) and is not
                  half-built here. Group DRAG works. */}
              {sole && !frame.locked && (
                <>
                  <span
                    className="dz-rotate"
                    onPointerDown={(e) => beginDrag(e, "rotate", sole)}
                    title="Drag to rotate (hold Shift for 15° steps)"
                  />
                  {HANDLES.map((h) => (
                    <span
                      key={h}
                      className={`dz-handle dz-handle--${h}`}
                      onPointerDown={(e) => beginDrag(e, "resize", sole, h)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignCanvas;
