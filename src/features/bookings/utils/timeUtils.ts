import type { IntervalOption } from "../types/scheduler-types";

export function generateTimeSlots(
  interval: IntervalOption = "30 Mins",
): string[] {
  const mins = parseInt(interval);
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += mins) {
      slots.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      );
    }
  }
  return slots;
}

export function formatTime12(time: string | undefined | null): string {
  if (!time) return "--:--";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "--:--";
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
}


export function getTimePosition(
  time: string,
  intervalMins: number,
  slotHeight: number,
): number {
  const [h, m] = time.split(":").map(Number);
  return ((h * 60 + m) / intervalMins) * slotHeight;
}

export function getBookingHeight(
  startTime: string,
  endTime: string,
  intervalMins: number,
  slotHeight: number,
): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return (diff / intervalMins) * slotHeight;
}

export function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

export function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

export function getWeekDays(dateStr: string): string[] {
  const d = new Date(dateStr);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dd.toISOString().slice(0, 10);
  });
}

export function getMonthDays(dateStr: string): (string | null)[] {
  const d = new Date(dateStr + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(
      `${year}-${(month + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`,
    );
  }
  return days;
}

export function formatDateLabel(dateStr: string, viewMode: string): string {
  const d = new Date(dateStr);
  if (viewMode === "Day") {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (viewMode === "Month") {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const days = getWeekDays(dateStr);
  const s = new Date(days[0]);
  const e = new Date(days[6]);
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const DAYS_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
