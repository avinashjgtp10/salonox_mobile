export type DateTimeInput = Date | string | number | null | undefined;

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_FIRST_DATE_TIME_PATTERN = /^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i;

const normalizeBackendDateString = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const dateOnlyMatch = trimmed.match(DATE_ONLY_PATTERN);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${year}-${month}-${day}T00:00:00`;
  }

  return trimmed
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
};

export const parseAppDateTime = (value: DateTimeInput): Date | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const dayFirstMatch = value.trim().match(DAY_FIRST_DATE_TIME_PATTERN);
    if (dayFirstMatch) {
      const [, dayValue, monthValue, yearValue, hourValue = "0", minuteValue = "0", secondValue = "0", meridiem] = dayFirstMatch;
      const day = Number(dayValue);
      const month = Number(monthValue);
      const shortYear = Number(yearValue);
      const year = yearValue.length === 2 ? 2000 + shortYear : shortYear;
      let hour = Number(hourValue);
      const minute = Number(minuteValue);
      const second = Number(secondValue);

      if (meridiem) hour = (hour % 12) + (meridiem.toUpperCase() === "PM" ? 12 : 0);
      const parsedDayFirst = new Date(year, month - 1, day, hour, minute, second);
      if (
        month >= 1 && month <= 12 && day >= 1 && day <= 31 &&
        hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59 &&
        parsedDayFirst.getFullYear() === year && parsedDayFirst.getMonth() === month - 1 && parsedDayFirst.getDate() === day
      ) return parsedDayFirst;
      return null;
    }
  }

  const parsed = new Date(typeof value === "string" ? normalizeBackendDateString(value) : value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const padTwo = (value: number) => String(value).padStart(2, "0");

export const formatAppDate = (value: DateTimeInput, fallback = "-") => {
  const date = parseAppDateTime(value);

  if (!date) {
    return fallback;
  }

  return `${padTwo(date.getDate())}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getFullYear() % 100)}`;
};

export const formatAppTime = (value: DateTimeInput, fallback = "-") => {
  const date = parseAppDateTime(value);

  if (!date) {
    return fallback;
  }

  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = padTwo(date.getMinutes());
  const meridiem = hours24 >= 12 ? "PM" : "AM";

  return `${padTwo(hours12)}:${minutes} ${meridiem}`;
};

export const formatAppDateTime = (value: DateTimeInput, fallback = "-") => {
  const date = parseAppDateTime(value);

  if (!date) {
    return fallback;
  }

  return `${formatAppDate(date, fallback)} • ${formatAppTime(date, fallback)}`;
};
