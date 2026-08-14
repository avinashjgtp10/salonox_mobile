export const DEFAULT_EXPENSE_TYPES = [
  "Rent",
  "Electricity",
  "Water Bill",
  "Internet",
  "Staff Salary",
  "Staff Advance",
  "Supplies",
  "Product Purchase",
  "Maintenance",
  "Cleaning",
  "Marketing",
  "Transportation",
  "Office Expenses",
  "Equipment",
  "Tax",
  "Miscellaneous",
];

const STORAGE_KEY = "cashmgmt.customExpenseTypes";

export function getCustomExpenseTypes(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function saveCustomExpenseType(name: string): string[] {
  const trimmed = name.trim();
  const existing = getCustomExpenseTypes();
  const alreadyKnown = [...DEFAULT_EXPENSE_TYPES, ...existing].some(
    (value) => value.toLowerCase() === trimmed.toLowerCase(),
  );
  const next = alreadyKnown ? existing : [...existing, trimmed];

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore persistence failures (e.g. storage disabled) — the type is
    // still returned so it can be used for the rest of this session.
  }

  return next;
}
