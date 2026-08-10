import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import type { CodeGenerator } from "./schema";

/**
 * QR codes and barcodes, generated in the editor and stored as SVG data URIs.
 *
 * Deliberately baked into the document rather than rendered at export time:
 * the stored design then carries a plain image, so the server renderer needs
 * neither library and the export can never disagree with the canvas. It also
 * keeps them VECTOR in the PDF, unlike a PNG QR which goes soft at press sizes.
 *
 * This also removes the api.qrserver.com dependency used elsewhere in the app —
 * an external image host inside a print pipeline is a silent-failure generator.
 */

const toDataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;

export async function makeQrDataUri(
  text: string,
  opts: { dark?: string; light?: string; margin?: number } = {},
): Promise<string> {
  const svg = await QRCode.toString(text || " ", {
    type: "svg",
    // 4 modules is the quiet zone the QR spec mandates and the library's own
    // default. A narrower one still decodes on a phone but is the first thing
    // to fail on cheap handheld scanners and on a busy printed background.
    margin: opts.margin ?? 4,
    color: { dark: opts.dark ?? "#000000", light: opts.light ?? "#ffffff" },
    errorCorrectionLevel: "M",
  });
  return toDataUri(svg);
}

export type BarcodeFormat = "CODE128" | "EAN13" | "UPC";

/**
 * Re-render a generated symbol from its recipe. Returns "" when the payload
 * can't be encoded, which callers treat as "leave the old image alone" rather
 * than blanking the element.
 */
export async function regenerateCode(
  gen: CodeGenerator,
  values: { CouponCode?: string; BookingUrl?: string },
): Promise<string> {
  const payload = gen.source === "BookingUrl" ? values.BookingUrl : values.CouponCode;
  if (!payload) return "";
  return gen.kind === "qr"
    ? makeQrDataUri(payload)
    : makeBarcodeDataUri(payload, gen.format ?? "CODE128");
}

/**
 * Returns "" when the value can't be encoded in the chosen symbology — EAN13
 * needs exactly 12–13 digits, UPC 11–12. Refusing beats emitting a corrupt
 * symbol, because a barcode that scans as the WRONG code at the till is worse
 * than no barcode at all.
 */
export function makeBarcodeDataUri(
  text: string,
  format: BarcodeFormat = "CODE128",
  opts: { color?: string; background?: string; showText?: boolean } = {},
): string {
  if (!text?.trim()) return "";
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, text.trim(), {
      format,
      lineColor: opts.color ?? "#000000",
      background: opts.background ?? "#ffffff",
      displayValue: opts.showText ?? true,
      // Quiet zone. EAN-13 needs 7 modules clear on the right; at a 2px module
      // that's 14px, and the old margin of 4 left only 2 modules — ZXing
      // refused to read it at all. 10px is the smallest value that decoded.
      margin: 10,
      fontSize: 14,
      valid: (ok: boolean) => { if (!ok) throw new Error("invalid for format"); },
    });
    // JsBarcode sets a literal xmlns attribute on an element that already has
    // the SVG namespace, so XMLSerializer emits xmlns twice. That is a fatal
    // XML well-formedness error, and a data:image/svg+xml URI is parsed as
    // strict XML — the browser would show a broken image rather than a barcode.
    svg.removeAttribute("xmlns");
    return toDataUri(new XMLSerializer().serializeToString(svg));
  } catch {
    return "";
  }
}
