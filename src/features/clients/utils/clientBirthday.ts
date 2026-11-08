/** A birthday has a month and day even when the client did not give a year. */
export function clientBirthdayLabel(value: string | null | undefined): string {
  if (!value) return "Not added";
  const [month, day] = value.split("-").map(Number);
  const date = new Date(2000, month - 1, day);
  if (!month || !day || date.getMonth() !== month - 1 || date.getDate() !== day) return "Not added";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
