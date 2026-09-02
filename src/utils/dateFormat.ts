/** App-wide standard date format: DD-MM-YYYY (e.g. 19-07-2026). */
export function formatDateDDMMYYYY(input: Date | string | number | null | undefined, fallback = "—"): string {
  if (input === null || input === undefined || input === "") return fallback;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return fallback;
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/** App-wide standard date+time format: DD-MM-YYYY hh:mm AM/PM. */
export function formatDateTimeDDMMYYYY(input: Date | string | number | null | undefined, fallback = "—"): string {
  if (input === null || input === undefined || input === "") return fallback;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return fallback;
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${formatDateDDMMYYYY(d)} ${String(h).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

/** App-wide standard "time ago" label (notifications, activity feeds, etc.):
 *  "just now" / "X min ago" / "X hr(s) ago" / "X day(s) ago", falling back to
 *  the app's standard DD-MM-YYYY date once something is a week or older —
 *  so a stale item reads as an actual date instead of "365 days ago". */
export function formatTimeAgo(input: Date | string | number | null | undefined, fallback = "—"): string {
  if (input === null || input === undefined || input === "") return fallback;
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return fallback;

  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return formatDateDDMMYYYY(d);
}
