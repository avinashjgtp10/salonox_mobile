// ISO 3166-1 country list, each mapped to its real primary currency (ISO 4217
// code — matches `code` in src/config/currencies.ts). Used by the Currency
// Settings page: picking a country auto-fills the currency default, but the
// currency dropdown stays independently editable afterward (e.g. a salon in
// India billing in USD is still a valid, intentional combination).
export interface CountryDef {
  code: string;    // ISO 3166-1 alpha-2
  name: string;
  currency: string; // default ISO 4217 currency code for this country
}

export const COUNTRIES: CountryDef[] = [
  { code: "AF", name: "Afghanistan", currency: "AFN" },
  { code: "AL", name: "Albania", currency: "ALL" },
  { code: "DZ", name: "Algeria", currency: "DZD" },
  { code: "AO", name: "Angola", currency: "AOA" },
  { code: "AR", name: "Argentina", currency: "ARS" },
  { code: "AM", name: "Armenia", currency: "AMD" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "AT", name: "Austria", currency: "EUR" },
  { code: "AZ", name: "Azerbaijan", currency: "AZN" },
  { code: "BS", name: "Bahamas", currency: "BSD" },
  { code: "BH", name: "Bahrain", currency: "BHD" },
  { code: "BD", name: "Bangladesh", currency: "BDT" },
  { code: "BB", name: "Barbados", currency: "BBD" },
  { code: "BY", name: "Belarus", currency: "BYN" },
  { code: "BE", name: "Belgium", currency: "EUR" },
  { code: "BZ", name: "Belize", currency: "BZD" },
  { code: "BJ", name: "Benin", currency: "XOF" },
  { code: "BT", name: "Bhutan", currency: "BTN" },
  { code: "BO", name: "Bolivia", currency: "BOB" },
  { code: "BA", name: "Bosnia and Herzegovina", currency: "BAM" },
  { code: "BW", name: "Botswana", currency: "BWP" },
  { code: "BR", name: "Brazil", currency: "BRL" },
  { code: "BN", name: "Brunei", currency: "BND" },
  { code: "BG", name: "Bulgaria", currency: "BGN" },
  { code: "BF", name: "Burkina Faso", currency: "XOF" },
  { code: "BI", name: "Burundi", currency: "BIF" },
  { code: "KH", name: "Cambodia", currency: "KHR" },
  { code: "CM", name: "Cameroon", currency: "XAF" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "CV", name: "Cape Verde", currency: "CVE" },
  { code: "CF", name: "Central African Republic", currency: "XAF" },
  { code: "TD", name: "Chad", currency: "XAF" },
  { code: "CL", name: "Chile", currency: "CLP" },
  { code: "CN", name: "China", currency: "CNY" },
  { code: "CO", name: "Colombia", currency: "COP" },
  { code: "KM", name: "Comoros", currency: "KMF" },
  { code: "CD", name: "Congo (DRC)", currency: "CDF" },
  { code: "CG", name: "Congo (Republic)", currency: "XAF" },
  { code: "CR", name: "Costa Rica", currency: "CRC" },
  { code: "HR", name: "Croatia", currency: "EUR" },
  { code: "CU", name: "Cuba", currency: "CUP" },
  { code: "CY", name: "Cyprus", currency: "EUR" },
  { code: "CZ", name: "Czech Republic", currency: "CZK" },
  { code: "DK", name: "Denmark", currency: "DKK" },
  { code: "DJ", name: "Djibouti", currency: "DJF" },
  { code: "DM", name: "Dominica", currency: "XCD" },
  { code: "DO", name: "Dominican Republic", currency: "DOP" },
  { code: "EC", name: "Ecuador", currency: "USD" },
  { code: "EG", name: "Egypt", currency: "EGP" },
  { code: "SV", name: "El Salvador", currency: "USD" },
  { code: "GQ", name: "Equatorial Guinea", currency: "XAF" },
  { code: "ER", name: "Eritrea", currency: "ERN" },
  { code: "EE", name: "Estonia", currency: "EUR" },
  { code: "SZ", name: "Eswatini", currency: "SZL" },
  { code: "ET", name: "Ethiopia", currency: "ETB" },
  { code: "FJ", name: "Fiji", currency: "FJD" },
  { code: "FI", name: "Finland", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "GA", name: "Gabon", currency: "XAF" },
  { code: "GM", name: "Gambia", currency: "GMD" },
  { code: "GE", name: "Georgia", currency: "GEL" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "GH", name: "Ghana", currency: "GHS" },
  { code: "GR", name: "Greece", currency: "EUR" },
  { code: "GD", name: "Grenada", currency: "XCD" },
  { code: "GT", name: "Guatemala", currency: "GTQ" },
  { code: "GN", name: "Guinea", currency: "GNF" },
  { code: "GW", name: "Guinea-Bissau", currency: "XOF" },
  { code: "GY", name: "Guyana", currency: "GYD" },
  { code: "HT", name: "Haiti", currency: "HTG" },
  { code: "HN", name: "Honduras", currency: "HNL" },
  { code: "HK", name: "Hong Kong", currency: "HKD" },
  { code: "HU", name: "Hungary", currency: "HUF" },
  { code: "IS", name: "Iceland", currency: "ISK" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "ID", name: "Indonesia", currency: "IDR" },
  { code: "IR", name: "Iran", currency: "IRR" },
  { code: "IQ", name: "Iraq", currency: "IQD" },
  { code: "IE", name: "Ireland", currency: "EUR" },
  { code: "IL", name: "Israel", currency: "ILS" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "JM", name: "Jamaica", currency: "JMD" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "JO", name: "Jordan", currency: "JOD" },
  { code: "KZ", name: "Kazakhstan", currency: "KZT" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "KI", name: "Kiribati", currency: "AUD" },
  { code: "KW", name: "Kuwait", currency: "KWD" },
  { code: "KG", name: "Kyrgyzstan", currency: "KGS" },
  { code: "LA", name: "Laos", currency: "LAK" },
  { code: "LV", name: "Latvia", currency: "EUR" },
  { code: "LB", name: "Lebanon", currency: "LBP" },
  { code: "LS", name: "Lesotho", currency: "LSL" },
  { code: "LR", name: "Liberia", currency: "LRD" },
  { code: "LY", name: "Libya", currency: "LYD" },
  { code: "LI", name: "Liechtenstein", currency: "CHF" },
  { code: "LT", name: "Lithuania", currency: "EUR" },
  { code: "LU", name: "Luxembourg", currency: "EUR" },
  { code: "MO", name: "Macau", currency: "MOP" },
  { code: "MG", name: "Madagascar", currency: "MGA" },
  { code: "MW", name: "Malawi", currency: "MWK" },
  { code: "MY", name: "Malaysia", currency: "MYR" },
  { code: "MV", name: "Maldives", currency: "MVR" },
  { code: "ML", name: "Mali", currency: "XOF" },
  { code: "MT", name: "Malta", currency: "EUR" },
  { code: "MR", name: "Mauritania", currency: "MRU" },
  { code: "MU", name: "Mauritius", currency: "MUR" },
  { code: "MX", name: "Mexico", currency: "MXN" },
  { code: "MD", name: "Moldova", currency: "MDL" },
  { code: "MN", name: "Mongolia", currency: "MNT" },
  { code: "ME", name: "Montenegro", currency: "EUR" },
  { code: "MA", name: "Morocco", currency: "MAD" },
  { code: "MZ", name: "Mozambique", currency: "MZN" },
  { code: "MM", name: "Myanmar", currency: "MMK" },
  { code: "NA", name: "Namibia", currency: "NAD" },
  { code: "NP", name: "Nepal", currency: "NPR" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "NZ", name: "New Zealand", currency: "NZD" },
  { code: "NI", name: "Nicaragua", currency: "NIO" },
  { code: "NE", name: "Niger", currency: "XOF" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "KP", name: "North Korea", currency: "KPW" },
  { code: "MK", name: "North Macedonia", currency: "MKD" },
  { code: "NO", name: "Norway", currency: "NOK" },
  { code: "OM", name: "Oman", currency: "OMR" },
  { code: "PK", name: "Pakistan", currency: "PKR" },
  { code: "PA", name: "Panama", currency: "PAB" },
  { code: "PG", name: "Papua New Guinea", currency: "PGK" },
  { code: "PY", name: "Paraguay", currency: "PYG" },
  { code: "PE", name: "Peru", currency: "PEN" },
  { code: "PH", name: "Philippines", currency: "PHP" },
  { code: "PL", name: "Poland", currency: "PLN" },
  { code: "PT", name: "Portugal", currency: "EUR" },
  { code: "QA", name: "Qatar", currency: "QAR" },
  { code: "RO", name: "Romania", currency: "RON" },
  { code: "RU", name: "Russia", currency: "RUB" },
  { code: "RW", name: "Rwanda", currency: "RWF" },
  { code: "WS", name: "Samoa", currency: "WST" },
  { code: "ST", name: "São Tomé and Príncipe", currency: "STN" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR" },
  { code: "SN", name: "Senegal", currency: "XOF" },
  { code: "RS", name: "Serbia", currency: "RSD" },
  { code: "SC", name: "Seychelles", currency: "SCR" },
  { code: "SL", name: "Sierra Leone", currency: "SLE" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "SK", name: "Slovakia", currency: "EUR" },
  { code: "SI", name: "Slovenia", currency: "EUR" },
  { code: "SB", name: "Solomon Islands", currency: "SBD" },
  { code: "SO", name: "Somalia", currency: "SOS" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "KR", name: "South Korea", currency: "KRW" },
  { code: "SS", name: "South Sudan", currency: "SSP" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "LK", name: "Sri Lanka", currency: "LKR" },
  { code: "SD", name: "Sudan", currency: "SDG" },
  { code: "SR", name: "Suriname", currency: "SRD" },
  { code: "SE", name: "Sweden", currency: "SEK" },
  { code: "CH", name: "Switzerland", currency: "CHF" },
  { code: "SY", name: "Syria", currency: "SYP" },
  { code: "TW", name: "Taiwan", currency: "TWD" },
  { code: "TJ", name: "Tajikistan", currency: "TJS" },
  { code: "TZ", name: "Tanzania", currency: "TZS" },
  { code: "TH", name: "Thailand", currency: "THB" },
  { code: "TG", name: "Togo", currency: "XOF" },
  { code: "TO", name: "Tonga", currency: "TOP" },
  { code: "TT", name: "Trinidad and Tobago", currency: "TTD" },
  { code: "TN", name: "Tunisia", currency: "TND" },
  { code: "TR", name: "Turkey", currency: "TRY" },
  { code: "TM", name: "Turkmenistan", currency: "TMT" },
  { code: "UG", name: "Uganda", currency: "UGX" },
  { code: "UA", name: "Ukraine", currency: "UAH" },
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "UY", name: "Uruguay", currency: "UYU" },
  { code: "UZ", name: "Uzbekistan", currency: "UZS" },
  { code: "VU", name: "Vanuatu", currency: "VUV" },
  { code: "VE", name: "Venezuela", currency: "VES" },
  { code: "VN", name: "Vietnam", currency: "VND" },
  { code: "YE", name: "Yemen", currency: "YER" },
  { code: "ZM", name: "Zambia", currency: "ZMW" },
  { code: "ZW", name: "Zimbabwe", currency: "ZWL" },
];

export function getCountryDef(code: string | null | undefined): CountryDef | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

// Countries with ONE time zone, so choosing the country can set the salon's zone directly. (India and the UAE come from COUNTRY_LOCALE
// above.) A country that spans several zones (US, Canada, Australia, Brazil, Russia, Mexico, Indonesia...) is deliberately left out: any
// guess would put some salons' opening and closing hours on the wrong day, so those keep the zone the person already has.
const SINGLE_ZONE_TIMEZONE: Record<string, string> = {
  SA: "Asia/Riyadh", QA: "Asia/Qatar", KW: "Asia/Kuwait", BH: "Asia/Bahrain", OM: "Asia/Muscat",
  PK: "Asia/Karachi", BD: "Asia/Dhaka", LK: "Asia/Colombo", NP: "Asia/Kathmandu",
  SG: "Asia/Singapore", MY: "Asia/Kuala_Lumpur", TH: "Asia/Bangkok", PH: "Asia/Manila", VN: "Asia/Ho_Chi_Minh",
  JP: "Asia/Tokyo", KR: "Asia/Seoul", HK: "Asia/Hong_Kong", CN: "Asia/Shanghai",
  TR: "Europe/Istanbul", JO: "Asia/Amman", LB: "Asia/Beirut", IQ: "Asia/Baghdad", IR: "Asia/Tehran", EG: "Africa/Cairo",
  GB: "Europe/London", IE: "Europe/Dublin", FR: "Europe/Paris", DE: "Europe/Berlin", IT: "Europe/Rome", NL: "Europe/Amsterdam", CH: "Europe/Zurich",
  ZA: "Africa/Johannesburg", KE: "Africa/Nairobi", NG: "Africa/Lagos",
};

/** The IANA time zone to set when this country is chosen, or undefined when it has several zones / we have no data (leave the zone as it is). */
export function timezoneForCountry(code: string | null | undefined): string | undefined {
  const iso = code ? toCountryCode(code) : undefined;
  if (!iso) return undefined;
  if (iso in COUNTRY_LOCALE) return COUNTRY_LOCALE[iso].timezone;
  return SINGLE_ZONE_TIMEZONE[iso];
}

// Words people type to find a country that are not in its name: the usual abbreviation, a nickname, the big cities. A search box that
// matches on the name alone says "No matches" for "dubai" or "uae" even though the country is right there. Lower case; matched as a
// substring, so "abu" finds Abu Dhabi. Used by every country picker through countryMatchesQuery().
const COUNTRY_SEARCH_ALIASES: Record<string, string> = {
  AE: "uae emirates emirati dubai abu dhabi sharjah ajman ras al khaimah fujairah umm al quwain al ain",
  IN: "bharat hindustan mumbai delhi bengaluru bangalore hyderabad chennai kolkata pune ahmedabad",
  SA: "ksa saudi riyadh jeddah mecca makkah medina dammam",
  QA: "doha",
  KW: "kuwait city",
  BH: "manama",
  OM: "muscat",
  US: "usa america united states",
  GB: "uk britain england scotland wales london",
};

/** The alias words for a country as one string (for pickers that build a search string), "" when there are none. */
export const countrySearchAliases = (code: string | null | undefined): string => COUNTRY_SEARCH_ALIASES[String(code ?? "").toUpperCase()] ?? "";

/** True when `query` (already lower-cased) is one of this country's alias words. The caller still checks the name / code / dial code. */
export function countryAliasMatches(code: string | null | undefined, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q || !code) return false;
  return (COUNTRY_SEARCH_ALIASES[String(code).toUpperCase()] ?? "").includes(q);
}

// Default country for salons that haven't set one yet (matches DEFAULT_CURRENCY_CODE = "INR").
export const DEFAULT_COUNTRY_CODE = "IN";

// Sales-tax regime. GST = India (CGST/SGST/IGST, GSTIN, HSN); VAT = single-rate
// tax with a TRN (UAE); NONE = the app shows no country-specific tax wording.
export type TaxRegime = "GST" | "VAT" | "NONE";

export interface CountryLocale {
  timezone: string;       // IANA zone
  taxRegime: TaxRegime;
  taxIdLabel: string;     // label for the salon's tax registration number
  taxName: string;        // short tax name used in labels ("GST", "VAT")
  weekStart: 0 | 1;       // first day of the calendar week: 0 = Sunday (India, and the app's long-standing default), 1 = Monday (UAE)
  upi: boolean;           // whether UPI is offered as a built-in way to pay (an India-only system); other countries add their own methods in Settings > Payment Methods
}

// Only countries with specific handling are listed; every other country falls
// back to NEUTRAL_LOCALE via getCountryLocale().
const COUNTRY_LOCALE: Record<string, CountryLocale> = {
  IN: { timezone: "Asia/Kolkata", taxRegime: "GST", taxIdLabel: "GSTIN", taxName: "GST", weekStart: 0, upi: true },
  AE: { timezone: "Asia/Dubai", taxRegime: "VAT", taxIdLabel: "TRN", taxName: "VAT", weekStart: 1, upi: false },
};

const NEUTRAL_LOCALE: CountryLocale = {
  timezone: "UTC",
  taxRegime: "NONE",
  taxIdLabel: "Tax ID",
  taxName: "Tax",
  weekStart: 0,
  upi: true, // a country we ship no locale for keeps what every salon saw before
};

// Stored salon countries are mostly ISO codes ("IN") but older rows hold names or odd
// casing ("india", "India"); accept both so those salons don't lose their tax regime.
function toCountryCode(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (v.length === 2) return v.toUpperCase();
  const lower = v.toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === lower)?.code;
}

// A missing/unrecognised country resolves to India so existing salons (which have
// no country set) keep today's GST behaviour.
// True when we ship specific locale data (timezone, tax regime) for this country.
export function hasCountryLocale(code: string | null | undefined): boolean {
  const iso = code ? toCountryCode(code) : undefined;
  return !!iso && iso in COUNTRY_LOCALE;
}

export function getCountryLocale(code: string | null | undefined): CountryLocale {
  const iso = code ? toCountryCode(code) : undefined;
  if (!iso) return COUNTRY_LOCALE[DEFAULT_COUNTRY_CODE];
  return COUNTRY_LOCALE[iso] ?? NEUTRAL_LOCALE;
}
