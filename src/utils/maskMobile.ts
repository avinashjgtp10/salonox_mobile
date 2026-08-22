/** Masks a client mobile/phone number for display: keeps the first 2 and
 *  last 2 digits visible and replaces everything in between with "*",
 *  e.g. "9876543210" -> "98******10". The raw value is still what's stored
 *  and sent to the backend/APIs — only call this at render sites (JSX text),
 *  never on values used for click-to-call, WhatsApp links, search/dedupe
 *  matching, or edit forms, since masking is display-only. */
export function maskMobile(value?: string | number | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (str.length <= 4) return str;
  return `${str.slice(0, 2)}${"*".repeat(str.length - 4)}${str.slice(-2)}`;
}
