/**
 * Utility functions for time selectors and formatting.
 */

export const generateTimeOptions = (): string[] => {
  return Array.from({ length: 48 }, (_, i) => {
    const hours24 = Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    const ampm = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const hoursStr = String(hours12).padStart(2, "0");
    const minutesStr = String(minutes).padStart(2, "0");
    return `${hoursStr}:${minutesStr} ${ampm}`;
  });
};

export const parseTimeToMinutes = (timeStr?: string | null): number => {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hours !== 12) {
    hours += 12;
  } else if (ampm === "AM" && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
};

export const parseWorkingHours = (workingHours?: string | null): { startTime: string; endTime: string } => {
  if (!workingHours || workingHours === "-") {
    return { startTime: "", endTime: "" };
  }

  // Split by hyphens or dashes
  const parts = workingHours.split(/[\-\–\—]/).map((part) => part.trim());
  if (parts.length === 2) {
    return {
      startTime: parts[0],
      endTime: parts[1],
    };
  }

  return { startTime: "", endTime: "" };
};
