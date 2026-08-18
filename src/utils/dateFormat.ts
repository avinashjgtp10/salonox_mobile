/** App-wide standard date format: DD-MM-YYYY (e.g. 19-07-2026). */
export function formatDateDDMMYYYY(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "—";
  const day   = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year  = d.getFullYear();
  return `${day}-${month}-${year}`;
}
