export type PackageExpiryStatus = "active" | "expiring-soon" | "expired";

// A package with no expiry date at all never expires (e.g. legacy/unlimited packages).
const EXPIRING_SOON_DAYS = 7;

export function getPackageExpiryStatus(expiryDate: string | null | undefined): PackageExpiryStatus {
  if (!expiryDate) return "active";
  const expiryMs = new Date(expiryDate).getTime();
  if (isNaN(expiryMs)) return "active";
  const now = Date.now();
  if (expiryMs < now) return "expired";
  const daysLeft = (expiryMs - now) / (1000 * 60 * 60 * 24);
  return daysLeft <= EXPIRING_SOON_DAYS ? "expiring-soon" : "active";
}

export function isPackageExpired(expiryDate: string | null | undefined): boolean {
  return getPackageExpiryStatus(expiryDate) === "expired";
}

// Same expiry logic applies to memberships (and anything else with a plain
// expiry date) — aliased here so call sites read naturally rather than
// calling a "package"-named helper on membership data.
export const getExpiryStatus = getPackageExpiryStatus;
export const isExpired = isPackageExpired;
