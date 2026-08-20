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
