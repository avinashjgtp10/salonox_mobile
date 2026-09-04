// GSM 03.38 basic character set — encodes as 1 septet each.
const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
);
// Extended GSM set — encodes as 2 septets each (escape char + the char).
const GSM_EXTENDED = new Set("^{}\\[~]|€\f");

export type SmsEncoding = "GSM-7" | "UCS-2";

export interface SmsSegmentInfo {
  encoding:      SmsEncoding;
  length:        number; // raw character count
  effectiveLength: number; // septet/unit count actually billed
  segments:      number;
  perSegmentLimit: number;
  singleLimit:   number;
}

// Classifies text as GSM-7 (160 chars/segment, 153 if concatenated across
// multiple) or UCS-2/Unicode (70/67) — anything outside the GSM alphabet,
// including emoji, most non-Latin scripts, and critically the ₹ rupee sign
// (not in GSM-7 at all), forces the WHOLE message to Unicode encoding.
export function analyzeSmsText(text: string): SmsSegmentInfo {
  let isGsm = true;
  let effectiveLength = 0;

  for (const ch of text) {
    if (GSM_BASIC.has(ch)) {
      effectiveLength += 1;
    } else if (GSM_EXTENDED.has(ch)) {
      effectiveLength += 2;
    } else {
      isGsm = false;
      break;
    }
  }

  const encoding: SmsEncoding = isGsm ? "GSM-7" : "UCS-2";
  const singleLimit = encoding === "GSM-7" ? 160 : 70;
  const perSegmentLimit = encoding === "GSM-7" ? 153 : 67;
  const effLen = encoding === "GSM-7" ? effectiveLength : text.length;

  const fitsInOne = effLen <= singleLimit;
  const segments = effLen === 0 ? 0 : (fitsInOne ? 1 : Math.ceil(effLen / perSegmentLimit));

  return { encoding, length: text.length, effectiveLength: effLen, segments, perSegmentLimit, singleLimit };
}
