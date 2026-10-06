import { parsePhoneNumberFromString } from "libphonenumber-js";

/** Display-only masking. Keep original numbers for API requests and matching. */
export function maskPhone(value?: string | null, countryCode?: string | null): string {
  const raw = value?.trim();
  if (!raw || raw === "-") return "-";
  // Preserve numbers already masked by the server.
  if (/[*•]/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "-";
  const code = countryCode?.replace(/\D/g, "");
  const candidate = raw.startsWith("+") ? raw : code ? `+${code}${digits.startsWith(code) && digits.length > 10 ? digits.slice(code.length) : digits}` : raw;
  const parsed = parsePhoneNumberFromString(candidate, "IN");
  const national = parsed?.nationalNumber ?? digits;
  const prefix = parsed ? `+${parsed.countryCallingCode} ` : code ? `+${code} ` : "";
  const masked = national.length > 4
    ? `${national.slice(0, 2)}${"*".repeat(national.length - 4)}${national.slice(-2)}`
    : "*".repeat(national.length);
  return `${prefix}${masked}`;
}
