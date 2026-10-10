import type { ClientListItem, CreateClientRequest } from "@/types/client";

// Same conventions as the web app (AddClientPage / QuickEditClientModal): the
// backend stores the birthday as "MM-DD" plus a separate year, and the
// anniversary as a full YYYY-MM-DD date. A birthday saved without a year is
// shown against this placeholder year.
const DOB_PLACEHOLDER_YEAR = 2000;

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/** Client record -> YYYY-MM-DD values for the date fields ("" when not set). */
export function getClientDateFields(client: Pick<ClientListItem, "anniversary" | "birthdayDayMonth" | "birthdayYear">) {
  const dayMonth = /^\d{2}-\d{2}$/.test(client.birthdayDayMonth ?? "") ? client.birthdayDayMonth : null;
  return {
    anniversary: /^\d{4}-\d{2}-\d{2}$/.test(client.anniversary ?? "") ? (client.anniversary as string) : "",
    dob: dayMonth ? `${client.birthdayYear ?? DOB_PLACEHOLDER_YEAR}-${dayMonth}` : "",
  };
}

/** YYYY-MM-DD values from the date fields -> API fields (null clears a date). */
export function toClientDatePayload(dob: string, anniversary: string): Pick<CreateClientRequest, "anniversary" | "birthday_day_month" | "birthday_year"> {
  const [year, month, day] = dob ? dob.split("-") : [];
  return {
    anniversary: anniversary || null,
    birthday_day_month: dob ? `${month}-${day}` : null,
    birthday_year: dob ? Number(year) : null,
  };
}

/** Returns error messages for invalid dates; empty object when both are valid. */
export function validateClientDates(dob: string, anniversary: string) {
  const errors: { anniversary?: string; dob?: string } = {};
  const today = todayKey();
  const isRealDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) &&
      date.getDate() === Number(value.slice(8, 10));
  };
  if (dob && !isRealDate(dob)) errors.dob = "Enter a valid date of birth.";
  else if (dob && dob > today) errors.dob = "Date of birth can't be in the future.";
  if (anniversary && !isRealDate(anniversary)) errors.anniversary = "Enter a valid anniversary date.";
  else if (anniversary && anniversary > today) errors.anniversary = "Anniversary can't be in the future.";
  else if (anniversary && dob && !errors.dob && anniversary < dob) errors.anniversary = "Anniversary can't be before the date of birth.";
  return errors;
}
