/**
 * Editor state + undo/redo.
 *
 * Deliberately NOT in Redux: the doc mutates at ~60fps while dragging, and the
 * store is wrapped in redux-persist — every pointer-move would hit
 * serialisation. This lives in a route-local useReducer instead; only the
 * *list* of saved designs belongs in a slice.
 *
 * History is bounded full snapshots rather than inverse operations. A design
 * doc is a few KB, so 50 snapshots is well under a megabyte, and snapshots are
 * far harder to get wrong than a set of paired do/undo operations.
 */

import {
  createEmptyDoc,
  getPreset,
  type DesignDoc,
  type DesignElement,
  type PresetId,
} from "./schema";

const HISTORY_LIMIT = 50;

export interface EditorState {
  doc: DesignDoc;
  selectedIds: string[];
  past: DesignDoc[];
  future: DesignDoc[];
  /** True when the doc differs from what was last saved. */
  dirty: boolean;
  zoom: number;
  /** Grid overlay + snap-to-grid, and snapping to other elements. */
  showGrid: boolean;
  snapToGrid: boolean;
  snapToElements: boolean;
  gridSize: number;
  /**
   * True between the first frame of a drag/resize and its `commit`.
   *
   * History must capture the doc as it was BEFORE the gesture, so the snapshot
   * is taken on the first transient frame and suppressed on every frame after.
   * Snapshotting on `commit` instead would store the post-drag state and make
   * undo a no-op.
   */
  gesture: boolean;
}

export type EditorAction =
  | { type: "load"; doc: DesignDoc }
  | { type: "addElement"; element: DesignElement }
  | { type: "updateElement"; id: string; patch: Partial<DesignElement>; transient?: boolean }
  | { type: "removeSelected" }
  | { type: "duplicateSelected" }
  | { type: "select"; ids: string[] }
  | { type: "toggleSelect"; id: string }
  /** Applies the same delta to several elements — a group drag. */
  | { type: "moveMany"; ids: string[]; dx: number; dy: number; transient?: boolean }
  | { type: "align"; edge: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom" }
  | { type: "distribute"; axis: "h" | "v" }
  | { type: "toggleGrid" }
  | { type: "toggleSnapGrid" }
  | { type: "toggleSnapElements" }
  | { type: "reorder"; id: string; direction: "front" | "back" | "forward" | "backward" }
  | { type: "setCanvasBackground"; fill: DesignDoc["canvas"]["background"] }
  | { type: "setPreset"; preset: PresetId }
  /**
   * Replace the src of generated (QR/barcode) images after the attached coupon
   * changes. Deliberately NOT in history: the user didn't do it, so it must not
   * sit between their edits as an undo step.
   */
  | { type: "syncGenerated"; srcById: Record<string, string> }
  | { type: "commit" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "setZoom"; zoom: number }
  | { type: "markSaved" };

export const initialEditorState = (doc?: DesignDoc): EditorState => ({
  doc: doc ?? createEmptyDoc(),
  selectedIds: [],
  past: [],
  future: [],
  dirty: false,
  zoom: 1,
  showGrid: false,
  snapToGrid: false,
  snapToElements: true,
  gridSize: 8,
  gesture: false,
});

/** Pushes the current doc onto history. Redo is cleared — the classic model. */
function pushHistory(state: EditorState): Pick<EditorState, "past" | "future"> {
  const past = [...state.past, state.doc];
  return {
    past: past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past,
    future: [],
  };
}

const withDoc = (state: EditorState, doc: DesignDoc, recordHistory: boolean): EditorState => ({
  ...state,
  ...(recordHistory ? pushHistory(state) : {}),
  doc,
  dirty: true,
});

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "load":
      return { ...initialEditorState(action.doc) };

    case "addElement": {
      const doc = { ...state.doc, elements: [...state.doc.elements, action.element] };
      return { ...withDoc(state, doc, true), selectedIds: [action.element.id] };
    }

    case "updateElement": {
      const elements = state.doc.elements.map((el) =>
        el.id === action.id ? ({ ...el, ...action.patch } as DesignElement) : el,
      );
      const doc = { ...state.doc, elements };

      if (!action.transient) return withDoc(state, doc, true);

      // Mid-gesture. Snapshot only on the FIRST frame — that captures the
      // pre-drag doc, which is what undo needs to restore. Every later frame
      // skips history, so the whole gesture collapses to one undo step.
      if (state.gesture) return { ...state, doc, dirty: true };
      return { ...withDoc(state, doc, true), gesture: true };
    }

    case "removeSelected": {
      if (state.selectedIds.length === 0) return state;
      const doc = {
        ...state.doc,
        elements: state.doc.elements.filter(
          (el) => !state.selectedIds.includes(el.id) || el.locked,
        ),
      };
      return { ...withDoc(state, doc, true), selectedIds: [] };
    }

    case "duplicateSelected": {
      const picked = state.doc.elements.filter((el) => state.selectedIds.includes(el.id));
      if (picked.length === 0) return state;
      const copies = picked.map((el) => ({
        ...el,
        id: `${el.id}_c${Math.random().toString(36).slice(2, 7)}`,
        name: `${el.name} copy`,
        // Offset so the copy is visibly distinct rather than exactly hidden
        // behind the original.
        x: el.x + 16,
        y: el.y + 16,
      })) as DesignElement[];
      const doc = { ...state.doc, elements: [...state.doc.elements, ...copies] };
      return { ...withDoc(state, doc, true), selectedIds: copies.map((c) => c.id) };
    }

    case "select":
      return { ...state, selectedIds: action.ids };

    case "toggleSelect": {
      const has = state.selectedIds.includes(action.id);
      return {
        ...state,
        selectedIds: has
          ? state.selectedIds.filter((x) => x !== action.id)
          : [...state.selectedIds, action.id],
      };
    }

    case "moveMany": {
      // Locked elements stay put even when caught in a group drag, otherwise
      // "locked" would only mean "can't be dragged on its own".
      const elements = state.doc.elements.map((el) =>
        action.ids.includes(el.id) && !el.locked
          ? { ...el, x: Math.round(el.x + action.dx), y: Math.round(el.y + action.dy) }
          : el,
      );
      const doc = { ...state.doc, elements };
      if (!action.transient) return withDoc(state, doc, true);
      if (state.gesture) return { ...state, doc, dirty: true };
      return { ...withDoc(state, doc, true), gesture: true };
    }

    case "align": {
      const picked = state.doc.elements.filter((el) => state.selectedIds.includes(el.id) && !el.locked);
      if (picked.length === 0) return state;

      // One element aligns to the canvas; several align to each other. That's
      // what every design tool does, and it's what people expect when they
      // select a single title and press "centre".
      const bounds = picked.length === 1
        ? { x: 0, y: 0, w: state.doc.canvas.width, h: state.doc.canvas.height }
        : {
            x: Math.min(...picked.map((e) => e.x)),
            y: Math.min(...picked.map((e) => e.y)),
            w: Math.max(...picked.map((e) => e.x + e.w)) - Math.min(...picked.map((e) => e.x)),
            h: Math.max(...picked.map((e) => e.y + e.h)) - Math.min(...picked.map((e) => e.y)),
          };

      const ids = new Set(picked.map((e) => e.id));
      const elements = state.doc.elements.map((el) => {
        if (!ids.has(el.id)) return el;
        switch (action.edge) {
          case "left":    return { ...el, x: Math.round(bounds.x) };
          case "hcenter": return { ...el, x: Math.round(bounds.x + (bounds.w - el.w) / 2) };
          case "right":   return { ...el, x: Math.round(bounds.x + bounds.w - el.w) };
          case "top":     return { ...el, y: Math.round(bounds.y) };
          case "vcenter": return { ...el, y: Math.round(bounds.y + (bounds.h - el.h) / 2) };
          case "bottom":  return { ...el, y: Math.round(bounds.y + bounds.h - el.h) };
          default:        return el;
        }
      });
      return withDoc(state, { ...state.doc, elements }, true);
    }

    case "distribute": {
      const picked = state.doc.elements
        .filter((el) => state.selectedIds.includes(el.id) && !el.locked)
        .sort((a, b) => (action.axis === "h" ? a.x - b.x : a.y - b.y));
      // Fewer than three has no meaningful "even spacing" — the outer two
      // define the span, so there'd be nothing in between to move.
      if (picked.length < 3) return state;

      const first = picked[0], last = picked[picked.length - 1];
      const span = action.axis === "h"
        ? (last.x + last.w) - first.x
        : (last.y + last.h) - first.y;
      const totalSize = picked.reduce((s, e) => s + (action.axis === "h" ? e.w : e.h), 0);
      const gap = (span - totalSize) / (picked.length - 1);

      const moved = new Map<string, number>();
      let cursor = action.axis === "h" ? first.x : first.y;
      for (const el of picked) {
        moved.set(el.id, Math.round(cursor));
        cursor += (action.axis === "h" ? el.w : el.h) + gap;
      }

      const elements = state.doc.elements.map((el) =>
        moved.has(el.id)
          ? action.axis === "h"
            ? { ...el, x: moved.get(el.id)! }
            : { ...el, y: moved.get(el.id)! }
          : el,
      );
      return withDoc(state, { ...state.doc, elements }, true);
    }

    case "toggleGrid":
      return { ...state, showGrid: !state.showGrid };
    case "toggleSnapGrid":
      return { ...state, snapToGrid: !state.snapToGrid };
    case "toggleSnapElements":
      return { ...state, snapToElements: !state.snapToElements };

    case "reorder": {
      const idx = state.doc.elements.findIndex((el) => el.id === action.id);
      if (idx === -1) return state;
      const elements = [...state.doc.elements];
      const [el] = elements.splice(idx, 1);
      const target =
        action.direction === "front"    ? elements.length
        : action.direction === "back"     ? 0
        : action.direction === "forward"  ? Math.min(elements.length, idx + 1)
        :                                   Math.max(0, idx - 1);
      elements.splice(target, 0, el);
      return withDoc(state, { ...state.doc, elements }, true);
    }

    case "setCanvasBackground":
      return withDoc(
        state,
        { ...state.doc, canvas: { ...state.doc.canvas, background: action.fill } },
        true,
      );

    case "setPreset": {
      const p = getPreset(action.preset);
      const from = state.doc.canvas;
      const sx = p.width / from.width;
      const sy = p.height / from.height;

      // Smart resize: positions scale on their own axis, but SIZE and type
      // scale by the smaller factor so nothing is stretched out of proportion.
      // Square → story would otherwise leave text 1.8x taller than it is wide.
      //
      // This always needs a human review pass afterwards — it is "resize then
      // review", never "one click and done".
      const k = Math.min(sx, sy);
      const elements = state.doc.elements.map((el) => {
        const next = {
          ...el,
          x: Math.round(el.x * sx),
          y: Math.round(el.y * sy),
          w: Math.max(8, Math.round(el.w * k)),
          h: Math.max(8, Math.round(el.h * k)),
        } as DesignElement;
        if (next.type === "text") {
          next.fontSize = Math.max(6, Math.round(next.fontSize * k));
        }
        return next;
      });

      const doc: DesignDoc = {
        ...state.doc,
        preset: action.preset,
        canvas: { ...state.doc.canvas, width: p.width, height: p.height },
        elements,
      };
      return withDoc(state, doc, true);
    }

    case "syncGenerated": {
      const ids = Object.keys(action.srcById);
      if (ids.length === 0) return state;
      const doc = {
        ...state.doc,
        elements: state.doc.elements.map((el) =>
          el.type === "image" && action.srcById[el.id]
            ? { ...el, src: action.srcById[el.id] }
            : el,
        ),
      };
      // dirty, so the refreshed symbol gets saved, but no history entry.
      return { ...state, doc, dirty: true };
    }

    case "commit":
      // Ends a gesture. Deliberately does NOT touch history — the snapshot was
      // already taken on the gesture's first frame.
      return state.gesture ? { ...state, gesture: false } : state;

    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        doc: previous,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
        dirty: true,
        // An undo mid-gesture would otherwise leave the flag stuck on and
        // swallow the next drag's snapshot.
        gesture: false,
        // Selection may reference elements that no longer exist in `previous`.
        selectedIds: state.selectedIds.filter((id) =>
          previous.elements.some((el) => el.id === id),
        ),
      };
    }

    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        doc: next,
        past: [...state.past, state.doc],
        future: state.future.slice(1),
        dirty: true,
        gesture: false,
        selectedIds: state.selectedIds.filter((id) =>
          next.elements.some((el) => el.id === id),
        ),
      };
    }

    case "setZoom":
      return { ...state, zoom: Math.min(4, Math.max(0.1, action.zoom)) };

    case "markSaved":
      return { ...state, dirty: false };

    default:
      return state;
  }
}

/* ── Selectors ────────────────────────────────────────────────────────── */

export const selectedElements = (s: EditorState): DesignElement[] =>
  s.doc.elements.filter((el) => s.selectedIds.includes(el.id));

/** The single selected element, or null when 0 or >1 are selected. */
export const soleSelected = (s: EditorState): DesignElement | null => {
  const picked = selectedElements(s);
  return picked.length === 1 ? picked[0] : null;
};

export const canUndo = (s: EditorState) => s.past.length > 0;
export const canRedo = (s: EditorState) => s.future.length > 0;
