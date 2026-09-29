// src/features/settings/components/PrintCouponModal.tsx
//
// Opened from Coupon List (a row's print icon) or the Coupon Details panel
// (the "Print Coupon" button next to "Design") — same coupon either way,
// this modal just configures HOW MANY copies, in WHICH template, at WHAT
// size. See couponPrintSheet.ts for why the preview and the real print run
// share one buildCouponSheetHtml() call, and why quantity repeats the same
// coupon code rather than minting new ones.
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Printer, Check } from "lucide-react";
import type { Coupon } from "../../../services/api/endpoints/coupon.endpoints";
import type { Salon } from "../../../types/salon.types";
import {
  COUPON_TEMPLATES,
  COUPON_SIZE_PRESETS,
  resolveCouponSize,
  couponsPerSheet,
  buildCouponSheetHtml,
  MAX_COUPON_QUANTITY,
  type CouponTemplateId,
  type CouponSizeId,
  type CouponSizeUnit,
} from "../utils/couponPrintSheet";
import { generateCouponQrDataUrl } from "../utils/couponQrCode";
import "../styles/PrintCouponModal.scss";

// Shared with the Coupon Designer's own Download quantity field and the
// backend's own per-request ceiling — see MAX_COUPON_QUANTITY's doc comment.
const MAX_QUANTITY = MAX_COUPON_QUANTITY;

interface PrintCouponModalProps {
  coupon: Coupon;
  salon: Salon | null;
  formatAmount: (n: number) => string;
  onClose: () => void;
}

interface FieldErrors {
  quantity?: string;
  template?: string;
  size?: string;
  custom?: string;
}

const PrintCouponModal: React.FC<PrintCouponModalProps> = ({ coupon, salon, formatAmount, onClose }) => {
  const [quantityInput, setQuantityInput] = useState("1");
  // No default template/size — the ticket validates "must select one",
  // which only means something if nothing is pre-selected. Quantity is the
  // one field the ticket itself says defaults to 1.
  const [templateId, setTemplateId] = useState<CouponTemplateId | null>(null);
  const [sizeId, setSizeId] = useState<CouponSizeId | null>(null);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [customUnit, setCustomUnit] = useState<CouponSizeUnit>("in");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [printing, setPrinting] = useState(false);

  // Generated once per coupon (its code doesn't change while this modal is
  // open) — every card in the preview/print sheet reuses this same data URI
  // rather than re-encoding the QR per copy.
  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    let cancelled = false;
    if (!coupon.show_barcode) { setQrDataUrl(""); return; }
    generateCouponQrDataUrl(coupon.code).then((url) => { if (!cancelled) setQrDataUrl(url); });
    return () => { cancelled = true; };
  }, [coupon.code, coupon.show_barcode]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const parseQuantity = (raw: string): number | null => {
    if (!/^\d+$/.test(raw.trim())) return null; // rejects "", "-1", "1.5", "abc"
    return parseInt(raw, 10);
  };

  const resolvedSize = useMemo(
    () => (sizeId ? resolveCouponSize({ sizeId, customWidth, customHeight, customUnit }) : null),
    [sizeId, customWidth, customHeight, customUnit],
  );

  const perSheet = resolvedSize ? couponsPerSheet(resolvedSize) : null;

  // Validates every field and returns the resolved, print-ready values on
  // success — shared by the Preview and Print Coupons buttons so the two can
  // never accept different inputs as "valid".
  function validate(): { quantity: number; templateId: CouponTemplateId; size: NonNullable<typeof resolvedSize> } | null {
    const next: FieldErrors = {};
    const quantity = parseQuantity(quantityInput);
    if (quantityInput.trim() === "") {
      next.quantity = "Please enter the number of coupons to print.";
    } else if (quantity === null) {
      next.quantity = "Please enter a valid number of coupons.";
    } else if (quantity === 0) {
      next.quantity = "Number of coupons must be at least 1.";
    } else if (quantity > MAX_QUANTITY) {
      next.quantity = `Number of coupons cannot exceed ${MAX_QUANTITY}.`;
    }
    if (!templateId) next.template = "Please select a coupon design template.";
    if (!sizeId) {
      next.size = "Please select a coupon size.";
    } else if (!resolvedSize) {
      // sizeId is set but resolution failed — only reachable via Custom
      // (the 3 presets always resolve), so this is the custom-dimension error.
      next.custom = "Please enter a valid coupon width and height.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !templateId || !resolvedSize || quantity === null || quantity < 1) return null;
    return { quantity, templateId, size: resolvedSize };
  }

  // Clears a field's error the moment it's edited, matching the rest of this
  // app's forms (e.g. ClientsListPage/AddMembershipModal) — otherwise a
  // message set by validate() sits there forever even after the user fixes it.
  const clearError = (key: keyof FieldErrors) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const sheetHtml = useMemo(() => {
    if (!templateId || !resolvedSize) return "";
    const quantity = parseQuantity(quantityInput) || 1;
    return buildCouponSheetHtml(coupon, salon, formatAmount, { quantity, templateId, size: resolvedSize }, qrDataUrl);
  }, [coupon, salon, formatAmount, templateId, resolvedSize, quantityInput, qrDataUrl]);

  // Live-updates as soon as template/size/quantity/coupon info change (see
  // sheetHtml above) — matches "the preview should update accordingly".
  // Preview button below re-runs validate() on top of this same content,
  // which is what actually surfaces field errors rather than silently no-op'ing.
  useEffect(() => {
    if (iframeRef.current) iframeRef.current.srcdoc = sheetHtml || "";
  }, [sheetHtml]);

  function handlePreview() {
    validate();
    // Nothing else to do — sheetHtml/the iframe are already current (see the
    // effect above); this button's job is surfacing validation, not
    // re-rendering something that wasn't already live.
  }

  function handlePrint() {
    const resolved = validate();
    if (!resolved) return;
    setPrinting(true);
    try {
      const html = buildCouponSheetHtml(coupon, salon, formatAmount, resolved, qrDataUrl);
      const win = window.open("", "_blank", "width=960,height=860");
      if (!win) { alert("Please allow popups to print the coupon."); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      // Printing only ever opens a print window on the coupon's EXISTING
      // code/discount/etc — no API call here at all, so there is nothing
      // that could touch coupon data or redemption state (see this file's
      // header comment / couponPrintSheet.ts).
      onClose();
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="pcm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pcm-modal" role="dialog" aria-modal="true" aria-label="Print Coupon">
        <div className="pcm-head">
          <h3 className="pcm-title">Print Coupon</h3>
          <button className="pcm-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="pcm-body">
          <div className="pcm-form">
            {/* ── Quantity ── */}
            <div className="pcm-field">
              <label className="pcm-field__label">Number of Coupons to Print <span className="pcm-required">*</span></label>
              <input
                type="text"
                inputMode="numeric"
                className={`pcm-input${errors.quantity ? " pcm-input--error" : ""}`}
                value={quantityInput}
                onChange={(e) => {
                  // Digits only, as typed — parseQuantity() above is the one
                  // place that decides "" / "0" / non-numeric all mean
                  // something different for validation, so this onChange
                  // doesn't try to pre-judge that itself.
                  setQuantityInput(e.target.value.replace(/[^\d]/g, ""));
                  clearError("quantity");
                }}
                placeholder="1"
              />
              {errors.quantity ? (
                <span className="pcm-error">{errors.quantity}</span>
              ) : (
                <div className="pcm-hint">Minimum 1, maximum {MAX_QUANTITY} per print run</div>
              )}
            </div>

            {/* ── Design Template ── */}
            <div className="pcm-field">
              <label className="pcm-field__label">Design Template <span className="pcm-required">*</span></label>
              <div className="pcm-template-grid">
                {COUPON_TEMPLATES.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`pcm-template-card${templateId === t.id ? " pcm-template-card--selected" : ""}`}
                    onClick={() => { setTemplateId(t.id); clearError("template"); }}
                  >
                    {templateId === t.id && (
                      <span className="pcm-template-card__check"><Check size={12} /></span>
                    )}
                    <span className="pcm-template-card__label">{t.label}</span>
                    <span className="pcm-template-card__desc">{t.description}</span>
                  </button>
                ))}
              </div>
              {errors.template && <span className="pcm-error">{errors.template}</span>}
            </div>

            {/* ── Coupon Size ── */}
            <div className="pcm-field">
              <label className="pcm-field__label">Coupon Size <span className="pcm-required">*</span></label>
              <div className="pcm-size-grid">
                {COUPON_SIZE_PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`pcm-size-card${sizeId === p.id ? " pcm-size-card--selected" : ""}`}
                    onClick={() => { setSizeId(p.id); clearError("size"); }}
                  >
                    <span className="pcm-size-card__label">{p.label}</span>
                    <span className="pcm-size-card__dims">{p.widthIn} × {p.heightIn} inch</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`pcm-size-card${sizeId === "custom" ? " pcm-size-card--selected" : ""}`}
                  onClick={() => { setSizeId("custom"); clearError("size"); }}
                >
                  <span className="pcm-size-card__label">Custom</span>
                  <span className="pcm-size-card__dims">User-defined</span>
                </button>
              </div>
              {errors.size && <span className="pcm-error">{errors.size}</span>}

              {sizeId === "custom" && (
                <div className="pcm-custom-size">
                  <div className="pcm-custom-size__field">
                    <label>Width</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`pcm-input${errors.custom ? " pcm-input--error" : ""}`}
                      value={customWidth}
                      onChange={(e) => { setCustomWidth(e.target.value.replace(/[^\d.]/g, "")); clearError("custom"); }}
                      placeholder="e.g. 4"
                    />
                  </div>
                  <div className="pcm-custom-size__field">
                    <label>Height</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`pcm-input${errors.custom ? " pcm-input--error" : ""}`}
                      value={customHeight}
                      onChange={(e) => { setCustomHeight(e.target.value.replace(/[^\d.]/g, "")); clearError("custom"); }}
                      placeholder="e.g. 2.5"
                    />
                  </div>
                  <div className="pcm-custom-size__field">
                    <label>Unit</label>
                    <select
                      className="pcm-input"
                      value={customUnit}
                      onChange={(e) => { setCustomUnit(e.target.value as CouponSizeUnit); clearError("custom"); }}
                    >
                      <option value="in">inch</option>
                      <option value="mm">mm</option>
                    </select>
                  </div>
                </div>
              )}
              {errors.custom && <span className="pcm-error">{errors.custom}</span>}
              {resolvedSize && perSheet && (
                <div className="pcm-hint">
                  ≈ {perSheet.perPage} coupon{perSheet.perPage === 1 ? "" : "s"} per A4 sheet ({perSheet.columns} × {perSheet.rows})
                </div>
              )}
            </div>
          </div>

          {/* ── Print Preview ── */}
          <div className="pcm-preview">
            <div className="pcm-preview__head">Print Preview</div>
            <div className="pcm-preview__box">
              {templateId && resolvedSize ? (
                <iframe ref={iframeRef} className="pcm-preview__frame" title="Coupon print preview" />
              ) : (
                <div className="pcm-preview__empty">Select a template and size to see the preview</div>
              )}
            </div>
          </div>
        </div>

        <div className="pcm-actions">
          <button className="pcm-btn" onClick={onClose}>Cancel</button>
          <button className="pcm-btn pcm-btn--outline" onClick={handlePreview}>Preview</button>
          <button className="pcm-btn pcm-btn--primary" onClick={handlePrint} disabled={printing}>
            <Printer size={14} /> Print Coupons
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintCouponModal;
