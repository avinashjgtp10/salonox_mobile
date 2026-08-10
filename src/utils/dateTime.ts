export type DateTimeInput = Date | string | number | null | undefined;

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

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

  const parsed = new Date(typeof value === "string" ? normalizeBackendDateString(value) : value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const padTwo = (value: number) => String(value).padStart(2, "0");

export const formatAppDate = (value: DateTimeInput, fallback = "-") => {
  const date = parseAppDateTime(value);

  if (!date) {
    return fallback;
  }

  return `${padTwo(date.getDate())}/${padTwo(date.getMonth() + 1)}/${date.getFullYear()}`;
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
