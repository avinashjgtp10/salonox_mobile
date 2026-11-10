import { festivalsForYear, type LunoxFestival } from "@/config/lunoxFestivals";
import { salonDateKey } from "@/utils/salonRegion";

const DAY_MS = 86_400_000;
const QUESTIONS = [
  "Who hasn’t visited in 60 days?",
  "How much revenue did we collect today?",
  "Which services sold the most this month?",
  "How many new clients came this month?",
  "What were today’s no-shows?",
  "How does this month’s revenue compare with last month?",
  "Which products sold best this month?",
  "What is our rebooking rate over the last 30 days?",
  "Suggest a WhatsApp win-back campaign for inactive clients.",
  "Which services should we promote based on this month’s sales?",
  "How many appointments do we have today?",
  "Suggest a WhatsApp welcome campaign for new clients.",
  "Which services brought in the most revenue last week?",
  "Suggest three campaigns to grow repeat visits.",
];

export const suggestionDay = salonDateKey;

export function dailySuggestions(day: string, calendar?: LunoxFestival[], country: string | null = "IN"): string[] {
  const ordinal = Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
  const year = Number(day.slice(0, 4));
  const upcoming = (calendar ?? [...festivalsForYear(year, country), ...festivalsForYear(year + 1, country)])
    .map(festival => ({ ...festival, daysAway: Math.round((Date.parse(`${festival.date}T00:00:00Z`) / DAY_MS) - ordinal) }))
    .filter(festival => festival.daysAway >= 1 && festival.daysAway <= 2)
    .sort((a, b) => a.daysAway - b.daysAway || a.name.localeCompare(b.name));
  if (upcoming.length) {
    const festival = upcoming[0];
    return festival.daysAway === 2 ? [
      `Suggest a WhatsApp campaign for ${festival.name} in two days.`,
      `Which client groups should we target for ${festival.name} on WhatsApp?`,
    ] : [
      `Draft a WhatsApp salon offer for ${festival.name} tomorrow.`,
      `Draft a last-minute ${festival.name} booking reminder for WhatsApp.`,
    ];
  }
  const start = ((ordinal * 2) % QUESTIONS.length + QUESTIONS.length) % QUESTIONS.length;
  return [QUESTIONS[start], QUESTIONS[(start + 1) % QUESTIONS.length]];
}

export function readDismissedSuggestions(raw: string | null, day: string): string[] {
  try {
    const record = JSON.parse(raw ?? "null");
    return record?.day === day && Array.isArray(record.dismissed)
      ? record.dismissed.filter((value: unknown): value is string => typeof value === "string") : [];
  } catch { return []; }
}
