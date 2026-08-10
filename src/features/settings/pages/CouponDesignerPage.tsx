import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Undo2, Redo2, ZoomIn, ZoomOut, Eye, Save, Download } from "lucide-react";
import api from "../../../services/api/axios";
import { useAppSelector } from "../../../hooks/useAppRedux";
import { useStatusOverlay } from "../../../hooks/useStatusOverlay";
import {
  COUPON_DESIGN,
  type CouponDesignDetail,
  type ExportDesignPayload,
  type ExportDesignResult,
} from "../../../services/api/endpoints/couponDesign.endpoints";
import { COUPON } from "../../../services/api/endpoints/coupon.endpoints";
import { BRAND_KIT, type BrandKit } from "../../../services/api/endpoints/brandKit.endpoints";
import {
  canUndo, canRedo, editorReducer, initialEditorState,
} from "../designer/core/editorReducer";
import { PRESETS, type DesignDoc, type ImageElement } from "../designer/core/schema";
import { printDesign, resolveTokens } from "../designer/core/renderHtml";
import { regenerateCode } from "../designer/core/codes";
import DesignCanvas from "../designer/DesignCanvas";
import PropertyPanel from "../designer/PropertyPanel";
import AssetPanel from "../designer/AssetPanel";
// Self-hosted WOFF2, not a Google Fonts <link>: the print window and the
// headless exporter both need these to resolve with no network, and a missing
// face substitutes silently — the export would look fine to the code and wrong
// to the customer.
import "@fontsource/great-vibes";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/cinzel/400.css";
import "@fontsource/cinzel/700.css";
import "@fontsource/bebas-neue";
import "@fontsource/dancing-script/400.css";
import "@fontsource/dancing-script/700.css";
import "../styles/CouponDesignerPage.scss";

/**
 * Coupon Designer.
 *
 * Three-panel editor: asset sidebar, canvas, properties. Drag, rotate,
 * 8-handle resize, multi-select, snapping, align/distribute, undo/redo,
 * autosave, and server-side export to PNG/JPEG/PDF at 72/150/300 DPI plus
 * printable multi-up A4 sheets with crop marks.
 */

const AUTOSAVE_MS = 2500;

const COUPONS_PATH = "/dashboard/settings/coupons";

/**
 * Reached from Settings → Coupons via the Design button, and returns there.
 * Routed at /dashboard/settings/coupon-designer so it keeps a Settings URL,
 * but rendered OUTSIDE SettingsLayout — a three-panel editor needs the full
 * viewport.
 */
const CouponDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  // ?coupon=<id> is set when the editor is opened from a specific coupon in
  // Settings → Coupons. It's what the design gets attached to, and where the
  // {{CouponCode}} / {{Discount}} / {{ExpiryDate}} values come from.
  const [searchParams] = useSearchParams();
  const couponId = searchParams.get("coupon");
  const salon = useAppSelector((s) => s.salon.currentSalon) as Record<string, unknown> | null;
  const { showSuccess, showError, overlay } = useStatusOverlay();
  const [coupon, setCoupon] = useState<Record<string, unknown> | null>(null);
  const [coupons, setCoupons] = useState<Record<string, unknown>[]>([]);
  const [brand, setBrand] = useState<BrandKit | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const [state, dispatch] = useReducer(editorReducer, undefined, () => initialEditorState());
  const [designId, setDesignId] = useState<string | null>(id ?? null);
  const [name, setName] = useState("Untitled design");
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  /* ── Sample token values ────────────────────────────────────────────
   * Design-time preview uses real salon data plus a synthetic coupon, so the
   * layout is laid out against realistic string lengths rather than the raw
   * {{tokens}}, which are always shorter than the values that replace them.
   * ────────────────────────────────────────────────────────────────── */
  const sampleValues = useMemo<Record<string, string>>(() => {
    const fmtDate = (raw: unknown) => {
      if (!raw) return "31 Dec 2026";
      try {
        return new Date(String(raw)).toLocaleDateString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
        });
      } catch { return String(raw); }
    };
    const discount = coupon
      ? coupon.type === "percentage"
        ? `${Number(coupon.value)}% OFF`
        : `₹${Number(coupon.value)} OFF`
      : "20% OFF";

    return {
      SalonName: brand?.salon_name || (salon?.business_name as string) || "Your Salon",
      SalonPhone: brand?.phone || (salon?.phone as string) || "+91 90000 00000",
      SalonAddress: brand?.address || (salon?.address as string) || "123 High Street",
      SalonWebsite: brand?.website || (salon?.website_url as string) || "yoursalon.com",
      Tagline: brand?.tagline || "Look good, feel better",
      Instagram: brand?.instagram || "@yoursalon",
      Facebook: brand?.facebook || "/yoursalon",
      WhatsApp: brand?.whatsapp_number || "+91 90000 00000",
      // Real coupon values when one is attached; otherwise a realistic sample
      // so the layout is designed against believable string lengths.
      CouponCode: (coupon?.code as string) || "SAVE20",
      Discount: discount,
      MinOrder: coupon ? `₹${Number(coupon.min_order_amount ?? 0)}` : "₹999",
      ExpiryDate: coupon ? fmtDate(coupon.expires_at) : "31 Dec 2026",
    };
  }, [salon, coupon, brand]);

  // Brand kit drives {{Tagline}}, {{Instagram}} and friends, and overrides the
  // salon fallbacks when set.
  useEffect(() => {
    let cancelled = false;
    api.get(BRAND_KIT.BASE)
      .then((r) => { if (!cancelled) setBrand(r.data?.data ?? r.data); })
      .catch(() => { /* tokens fall back to salon values */ });
    return () => { cancelled = true; };
  }, []);

  const bookingUrl = (salon?.website_url as string) || "https://salonox.app";

  const resolveText = useCallback(
    (raw: string) => resolveTokens(raw, sampleValues).text,
    [sampleValues],
  );

  /**
   * Keep QR/barcode images in step with the attached coupon.
   *
   * They're baked to a data URI so the server renderer needs no encoder, but
   * that means the symbol is frozen at the moment it was inserted. Without this
   * effect, switching the design to another coupon updates the {{CouponCode}}
   * text while the bars keep the old code — the card would read one code and
   * scan as another, which is worse than either being wrong on its own.
   */
  const docRef = useRef(state.doc);
  docRef.current = state.doc;

  // Keyed on WHICH generators exist, not on the doc: depending on the element
  // list would re-run this on every drag frame and regenerate a QR 60×/second.
  const generatorKey = useMemo(
    () => state.doc.elements
      .filter((el): el is ImageElement => el.type === "image" && !!el.generator)
      .map((el) => `${el.id}:${el.generator!.kind}:${el.generator!.source}:${el.generator!.format ?? ""}`)
      .join("|"),
    [state.doc.elements],
  );

  useEffect(() => {
    if (!generatorKey) return;
    let cancelled = false;
    (async () => {
      const srcById: Record<string, string> = {};
      for (const el of docRef.current.elements) {
        if (el.type !== "image" || !el.generator) continue;
        const src = await regenerateCode(el.generator, {
          CouponCode: sampleValues.CouponCode,
          BookingUrl: bookingUrl,
        });
        // "" means the payload can't be encoded in that symbology — keep the
        // existing image rather than blanking the element.
        if (src && src !== el.src) srcById[el.id] = src;
      }
      if (!cancelled && Object.keys(srcById).length > 0) {
        dispatch({ type: "syncGenerated", srcById });
      }
    })();
    return () => { cancelled = true; };
  }, [generatorKey, sampleValues.CouponCode, bookingUrl, dispatch]);

  /* ── Load ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(COUPON_DESIGN.BY_ID(id));
        const design: CouponDesignDetail = res.data?.data ?? res.data;
        if (cancelled) return;
        setName(design.name);
        dispatch({ type: "load", doc: design.doc as DesignDoc });
      } catch {
        if (!cancelled) showError("Could not open that design");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // The salon's coupons, for the toolbar picker. Loaded once — the designer is
  // now the front door to Settings → Coupons, so the list has to live here
  // rather than only on the management page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(COUPON.MINE);
        const list: Record<string, unknown>[] = res.data?.data ?? res.data ?? [];
        if (cancelled) return;
        setCoupons(list);
        // Tokens preview with the attached coupon's real values when one is
        // selected; otherwise sample values keep the layout realistic.
        const found = couponId ? list.find((c) => String(c.id) === String(couponId)) : null;
        setCoupon(found ?? null);
      } catch { /* keep sample values */ }
    })();
    return () => { cancelled = true; };
  }, [couponId]);

  /* ── Save ─────────────────────────────────────────────────────────── */
  const save = useCallback(async (silent = false) => {
    setSaving(true);
    const payload = {
      name,
      preset: state.doc.preset,
      width_px: state.doc.canvas.width,
      height_px: state.doc.canvas.height,
      doc: state.doc,
      // Only sent when the editor was opened from a coupon, so re-saving a
      // standalone design can't accidentally clear an existing attachment.
      ...(couponId ? { coupon_id: couponId } : {}),
    };
    try {
      if (designId) {
        await api.patch(COUPON_DESIGN.BY_ID(designId), payload);
      } else {
        const res = await api.post(COUPON_DESIGN.BASE, payload);
        const created: CouponDesignDetail = res.data?.data ?? res.data;
        setDesignId(created.id);
        // Put the new id in the URL so a refresh reopens the same design
        // instead of silently starting a second one. The coupon param is kept
        // so token previews survive the refresh too.
        const q = couponId ? `?coupon=${couponId}` : "";
        window.history.replaceState(null, "", `/dashboard/settings/coupon-designer/${created.id}${q}`);
      }
      dispatch({ type: "markSaved" });
      if (!silent) showSuccess("Design saved");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      showError(e?.response?.data?.error?.message ?? e?.response?.data?.message ?? "Could not save the design");
    } finally {
      setSaving(false);
    }
  }, [designId, name, state.doc, showSuccess, showError]);

  // Autosave. Keyed on the doc so it only fires after an actual change, and
  // debounced so a drag doesn't produce a request per frame.
  const dirtyRef = useRef(state.dirty);
  dirtyRef.current = state.dirty;
  useEffect(() => {
    if (!state.dirty || loading) return;
    const t = setTimeout(() => { if (dirtyRef.current) save(true); }, AUTOSAVE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.doc, state.dirty, loading]);

  /* ── Keyboard ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Never hijack keys while the user is typing in a property field.
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
        return;
      }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); save(); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); dispatch({ type: "duplicateSelected" }); return; }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedIds.length) { e.preventDefault(); dispatch({ type: "removeSelected" }); }
        return;
      }
      // Arrow nudge: 1px, or 10px with shift.
      const step = e.shiftKey ? 10 : 1;
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      const d = deltas[e.key];
      if (d && state.selectedIds.length === 1) {
        e.preventDefault();
        const el = state.doc.elements.find((x) => x.id === state.selectedIds[0]);
        if (el && !el.locked) {
          dispatch({ type: "updateElement", id: el.id, patch: { x: el.x + d[0], y: el.y + d[1] } });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedIds, state.doc.elements, save]);

  // Close the export menu when clicking away from it.
  useEffect(() => {
    if (!showExport) return;
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showExport]);

  // Warn before losing unsaved work.
  useEffect(() => {
    if (!state.dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.dirty]);

  /* ── Actions ──────────────────────────────────────────────────────── */
  const onPreview = () => printDesign(state.doc, sampleValues, name);

  /**
   * Server-side export. Saves first when needed — the renderer reads the
   * stored doc, so exporting an unsaved design would silently export the
   * previous version.
   */
  async function runExport(opts: ExportDesignPayload) {
    setShowExport(false);
    let id = designId;
    if (!id || state.dirty) { await save(true); id = designId; }
    if (!id) { showError("Save the design first"); return; }

    setExporting(true);
    try {
      const res = await api.post(COUPON_DESIGN.EXPORT(id), { ...opts, values: sampleValues });
      const out: ExportDesignResult = res.data?.data ?? res.data;
      // A blank where the coupon code should be is worth flagging rather than
      // letting someone print a hundred of them.
      if (out.missingTokens?.length) {
        showError(`Exported, but these fields had no value: ${out.missingTokens.join(", ")}`);
      } else {
        showSuccess(`Exported ${out.fileName}`);
      }
      window.open(out.url, "_blank");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      showError(e?.response?.data?.error?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="dz-loading">Loading design…</div>;

  return (
    <div className="dz-page">
      {overlay}

      {/* ── Top toolbar ─────────────────────────────────────────────── */}
      <header className="dz-topbar">
        <div className="dz-topbar__left">
          <button className="dz-icon-btn" onClick={() => navigate(COUPONS_PATH)} title="Back to Coupons">
            <ArrowLeft size={16} />
          </button>
          <input className="dz-name" value={name} onChange={(e) => setName(e.target.value)} />

          {/* Which coupon this artwork is for. Changing it re-resolves every
              {{token}} against that coupon's real code/discount/expiry. */}
          <select
            className="dz-coupon-select"
            value={couponId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__manage") { navigate("/dashboard/settings/coupons-manage"); return; }
              const base = designId
                ? `/dashboard/settings/coupon-designer/${designId}`
                : "/dashboard/settings/coupon-designer";
              navigate(v ? `${base}?coupon=${v}` : base, { replace: true });
            }}
            title="Coupon this design is for"
          >
            <option value="">No coupon — sample values</option>
            {coupons.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {String(c.code)} · {c.type === "percentage" ? `${Number(c.value)}%` : `₹${Number(c.value)}`}
              </option>
            ))}
            <option value="__manage">Manage coupons…</option>
          </select>

          <span className={`dz-status${state.dirty ? " dz-status--dirty" : ""}`}>
            {saving ? "Saving…" : state.dirty ? "Unsaved" : "Saved"}
          </span>
        </div>

        <div className="dz-topbar__center">
          <button className="dz-icon-btn" disabled={!canUndo(state)} onClick={() => dispatch({ type: "undo" })} title="Undo (Ctrl+Z)">
            <Undo2 size={16} />
          </button>
          <button className="dz-icon-btn" disabled={!canRedo(state)} onClick={() => dispatch({ type: "redo" })} title="Redo (Ctrl+Shift+Z)">
            <Redo2 size={16} />
          </button>
          <span className="dz-divider" />
          <button className="dz-icon-btn" onClick={() => dispatch({ type: "setZoom", zoom: state.zoom - 0.1 })} title="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="dz-zoom">{Math.round(state.zoom * 100)}%</span>
          <button className="dz-icon-btn" onClick={() => dispatch({ type: "setZoom", zoom: state.zoom + 0.1 })} title="Zoom in">
            <ZoomIn size={16} />
          </button>
          <span className="dz-divider" />
          <button
            className={`dz-toggle${state.showGrid ? " dz-toggle--on" : ""}`}
            onClick={() => dispatch({ type: "toggleGrid" })}
            title="Show grid"
          >Grid</button>
          {/* Grid snapping and element snapping are mutually exclusive in
              practice — snapping to a grid line and to a neighbour's edge at
              the same time fights itself, so the canvas prefers the grid. */}
          <button
            className={`dz-toggle${state.snapToGrid ? " dz-toggle--on" : ""}`}
            onClick={() => dispatch({ type: "toggleSnapGrid" })}
            title="Snap to grid"
          >Snap grid</button>
          <button
            className={`dz-toggle${state.snapToElements ? " dz-toggle--on" : ""}`}
            onClick={() => dispatch({ type: "toggleSnapElements" })}
            title="Snap to other elements"
          >Snap</button>
        </div>

        <div className="dz-topbar__right">
          {/* Preview renders the SAME html the export path produces, so a
              mismatch shows up here rather than after downloading. */}
          <button className="dz-btn" onClick={onPreview}><Eye size={14} /> Preview</button>

          {/* Server-side export. Needs a saved design, since the renderer
              reads the stored doc rather than trusting the client. */}
          <div className="dz-dd" ref={exportRef}>
            <button
              className="dz-btn"
              disabled={exporting}
              onClick={() => (designId ? setShowExport((v) => !v) : save().then(() => setShowExport(true)))}
            >
              <Download size={14} /> {exporting ? "Exporting…" : "Export"}
            </button>
            {showExport && (
              <div className="dz-dd__menu">
                <p className="dz-dd__label">Single design</p>
                <button onClick={() => runExport({ format: "png", dpi: 72 })}>PNG · screen (72 dpi)</button>
                <button onClick={() => runExport({ format: "png", dpi: 150 })}>PNG · print (150 dpi)</button>
                <button onClick={() => runExport({ format: "png", dpi: 300 })}>PNG · press (300 dpi)</button>
                <button onClick={() => runExport({ format: "jpeg", dpi: 150 })}>JPEG · 150 dpi</button>
                <button onClick={() => runExport({ format: "pdf" })}>PDF · vector text</button>
                <p className="dz-dd__label">Printable A4 sheet</p>
                {([2, 4, 8, 12] as const).map((n) => (
                  <button key={n} onClick={() => runExport({ format: "pdf", perPage: n, cropMarks: true })}>
                    {n} per page · with crop marks
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="dz-btn dz-btn--primary" disabled={saving} onClick={() => save()}>
            <Save size={14} /> Save
          </button>
        </div>
      </header>

      <div className="dz-body">
        {/* ── Left sidebar ──────────────────────────────────────────── */}
        <AssetPanel
          state={state}
          dispatch={dispatch}
          designName={name}
          onRename={setName}
          couponCode={sampleValues.CouponCode}
          bookingUrl={bookingUrl}
          couponAttached={!!coupon?.code}
        />

        <DesignCanvas state={state} dispatch={dispatch} resolveText={resolveText} />

        <PropertyPanel state={state} dispatch={dispatch} />
      </div>

      {/* Status bar: read-only facts about the document. Alignment stays in the
          properties panel, because aligning is an action on a selection, not a
          state to report. */}
      <footer className="dz-statusbar">
        <span>{Math.round(state.zoom * 100)}%</span>
        <span>{state.doc.canvas.width} × {state.doc.canvas.height} px</span>
        <span>{PRESETS.find((p) => p.id === state.doc.preset)?.label ?? state.doc.preset}</span>
        <span>{state.doc.elements.length} element{state.doc.elements.length === 1 ? "" : "s"}</span>
        <span>{state.selectedIds.length > 0 ? `${state.selectedIds.length} selected` : "Nothing selected"}</span>
        <span className={state.dirty ? "dz-statusbar__dirty" : ""}>{state.dirty ? "Unsaved changes" : "All changes saved"}</span>
      </footer>
    </div>
  );
};

export default CouponDesignerPage;
