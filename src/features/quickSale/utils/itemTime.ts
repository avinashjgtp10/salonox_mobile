export const localItemTime = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value) return undefined;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
};

export const itemTimeDate = (time: string | undefined, fallback: Date): Date => {
  const result = new Date(fallback);
  const valid = localItemTime(time);
  if (valid) {
    const [hours, minutes] = valid.split(":").map(Number);
    result.setHours(hours, minutes, 0, 0);
  }
  return result;
};

export const itemTimeLabel = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};
