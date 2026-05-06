import type { ShiftEntry, StaffMember, ShiftMap } from "./types";

// ── Date helpers ─────────────────────────────────────────────────────────────

export function getSundayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getWeekDates(sunday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function formatColHeader(d: Date): { date: string; day: string } {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return { date: `${dd}-${mm}-${yyyy}`, day: DAY_NAMES[d.getDay()] };
}

export function formatDrawerDate(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function formatNavDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, " ");
}

// ── Time helpers ─────────────────────────────────────────────────────────────

export function calcTotalHours(start: string, end: string): string {
  const parse = (t: string): number => {
    const [timePart, period] = t.split(" ");
    let [h, m] = timePart.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const diff = parse(end) - parse(start);
  if (diff <= 0) return "0 hrs";
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins === 0 ? `${hrs} hrs` : `${hrs} hrs ${mins} mins`;
}

export function generateTimeOptions(): string[] {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const period = h < 12 ? "AM" : "PM";
      const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      opts.push(`${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`);
    }
  }
  return opts;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

export const SEED_STAFF: StaffMember[] = [
  { id: "1", name: "Salon",         initials: "S",  avatarColor: "#6366f1" },
  { id: "2", name: "Sanket",        initials: "SK", avatarColor: "#8b5cf6" },
  { id: "3", name: "Priti",         initials: "P",  avatarColor: "#ec4899" },
  { id: "4", name: "Swapnali",      initials: "SW", avatarColor: "#f59e0b" },
  { id: "5", name: "Nikita Jagdale",initials: "NJ", avatarColor: "#10b981" },
  { id: "6", name: "Nikita Kamble", initials: "NK", avatarColor: "#3b82f6" },
  { id: "7", name: "Nilesh",        initials: "NL", avatarColor: "#6b7280" },
  { id: "8", name: "Rupesh",        initials: "R",  avatarColor: "#ef4444" },
];

const STAFF_TIMES: Record<string, [string, string]> = {
  "1": ["10:30 AM", "09:00 PM"],
  "2": ["11:00 AM", "08:00 PM"],
  "3": ["10:30 AM", "07:30 PM"],
  "4": ["08:00 AM", "10:00 PM"],
  "5": ["11:30 AM", "08:30 PM"],
  "6": ["08:00 AM", "10:00 PM"],
  "7": ["10:30 AM", "09:00 PM"],
  "8": ["10:30 AM", "09:00 PM"],
};

export function buildSeedShifts(sunday: Date): ShiftMap {
  const map: ShiftMap = {};
  SEED_STAFF.forEach((s) => {
    map[s.id] = {};
    const [start, end] = STAFF_TIMES[s.id] ?? ["10:00 AM", "07:00 PM"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const key = toDateKey(d);
      map[s.id][key] = {
        staffId: s.id, date: key,
        startTime: start, endTime: end,
        totalHours: calcTotalHours(start, end),
        type: "working", isAvailable: true,
      };
    }
  });
  // Priti: Tuesday = empty (day off look from image)
  const tue = new Date(sunday); tue.setDate(sunday.getDate() + 2);
  delete map["3"]?.[toDateKey(tue)];
  // Swapnali: Wednesday = empty
  const wed = new Date(sunday); wed.setDate(sunday.getDate() + 3);
  delete map["4"]?.[toDateKey(wed)];
  return map;
}

export function buildShiftEntry(
  staffId: string, date: string, start: string, end: string, type: ShiftEntry["type"] = "working"
): ShiftEntry {
  return { staffId, date, startTime: start, endTime: end, totalHours: calcTotalHours(start, end), type, isAvailable: true };
}
