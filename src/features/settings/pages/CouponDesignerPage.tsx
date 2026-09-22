import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Undo2, Redo2, ZoomIn, ZoomOut, Eye, Download, Check, Save as SaveIcon } from "lucide-react";
import api from "../../../services/api/axios";
import { API_ORIGIN } from "../../../services/api/baseUrl";
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
import {
  COUPON_SIZE_PRESETS,
  resolveCouponSize,
  MAX_COUPON_QUANTITY,
  type CouponSizeId,
  type CouponSizeUnit,
} from "../utils/couponPrintSheet";
import { printDesign, resolveTokens, showExportedFile } from "../designer/core/renderHtml";
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
 * an explicit Save button (Ctrl+S), and server-side export to PNG/JPEG/PDF
 * at 72/150/300 DPI plus printable multi-up A4 sheets with crop marks.
 */

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
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sizePickerRef = useRef<HTMLDivElement>(null);
  // Download's own size picker — same Small/Medium/Large/Custom concept as
  // the Print Coupon modal, no default selection (matches that modal's own
  // "must choose" behaviour rather than silently assuming one).
  const [downloadSizeId, setDownloadSizeId] = useState<CouponSizeId | null>(null);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [customUnit, setCustomUnit] = useState<CouponSizeUnit>("in");
  const [sizeError, setSizeError] = useState("");
  // How many total copies, across as many A4 pages as it takes — same
  // MAX_QUANTITY/validation shape as the Print Coupon modal's own quantity
  // field, default 1 (a single page's worth once resolved, see
  // handleDownload/renderSheet's "never below perPage" floor).
  const [downloadQty, setDownloadQty] = useState("1");
  const [qtyError, setQtyError] = useState("");

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
    if (!showSizePicker) return;
    const onDown = (e: MouseEvent) => {
      if (sizePickerRef.current && !sizePickerRef.current.contains(e.target as Node)) setShowSizePicker(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showSizePicker]);

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
  async function runExport(opts: ExportDesignPayload, popup: Window | null) {
    setShowSizePicker(false);
    let id = designId;
    if (!id || state.dirty) { await save(true); id = designId; }
    if (!id) { showError("Save the design first"); popup?.close(); return; }

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
      // out.url is a path on the BACKEND's own /uploads static mount
      // (coupon-designs.controller.ts deliberately returns it unprefixed —
      // see its comment), not the frontend's origin — needs API_ORIGIN or a
      // frontend/backend split deploy resolves it against whatever page
      // we're on and 404s into the SPA's own fallback route.
      //
      // Fills the tab opened SYNCHRONOUSLY back in handleDownload(), not a
      // fresh window.open() here — calling window.open() only after this
      // await has already resolved runs outside the original click's "user
      // activation" window, so Chromium browsers (Brave especially) silently
      // block it with no error at all. Writing into an already-open tab has
      // no such restriction.
      const fileUrl = `${API_ORIGIN}${out.url}`;
      if (popup) showExportedFile(popup, fileUrl, out.fileName);
      else window.open(fileUrl, "_blank"); // popup was itself blocked — best effort
      setDownloadSizeId(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      showError(e?.response?.data?.error?.message ?? "Export failed");
      popup?.close();
    } finally {
      setExporting(false);
    }
  }

  // Resolves whichever size (and quantity) is currently selected, then runs
  // the same runExport() the old format/dpi menu used — just always with
  // format: "pdf", a sizeMm instead of perPage, and however many total
  // copies were asked for (spanning as many A4 pages as that takes — see
  // design-render.ts's renderSheet()). Mirrors the Print Coupon modal's own
  // validate-then-resolve shape (couponPrintSheet.ts's resolveCouponSize) so
  // the two "pick a size" UIs behave identically.
  function handleDownload() {
    let ok = true;
    if (!downloadSizeId) { setSizeError("Please select a coupon size."); ok = false; }
    else setSizeError("");

    const qtyTrimmed = downloadQty.trim();
    let quantity = 1;
    if (qtyTrimmed === "") {
      setQtyError("Please enter the number of coupons to download.");
      ok = false;
    } else if (!/^\d+$/.test(qtyTrimmed)) {
      setQtyError("Please enter a valid number of coupons.");
      ok = false;
    } else {
      quantity = parseInt(qtyTrimmed, 10);
      if (quantity === 0) {
        setQtyError("Number of coupons must be at least 1.");
        ok = false;
      } else if (quantity > MAX_COUPON_QUANTITY) {
        setQtyError(`Number of coupons cannot exceed ${MAX_COUPON_QUANTITY}.`);
        ok = false;
      } else {
        setQtyError("");
      }
    }

    if (!ok || !downloadSizeId) return;
    const resolved = resolveCouponSize({
      sizeId: downloadSizeId,
      customWidth,
      customHeight,
      customUnit,
    });
    if (!resolved) { setSizeError("Please enter a valid coupon width and height."); return; }
    // Opened here, synchronously, still inside the click's own call stack —
    // see runExport()'s comment on why this can't be deferred until after
    // the export request resolves without the browser silently blocking it.
    const popup = window.open("", "_blank");
    runExport({
      format: "pdf",
      sizeMm: { width: resolved.widthMm, height: resolved.heightMm },
      quantity,
    }, popup);
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

          <button
            className="dz-btn dz-btn--primary"
            disabled={saving || !state.dirty}
            onClick={() => save()}
            title="Save (Ctrl+S)"
          >
            <SaveIcon size={14} /> {saving ? "Saving…" : state.dirty ? "Save" : "Saved"}
          </button>
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

          {/* Server-side export, always PDF at a real physical coupon size —
              same Small/Medium/Large/Custom concept as the Print Coupon
              modal (couponPrintSheet.ts), tiled as many-per-A4-page as
              actually fit (cellsForSize() on the backend). No separate Save
              button any more: autosave (above) already keeps designId/doc
              current, and runExport() itself saves first if anything's still
              dirty — Download always has a saved design to render from. */}
          <div className="dz-dd" ref={sizePickerRef}>
            <button
              className="dz-btn dz-btn--primary"
              disabled={exporting}
              onClick={() => setShowSizePicker((v) => !v)}
            >
              <Download size={14} /> {exporting ? "Downloading…" : "Download"}
            </button>
            {showSizePicker && (
              <div className="dz-dd__menu dz-dd__menu--size">
                <p className="dz-dd__label">Number of Coupons</p>
                <div className="dz-qty-row">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="dz-qty-input"
                    value={downloadQty}
                    onChange={(e) => { setDownloadQty(e.target.value.replace(/[^\d]/g, "")); setQtyError(""); }}
                    placeholder="1"
                  />
                  <span className="dz-qty-hint">1–{MAX_COUPON_QUANTITY}, across as many pages as it takes</span>
                </div>
                {qtyError && <p className="dz-dd__error">{qtyError}</p>}

                <p className="dz-dd__label">Coupon Size</p>
                {COUPON_SIZE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`dz-size-opt${downloadSizeId === p.id ? " dz-size-opt--selected" : ""}`}
                    onClick={() => { setDownloadSizeId(p.id); setSizeError(""); }}
                  >
                    {downloadSizeId === p.id && <Check size={12} />}
                    <span>{p.label}</span>
                    <span className="dz-size-opt__dims">{p.widthIn} × {p.heightIn} in</span>
                  </button>
                ))}
                <button
                  className={`dz-size-opt${downloadSizeId === "custom" ? " dz-size-opt--selected" : ""}`}
                  onClick={() => { setDownloadSizeId("custom"); setSizeError(""); }}
                >
                  {downloadSizeId === "custom" && <Check size={12} />}
                  <span>Custom</span>
                  <span className="dz-size-opt__dims">User-defined</span>
                </button>

                {downloadSizeId === "custom" && (
                  <div className="dz-custom-size">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Width"
                      value={customWidth}
                      onChange={(e) => { setCustomWidth(e.target.value.replace(/[^\d.]/g, "")); setSizeError(""); }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Height"
                      value={customHeight}
                      onChange={(e) => { setCustomHeight(e.target.value.replace(/[^\d.]/g, "")); setSizeError(""); }}
                    />
                    <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value as CouponSizeUnit)}>
                      <option value="in">inch</option>
                      <option value="mm">mm</option>
                    </select>
                  </div>
                )}

                {sizeError && <p className="dz-dd__error">{sizeError}</p>}

                <button className="dz-btn dz-btn--primary dz-dd__confirm" disabled={exporting} onClick={handleDownload}>
                  {exporting ? "Downloading…" : "Download PDF"}
                </button>
              </div>
            )}
          </div>
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
