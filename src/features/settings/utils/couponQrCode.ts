// src/features/settings/utils/couponQrCode.ts
//
// Thin wrapper around the already-installed `qrcode` package (same one the
// Coupon Designer's designer/core/codes.ts uses — see that module for why a
// real library beats hand-rolling: true QR needs Reed–Solomon error
// correction, not worth re-deriving here). Unlike the Designer's headless-
// Chromium export, the Print Coupon modal's print window is just a plain
// `window.open()` popup in the SAME browser — so the QR only ever needs to
// be generated ONCE, client-side, as a data URI, then embedded as a plain
// `<img src="...">` in both the live preview and the final print HTML.
// Nothing in the popup window needs to run any JS to produce it.
import QRCode from "qrcode";

/** Renders `text` (the coupon code) as a black-on-white QR PNG data URI.
 *  Resolves to "" on failure rather than throwing — a missing QR image is a
 *  layout gap the caller can skip past; a thrown error would abort the whole
 *  print/preview build over one cosmetic element. */
export async function generateCouponQrDataUrl(text: string): Promise<string> {
  const value = (text ?? "").trim();
  if (!value) return "";
  try {
    return await QRCode.toDataURL(value, {
      margin: 1,
      width: 240,
      color: { dark: "#111827", light: "#ffffff" },
    });
  } catch {
    return "";
  }
}
