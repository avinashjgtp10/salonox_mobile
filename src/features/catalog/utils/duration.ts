// Service durations are stored as whole minutes (services.duration_minutes) and
// that does not change here — only how they're entered and displayed.
//
// An hours-only representation was considered and rejected: on dev only 181 of
// 1,520 services are a whole number of hours. The single most common duration is
// 30 minutes (1,047 services), and 10/20/40/45/75-minute services all exist, so
// hours alone would force decimals like 0.5 for the overwhelmingly common case.

/** Split stored minutes into the hours + minutes pair the form edits. */
export const splitDuration = (totalMinutes: number): { hours: number; minutes: number } => {
  const safe = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
};

/** Recombine the form's hours + minutes back into the stored total. */
export const joinDuration = (hours: number, minutes: number): number =>
  Math.max(0, Math.floor(Number(hours) || 0)) * 60 +
  Math.max(0, Math.floor(Number(minutes) || 0));

/**
 * Human-readable duration, hours-first: 120 → "2 hr", 90 → "1 hr 30 min",
 * 30 → "30 min". Sub-hour durations stay in minutes rather than becoming
 * "0 hr 30 min", which reads worse and is the majority of the catalogue.
 */
export const formatDuration = (totalMinutes: number): string => {
  const { hours, minutes } = splitDuration(totalMinutes);
  if (hours === 0 && minutes === 0) return "—";
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
};
