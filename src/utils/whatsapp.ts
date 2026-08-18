/** wa.me deep link for a client's phone. Defaults to India's country code
 *  (91) when none is known — same fallback ClientHistoryDetail.tsx's own
 *  WhatsApp button uses, since client-scoped data doesn't always carry a
 *  separate country code field. Shared across features (booking receipts,
 *  dashboard birthday wishes, ...) — every wa.me link in the app should go
 *  through this, not a one-off reimplementation. */
export function buildClientWhatsAppLink(phone?: string | null, countryCode?: string | null): string | null {
  const pn = (phone || "").replace(/[^0-9]/g, "");
  if (!pn) return null;
  // A bare local mobile number (≤10 digits) has no country code attached —
  // prepend one. Anything longer is already carrying a country code (some
  // client records store the phone with it baked in) — don't double it up.
  if (pn.length > 10) return `https://wa.me/${pn}`;
  const cc = (countryCode || "").replace(/[^0-9]/g, "") || "91";
  return `https://wa.me/${cc}${pn}`;
}
