// Matches the web/backend fallback for legacy salons without a saved timezone.
export const DEFAULT_SALON_TIMEZONE = "Asia/Kolkata";

export function validSalonTimezone(value?: string | null): string {
  try {
    if (value) { new Intl.DateTimeFormat("en", { timeZone: value }); return value; }
  } catch { /* Invalid settings must not crash the dashboard. */ }
  return DEFAULT_SALON_TIMEZONE;
}

export function salonDateKey(now = new Date(), timezone?: string | null): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: validSalonTimezone(timezone), year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}

// countryCode can be a telephone dialling code in older registrations. Prefer
// the explicit country name/ISO code; never confuse +1 with a single country.
export function salonCountry(country?: string | null, code?: string | null, timezone?: string | null): string | null {
  const aliases: Record<string, string> = {
    INDIA: "IN", IN: "IN", "UNITED ARAB EMIRATES": "AE", UAE: "AE", AE: "AE",
    "UNITED KINGDOM": "GB", UK: "GB", GB: "GB", "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US", USA: "US", US: "US",
    CANADA: "CA", CA: "CA", AUSTRALIA: "AU", AU: "AU",
  };
  for (const value of [country, code]) {
    const normalized = value?.trim().toUpperCase();
    if (!normalized) continue;
    if (aliases[normalized]) return aliases[normalized];
    if (/^[A-Z]{2}$/.test(normalized)) return normalized;
    // A named, unrecognised country must not inherit an India calendar.
    if (value === country && /[A-Z]/.test(normalized)) return null;
  }
  if (timezone === "Asia/Dubai") return "AE";
  if (timezone === "Asia/Kolkata" || timezone === "Asia/Calcutta") return "IN";
  return null;
}
