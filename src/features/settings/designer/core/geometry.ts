/**
 * Transform geometry — rotation-aware resize, bounding boxes, snapping.
 *
 * Pure maths, no React/DOM. Kept apart from the reducer because this is the
 * part that is genuinely easy to get wrong: dragging the NE handle of a
 * 37°-rotated box is not the same problem as dragging it unrotated.
 */

import type { DesignElement } from "./schema";

export interface Box { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }

export const rad = (deg: number) => (deg * Math.PI) / 180;

export const rotatePoint = (p: Point, origin: Point, deg: number): Point => {
  if (!deg) return p;
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  const dx = p.x - origin.x, dy = p.y - origin.y;
  return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c };
};

export const centreOf = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** The four corners of a box after rotation about its centre. */
export function corners(b: Box, rotation: number): Point[] {
  const c = centreOf(b);
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ].map((p) => rotatePoint(p, c, rotation));
}

/** Axis-aligned bounds that contain the element even when it's rotated. */
export function aabb(el: DesignElement): Box {
  const pts = corners(el, el.rotation);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Bounds enclosing a set of elements — the frame drawn around a multi-select. */
export function unionBounds(els: DesignElement[]): Box | null {
  if (els.length === 0) return null;
  const boxes = els.map(aabb);
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const bo = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: bo - y };
}

export const boxesIntersect = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/* ── Rotation-aware resize ────────────────────────────────────────────── */

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const MIN = 8;

/**
 * Resizes a rotated box by dragging `handle`.
 *
 * The trick: work in the element's OWN rotated frame. The pointer delta is
 * un-rotated into that frame, the edges move there, and then the centre is
 * corrected so the opposite edge stays visually pinned. Doing it in screen
 * space instead makes a rotated box drift and shear as you drag.
 */
export function resizeRotated(
  origin: Box,
  rotation: number,
  handle: HandleId,
  dxScreen: number,
  dyScreen: number,
  keepAspect = false,
): Box {
  // Un-rotate the delta into the element's local axes.
  const c = Math.cos(rad(-rotation)), s = Math.sin(rad(-rotation));
  let dx = dxScreen * c - dyScreen * s;
  let dy = dxScreen * s + dyScreen * c;

  const east = handle.includes("e"), west = handle.includes("w");
  const south = handle.includes("s"), north = handle.includes("n");

  if (keepAspect && (east || west) && (north || south)) {
    // Drive both axes from the larger movement so the drag feels stable.
    const ratio = origin.h / origin.w;
    if (Math.abs(dx) > Math.abs(dy)) dy = (east === south ? dx : -dx) * ratio;
    else dx = (east === south ? dy : -dy) / ratio;
  }

  let w = origin.w + (east ? dx : 0) - (west ? dx : 0);
  let h = origin.h + (south ? dy : 0) - (north ? dy : 0);

  // Clamp, and zero the delta that caused it so the pinned edge can't creep.
  if (w < MIN) { dx = west ? origin.w - MIN : MIN - origin.w; w = MIN; }
  if (h < MIN) { dy = north ? origin.h - MIN : MIN - origin.h; h = MIN; }

  // The unrotated top-left moves by half the size change on each dragged axis;
  // the centre then shifts by that amount rotated back into screen space.
  const localShiftX = (east ? dx : 0) + (west ? dx : 0);
  const localShiftY = (south ? dy : 0) + (north ? dy : 0);
  const cc = Math.cos(rad(rotation)), ss = Math.sin(rad(rotation));
  const centre = centreOf(origin);
  const newCentre = {
    x: centre.x + (localShiftX / 2) * cc - (localShiftY / 2) * ss,
    y: centre.y + (localShiftX / 2) * ss + (localShiftY / 2) * cc,
  };

  return { x: newCentre.x - w / 2, y: newCentre.y - h / 2, w, h };
}

/** Angle of a pointer relative to a centre, in degrees, 0 = up. */
export const angleTo = (centre: Point, p: Point): number =>
  (Math.atan2(p.y - centre.y, p.x - centre.x) * 180) / Math.PI + 90;

/* ── Snapping ─────────────────────────────────────────────────────────── */

export interface SnapLine { axis: "x" | "y"; at: number }

export interface SnapResult { dx: number; dy: number; lines: SnapLine[] }

/**
 * Nudges a moving box onto nearby edges/centres of the canvas and other
 * elements. Returns the correction plus the guides to draw.
 *
 * `threshold` is in DESIGN px and is divided by zoom by the caller, so the
 * snap feels the same distance on screen at any zoom level.
 */
export function computeSnap(
  moving: Box,
  others: Box[],
  canvas: { width: number; height: number },
  threshold: number,
): SnapResult {
  const targetsX = [0, canvas.width / 2, canvas.width];
  const targetsY = [0, canvas.height / 2, canvas.height];
  for (const o of others) {
    targetsX.push(o.x, o.x + o.w / 2, o.x + o.w);
    targetsY.push(o.y, o.y + o.h / 2, o.y + o.h);
  }

  const edgesX = [moving.x, moving.x + moving.w / 2, moving.x + moving.w];
  const edgesY = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];

  let bestX: { delta: number; at: number } | null = null;
  let bestY: { delta: number; at: number } | null = null;

  for (const e of edgesX) {
    for (const t of targetsX) {
      const d = t - e;
      if (Math.abs(d) <= threshold && (!bestX || Math.abs(d) < Math.abs(bestX.delta))) {
        bestX = { delta: d, at: t };
      }
    }
  }
  for (const e of edgesY) {
    for (const t of targetsY) {
      const d = t - e;
      if (Math.abs(d) <= threshold && (!bestY || Math.abs(d) < Math.abs(bestY.delta))) {
        bestY = { delta: d, at: t };
      }
    }
  }

  const lines: SnapLine[] = [];
  if (bestX) lines.push({ axis: "x", at: bestX.at });
  if (bestY) lines.push({ axis: "y", at: bestY.at });
  return { dx: bestX?.delta ?? 0, dy: bestY?.delta ?? 0, lines };
}

export const snapToGrid = (v: number, grid: number) => Math.round(v / grid) * grid;
