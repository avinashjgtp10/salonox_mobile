export type PackageExpiryStatus = "active" | "expiring-soon" | "expired";

// A package with no expiry date at all never expires (e.g. legacy/unlimited packages).
const EXPIRING_SOON_DAYS = 7;

// Calendar days, not raw milliseconds, between two dates — comparing exact
// timestamps let two memberships/packages that display the identical expiry
// DATE land on opposite sides of the "expiring soon" cutoff purely because of
// what time of day each was purchased. expires_at inherits the exact
// time-of-day from `new Date()` at purchase time (see computeExpiryDate in
// client-memberships.repository.ts) — e.g. two memberships bought hours apart
// on the same day, both "valid for 7 days", land on the same calendar expiry
// date but different timestamps, so one could compute 6.9 days left and the
// other 7.1. Normalizing both sides to midnight before diffing means any two
// items sharing an expiry date always get the same status, independent of
// purchase time or the moment the status happens to be checked.
function daysBetweenCalendarDates(from: Date, to: Date): number {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(to) - startOfDay(from)) / (1000 * 60 * 60 * 24));
}

export function getPackageExpiryStatus(expiryDate: string | null | undefined): PackageExpiryStatus {
  if (!expiryDate) return "active";
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return "active";
  const daysLeft = daysBetweenCalendarDates(new Date(), expiry);
  if (daysLeft < 0) return "expired";
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
