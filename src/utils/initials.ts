// Canonical initials logic — the single source of truth for every avatar
// across the app (Dashboard, Team Members, Calendar, Client Lists, Reports).
// Rules: first letter of first name; first letter of first name + first
// letter of last name when both are present; uppercase; trims/ignores empty
// or whitespace-only fields; empty string (never garbage like "?" or "??")
// when there's nothing to show, so callers can render a default icon instead.

/** Build initials from separate first/last name fields. */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  if (first && last) return (first[0] + last[0]).toUpperCase();
  if (first) return first[0].toUpperCase();
  if (last) return last[0].toUpperCase();
  return "";
}

/** Build initials from a single "First Last" (or "First Middle Last") string
 *  — uses the FIRST and LAST word, not the first two words, so a middle name
 *  doesn't get mistaken for a surname. */
export function getInitialsFromFullName(fullName?: string | null): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
